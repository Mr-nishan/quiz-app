const express = require('express');
const cors = require('cors');
const path = require('path');

const { getDatabase } = require('./database');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const questionRoutes = require('./routes/questions');
const teamRoutes = require('./routes/teams');
const quizRoutes = require('./routes/quiz');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/quiz', quizRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static build (if available)
const distPath = path.join(__dirname, '../frontend/dist');
const fs = require('fs');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`Serving frontend from: ${distPath}`);
} else {
    console.log('Frontend dist not found. Run "cd frontend && npm run build" to build the frontend.');
}

// Global error handler – ensures every error returns JSON, never HTML
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
});

// Initialize database asynchronously before starting the server
async function startServer() {
    try {
        await getDatabase();
        console.log('Database initialized successfully');

        app.listen(PORT, () => {
            console.log(`Quiz Manual Server running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
}

startServer();