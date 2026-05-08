import { Router } from 'express';
import { db } from '../db.js';
import { broadcast } from '../lib/broadcast.js';
import { getFullState } from '../lib/state.js';
import { computeOdds, payoutFor } from '../lib/odds.js';

const router = Router();

const VALID_PICKS = new Set(['A', 'B', 'halve']);

function findOrCreateBettor(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  if (trimmed.length > 30) return null;
  const existing = db
    .prepare('SELECT id, name FROM bettor WHERE LOWER(name) = LOWER(?)')
    .get(trimmed);
  if (existing) return existing;
  const r = db.prepare('INSERT INTO bettor (name) VALUES (?)').run(trimmed);
  return { id: r.lastInsertRowid, name: trimmed };
}

router.post('/', (req, res) => {
  const { name, matchId, pick } = req.body || {};
  if (!Number.isInteger(matchId)) return res.status(400).json({ error: 'matchId required' });
  if (!VALID_PICKS.has(pick)) return res.status(400).json({ error: 'pick must be A, B, or halve' });

  const trimmedName = String(name || '').trim();
  if (!trimmedName || trimmedName.length > 30) {
    return res.status(400).json({ error: 'name required (max 30 chars)' });
  }

  const match = matchSnapshot(matchId);
  if (!match) return res.status(404).json({ error: 'match not found' });
  if (match.status !== 'pending') {
    return res.status(409).json({ error: 'bets locked — match has started' });
  }
  if (match.sideA.length === 0 || match.sideB.length === 0) {
    return res.status(409).json({ error: 'lineup not set yet' });
  }

  const odds = computeOdds(match, { preMatch: true });
  if (!odds) return res.status(409).json({ error: 'odds unavailable' });

  const bettor = findOrCreateBettor(trimmedName);
  if (!bettor) return res.status(400).json({ error: 'name required (max 30 chars)' });

  const existing = db
    .prepare('SELECT id FROM bet WHERE bettor_id = ? AND match_id = ?')
    .get(bettor.id, matchId);

  if (existing) {
    db.prepare(
      `UPDATE bet
          SET pick = ?, money_a = ?, money_b = ?, money_halve = ?, created_at = strftime('%s','now')
        WHERE id = ?`
    ).run(pick, odds.moneyA, odds.moneyB, odds.moneyHalve, existing.id);
  } else {
    db.prepare(
      `INSERT INTO bet (bettor_id, match_id, pick, money_a, money_b, money_halve)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(bettor.id, matchId, pick, odds.moneyA, odds.moneyB, odds.moneyHalve);
  }

  broadcast('state', getFullState());
  res.json({ ok: true, bettor });
});

router.delete('/', (req, res) => {
  const { name, matchId } = req.body || {};
  if (!Number.isInteger(matchId)) return res.status(400).json({ error: 'matchId required' });
  const trimmed = String(name || '').trim();
  if (!trimmed) return res.status(400).json({ error: 'name required' });

  const bettor = db.prepare('SELECT id FROM bettor WHERE LOWER(name) = LOWER(?)').get(trimmed);
  if (!bettor) return res.status(404).json({ error: 'bettor not found' });

  const match = db.prepare('SELECT status FROM match WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'match not found' });
  if (match.status !== 'pending') {
    return res.status(409).json({ error: 'bets locked — match has started' });
  }

  db.prepare('DELETE FROM bet WHERE bettor_id = ? AND match_id = ?').run(bettor.id, matchId);
  broadcast('state', getFullState());
  res.json({ ok: true });
});

function matchSnapshot(matchId) {
  const state = getFullState();
  return state.matches.find((m) => m.id === matchId);
}

export default router;
