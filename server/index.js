import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { db } from './db.js';
import { seedIfEmpty, ensureHandicapsIfUnset } from './seed.js';
import { SESSION_SECRET } from './lib/auth.js';
import sseRouter from './routes/sse.js';
import tournamentRouter from './routes/tournament.js';
import matchesRouter from './routes/matches.js';
import playersRouter from './routes/players.js';
import tiebreakerRouter from './routes/tiebreaker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

seedIfEmpty();
ensureHandicapsIfUnset();

const app = express();
app.use(express.json());
app.use(cookieParser(SESSION_SECRET));

const api = express.Router();
api.use('/sse', sseRouter);
api.use('/match', matchesRouter);
api.use('/player', playersRouter);
api.use('/tiebreaker', tiebreakerRouter);
api.use('/', tournamentRouter);
app.use('/api', api);

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`BBH Ryder Cup server listening on :${PORT}`);
});

process.on('SIGTERM', () => {
  try { db.close(); } catch {}
  process.exit(0);
});
