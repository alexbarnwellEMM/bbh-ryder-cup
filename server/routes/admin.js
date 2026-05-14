import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { factoryReset } from '../seed.js';
import { broadcast } from '../lib/broadcast.js';
import { getFullState } from '../lib/state.js';

const router = Router();

router.post('/factory-reset', requireAdmin, (req, res) => {
  factoryReset();
  broadcast('state', getFullState());
  res.json({ ok: true });
});

export default router;
