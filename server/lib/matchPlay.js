export function computeMatch(holeResults) {
  const sorted = [...holeResults].sort((a, b) => a.hole_index - b.hole_index);

  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  let isClosed = false;
  let closedAtIndex = null;
  let result = null;

  for (const h of sorted) {
    if (isClosed) break;
    if (h.winner === 'A') aWins++;
    else if (h.winner === 'B') bWins++;
    else if (h.winner === 'tie') ties++;

    const played = aWins + bWins + ties;
    const lead = aWins - bWins;
    const absLead = Math.abs(lead);
    const remaining = 9 - played;

    if (absLead > remaining) {
      isClosed = true;
      closedAtIndex = h.hole_index;
      result = `${absLead}&${remaining}`;
    }
  }

  const holesPlayed = aWins + bWins + ties;
  const lead = aWins - bWins;
  const absLead = Math.abs(lead);
  const remaining = 9 - holesPlayed;

  let status;
  if (isClosed) {
    status = result;
  } else if (holesPlayed === 9) {
    if (lead === 0) {
      status = 'AS';
      result = 'AS';
    } else {
      status = `${lead > 0 ? 'A' : 'B'} ${absLead}UP`;
      result = `${absLead}UP`;
    }
  } else if (holesPlayed === 0) {
    status = 'AS';
  } else if (lead === 0) {
    status = 'AS';
  } else if (absLead === remaining) {
    status = `DORMIE ${lead > 0 ? 'A' : 'B'}`;
  } else {
    status = `${lead > 0 ? 'A' : 'B'} ${absLead} UP`;
  }

  const final = isClosed || holesPlayed === 9;

  return {
    holesPlayed,
    aWins,
    bWins,
    ties,
    lead,
    remaining,
    status,
    isClosed,
    closedAtIndex,
    result,
    final,
  };
}

export function pointsFor(computed) {
  if (!computed.final) return { a: 0, b: 0 };
  if (computed.lead > 0) return { a: 1, b: 0 };
  if (computed.lead < 0) return { a: 0, b: 1 };
  return { a: 0.5, b: 0.5 };
}
