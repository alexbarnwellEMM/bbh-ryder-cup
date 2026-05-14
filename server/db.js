import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'bbh.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

ensureColumn('player', 'handicap', 'REAL NOT NULL DEFAULT 0');
ensureColumn('bettor', 'code', 'TEXT');
ensureColumn('match', 'points_weight', 'REAL NOT NULL DEFAULT 1');
ensureColumn('match', 'sudden_death', 'INTEGER NOT NULL DEFAULT 0');

// SQLite ALTER TABLE ADD COLUMN can't take an expression default, so add the
// column without one, then backfill existing rows.
if (!hasColumn('hole_result', 'created_at')) {
  db.exec(`ALTER TABLE hole_result ADD COLUMN created_at INTEGER`);
  db.exec(
    `UPDATE hole_result SET created_at = strftime('%s','now') WHERE created_at IS NULL`
  );
}

function hasColumn(table, column) {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((c) => c.name === column);
}

function ensureColumn(table, column, defn) {
  if (!hasColumn(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${defn}`);
  }
}

export function dbPath() {
  return DB_PATH;
}
