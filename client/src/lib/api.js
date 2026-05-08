async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  state: () => request('GET', '/state'),
  authPin: (pin) => request('POST', '/auth/scorekeeper', { pin }),
  authJoin: (code) => request('POST', '/auth/join', { code }),
  authMe: () => request('GET', '/auth/me'),
  logout: () => request('POST', '/auth/logout'),

  setupMatch: (id, body) => request('POST', `/match/${id}/setup`, body),
  startMatch: (id) => request('POST', `/match/${id}/start`),
  scoreHole: (id, body) => request('POST', `/match/${id}/hole`, body),
  undoHole: (id, idx) => request('DELETE', `/match/${id}/hole/${idx}`),

  startTiebreaker: (holes) => request('POST', '/tiebreaker/start', { holes }),
  scoreTiebreaker: (body) => request('POST', '/tiebreaker/score', body),

  setHandicap: (playerId, handicap) =>
    request('PATCH', `/player/${playerId}/handicap`, { handicap }),

  authBettor: (name, code) => request('POST', '/bet/auth', { name, code }),
  placeBet: (name, code, matchId, pick) =>
    request('POST', '/bet', { name, code, matchId, pick }),
  cancelBet: (name, code, matchId) =>
    request('DELETE', '/bet', { name, code, matchId }),
};

export const COURSE_PARS = [5, 4, 5, 3, 4, 4, 4, 4, 3];
export function parFor(holeNumber) {
  return COURSE_PARS[holeNumber - 1];
}
