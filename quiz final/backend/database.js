const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'quiz_manual.db');

let db = null;

async function getDatabase() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
  initSchema();
  seedDefaultAdmin();
  saveDatabase();

  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'setup',
      current_turn INTEGER DEFAULT 0,
      team_order TEXT DEFAULT '[]',
      active_question_id INTEGER,
      active_question_started_at DATETIME,
      question_start_turn INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: add column if missing (SQLite throws error if column exists, so ignore)
  try {
    db.run('ALTER TABLE events ADD COLUMN question_start_turn INTEGER DEFAULT NULL');
  } catch (e) {
    // Column probably already exists; ignore
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      link_url TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
      points INTEGER NOT NULL DEFAULT 5,
      used INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      team_name TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      result TEXT NOT NULL CHECK(result IN ('correct', 'wrong', 'skipped')),
      points_awarded INTEGER NOT NULL DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

function seedDefaultAdmin() {
  const resultAdmin = db.exec("SELECT id FROM users WHERE username = 'admin'");
  if (resultAdmin.length === 0 || resultAdmin[0].values.length === 0) {
    const hashedAdmin = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hashedAdmin, 'admin']);
    console.log('Default admin user created: admin / admin123');
  }

  const resultPashupati = db.exec("SELECT id FROM users WHERE username = 'pashupati'");
  if (resultPashupati.length === 0 || resultPashupati[0].values.length === 0) {
    const hashedPashupati = bcrypt.hashSync('pss-2026', 10);
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['pashupati', hashedPashupati, 'admin']);
    console.log('Additional admin user created: pashupati / pss-2026');
  }
}

// Helper to convert sql.js result to array of objects
function queryAll(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } catch (err) {
    console.error('Database queryAll error:', err.message, 'SQL:', sql);
    throw err;
  }
}

function queryGet(sql, params = []) {
  try {
    const rows = queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error('Database queryGet error:', err.message, 'SQL:', sql);
    throw err;
  }
}

function queryRun(sql, params = []) {
  try {
    db.run(sql, params);
    // Capture last_insert_rowid BEFORE saveDatabase() (export resets it)
    const result = db.exec("SELECT last_insert_rowid() as _lid");
    let rowid = 0;
    if (result.length > 0 && result[0].values.length > 0) {
      rowid = result[0].values[0][0];
    }
    // Only save if this is an INSERT/UPDATE/DELETE (has rowid or modifies)
    if (sql.trim().toUpperCase().startsWith('INSERT') ||
      sql.trim().toUpperCase().startsWith('UPDATE') ||
      sql.trim().toUpperCase().startsWith('DELETE') ||
      sql.trim().toUpperCase().startsWith('CREATE')) {
      saveDatabase();
    }
    return { lastInsertRowid: rowid };
  } catch (err) {
    console.error('Database queryRun error:', err.message, 'SQL:', sql);
    throw err;
  }
}

module.exports = { getDatabase, queryAll, queryGet, queryRun, saveDatabase };