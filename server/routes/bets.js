import { Router } from 'express';
import { db } from '../db.js';
import { broadcast } from '../lib/broadcast.js';
import { getFullState } from '../lib/state.js';
import { computeOdds, payoutFor } from '../lib/odds.js';
import { requireAdmin } from '../lib/auth.js';

const router = Router();

const VALID_PICKS = new Set(['A', 'B', 'halve']);

function normalizeName(name) {
  const t = String(name || '').trim();
  if (!t) return null;
  if (t.length > 30) return null;
  return t;
}

function normalizeCode(code) {
  const t = String(code || '').trim();
  if (!t) return null;
  if (t.length < 3 || t.length > 30) return null;
  return t;
}

function findBettor(name) {
  return db
    .prepare('SELECT id, name, code FROM bettor WHERE LOWER(name) = LOWER(?)')
    .get(name);
}

// Returns { bettor, claimed, error }
//   - error: 'wrong_code' (existing bettor, code doesn't match)
//   - claimed: true means we just set the code on a previously code-less bettor
function authBettor(rawName, rawCode) {
  const name = normalizeName(rawName);
  const code = normalizeCode(rawCode);
  if (!name) return { error: 'name required (max 30 chars)' };
  if (!code) return { error: 'code required (3–30 chars)' };

  const existing = findBettor(name);
  if (existing) {
    if (!existing.code) {
      db.prepare('UPDATE bettor SET code = ? WHERE id = ?').run(code, existing.id);
      return { bettor: { ...existing, code }, claimed: true, isNew: false };
    }
    if (existing.code !== code) return { error: 'wrong_code' };
    return { bettor: existing, claimed: false, isNew: false };
  }

  const r = db.prepare('INSERT INTO bettor (name, code) VALUES (?, ?)').run(name, code);
  return {
    bettor: { id: r.lastInsertRowid, name, code },
    claimed: false,
    isNew: true,
  };
}

router.post('/auth', (req, res) => {
  const { name, code } = req.body || {};
  const r = authBettor(name, code);
  if (r.error === 'wrong_code') return res.status(401).json({ error: 'wrong code for that name' });
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ ok: true, bettor: { id: r.bettor.id, name: r.bettor.name }, isNew: r.isNew, claimed: !!r.claimed });
});

router.post('/', (req, res) => {
  const { name, code, matchId, pick } = req.body || {};
  if (!Number.isInteger(matchId)) return res.status(400).json({ error: 'matchId required' });
  if (!VALID_PICKS.has(pick)) return res.status(400).json({ error: 'pick must be A, B, or halve' });

  const auth = authBettor(name, code);
  if (auth.error === 'wrong_code') return res.status(401).json({ error: 'wrong code for that name' });
  if (auth.error) return res.status(400).json({ error: auth.error });

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

  const bettorId = auth.bettor.id;
  const existing = db
    .prepare('SELECT id FROM bet WHERE bettor_id = ? AND match_id = ?')
    .get(bettorId, matchId);

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
    ).run(bettorId, matchId, pick, odds.moneyA, odds.moneyB, odds.moneyHalve);
  }

  broadcast('state', getFullState());
  res.json({ ok: true });
});

router.delete('/', (req, res) => {
  const { name, code, matchId } = req.body || {};
  if (!Number.isInteger(matchId)) return res.status(400).json({ error: 'matchId required' });

  const auth = authBettor(name, code);
  if (auth.error === 'wrong_code') return res.status(401).json({ error: 'wrong code for that name' });
  if (auth.error) return res.status(400).json({ error: auth.error });

  const match = db.prepare('SELECT status FROM match WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'match not found' });
  if (match.status !== 'pending') {
    return res.status(409).json({ error: 'bets locked — match has started' });
  }

  db.prepare('DELETE FROM bet WHERE bettor_id = ? AND match_id = ?').run(
    auth.bettor.id,
    matchId
  );
  broadcast('state', getFullState());
  res.json({ ok: true });
});

router.delete('/bettor/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid bettor id' });
  }
  const existing = db.prepare('SELECT id, name FROM bettor WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'bettor not found' });

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM bet WHERE bettor_id = ?').run(id);
    db.prepare('DELETE FROM bettor WHERE id = ?').run(id);
  });
  tx();

  broadcast('state', getFullState());
  res.json({ ok: true, deleted: existing.name });
});

function matchSnapshot(matchId) {
  const state = getFullState();
  return state.matches.find((m) => m.id === matchId);
}

export default router;
