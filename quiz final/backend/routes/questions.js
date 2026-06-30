const express = require('express');
const { queryAll, queryGet, queryRun } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/questions/:eventId
router.get('/:eventId', (req, res) => {
    const questions = queryAll(
        'SELECT * FROM questions WHERE event_id = ? ORDER BY difficulty, sort_order, id',
        [req.params.eventId]
    );
    res.json(questions);
});

// GET /api/questions/:eventId/board
router.get('/:eventId/board', (req, res) => {
    const questions = queryAll(
        'SELECT id, question, answer, difficulty, points, used, sort_order, link_url, image_url FROM questions WHERE event_id = ? ORDER BY difficulty, sort_order, id',
        [req.params.eventId]
    );
    res.json(questions);
});

// POST /api/questions/:eventId
router.post('/:eventId', (req, res) => {
    let { question, answer, difficulty, link_url, image_url } = req.body;
    difficulty = (difficulty || '').toLowerCase();
    link_url = link_url || '';
    image_url = image_url || '';

    if (!question || !answer || !difficulty) {
        return res.status(400).json({ error: 'Question, answer, and difficulty are required' });
    }
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({ error: 'Difficulty must be easy, medium, or hard' });
    }

    const pointsMap = { easy: 5, medium: 10, hard: 15 };
    const points = pointsMap[difficulty] || 5;

    const maxSort = queryGet(
        'SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM questions WHERE event_id = ? AND difficulty = ?',
        [req.params.eventId, difficulty]
    );

    const result = queryRun(
        'INSERT INTO questions (event_id, question, answer, link_url, image_url, difficulty, points, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [req.params.eventId, question, answer, link_url, image_url, difficulty, points, (maxSort.max_sort || 0) + 1]
    );

    const newQuestion = queryGet('SELECT * FROM questions WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(newQuestion);
});

// PUT /api/questions/:eventId/:id
router.put('/:eventId/:id', (req, res) => {
    let { question, answer, difficulty, link_url, image_url } = req.body;
    difficulty = difficulty ? difficulty.toLowerCase() : undefined;

    const existing = queryGet('SELECT * FROM questions WHERE id = ? AND event_id = ?', [req.params.id, req.params.eventId]);

    if (!existing) {
        return res.status(404).json({ error: 'Question not found' });
    }
    if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({ error: 'Difficulty must be easy, medium, or hard' });
    }

    const pointsMap = { easy: 5, medium: 10, hard: 15 };
    const points = difficulty ? (pointsMap[difficulty] || existing.points) : existing.points;

    queryRun(
        'UPDATE questions SET question = ?, answer = ?, link_url = ?, image_url = ?, difficulty = ?, points = ? WHERE id = ? AND event_id = ?',
        [
            question || existing.question,
            answer || existing.answer,
            link_url !== undefined ? link_url : (existing.link_url || ''),
            image_url !== undefined ? image_url : (existing.image_url || ''),
            difficulty || existing.difficulty,
            points,
            req.params.id,
            req.params.eventId
        ]
    );

    const updated = queryGet('SELECT * FROM questions WHERE id = ?', [req.params.id]);
    res.json(updated);
});

// DELETE /api/questions/:eventId/:id
router.delete('/:eventId/:id', (req, res) => {
    const question = queryGet('SELECT * FROM questions WHERE id = ? AND event_id = ?', [req.params.id, req.params.eventId]);
    if (!question) {
        return res.status(404).json({ error: 'Question not found' });
    }
    queryRun('DELETE FROM questions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Question deleted successfully' });
});

// POST /api/questions/:eventId/bulk
router.post('/:eventId/bulk', (req, res) => {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'Questions array is required' });
    }

    const pointsMap = { easy: 5, medium: 10, hard: 15 };
    const created = [];

    for (const q of questions) {
        q.difficulty = (q.difficulty || '').toLowerCase();
        if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
            return res.status(400).json({ error: `Invalid difficulty '${q.difficulty}' for question: ${q.question}` });
        }
        const points = pointsMap[q.difficulty] || 5;
        const maxSort = queryGet(
            'SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM questions WHERE event_id = ? AND difficulty = ?',
            [req.params.eventId, q.difficulty]
        );

        const link_url = q.link_url || '';
        const image_url = q.image_url || '';
        const result = queryRun(
            'INSERT INTO questions (event_id, question, answer, link_url, image_url, difficulty, points, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [req.params.eventId, q.question, q.answer, link_url, image_url, q.difficulty, points, (maxSort.max_sort || 0) + 1]
        );
        created.push(queryGet('SELECT * FROM questions WHERE id = ?', [result.lastInsertRowid]));
    }

    res.status(201).json(created);
});

module.exports = router;