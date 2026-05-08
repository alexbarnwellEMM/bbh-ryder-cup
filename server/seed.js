import { db } from './db.js';

const TOURNAMENT_CODE = process.env.TOURNAMENT_CODE || 'BBH2026';
const SCOREKEEPER_PIN = process.env.SCOREKEEPER_PIN || '1234';

const TEAMS = [
  { name: 'Team Al', color: '#1e40af', players: ['Alex', 'Tyler', 'Tripp', 'Austin', 'Drew'] },
  { name: 'Team Unc', color: '#b91c1c', players: ['Jake', 'George', 'Cam', 'John', 'Matt'] },
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
  const insertPlayer = db.prepare('INSERT INTO player (name, team_id) VALUES (?, ?)');
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
      for (const playerName of team.players) {
        insertPlayer.run(playerName, teamId);
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const { seeded } = seedIfEmpty();
  console.log(seeded ? 'Seeded.' : 'Already seeded; no changes.');
}
