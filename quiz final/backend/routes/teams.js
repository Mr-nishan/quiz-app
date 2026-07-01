const express = require('express');
const { queryAll, queryGet, queryRun } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/teams/:eventId
router.get('/:eventId', (req, res) => {
    const teams = queryAll('SELECT * FROM teams WHERE event_id = ? ORDER BY id', [req.params.eventId]);
    res.json(teams);
});

// POST /api/teams/:eventId
router.post('/:eventId', (req, res) => {
    const { team_name } = req.body;
    const trimmedTeamName = team_name?.trim();

    if (!trimmedTeamName) {
        return res.status(400).json({ error: 'Team name is required' });
    }

    const duplicate = queryGet(
        'SELECT id FROM teams WHERE event_id = ? AND LOWER(TRIM(team_name)) = LOWER(?)',
        [req.params.eventId, trimmedTeamName]
    );

    if (duplicate) {
        return res.status(409).json({ error: 'A team with this name is already registered' });
    }

    const result = queryRun(
        'INSERT INTO teams (event_id, team_name, score) VALUES (?, ?, 0)',
        [req.params.eventId, trimmedTeamName]
    );

    const team = queryGet('SELECT * FROM teams WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(team);
});

// PUT /api/teams/:eventId/:id
router.put('/:eventId/:id', (req, res) => {
    const { team_name } = req.body;
    const team = queryGet('SELECT * FROM teams WHERE id = ? AND event_id = ?', [req.params.id, req.params.eventId]);

    if (!team) {
        return res.status(404).json({ error: 'Team not found' });
    }

    const trimmedTeamName = team_name?.trim() || team.team_name;
    const duplicate = queryGet(
        'SELECT id FROM teams WHERE event_id = ? AND id != ? AND LOWER(TRIM(team_name)) = LOWER(?)',
        [req.params.eventId, req.params.id, trimmedTeamName]
    );

    if (duplicate) {
        return res.status(409).json({ error: 'A team with this name is already registered' });
    }

    queryRun('UPDATE teams SET team_name = ? WHERE id = ? AND event_id = ?',
        [trimmedTeamName, req.params.id, req.params.eventId]);

    const updated = queryGet('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    res.json(updated);
});

// DELETE /api/teams/:eventId/:id
router.delete('/:eventId/:id', (req, res) => {
    const team = queryGet('SELECT * FROM teams WHERE id = ? AND event_id = ?', [req.params.id, req.params.eventId]);
    if (!team) {
        return res.status(404).json({ error: 'Team not found' });
    }
    queryRun('DELETE FROM teams WHERE id = ?', [req.params.id]);
    res.json({ message: 'Team deleted successfully' });
});

module.exports = router;
