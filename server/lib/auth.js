import { db } from '../db.js';

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const ADMIN_PIN = process.env.ADMIN_PIN || '2222';

export function isScorekeeper(req) {
  const signed = req.signedCookies?.bbh_pin;
  if (!signed) return false;
  const tournament = db.prepare('SELECT scorekeeper_pin FROM tournament WHERE id = 1').get();
  if (!tournament) return false;
  return signed === tournament.scorekeeper_pin;
}

export function isAdmin(req) {
  const signed = req.signedCookies?.bbh_admin;
  if (!signed) return false;
  return ADMIN_PIN && signed === ADMIN_PIN;
}

export function requirePin(req, res, next) {
  if (!isScorekeeper(req)) {
    return res.status(401).json({ error: 'PIN required' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'admin PIN required' });
  }
  next();
}

export { SESSION_SECRET, ADMIN_PIN };
