import { Router } from 'express';
import { db } from '../db.js';
import { requirePin } from '../lib/auth.js';
import { broadcast } from '../lib/broadcast.js';
import { getFullState, recomputeMatch } from '../lib/state.js';

const router = Router();

router.post('/:id/setup', requirePin, (req, res) => {
  const matchId = Number(req.params.id);
  const { startHole, teamAPlayerIds, teamBPlayerIds } = req.body || {};

  if (!Number.isInteger(startHole) || startHole < 1 || startHole > 9) {
    return res.status(400).json({ error: 'startHole must be 1-9' });
  }
  if (!Array.isArray(teamAPlayerIds) || !Array.isArray(teamBPlayerIds)) {
    return res.status(400).json({ error: 'team player arrays required' });
  }

  const match = db.prepare('SELECT * FROM match WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'match not found' });
  if (match.status === 'final' || match.status === 'closed') {
    return res.status(409).json({ error: 'match already complete' });
  }
  if (teamAPlayerIds.length !== match.team_a_size) {
    return res.status(400).json({ error: `need ${match.team_a_size} A players` });
  }
  if (teamBPlayerIds.length !== match.team_b_size) {
    return res.status(400).json({ error: `need ${match.team_b_size} B players` });
  }

  const teams = db.prepare('SELECT id FROM team ORDER BY id').all();
  const teamAId = teams[0]?.id;
  const teamBId = teams[1]?.id;

  const playerLookup = db.prepare('SELECT id, team_id FROM player WHERE id = ?');
  for (const pid of teamAPlayerIds) {
    const p = playerLookup.get(pid);
    if (!p || p.team_id !== teamAId) return res.status(400).json({ error: `player ${pid} not on team A` });
  }
  for (const pid of teamBPlayerIds) {
    const p = playerLookup.get(pid);
    if (!p || p.team_id !== teamBId) return res.status(400).json({ error: `player ${pid} not on team B` });
  }

  const tx = db.transaction(() => {
    db.prepare('UPDATE match SET start_hole = ? WHERE id = ?').run(startHole, matchId);
    db.prepare('DELETE FROM match_player WHERE match_id = ?').run(matchId);
    const ins = db.prepare('INSERT INTO match_player (match_id, player_id, side) VALUES (?, ?, ?)');
    for (const pid of teamAPlayerIds) ins.run(matchId, pid, 'A');
    for (const pid of teamBPlayerIds) ins.run(matchId, pid, 'B');
  });
  tx();

  broadcast('state', getFullState());
  res.json({ ok: true });
});

router.post('/:id/start', requirePin, (req, res) => {
  const matchId = Number(req.params.id);
  const match = db.prepare('SELECT * FROM match WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'match not found' });
  if (!match.start_hole) return res.status(400).json({ error: 'set start hole first' });

  const players = db.prepare('SELECT side FROM match_player WHERE match_id = ?').all(matchId);
  const aCount = players.filter((p) => p.side === 'A').length;
  const bCount = players.filter((p) => p.side === 'B').length;
  if (aCount !== match.team_a_size || bCount !== match.team_b_size) {
    return res.status(400).json({ error: 'players not assigned' });
  }

  db.prepare("UPDATE match SET status = 'in_progress' WHERE id = ?").run(matchId);
  broadcast('state', getFullState());
  res.json({ ok: true });
});

router.post('/:id/hole', requirePin, (req, res) => {
  const matchId = Number(req.params.id);
  const { holeIndex, teamAScore, teamBScore } = req.body || {};

  if (!Number.isInteger(holeIndex) || holeIndex < 0 || holeIndex > 8) {
    return res.status(400).json({ error: 'holeIndex must be 0-8' });
  }
  if (!Number.isInteger(teamAScore) || !Number.isInteger(teamBScore)) {
    return res.status(400).json({ error: 'scores required' });
  }
  if (teamAScore < 1 || teamBScore < 1) {
    return res.status(400).json({ error: 'scores must be >= 1' });
  }

  const match = db.prepare('SELECT * FROM match WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'match not found' });
  if (!match.start_hole) return res.status(400).json({ error: 'match not set up' });
  if (match.status === 'final' || match.status === 'closed') {
    return res.status(409).json({ error: 'match closed' });
  }

  const holeNumber = ((match.start_hole - 1 + holeIndex) % 9) + 1;
  const winner = teamAScore < teamBScore ? 'A' : teamAScore > teamBScore ? 'B' : 'tie';

  const existing = db
    .prepare('SELECT id FROM hole_result WHERE match_id = ? AND hole_index = ?')
    .get(matchId, holeIndex);

  if (existing) {
    db.prepare(
      `UPDATE hole_result
          SET team_a_score = ?, team_b_score = ?, winner = ?, hole_number = ?
        WHERE id = ?`
    ).run(teamAScore, teamBScore, winner, holeNumber, existing.id);
  } else {
    db.prepare(
      `INSERT INTO hole_result (match_id, hole_index, hole_number, team_a_score, team_b_score, winner)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(matchId, holeIndex, holeNumber, teamAScore, teamBScore, winner);
  }

  recomputeMatch(matchId);
  broadcast('state', getFullState());
  res.json({ ok: true });
});

router.delete('/:id/hole/:idx', requirePin, (req, res) => {
  const matchId = Number(req.params.id);
  const holeIndex = Number(req.params.idx);

  const match = db.prepare('SELECT * FROM match WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'match not found' });

  db.prepare('DELETE FROM hole_result WHERE match_id = ? AND hole_index = ?').run(
    matchId,
    holeIndex
  );

  // If undo brings match back below closure threshold, reopen it.
  const remaining = db
    .prepare('SELECT COUNT(*) AS c FROM hole_result WHERE match_id = ?')
    .get(matchId).c;

  if (remaining === 0) {
    db.prepare(
      "UPDATE match SET status = 'pending', closed_on_hole_index = NULL, result = NULL, team_a_points = 0, team_b_points = 0 WHERE id = ?"
    ).run(matchId);
  } else {
    db.prepare(
      "UPDATE match SET status = 'in_progress', closed_on_hole_index = NULL, result = NULL, team_a_points = 0, team_b_points = 0 WHERE id = ?"
    ).run(matchId);
    recomputeMatch(matchId);
  }

  broadcast('state', getFullState());
  res.json({ ok: true });
});

export default router;
