import { Router } from 'express';
import { db } from '../db.js';
import { requirePin } from '../lib/auth.js';
import { broadcast } from '../lib/broadcast.js';
import { getFullState } from '../lib/state.js';

const router = Router();

router.patch('/:id/handicap', requirePin, (req, res) => {
  const id = Number(req.params.id);
  const { handicap } = req.body || {};
  if (!Number.isFinite(handicap)) {
    return res.status(400).json({ error: 'handicap must be a number' });
  }
  if (handicap < -10 || handicap > 54) {
    return res.status(400).json({ error: 'handicap out of range' });
  }
  const result = db.prepare('UPDATE player SET handicap = ? WHERE id = ?').run(handicap, id);
  if (result.changes === 0) return res.status(404).json({ error: 'player not found' });
  broadcast('state', getFullState());
  res.json({ ok: true });
});

export default router;
