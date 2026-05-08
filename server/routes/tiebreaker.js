import { Router } from 'express';
import { db } from '../db.js';
import { requirePin } from '../lib/auth.js';
import { broadcast } from '../lib/broadcast.js';
import { getFullState, recomputeTiebreaker } from '../lib/state.js';

const router = Router();

router.post('/start', requirePin, (req, res) => {
  const { holes } = req.body || {};
  if (!Array.isArray(holes) || holes.length !== 3) {
    return res.status(400).json({ error: '3 holes required' });
  }
  if (!holes.every((h) => Number.isInteger(h) && h >= 1 && h <= 9)) {
    return res.status(400).json({ error: 'holes must be 1-9 ints' });
  }

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM tiebreaker_hole').run();
    db.prepare(
      "UPDATE tiebreaker SET active = 1, holes = ?, team_a_total = 0, team_b_total = 0, winner = NULL WHERE id = 1"
    ).run(JSON.stringify(holes));
    const ins = db.prepare(
      'INSERT INTO tiebreaker_hole (hole_number, team_a_score, team_b_score) VALUES (?, NULL, NULL)'
    );
    for (const h of holes) ins.run(h);
  });
  tx();

  recomputeTiebreaker();
  broadcast('state', getFullState());
  res.json({ ok: true });
});

router.post('/score', requirePin, (req, res) => {
  const { holeNumber, teamAScore, teamBScore } = req.body || {};
  if (!Number.isInteger(holeNumber)) {
    return res.status(400).json({ error: 'holeNumber required' });
  }
  if (!Number.isInteger(teamAScore) || !Number.isInteger(teamBScore)) {
    return res.status(400).json({ error: 'scores required' });
  }

  const tb = db.prepare('SELECT active FROM tiebreaker WHERE id = 1').get();
  if (!tb || !tb.active) return res.status(409).json({ error: 'tiebreaker not active' });

  const row = db
    .prepare('SELECT id FROM tiebreaker_hole WHERE hole_number = ? ORDER BY id LIMIT 1')
    .get(holeNumber);
  if (!row) return res.status(404).json({ error: 'hole not part of tiebreaker' });

  db.prepare(
    'UPDATE tiebreaker_hole SET team_a_score = ?, team_b_score = ? WHERE id = ?'
  ).run(teamAScore, teamBScore, row.id);

  recomputeTiebreaker();
  broadcast('state', getFullState());
  res.json({ ok: true });
});

export default router;
