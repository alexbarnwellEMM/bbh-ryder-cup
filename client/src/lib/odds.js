export function computeOdds(match) {
  const c = match.computed;
  if (!c) return null;
  if (match.status !== 'in_progress') return null;
  if (c.isClosed) return null;

  const remaining = c.remaining;
  if (remaining <= 0) return null;

  const recent = [...(match.holes || [])]
    .sort((a, b) => b.holeIndex - a.holeIndex)
    .slice(0, 3);
  let momentum = 0;
  for (const h of recent) {
    if (h.winner === 'A') momentum += 1;
    else if (h.winner === 'B') momentum -= 1;
  }

  const pTie =
    match.format === 'alt_shot'
      ? 0.22
      : match.format === 'best_ball'
        ? 0.16
        : match.format === 'scramble'
          ? 0.18
          : 0.2;

  const aFraction = clamp(0.5 + 0.085 * momentum, 0.25, 0.75);
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

  let pAWin = 0;
  let pBWin = 0;
  let pHalve = 0;
  for (const [delta, prob] of dist) {
    const final = c.lead + delta;
    if (final > 0) pAWin += prob;
    else if (final < 0) pBWin += prob;
    else pHalve += prob;
  }

  return {
    pAWin,
    pBWin,
    pHalve,
    moneyA: toMoneyline(pAWin),
    moneyB: toMoneyline(pBWin),
    moneyHalve: toMoneyline(pHalve),
    momentum,
  };
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

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
