const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'shorts-studio.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tema TEXT NOT NULL,
    tono TEXT NOT NULL DEFAULT 'Cercano y directo',
    duracion TEXT NOT NULL DEFAULT '30 segundos',
    audiencia TEXT NOT NULL DEFAULT '',
    stage INTEGER NOT NULL DEFAULT 1,
    hook TEXT NOT NULL DEFAULT '',
    titulos TEXT NOT NULL DEFAULT '[]',
    titulo_seleccionado INTEGER NOT NULL DEFAULT 0,
    descripcion TEXT NOT NULL DEFAULT '',
    hashtags TEXT NOT NULL DEFAULT '[]',
    miniatura_texto TEXT NOT NULL DEFAULT '',
    checklist TEXT NOT NULL DEFAULT '{}',
    ia_generativa INTEGER NOT NULL DEFAULT 0,
    video_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS beats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL,
    tiempo TEXT NOT NULL DEFAULT '',
    texto TEXT NOT NULL DEFAULT '',
    visual TEXT NOT NULL DEFAULT '',
    image_path TEXT,
    audio_path TEXT,
    audio_duration REAL
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// CREATE TABLE IF NOT EXISTS only creates missing tables — it doesn't add new
// columns to a table that already exists from an earlier version of this file.
// Migrate existing databases forward, ignoring "duplicate column" errors.
function addColumnIfMissing(table, columnDef) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
  } catch (e) {
    if (!/duplicate column/i.test(e.message)) throw e;
  }
}
addColumnIfMissing('projects', 'video_path TEXT');
addColumnIfMissing('beats', 'audio_duration REAL');

module.exports = db;
