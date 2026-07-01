const express = require('express');
const { queryAll, queryGet, queryRun } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// POST /api/quiz/:eventId/start
router.post('/:eventId/start', (req, res) => {
    const event = queryGet('SELECT * FROM events WHERE id = ?', [req.params.eventId]);
    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    // Prevent reset if game is already in progress
    if (event.status === 'in_progress') {
        return res.status(400).json({
            error: 'Game is already in progress. Use resume instead.',
            resumeAvailable: true
        });
    }

    // Prevent restarting a completed game
    if (event.status === 'completed') {
        return res.status(400).json({
            error: 'This event is already completed. Results are available.',
            completed: true
        });
    }

    const teams = queryAll('SELECT * FROM teams WHERE event_id = ? ORDER BY id', [req.params.eventId]);
    if (teams.length === 0) {
        return res.status(400).json({ error: 'No teams registered' });
    }

    const availableQuestions = queryAll('SELECT * FROM questions WHERE event_id = ? AND used = 0', [req.params.eventId]);
    if (availableQuestions.length === 0) {
        return res.status(400).json({ error: 'No questions available' });
    }

    // Reset game state
    queryRun('UPDATE questions SET used = 0 WHERE event_id = ?', [req.params.eventId]);
    queryRun('UPDATE teams SET score = 0 WHERE event_id = ?', [req.params.eventId]);
    queryRun('DELETE FROM game_history WHERE event_id = ?', [req.params.eventId]);

    // Set team order and current turn
    const teamOrder = teams.map(t => t.id);
    queryRun(
        "UPDATE events SET status = ?, current_turn = 0, team_order = ?, active_question_id = NULL, active_question_started_at = NULL WHERE id = ?",
        ['in_progress', JSON.stringify(teamOrder), req.params.eventId]
    );

    const updated = queryGet(`
    SELECT e.*,
      (SELECT COUNT(*) FROM questions WHERE event_id = e.id AND used = 0) as remaining_questions,
      (SELECT COUNT(*) FROM teams WHERE event_id = e.id) as total_teams
    FROM events e WHERE e.id = ?
  `, [req.params.eventId]);

    const currentTeam = teams[0];

    res.json({ event: updated, currentTeam, teams });
});

// GET /api/quiz/:eventId/resume
router.get('/:eventId/resume', (req, res) => {
    const event = queryGet(`
    SELECT e.*,
      (SELECT COUNT(*) FROM questions WHERE event_id = e.id AND used = 0) as remaining_questions,
      (SELECT COUNT(*) FROM questions WHERE event_id = e.id) as total_questions,
      (SELECT COUNT(*) FROM teams WHERE event_id = e.id) as total_teams
    FROM events e WHERE e.id = ?
  `, [req.params.eventId]);

    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    // Parse team order
    let teamOrder = [];
    try { teamOrder = JSON.parse(event.team_order || '[]'); } catch (e) { teamOrder = []; }

    // Determine current team from current_turn
    let currentTeam = null;
    if (event.status === 'in_progress' && teamOrder.length > 0) {
        const teamId = teamOrder[event.current_turn % teamOrder.length];
        currentTeam = queryGet('SELECT * FROM teams WHERE id = ?', [teamId]);
    }

    let activeQuestion = null;
    let elapsedSeconds = 0;
    if (event.active_question_id) {
        activeQuestion = queryGet('SELECT * FROM questions WHERE id = ? AND event_id = ?', [
            event.active_question_id, req.params.eventId
        ]);
        if (event.active_question_started_at) {
            const elapsedResult = queryGet("SELECT CAST((julianday('now') - julianday(?)) * 86400 AS INTEGER) as elapsed", [event.active_question_started_at]);
            if (elapsedResult) {
                elapsedSeconds = elapsedResult.elapsed;
            }
        }
    }
    event.elapsedSeconds = elapsedSeconds;

    // Get all teams with scores
    const teams = queryAll('SELECT * FROM teams WHERE event_id = ? ORDER BY score DESC', [req.params.eventId]);

    // Get scores as a map
    const scores = {};
    for (const t of teams) {
        scores[t.id] = t.score;
    }

    // Get game history
    const gameHistory = queryAll(`
    SELECT gh.*, t.team_name, q.question as question_text, q.difficulty, q.points
    FROM game_history gh
    JOIN teams t ON gh.team_id = t.id
    JOIN questions q ON gh.question_id = q.id
    WHERE gh.event_id = ?
    ORDER BY gh.timestamp ASC
  `, [req.params.eventId]);

    // Get remaining (unused) questions
    const remainingQuestions = queryAll(
        'SELECT id, question, answer, difficulty, points, used, sort_order, link_url, image_url FROM questions WHERE event_id = ? AND used = 0 ORDER BY difficulty, sort_order, id',
        [req.params.eventId]
    );

    // Get used question IDs
    const usedQuestions = queryAll(
        'SELECT id FROM questions WHERE event_id = ? AND used = 1',
        [req.params.eventId]
    ).map(q => q.id);

    res.json({
        event,
        currentTeam,
        activeQuestion,
        scores,
        teams,
        teamOrder,
        currentTurn: event.current_turn,
        remainingQuestions,
        usedQuestions,
        gameHistory,
        stats: {
            remainingQuestions: remainingQuestions.length,
            totalQuestions: event.total_questions || 0,
            usedQuestions: usedQuestions.length
        }
    });
});

// POST /api/quiz/:eventId/select
router.post('/:eventId/select', (req, res) => {
    const { question_id } = req.body;

    if (!question_id) {
        return res.status(400).json({ error: 'question_id is required' });
    }

    const event = queryGet('SELECT * FROM events WHERE id = ?', [req.params.eventId]);
    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'in_progress') {
        return res.status(400).json({ error: 'Event is not in progress' });
    }

    // Check if there's already an active question
    if (event.active_question_id) {
        // If same question, just return it (idempotent)
        if (event.active_question_id === question_id) {
            const question = queryGet('SELECT * FROM questions WHERE id = ?', [question_id]);
            return res.json({ question, restored: true });
        }
        return res.status(400).json({
            error: 'A question is already active. Resolve it before selecting a new one.',
            activeQuestionId: event.active_question_id
        });
    }

    const question = queryGet('SELECT * FROM questions WHERE id = ? AND event_id = ?', [question_id, req.params.eventId]);
    if (!question) {
        return res.status(404).json({ error: 'Question not found' });
    }

    if (question.used === 1) {
        return res.status(400).json({ error: 'Question already used' });
    }

    // Persist the active question to the database and record which team started it
    queryRun(
        'UPDATE events SET active_question_id = ?, active_question_started_at = CURRENT_TIMESTAMP, question_start_turn = current_turn WHERE id = ?',
        [question_id, req.params.eventId]
    );

    res.json({ question, restored: false });
});

// POST /api/quiz/:eventId/cancel-select
router.post('/:eventId/cancel-select', (req, res) => {
    const event = queryGet('SELECT * FROM events WHERE id = ?', [req.params.eventId]);
    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    queryRun(
        'UPDATE events SET active_question_id = NULL, active_question_started_at = NULL, question_start_turn = NULL WHERE id = ?',
        [req.params.eventId]
    );

    res.json({ message: 'Question selection cancelled' });
});

// GET /api/quiz/:eventId/state
router.get('/:eventId/state', (req, res) => {
    const event = queryGet(`
    SELECT e.*,
      (SELECT COUNT(*) FROM questions WHERE event_id = e.id AND used = 0) as remaining_questions,
      (SELECT COUNT(*) FROM teams WHERE event_id = e.id) as total_teams
    FROM events e WHERE e.id = ?
  `, [req.params.eventId]);

    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    const teams = queryAll('SELECT * FROM teams WHERE event_id = ? ORDER BY score DESC', [req.params.eventId]);
    let teamOrder = [];
    try { teamOrder = JSON.parse(event.team_order || '[]'); } catch (e) { teamOrder = []; }

    let currentTeam = null;
    if (event.status === 'in_progress' && teamOrder.length > 0) {
        const teamId = teamOrder[event.current_turn % teamOrder.length];
        currentTeam = queryGet('SELECT * FROM teams WHERE id = ?', [teamId]);
    }

    // Get active question
    let activeQuestion = null;
    let elapsedSeconds = 0;
    if (event.active_question_id) {
        activeQuestion = queryGet('SELECT * FROM questions WHERE id = ?', [event.active_question_id]);
        if (event.active_question_started_at) {
            const elapsedResult = queryGet("SELECT CAST((julianday('now') - julianday(?)) * 86400 AS INTEGER) as elapsed", [event.active_question_started_at]);
            if (elapsedResult) {
                elapsedSeconds = elapsedResult.elapsed;
            }
        }
    }
    event.elapsedSeconds = elapsedSeconds;

    const stats = queryGet(`
    SELECT
      (SELECT COUNT(*) FROM questions WHERE event_id = ? AND used = 1) as used_questions,
      (SELECT COUNT(*) FROM questions WHERE event_id = ?) as total_questions
  `, [req.params.eventId, req.params.eventId]);

    // Get history
    const history = queryAll(`
    SELECT gh.*, t.team_name, q.question as question_text, q.difficulty
    FROM game_history gh
    JOIN teams t ON gh.team_id = t.id
    JOIN questions q ON gh.question_id = q.id
    WHERE gh.event_id = ?
    ORDER BY gh.timestamp DESC
  `, [req.params.eventId]);

    res.json({
        event,
        teams,
        currentTeam,
        activeQuestion,
        teamOrder,
        stats,
        history
    });
});

// POST /api/quiz/:eventId/answer
router.post('/:eventId/answer', (req, res) => {
    const { question_id, result: answerResult } = req.body;

    if (!question_id || !answerResult) {
        return res.status(400).json({ error: 'question_id and result (correct/wrong) are required' });
    }

    if (!['correct', 'wrong'].includes(answerResult)) {
        return res.status(400).json({ error: 'Result must be "correct" or "wrong"' });
    }

    const event = queryGet('SELECT * FROM events WHERE id = ?', [req.params.eventId]);
    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    const question = queryGet('SELECT * FROM questions WHERE id = ? AND event_id = ?', [question_id, req.params.eventId]);
    if (!question) {
        return res.status(404).json({ error: 'Question not found' });
    }

    if (question.used === 1) {
        return res.status(400).json({ error: 'Question already used' });
    }

    let teamOrder = [];
    try { teamOrder = JSON.parse(event.team_order || '[]'); } catch (e) { teamOrder = []; }

    if (teamOrder.length === 0) {
        return res.status(400).json({ error: 'No teams in game' });
    }

    const currentTeamId = teamOrder[event.current_turn % teamOrder.length];
    const currentTeam = queryGet('SELECT * FROM teams WHERE id = ?', [currentTeamId]);
    if (!currentTeam) {
        return res.status(404).json({ error: 'Current team not found' });
    }

    const pointsAwarded = answerResult === 'correct' ? question.points : 0;

    // Record game history
    queryRun(
        'INSERT INTO game_history (event_id, team_id, question_id, result, points_awarded) VALUES (?, ?, ?, ?, ?)',
        [req.params.eventId, currentTeamId, question_id, answerResult, pointsAwarded]
    );

    // Update team score
    if (pointsAwarded > 0) {
        queryRun('UPDATE teams SET score = score + ? WHERE id = ?', [pointsAwarded, currentTeamId]);
    }

    // Determine if all teams have now attempted this question and all got it wrong
    let allTeamsFailed = false;
    if (answerResult === 'wrong') {
        const totalTeams = queryGet(
            'SELECT COUNT(*) as count FROM teams WHERE event_id = ?',
            [req.params.eventId]
        );
        const wrongAttempts = queryGet(
            'SELECT COUNT(DISTINCT team_id) as count FROM game_history WHERE question_id = ? AND event_id = ? AND result = ?',
            [question_id, req.params.eventId, 'wrong']
        );
        if (wrongAttempts.count >= totalTeams.count) {
            // All teams have attempted and failed – discard the question
            queryRun('UPDATE questions SET used = 1 WHERE id = ?', [question_id]);
            allTeamsFailed = true;
        }
    } else {
        // Correct answer – award points and mark question used
        queryRun('UPDATE questions SET used = 1 WHERE id = ?', [question_id]);
    }

    // Compute next turn based on rotation rules
    let nextTurn;
    let startTurn = event.question_start_turn !== null && event.question_start_turn !== undefined ? event.question_start_turn : event.current_turn;
    if (allTeamsFailed) {
        // All teams failed – skip the original starter and move to the next team
        nextTurn = (startTurn + 1) % teamOrder.length;
    } else if (answerResult === 'correct') {
        // Correct answer – move to the next team (instead of keeping it)
        nextTurn = (startTurn + 1) % teamOrder.length;
    } else {
        // Wrong answer – advance to the next team in round‑robin (for stealing)
        nextTurn = (event.current_turn + 1) % teamOrder.length;
    }
    
    // Clear active question if it is now used (either correct or all teams failed)
    if (answerResult === 'correct' || allTeamsFailed) {
        queryRun('UPDATE events SET active_question_id = NULL, active_question_started_at = NULL, question_start_turn = NULL WHERE id = ?', [req.params.eventId]);
    }

    queryRun('UPDATE events SET current_turn = ? WHERE id = ?', [nextTurn, req.params.eventId]);

    // Check if game is over (no more unused questions)
    const remainingCount = queryGet(
        'SELECT COUNT(*) as count FROM questions WHERE event_id = ? AND used = 0',
        [req.params.eventId]
    );

    let gameOver = false;
    let results = null;

    if (remainingCount.count === 0) {
        gameOver = true;
        queryRun("UPDATE events SET status = 'completed' WHERE id = ?", [req.params.eventId]);

        const finalTeams = queryAll('SELECT * FROM teams WHERE event_id = ? ORDER BY score DESC', [req.params.eventId]);
        results = {
            winner: finalTeams[0] || null,
            runnerUp: finalTeams[1] || null,
            rankings: finalTeams
        };
    }

    const updatedTeams = queryAll('SELECT * FROM teams WHERE event_id = ? ORDER BY score DESC', [req.params.eventId]);

    // Get next team for response
    const nextTeamId = teamOrder[nextTurn % teamOrder.length];
    const nextTeam = queryGet('SELECT * FROM teams WHERE id = ?', [nextTeamId]);

    res.json({
        pointsAwarded,
        currentTeam: { ...currentTeam, score: currentTeam.score + pointsAwarded },
        nextTeam,
        teams: updatedTeams,
        gameOver,
        results,
        allTeamsFailed,
        remainingQuestions: remainingCount.count
    });
});

// POST /api/quiz/:eventId/next-team
router.post('/:eventId/next-team', (req, res) => {
    const event = queryGet('SELECT * FROM events WHERE id = ?', [req.params.eventId]);
    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    let teamOrder = [];
    try { teamOrder = JSON.parse(event.team_order || '[]'); } catch (e) { teamOrder = []; }

    if (teamOrder.length === 0) {
        return res.status(400).json({ error: 'No teams defined' });
    }

    const nextTurn = ((event.current_turn || 0) + 1) % teamOrder.length;
    queryRun('UPDATE events SET current_turn = ? WHERE id = ?', [nextTurn, req.params.eventId]);

    const nextTeamId = teamOrder[nextTurn];
    const nextTeam = queryGet('SELECT * FROM teams WHERE id = ?', [nextTeamId]);
    const teams = queryAll('SELECT * FROM teams WHERE event_id = ? ORDER BY score DESC', [req.params.eventId]);

    res.json({ nextTeam, teams, currentTurn: nextTurn });
});

// GET /api/quiz/:eventId/results
router.get('/:eventId/results', (req, res) => {
    const event = queryGet('SELECT * FROM events WHERE id = ?', [req.params.eventId]);
    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    const teams = queryAll('SELECT * FROM teams WHERE event_id = ? ORDER BY score DESC', [req.params.eventId]);
    const totalQuestions = queryGet('SELECT COUNT(*) as count FROM questions WHERE event_id = ?', [req.params.eventId]);

    const history = queryAll(`
    SELECT gh.*, t.team_name, q.question as question_text, q.difficulty, q.points
    FROM game_history gh
    JOIN teams t ON gh.team_id = t.id
    JOIN questions q ON gh.question_id = q.id
    WHERE gh.event_id = ?
    ORDER BY gh.timestamp ASC
  `, [req.params.eventId]);

    res.json({
        event,
        rankings: teams,
        winner: teams[0] || null,
        runnerUp: teams[1] || null,
        totalQuestions: totalQuestions.count,
        history
    });
});

module.exports = router;