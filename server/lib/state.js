import { db } from '../db.js';
import { computeMatch, pointsFor } from './matchPlay.js';
import { holeOrderFromStart, SWEETENS_COVE } from './course.js';

export function recomputeMatch(matchId) {
  const match = db.prepare('SELECT * FROM match WHERE id = ?').get(matchId);
  if (!match) return null;

  const holes = db
    .prepare('SELECT * FROM hole_result WHERE match_id = ? ORDER BY hole_index')
    .all(matchId);

  const computed = computeMatch(holes);
  const pts = pointsFor(computed);

  let status = match.status;
  if (status === 'pending' && holes.length > 0) status = 'in_progress';
  if (computed.final) status = 'final';
  else if (computed.isClosed) status = 'closed';

  db.prepare(
    `UPDATE match
       SET status = ?,
           closed_on_hole_index = ?,
           result = ?,
           team_a_points = ?,
           team_b_points = ?
     WHERE id = ?`
  ).run(
    status,
    computed.closedAtIndex,
    computed.result,
    pts.a,
    pts.b,
    matchId
  );

  return { match: { ...match, status }, computed, points: pts };
}

export function recomputeTiebreaker() {
  const tb = db.prepare('SELECT * FROM tiebreaker WHERE id = 1').get();
  if (!tb || !tb.active) return tb;

  const holes = db
    .prepare('SELECT * FROM tiebreaker_hole ORDER BY id')
    .all();

  const totalA = holes.reduce(
    (s, h) => s + (h.team_a_score != null ? h.team_a_score : 0),
    0
  );
  const totalB = holes.reduce(
    (s, h) => s + (h.team_b_score != null ? h.team_b_score : 0),
    0
  );

  const allScored =
    holes.length === 3 && holes.every((h) => h.team_a_score != null && h.team_b_score != null);

  let winner = null;
  if (allScored) {
    if (totalA < totalB) winner = 'A';
    else if (totalB < totalA) winner = 'B';
    else winner = 'tie';
  }

  db.prepare(
    'UPDATE tiebreaker SET team_a_total = ?, team_b_total = ?, winner = ? WHERE id = 1'
  ).run(totalA, totalB, winner);

  return { ...tb, team_a_total: totalA, team_b_total: totalB, winner };
}

export function getFullState() {
  const tournament = db.prepare('SELECT id, name FROM tournament WHERE id = 1').get() || {
    id: 1,
    name: 'BBH Ryder Cup',
  };

  const teamsRaw = db.prepare('SELECT * FROM team ORDER BY id').all();
  const playersByTeam = db.prepare('SELECT * FROM player WHERE team_id = ? ORDER BY id');

  const matches = db
    .prepare('SELECT * FROM match ORDER BY display_order')
    .all();

  const matchPlayers = db.prepare(
    `SELECT mp.match_id, mp.side, p.id, p.name, p.team_id, p.handicap
       FROM match_player mp
       JOIN player p ON p.id = mp.player_id
      WHERE mp.match_id = ?`
  );

  const matchHoles = db.prepare(
    'SELECT * FROM hole_result WHERE match_id = ? ORDER BY hole_index'
  );

  const playerScoresStmt = db.prepare(
    'SELECT player_id, score FROM hole_player_score WHERE hole_result_id = ?'
  );

  const matchOut = matches.map((m) => {
    const players = matchPlayers.all(m.id);
    const toPlayer = (p) => ({
      id: p.id,
      name: p.name,
      teamId: p.team_id,
      handicap: p.handicap ?? 0,
    });
    const sideA = players.filter((p) => p.side === 'A').map(toPlayer);
    const sideB = players.filter((p) => p.side === 'B').map(toPlayer);
    const holes = matchHoles.all(m.id);
    const computed = computeMatch(holes);
    const holePlayOrder = m.start_hole ? holeOrderFromStart(m.start_hole) : null;
    return {
      id: m.id,
      sessionId: m.session_id,
      format: m.format,
      teamASize: m.team_a_size,
      teamBSize: m.team_b_size,
      startHole: m.start_hole,
      status: m.status,
      closedOnHoleIndex: m.closed_on_hole_index,
      result: m.result,
      teamAPoints: m.team_a_points,
      teamBPoints: m.team_b_points,
      displayOrder: m.display_order,
      sideA,
      sideB,
      holes: holes.map((h) => {
        const ps = {};
        for (const row of playerScoresStmt.all(h.id)) {
          ps[row.player_id] = row.score;
        }
        return {
          id: h.id,
          holeIndex: h.hole_index,
          holeNumber: h.hole_number,
          teamAScore: h.team_a_score,
          teamBScore: h.team_b_score,
          winner: h.winner,
          playerScores: ps,
        };
      }),
      holePlayOrder,
      computed,
    };
  });

  const sessionsRaw = db.prepare('SELECT * FROM session ORDER BY display_order').all();
  const sessions = sessionsRaw.map((s) => ({
    id: s.id,
    name: s.name,
    displayOrder: s.display_order,
    matches: matchOut.filter((m) => m.sessionId === s.id),
  }));

  const teams = teamsRaw.map((t, i) => {
    const side = i === 0 ? 'A' : 'B';
    const totalPoints = matchOut.reduce(
      (sum, m) => sum + (side === 'A' ? m.teamAPoints : m.teamBPoints),
      0
    );
    return {
      id: t.id,
      name: t.name,
      color: t.color,
      side,
      players: playersByTeam.all(t.id).map((p) => ({
        id: p.id,
        name: p.name,
        teamId: p.team_id,
        handicap: p.handicap ?? 0,
      })),
      totalPoints,
    };
  });

  const allMatchesFinal =
    matchOut.length > 0 && matchOut.every((m) => m.status === 'final');

  const tbRow = db.prepare('SELECT * FROM tiebreaker WHERE id = 1').get();
  const tbHoles = db.prepare('SELECT * FROM tiebreaker_hole ORDER BY id').all();
  const tiebreaker = tbRow
    ? {
        active: !!tbRow.active,
        holes: tbRow.holes ? JSON.parse(tbRow.holes) : [],
        scores: tbHoles.map((h) => ({
          id: h.id,
          holeNumber: h.hole_number,
          teamAScore: h.team_a_score,
          teamBScore: h.team_b_score,
        })),
        teamATotal: tbRow.team_a_total,
        teamBTotal: tbRow.team_b_total,
        winner: tbRow.winner,
      }
    : null;

  const totals = {
    a: teams[0]?.totalPoints || 0,
    b: teams[1]?.totalPoints || 0,
  };

  const tieAfterAll = allMatchesFinal && totals.a === 6 && totals.b === 6;

  let tournamentFinal = false;
  if (allMatchesFinal) {
    if (!tieAfterAll) tournamentFinal = true;
    else if (tiebreaker?.winner && tiebreaker.winner !== 'tie') tournamentFinal = true;
  }

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
    },
    teams,
    sessions,
    matches: matchOut,
    tiebreaker,
    totals,
    allMatchesFinal,
    tieAfterAll,
    tournamentFinal,
    course: SWEETENS_COVE,
  };
}
