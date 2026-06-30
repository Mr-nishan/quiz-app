const express = require('express');
const { queryAll, queryGet, queryRun } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/events
router.get('/', (req, res) => {
    const events = queryAll(`
    SELECT e.*,
      (SELECT COUNT(*) FROM questions WHERE event_id = e.id) as total_questions,
      (SELECT COUNT(*) FROM teams WHERE event_id = e.id) as total_teams
    FROM events e
    ORDER BY e.created_at DESC
  `);
    res.json(events);
});

// GET /api/events/:id
router.get('/:id', (req, res) => {
    const event = queryGet(`
    SELECT e.*,
      (SELECT COUNT(*) FROM questions WHERE event_id = e.id) as total_questions,
      (SELECT COUNT(*) FROM questions WHERE event_id = e.id AND used = 1) as used_questions,
      (SELECT COUNT(*) FROM teams WHERE event_id = e.id) as total_teams
    FROM events e WHERE e.id = ?
  `, [req.params.id]);

    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    try { event.team_order = JSON.parse(event.team_order || '[]'); } catch (e) { event.team_order = []; }
    res.json(event);
});

// POST /api/events
router.post('/', (req, res) => {
    const { name, description, date } = req.body;

    if (!name || !date) {
        return res.status(400).json({ error: 'Name and date are required' });
    }

    const result = queryRun(
        'INSERT INTO events (name, description, date, status) VALUES (?, ?, ?, ?)',
        [name, description || '', date, 'setup']
    );

    const event = queryGet('SELECT * FROM events WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(event);
});

// PUT /api/events/:id
router.put('/:id', (req, res) => {
    const { name, description, date, status } = req.body;
    const event = queryGet('SELECT * FROM events WHERE id = ?', [req.params.id]);

    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    queryRun(
        'UPDATE events SET name = ?, description = ?, date = ?, status = ? WHERE id = ?',
        [
            name || event.name,
            description !== undefined ? description : event.description,
            date || event.date,
            status || event.status,
            req.params.id
        ]
    );

    const updated = queryGet('SELECT * FROM events WHERE id = ?', [req.params.id]);
    res.json(updated);
});

// DELETE /api/events/:id
router.delete('/:id', (req, res) => {
    const event = queryGet('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }
    queryRun('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted successfully' });
});

// GET /api/events/:id/questions
router.get('/:id/questions', (req, res) => {
    const questions = queryAll(
        'SELECT id, event_id, question, answer, link_url, image_url, difficulty, points, used, sort_order, created_at FROM questions WHERE event_id = ? ORDER BY difficulty, sort_order, id',
        [req.params.id]
    );
    res.json(questions);
});

module.exports = router;