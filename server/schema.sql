CREATE TABLE IF NOT EXISTS tournament (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  scorekeeper_pin TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS player (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  team_id INTEGER NOT NULL REFERENCES team(id),
  handicap REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS session (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS match (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES session(id),
  format TEXT NOT NULL,
  team_a_size INTEGER NOT NULL,
  team_b_size INTEGER NOT NULL,
  start_hole INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  closed_on_hole_index INTEGER,
  result TEXT,
  team_a_points REAL DEFAULT 0,
  team_b_points REAL DEFAULT 0,
  display_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS match_player (
  match_id INTEGER NOT NULL REFERENCES match(id),
  player_id INTEGER NOT NULL REFERENCES player(id),
  side TEXT NOT NULL,
  PRIMARY KEY (match_id, player_id)
);

CREATE TABLE IF NOT EXISTS hole_result (
  id INTEGER PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES match(id),
  hole_index INTEGER NOT NULL,
  hole_number INTEGER NOT NULL,
  team_a_score INTEGER,
  team_b_score INTEGER,
  winner TEXT,
  UNIQUE(match_id, hole_index)
);

CREATE TABLE IF NOT EXISTS tiebreaker (
  id INTEGER PRIMARY KEY,
  active INTEGER DEFAULT 0,
  holes TEXT,
  team_a_total INTEGER,
  team_b_total INTEGER,
  winner TEXT
);

CREATE TABLE IF NOT EXISTS tiebreaker_hole (
  id INTEGER PRIMARY KEY,
  hole_number INTEGER NOT NULL,
  team_a_score INTEGER,
  team_b_score INTEGER
);
