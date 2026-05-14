export function computeOdds(match, { preMatch = false } = {}) {
  if (!match) return null;
  if (!match.sideA?.length || !match.sideB?.length) return null;

  const c = match.computed;

  let lead;
  let remaining;
  let momentum;

  if (preMatch) {
    lead = 0;
    remaining = 9;
    momentum = 0;
  } else {
    if (!c) return null;
    if (match.status !== 'in_progress') return null;
    if (c.isClosed) return null;
    if (c.remaining <= 0) return null;
    lead = c.lead;
    remaining = c.remaining;
    momentum = recentMomentum(match);
  }

  const pTie =
    match.format === 'alt_shot'
      ? 0.22
      : match.format === 'best_ball'
        ? 0.16
        : match.format === 'scramble'
          ? 0.18
          : 0.2;

  const hcpA = effectiveHandicap(match.format, match.sideA);
  const hcpB = effectiveHandicap(match.format, match.sideB);
  const hcpDiff = hcpB - hcpA; // positive favors A

  const aFraction = clamp(
    0.5 + 0.05 * momentum + 0.022 * hcpDiff,
    0.22,
    0.78
  );
  const pA = aFraction * (1 - pTie);
  const pB = (1 - aFraction) * (1 - pTie);

  let dist = new Map();
  dist.set(0, 1);
  for (let k = 0; k < remaining; k++) {
    const next = new Map();
    for (const [delta, prob] of dist) {
      add(next, delta + 1, prob * pA);
      add(next, delta - 1, prob * pB);
      add(next, delta, prob * pTie);
    }
    dist = next;
  }

  let pAWinRaw = 0;
  let pBWinRaw = 0;
  let pHalveRaw = 0;
  for (const [delta, prob] of dist) {
    const final = lead + delta;
    if (final > 0) pAWinRaw += prob;
    else if (final < 0) pBWinRaw += prob;
    else pHalveRaw += prob;
  }

  // Shrink toward neutral so displayed odds reflect golf's real volatility.
  const SHRINK = 0.6;
  const NEUTRAL_A = 0.4;
  const NEUTRAL_B = 0.4;
  const NEUTRAL_H = 0.2;
  const pAWin = SHRINK * pAWinRaw + (1 - SHRINK) * NEUTRAL_A;
  const pBWin = SHRINK * pBWinRaw + (1 - SHRINK) * NEUTRAL_B;
  const pHalve = SHRINK * pHalveRaw + (1 - SHRINK) * NEUTRAL_H;

  return {
    pAWin,
    pBWin,
    pHalve,
    moneyA: toMoneyline(pAWin),
    moneyB: toMoneyline(pBWin),
    moneyHalve: toMoneyline(pHalve),
    momentum,
    hcpA,
    hcpB,
    hcpDiff,
    isPreMatch: preMatch,
  };
}

function recentMomentum(match) {
  const recent = [...(match.holes || [])]
    .sort((a, b) => b.holeIndex - a.holeIndex)
    .slice(0, 3);
  let m = 0;
  for (const h of recent) {
    if (h.winner === 'A') m += 1;
    else if (h.winner === 'B') m -= 1;
  }
  return m;
}

function effectiveHandicap(format, players) {
  if (!players || players.length === 0) return 0;
  const hcps = players.map((p) => Number(p.handicap) || 0);
  const sum = hcps.reduce((s, x) => s + x, 0);
  const avg = sum / hcps.length;
  const min = Math.min(...hcps);
  switch (format) {
    case 'best_ball':
      return min;
    case 'scramble':
      return 0.85 * min + 0.15 * avg;
    case 'alt_shot':
      return avg;
    case 'singles':
    default:
      return avg;
  }
}

function add(map, key, value) {
  map.set(key, (map.get(key) || 0) + value);
}

function toMoneyline(p) {
  if (!Number.isFinite(p)) return null;
  if (p <= 0.001) return null;
  if (p >= 0.999) return null;
  if (p > 0.5) return -Math.round((p / (1 - p)) * 100);
  return Math.round(((1 - p) / p) * 100);
}

export function formatMoneyline(m) {
  if (m == null) return '—';
  return m > 0 ? `+${m}` : `${m}`;
}

// Probability that each team takes the cup outright + the tiebreaker chance.
// Models remaining matches as a random walk over the points differential
// (A points − B points). Halves don't move the diff (both teams gain ½ × weight).
// At the end, diff > 0 → A wins, diff < 0 → B wins, diff === 0 → tiebreaker.
// The 5v5 alt-shot tiebreaker is treated as 50/50 with no model.
export function computeCupOdds(state) {
  if (!state || !Array.isArray(state.matches)) return null;
  const { totals, matches } = state;

  // Work in half-point units so weights are integers (1 → 2, 0.5 → 1).
  const startDiff = Math.round(((totals?.a || 0) - (totals?.b || 0)) * 2);
  let dist = new Map();
  dist.set(startDiff, 1);

  for (const match of matches) {
    if (match.status === 'final') continue;

    const w = Math.round((match.pointsWeight || 1) * 2);

    let pA;
    let pB;
    let pH;

    if (!match.sideA?.length || !match.sideB?.length) {
      // Lineup not set yet → neutral guess.
      pA = 0.4;
      pB = 0.4;
      pH = 0.2;
    } else {
      let odds = null;
      if (match.status === 'in_progress') {
        odds = computeOdds(match);
      }
      if (!odds && match.suddenDeath && match.computed?.inOvertime) {
        // In OT — eventually decisive, ~50/50 split, no halves.
        pA = 0.5;
        pB = 0.5;
        pH = 0;
      } else if (!odds) {
        odds = computeOdds(match, { preMatch: true });
        if (odds) {
          pA = odds.pAWin;
          pB = odds.pBWin;
          pH = odds.pHalve;
        } else {
          pA = 0.4;
          pB = 0.4;
          pH = 0.2;
        }
      } else {
        pA = odds.pAWin;
        pB = odds.pBWin;
        pH = odds.pHalve;
        // Sudden-death matches don't halve in reality.
        if (match.suddenDeath) {
          const decisive = pA + pB;
          if (decisive > 0) {
            pA = pA / decisive;
            pB = pB / decisive;
            pH = 0;
          }
        }
      }
    }

    const next = new Map();
    for (const [diff, prob] of dist) {
      add(next, diff + w, prob * pA);
      add(next, diff - w, prob * pB);
      add(next, diff, prob * pH);
    }
    dist = next;
  }

  let pAOutright = 0;
  let pBOutright = 0;
  let pTie = 0;
  for (const [diff, prob] of dist) {
    if (diff > 0) pAOutright += prob;
    else if (diff < 0) pBOutright += prob;
    else pTie += prob;
  }

  const pAWin = pAOutright + 0.5 * pTie;
  const pBWin = pBOutright + 0.5 * pTie;

  return {
    pAWin,
    pBWin,
    pTiebreaker: pTie,
    moneyA: toMoneyline(pAWin),
    moneyB: toMoneyline(pBWin),
  };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
