const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_DIR = path.join(__dirname, '..', 'data')
const DB_PATH = path.join(DB_DIR, 'glorbi.db')

// Ensure the data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

const db = new Database(DB_PATH)

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    full_name   TEXT,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'user',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    id                 TEXT PRIMARY KEY,
    created_by         TEXT NOT NULL,
    binance_api_key    TEXT,
    binance_api_secret TEXT,
    display_name       TEXT,
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(email)
  );
`)

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return require('crypto').randomBytes(12).toString('hex')
}

// ── Prepared statements ───────────────────────────────────────────────────────

const stmts = {
  // Users
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserById:    db.prepare('SELECT * FROM users WHERE id = ?'),
  createUser:     db.prepare(
    'INSERT INTO users (id, email, full_name, password, role) VALUES (?, ?, ?, ?, ?)'
  ),

  // User settings
  getSettingsByOwner: db.prepare(
    'SELECT * FROM user_settings WHERE created_by = ?'
  ),
  getSettingsById: db.prepare(
    'SELECT * FROM user_settings WHERE id = ?'
  ),
  createSettings: db.prepare(
    `INSERT INTO user_settings (id, created_by, binance_api_key, binance_api_secret, display_name)
     VALUES (?, ?, ?, ?, ?)`
  ),
  updateSettings: db.prepare(
    `UPDATE user_settings
     SET binance_api_key = ?, binance_api_secret = ?, display_name = ?, updated_at = datetime('now')
     WHERE id = ?`
  ),
  deleteSettings: db.prepare('DELETE FROM user_settings WHERE id = ?'),
}

module.exports = { db, stmts, generateId }
