import { db } from './db.js';

const TOURNAMENT_CODE = process.env.TOURNAMENT_CODE || 'BBH2026';
const SCOREKEEPER_PIN = process.env.SCOREKEEPER_PIN || '1234';

const TEAMS = [
  {
    name: 'Team Al',
    color: '#1e40af',
    players: [
      { name: 'Alex', handicap: 27 },
      { name: 'Tyler', handicap: 8 },
      { name: 'Tripp', handicap: 24 },
      { name: 'Austin', handicap: 21 },
      { name: 'Drew', handicap: 10 },
    ],
  },
  {
    name: 'Team Unc',
    color: '#b91c1c',
    players: [
      { name: 'Jake', handicap: 32 },
      { name: 'George', handicap: 13 },
      { name: 'Cam', handicap: 14 },
      { name: 'John', handicap: 8 },
      { name: 'Matt', handicap: 22 },
    ],
  },
];

// 13 matches totaling 12 points
const SESSIONS = [
  {
    name: 'Session 1',
    matches: [
      { format: 'best_ball', team_a_size: 2, team_b_size: 2, points_weight: 1 },
      { format: 'scramble', team_a_size: 3, team_b_size: 3, points_weight: 1 },
    ],
  },
  {
    name: 'Session 2',
    matches: [
      { format: 'scramble', team_a_size: 2, team_b_size: 2, points_weight: 1 },
      { format: 'best_ball', team_a_size: 2, team_b_size: 2, points_weight: 1 },
      { format: 'singles', team_a_size: 1, team_b_size: 1, points_weight: 0.5, sudden_death: 1 },
    ],
  },
  {
    name: 'Session 3',
    matches: [
      { format: 'alt_shot', team_a_size: 2, team_b_size: 2, points_weight: 1 },
      { format: 'alt_shot', team_a_size: 2, team_b_size: 2, points_weight: 1 },
      { format: 'singles', team_a_size: 1, team_b_size: 1, points_weight: 0.5, sudden_death: 1 },
    ],
  },
  {
    name: 'Session 4',
    matches: [
      { format: 'singles', team_a_size: 1, team_b_size: 1, points_weight: 1 },
      { format: 'singles', team_a_size: 1, team_b_size: 1, points_weight: 1 },
      { format: 'singles', team_a_size: 1, team_b_size: 1, points_weight: 1 },
      { format: 'singles', team_a_size: 1, team_b_size: 1, points_weight: 1 },
      { format: 'singles', team_a_size: 1, team_b_size: 1, points_weight: 1 },
    ],
  },
];

const EXPECTED_MATCH_COUNT = SESSIONS.reduce((s, x) => s + x.matches.length, 0);

export function seedIfEmpty() {
  const tournamentCount = db.prepare('SELECT COUNT(*) AS c FROM tournament').get().c;
  if (tournamentCount > 0) {
    return { seeded: false };
  }

  const insertTournament = db.prepare(
    'INSERT INTO tournament (id, name, code, scorekeeper_pin) VALUES (1, ?, ?, ?)'
  );
  const insertTeam = db.prepare('INSERT INTO team (name, color) VALUES (?, ?)');
  const insertPlayer = db.prepare(
    'INSERT INTO player (name, team_id, handicap) VALUES (?, ?, ?)'
  );
  const insertTiebreaker = db.prepare('INSERT INTO tiebreaker (id, active) VALUES (1, 0)');

  const tx = db.transaction(() => {
    insertTournament.run('BBH Ryder Cup', TOURNAMENT_CODE, SCOREKEEPER_PIN);

    for (const team of TEAMS) {
      const { lastInsertRowid: teamId } = insertTeam.run(team.name, team.color);
      for (const player of team.players) {
        insertPlayer.run(player.name, teamId, player.handicap);
      }
    }

    insertSessionsAndMatches();
    insertTiebreaker.run();
  });

  tx();
  return { seeded: true };
}

function insertSessionsAndMatches() {
  const insertSession = db.prepare(
    'INSERT INTO session (name, display_order) VALUES (?, ?)'
  );
  const insertMatch = db.prepare(
    `INSERT INTO match (session_id, format, team_a_size, team_b_size, points_weight, sudden_death, display_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  let order = 0;
  SESSIONS.forEach((session, sIdx) => {
    const { lastInsertRowid: sessionId } = insertSession.run(session.name, sIdx + 1);
    for (const m of session.matches) {
      order += 1;
      insertMatch.run(
        sessionId,
        m.format,
        m.team_a_size,
        m.team_b_size,
        m.points_weight,
        m.sudden_death ? 1 : 0,
        order
      );
    }
  });
}

export function ensureHandicapsIfUnset() {
  const anyNonZero = db
    .prepare('SELECT COUNT(*) AS c FROM player WHERE handicap != 0')
    .get().c;
  if (anyNonZero > 0) return { applied: false };

  const upd = db.prepare('UPDATE player SET handicap = ? WHERE name = ?');
  const tx = db.transaction(() => {
    for (const team of TEAMS) {
      for (const p of team.players) {
        upd.run(p.handicap, p.name);
      }
    }
  });
  tx();
  return { applied: true };
}

// Wipes all scoring, bets, bettors, tiebreaker state, and match/session
// config; re-seeds matches and sessions. Preserves tournament row, teams,
// and players (with their handicaps).
export function factoryReset() {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM hole_player_score').run();
    db.prepare('DELETE FROM hole_result').run();
    db.prepare('DELETE FROM match_player').run();
    db.prepare('DELETE FROM bet').run();
    db.prepare('DELETE FROM bettor').run();
    db.prepare('DELETE FROM tiebreaker_hole').run();
    db.prepare(
      "UPDATE tiebreaker SET active = 0, holes = NULL, team_a_total = 0, team_b_total = 0, winner = NULL WHERE id = 1"
    ).run();
    db.prepare('DELETE FROM match').run();
    db.prepare('DELETE FROM session').run();
    insertSessionsAndMatches();
  });
  tx();
}

// One-shot startup migration: fires once when the DB hasn't been upgraded
// to the new sudden_death format. After it runs, sudden_death=1 rows exist
// and it never fires again.
export function migrateToNewFormatIfNeeded() {
  const withSuddenDeath = db
    .prepare('SELECT COUNT(*) AS c FROM match WHERE sudden_death = 1')
    .get().c;
  if (withSuddenDeath > 0) return { migrated: false, reason: 'already up to date' };
  factoryReset();
  return { migrated: true };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { seeded } = seedIfEmpty();
  const hcp = ensureHandicapsIfUnset();
  const mig = migrateToNewFormatIfNeeded();
  console.log(seeded ? 'Seeded.' : 'Already seeded; no changes.');
  if (hcp.applied) console.log('Pre-filled handicaps for existing players.');
  if (mig.migrated) console.log('Wiped scoring/bets and reseeded matches.');
  else if (mig.reason) console.log(`Migration skipped: ${mig.reason}.`);
}
