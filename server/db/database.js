const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_DIR = path.join(__dirname, '..', 'data')
const DB_PATH = path.join(DB_DIR, 'glorbi.db')

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── Schema base ────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id             TEXT PRIMARY KEY,
    email          TEXT UNIQUE NOT NULL,
    full_name      TEXT,
    password       TEXT NOT NULL,
    role           TEXT NOT NULL DEFAULT 'user',
    email_verified INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    id                 TEXT PRIMARY KEY,
    created_by         TEXT NOT NULL,
    binance_api_key    TEXT,
    binance_api_secret TEXT,
    iol_username       TEXT,
    iol_password       TEXT,
    display_name       TEXT,
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(email)
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id          TEXT PRIMARY KEY,
    created_by  TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'general',
    message     TEXT NOT NULL,
    page_url    TEXT,
    status      TEXT NOT NULL DEFAULT 'open',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(email)
  );

  -- Tokens de un solo uso, compartidos entre verificación de email y
  -- recuperación de contraseña (se diferencian por la columna "purpose").
  CREATE TABLE IF NOT EXISTS auth_tokens (
    token       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    purpose     TEXT NOT NULL,   -- 'verify_email' | 'reset_password'
    expires_at  TEXT NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS x_subscriptions (
    id         TEXT PRIMARY KEY,
    created_by TEXT NOT NULL,
    handle     TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (created_by, handle),
    FOREIGN KEY (created_by) REFERENCES users(email)
  );

  CREATE TABLE IF NOT EXISTS iol_positions (
    created_by   TEXT NOT NULL,
    ticker       TEXT NOT NULL,
    description  TEXT,
    quantity     REAL NOT NULL DEFAULT 0,
    last_price   REAL NOT NULL DEFAULT 0,
    total_value  REAL NOT NULL DEFAULT 0,
    profit_loss  REAL NOT NULL DEFAULT 0,
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (created_by, ticker)
  );

  CREATE TABLE IF NOT EXISTS iol_transactions (
    created_by    TEXT NOT NULL,
    operation_id  TEXT NOT NULL,
    date          TEXT NOT NULL,
    type          TEXT NOT NULL,
    ticker        TEXT NOT NULL,
    quantity      REAL NOT NULL DEFAULT 0,
    price         REAL NOT NULL DEFAULT 0,
    fees          REAL NOT NULL DEFAULT 0,
    total_amount  REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (created_by, operation_id)
  );

  CREATE TABLE IF NOT EXISTS portfolio_daily_history (
    created_by       TEXT NOT NULL,
    date             TEXT NOT NULL,
    total_balance    REAL NOT NULL DEFAULT 0,
    cash_balance     REAL NOT NULL DEFAULT 0,
    invested_balance REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (created_by, date)
  );

  CREATE INDEX IF NOT EXISTS idx_iol_transactions_date
    ON iol_transactions(date DESC);
`)

/**
 * Migración segura para bases de datos creadas ANTES de que existiera
 * la columna email_verified — si ya la tenés, esto no hace nada;
 * si tu DB es vieja (de antes de este cambio), la agrega sin borrar datos.
 */
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  const exists = cols.some((c) => c.name === column)
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    console.log(`[db] Migración: agregada columna ${column} a ${table}`)
  }
}
ensureColumn('users', 'email_verified', "INTEGER NOT NULL DEFAULT 0")
ensureColumn('user_settings', 'iol_username', 'TEXT')
ensureColumn('user_settings', 'iol_password', 'TEXT')

// Las primeras tablas IOL eran globales. Se reconstruyen y se descartan sus
// filas porque no pueden atribuirse de forma segura a un usuario concreto.
function ensureOwnerScopedIolTables() {
  const hasOwner = (table) => db.prepare(`PRAGMA table_info(${table})`).all().some((column) => column.name === 'created_by')
  if (hasOwner('iol_positions') && hasOwner('iol_transactions') && hasOwner('portfolio_daily_history')) return

  db.exec(`
    ALTER TABLE iol_positions RENAME TO iol_positions_legacy;
    ALTER TABLE iol_transactions RENAME TO iol_transactions_legacy;
    ALTER TABLE portfolio_daily_history RENAME TO portfolio_daily_history_legacy;
    CREATE TABLE iol_positions (
      created_by TEXT NOT NULL, ticker TEXT NOT NULL, description TEXT,
      quantity REAL NOT NULL DEFAULT 0, last_price REAL NOT NULL DEFAULT 0,
      total_value REAL NOT NULL DEFAULT 0, profit_loss REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (created_by, ticker)
    );
    CREATE TABLE iol_transactions (
      created_by TEXT NOT NULL, operation_id TEXT NOT NULL, date TEXT NOT NULL,
      type TEXT NOT NULL, ticker TEXT NOT NULL, quantity REAL NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0, fees REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0, PRIMARY KEY (created_by, operation_id)
    );
    CREATE TABLE portfolio_daily_history (
      created_by TEXT NOT NULL, date TEXT NOT NULL, total_balance REAL NOT NULL DEFAULT 0,
      cash_balance REAL NOT NULL DEFAULT 0, invested_balance REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (created_by, date)
    );
    DROP TABLE iol_positions_legacy;
    DROP TABLE iol_transactions_legacy;
    DROP TABLE portfolio_daily_history_legacy;
    CREATE INDEX IF NOT EXISTS idx_iol_transactions_owner_date
      ON iol_transactions(created_by, date DESC);
  `)
}
ensureOwnerScopedIolTables()

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return require('crypto').randomBytes(12).toString('hex')
}

function generateToken() {
  return require('crypto').randomBytes(32).toString('hex')
}

// ── Prepared statements ───────────────────────────────────────────────────────

const stmts = {
  // Users
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserById:    db.prepare('SELECT * FROM users WHERE id = ?'),
  // FIX: la versión anterior solo traía columnas de "users" — has_binance_keys
  // en admin.js siempre daba false porque binance_api_key vive en la tabla
  // user_settings, no en users. Con este LEFT JOIN se trae el dato real.
  getAllUsers: db.prepare(`
    SELECT
      u.id, u.email, u.full_name, u.role, u.email_verified, u.created_at,
      us.binance_api_key IS NOT NULL AS has_binance_keys
    FROM users u
    LEFT JOIN user_settings us ON us.created_by = u.email
    ORDER BY u.created_at DESC
  `),
  countUsers:     db.prepare('SELECT COUNT(*) as count FROM users'),
  createUser:     db.prepare(
    'INSERT INTO users (id, email, full_name, password, role) VALUES (?, ?, ?, ?, ?)'
  ),
  setEmailVerified: db.prepare(
    'UPDATE users SET email_verified = 1 WHERE id = ?'
  ),
  updatePassword: db.prepare(
    'UPDATE users SET password = ? WHERE id = ?'
  ),

  // User settings
  getSettingsByOwner: db.prepare(
    'SELECT * FROM user_settings WHERE created_by = ?'
  ),
  getSettingsById: db.prepare(
    'SELECT * FROM user_settings WHERE id = ?'
  ),
  createSettings: db.prepare(
    `INSERT INTO user_settings (id, created_by, binance_api_key, binance_api_secret, iol_username, iol_password, display_name)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ),
  updateSettings: db.prepare(
     `UPDATE user_settings
      SET binance_api_key = ?, binance_api_secret = ?, iol_username = ?, iol_password = ?, display_name = ?, updated_at = datetime('now')
     WHERE id = ?`
  ),
  deleteSettings: db.prepare('DELETE FROM user_settings WHERE id = ?'),
  deleteUserSettingsByOwner: db.prepare('DELETE FROM user_settings WHERE created_by = ?'),
  deleteUserTokensByUser: db.prepare('DELETE FROM auth_tokens WHERE user_id = ?'),
  deleteUserFeedback: db.prepare('DELETE FROM feedback WHERE created_by = ?'),
  deleteUserXSubscriptions: db.prepare('DELETE FROM x_subscriptions WHERE created_by = ?'),
  deleteUserIolPositions: db.prepare('DELETE FROM iol_positions WHERE created_by = ?'),
  deleteUserIolTransactions: db.prepare('DELETE FROM iol_transactions WHERE created_by = ?'),
  deleteUserPortfolioHistory: db.prepare('DELETE FROM portfolio_daily_history WHERE created_by = ?'),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),

  // Feedback
  createFeedback: db.prepare(
    `INSERT INTO feedback (id, created_by, category, message, page_url)
     VALUES (?, ?, ?, ?, ?)`
  ),
  getAllFeedback: db.prepare(
    'SELECT * FROM feedback ORDER BY created_at DESC'
  ),
  getFeedbackByUser: db.prepare(
    'SELECT * FROM feedback WHERE created_by = ? ORDER BY created_at DESC'
  ),
  updateFeedbackStatus: db.prepare(
    'UPDATE feedback SET status = ? WHERE id = ?'
  ),

  // Auth tokens (verificación de email + recuperación de contraseña)
  createAuthToken: db.prepare(
    `INSERT INTO auth_tokens (token, user_id, purpose, expires_at)
     VALUES (?, ?, ?, ?)`
  ),
  getValidToken: db.prepare(
    `SELECT * FROM auth_tokens
     WHERE token = ? AND purpose = ? AND used = 0 AND expires_at > datetime('now')`
  ),
  markTokenUsed: db.prepare(
    'UPDATE auth_tokens SET used = 1 WHERE token = ?'
  ),
  invalidateUserTokens: db.prepare(
    `UPDATE auth_tokens SET used = 1 WHERE user_id = ? AND purpose = ? AND used = 0`
  ),

  // X subscriptions
  getXSubscriptionsByOwner: db.prepare(
    'SELECT * FROM x_subscriptions WHERE created_by = ? ORDER BY created_at ASC'
  ),
  createXSubscription: db.prepare(
    'INSERT INTO x_subscriptions (id, created_by, handle) VALUES (?, ?, ?)'
  ),
  deleteXSubscription: db.prepare(
    'DELETE FROM x_subscriptions WHERE created_by = ? AND handle = ?'
  ),

  // IOL snapshots and synchronized history
  getIolPositions: db.prepare(
    'SELECT * FROM iol_positions ORDER BY total_value DESC'
  ),
  upsertIolPosition: db.prepare(
    `INSERT INTO iol_positions
      (created_by, ticker, description, quantity, last_price, total_value, profit_loss, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(created_by, ticker) DO UPDATE SET
       description = excluded.description,
       quantity = excluded.quantity,
       last_price = excluded.last_price,
       total_value = excluded.total_value,
       profit_loss = excluded.profit_loss,
       updated_at = datetime('now')`
  ),
  clearIolPositions: db.prepare('DELETE FROM iol_positions WHERE created_by = ?'),
  getIolTransactions: db.prepare(
    'SELECT * FROM iol_transactions WHERE created_by = ? ORDER BY date DESC LIMIT ? OFFSET ?'
  ),
  countIolTransactions: db.prepare(
    'SELECT COUNT(*) AS count FROM iol_transactions WHERE created_by = ?'
  ),
  upsertIolTransaction: db.prepare(
    `INSERT INTO iol_transactions
      (created_by, operation_id, date, type, ticker, quantity, price, fees, total_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(created_by, operation_id) DO UPDATE SET
       date = excluded.date,
       type = excluded.type,
       ticker = excluded.ticker,
       quantity = excluded.quantity,
       price = excluded.price,
       fees = excluded.fees,
       total_amount = excluded.total_amount`
  ),
  getPortfolioDailyHistory: db.prepare(
    'SELECT * FROM portfolio_daily_history WHERE created_by = ? AND date >= ? ORDER BY date ASC'
  ),
  upsertPortfolioDailyHistory: db.prepare(
    `INSERT INTO portfolio_daily_history
      (created_by, date, total_balance, cash_balance, invested_balance)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(created_by, date) DO UPDATE SET
       total_balance = excluded.total_balance,
       cash_balance = excluded.cash_balance,
       invested_balance = excluded.invested_balance`
  ),
}

module.exports = { db, stmts, generateId, generateToken }
