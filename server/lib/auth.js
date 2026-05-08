import { db } from '../db.js';

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';

export function isScorekeeper(req) {
  const signed = req.signedCookies?.bbh_pin;
  if (!signed) return false;
  const tournament = db.prepare('SELECT scorekeeper_pin FROM tournament WHERE id = 1').get();
  if (!tournament) return false;
  return signed === tournament.scorekeeper_pin;
}

export function requirePin(req, res, next) {
  if (!isScorekeeper(req)) {
    return res.status(401).json({ error: 'PIN required' });
  }
  next();
}

export { SESSION_SECRET };
