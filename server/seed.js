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

const SESSIONS = [
  {
    name: 'Session 1',
    matches: [
      { format: 'best_ball', team_a_size: 2, team_b_size: 2 },
      { format: 'scramble', team_a_size: 3, team_b_size: 3 },
    ],
  },
  {
    name: 'Session 2',
    matches: [
      { format: 'best_ball', team_a_size: 2, team_b_size: 2 },
      { format: 'alt_shot', team_a_size: 2, team_b_size: 2 },
      { format: 'singles', team_a_size: 1, team_b_size: 1 },
    ],
  },
  {
    name: 'Session 3',
    matches: [
      { format: 'alt_shot', team_a_size: 2, team_b_size: 2 },
      { format: 'alt_shot', team_a_size: 3, team_b_size: 3 },
    ],
  },
  {
    name: 'Session 4',
    matches: [
      { format: 'singles', team_a_size: 1, team_b_size: 1 },
      { format: 'singles', team_a_size: 1, team_b_size: 1 },
      { format: 'singles', team_a_size: 1, team_b_size: 1 },
      { format: 'singles', team_a_size: 1, team_b_size: 1 },
      { format: 'singles', team_a_size: 1, team_b_size: 1 },
    ],
  },
];

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
  const insertSession = db.prepare('INSERT INTO session (name, display_order) VALUES (?, ?)');
  const insertMatch = db.prepare(
    'INSERT INTO match (session_id, format, team_a_size, team_b_size, display_order) VALUES (?, ?, ?, ?, ?)'
  );
  const insertTiebreaker = db.prepare(
    'INSERT INTO tiebreaker (id, active) VALUES (1, 0)'
  );

  const tx = db.transaction(() => {
    insertTournament.run('BBH Ryder Cup', TOURNAMENT_CODE, SCOREKEEPER_PIN);

    for (const team of TEAMS) {
      const { lastInsertRowid: teamId } = insertTeam.run(team.name, team.color);
      for (const player of team.players) {
        insertPlayer.run(player.name, teamId, player.handicap);
      }
    }

    let matchOrder = 0;
    SESSIONS.forEach((session, sIdx) => {
      const { lastInsertRowid: sessionId } = insertSession.run(session.name, sIdx + 1);
      session.matches.forEach((m) => {
        matchOrder += 1;
        insertMatch.run(sessionId, m.format, m.team_a_size, m.team_b_size, matchOrder);
      });
    });

    insertTiebreaker.run();
  });

  tx();
  return { seeded: true };
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const { seeded } = seedIfEmpty();
  const hcp = ensureHandicapsIfUnset();
  console.log(seeded ? 'Seeded.' : 'Already seeded; no changes.');
  if (hcp.applied) console.log('Pre-filled handicaps for existing players.');
}
