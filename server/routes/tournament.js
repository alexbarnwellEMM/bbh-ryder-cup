import { Router } from 'express';
import { db } from '../db.js';
import { getFullState } from '../lib/state.js';
import { isScorekeeper, isAdmin, ADMIN_PIN } from '../lib/auth.js';

const router = Router();

router.get('/state', (req, res) => {
  res.json(getFullState());
});

router.post('/auth/scorekeeper', (req, res) => {
  const { pin } = req.body || {};
  if (!pin) return res.status(400).json({ error: 'pin required' });

  const tournament = db.prepare('SELECT scorekeeper_pin FROM tournament WHERE id = 1').get();
  if (!tournament) return res.status(500).json({ error: 'tournament not initialized' });

  const matchedScorekeeper = pin === tournament.scorekeeper_pin;
  const matchedAdmin = ADMIN_PIN && pin === ADMIN_PIN;
  if (!matchedScorekeeper && !matchedAdmin) {
    return res.status(401).json({ error: 'invalid pin' });
  }

  // Admin PIN also grants scorekeeper.
  res.cookie('bbh_pin', tournament.scorekeeper_pin, {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 12,
  });
  if (matchedAdmin) {
    res.cookie('bbh_admin', ADMIN_PIN, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 12,
    });
  }
  res.json({ ok: true, isAdmin: !!matchedAdmin });
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('bbh_pin');
  res.clearCookie('bbh_admin');
  res.json({ ok: true });
});

router.post('/auth/join', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code required' });

  const tournament = db.prepare('SELECT code FROM tournament WHERE id = 1').get();
  if (!tournament) return res.status(500).json({ error: 'tournament not initialized' });

  if (code.toUpperCase() !== tournament.code.toUpperCase()) {
    return res.status(401).json({ error: 'invalid code' });
  }
  res.json({ ok: true });
});

router.get('/auth/me', (req, res) => {
  res.json({
    isScorekeeper: isScorekeeper(req),
    isAdmin: isAdmin(req),
  });
});

router.get('/export', (req, res) => {
  const matches = db
    .prepare(
      `SELECT m.id, s.name AS session_name, m.format, m.start_hole, m.status, m.result,
              m.team_a_points, m.team_b_points
         FROM match m JOIN session s ON s.id = m.session_id
        ORDER BY m.display_order`
    )
    .all();

  const holes = db
    .prepare(
      `SELECT h.match_id, h.hole_index, h.hole_number, h.team_a_score, h.team_b_score, h.winner
         FROM hole_result h ORDER BY h.match_id, h.hole_index`
    )
    .all();

  const lines = [];
  lines.push('# Matches');
  lines.push(
    'match_id,session,format,start_hole,status,result,team_a_points,team_b_points'
  );
  for (const m of matches) {
    lines.push(
      [
        m.id,
        csv(m.session_name),
        m.format,
        m.start_hole ?? '',
        m.status,
        csv(m.result ?? ''),
        m.team_a_points,
        m.team_b_points,
      ].join(',')
    );
  }
  lines.push('');
  lines.push('# Holes');
  lines.push('match_id,hole_index,hole_number,team_a_score,team_b_score,winner');
  for (const h of holes) {
    lines.push(
      [
        h.match_id,
        h.hole_index,
        h.hole_number,
        h.team_a_score ?? '',
        h.team_b_score ?? '',
        h.winner ?? '',
      ].join(',')
    );
  }

  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename="bbh-ryder-cup.csv"');
  res.send(lines.join('\n'));
});

function csv(s) {
  if (s == null) return '';
  const v = String(s);
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export default router;
