import { Router } from 'express';
import { addClient, removeClient } from '../lib/broadcast.js';
import { getFullState } from '../lib/state.js';

const router = Router();

router.get('/', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  addClient(res);

  res.write(`event: state\ndata: ${JSON.stringify(getFullState())}\n\n`);

  const hb = setInterval(() => {
    try {
      res.write(': hb\n\n');
    } catch {
      clearInterval(hb);
      removeClient(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(hb);
    removeClient(res);
  });
});

export default router;
