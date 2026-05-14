export function computeMatch(holeResults, { suddenDeath = false } = {}) {
  const sorted = [...holeResults].sort((a, b) => a.hole_index - b.hole_index);

  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  let isClosed = false;
  let closedAtIndex = null;
  let result = null;

  for (const h of sorted) {
    if (isClosed) break;
    const idx = h.hole_index;

    if (h.winner === 'A') aWins++;
    else if (h.winner === 'B') bWins++;
    else if (h.winner === 'tie') ties++;

    const played = aWins + bWins + ties;
    const lead = aWins - bWins;
    const absLead = Math.abs(lead);

    if (idx < 9) {
      // Regulation: close if lead exceeds remaining regulation holes.
      const remaining = 9 - played;
      if (absLead > remaining) {
        isClosed = true;
        closedAtIndex = idx;
        result = `${absLead}&${remaining}`;
      } else if (idx === 8) {
        // Hole 9 played. Decide whether to halve or continue.
        if (absLead === 0) {
          // Tied through 9.
          if (!suddenDeath) {
            // Match ends halved.
            isClosed = true;
            closedAtIndex = idx;
            result = 'AS';
          }
          // sudden death: stay open, await OT holes.
        } else {
          // Winner via final hole — close.
          isClosed = true;
          closedAtIndex = idx;
          result = `${absLead}UP`;
        }
      }
    } else {
      // Overtime (only valid for sudden_death). First decisive hole closes.
      if (h.winner === 'A' || h.winner === 'B') {
        isClosed = true;
        closedAtIndex = idx;
        result = `OT ${idx - 8}`;
      }
    }
  }

  const holesPlayed = aWins + bWins + ties;
  const lead = aWins - bWins;
  const absLead = Math.abs(lead);
  const regulationRemaining = Math.max(0, 9 - Math.min(holesPlayed, 9));

  let status;
  if (isClosed) {
    status = result;
  } else if (holesPlayed === 0) {
    status = 'AS';
  } else if (holesPlayed >= 9 && suddenDeath && lead === 0) {
    status = `AS · OT ${holesPlayed - 8}`;
  } else if (lead === 0) {
    status = 'AS';
  } else if (absLead === regulationRemaining && regulationRemaining > 0) {
    status = `DORMIE ${lead > 0 ? 'A' : 'B'}`;
  } else {
    status = `${lead > 0 ? 'A' : 'B'} ${absLead} UP`;
  }

  // For computed.remaining we keep the regulation-style notion: how many
  // holes can still swing the match in regulation. After hole 9, it's 0.
  const remaining = regulationRemaining;
  const final = isClosed;

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
    inOvertime: !final && holesPlayed >= 9 && suddenDeath,
  };
}

export function pointsFor(computed, weight = 1) {
  if (!computed.final) return { a: 0, b: 0 };
  if (computed.lead > 0) return { a: weight, b: 0 };
  if (computed.lead < 0) return { a: 0, b: weight };
  return { a: weight / 2, b: weight / 2 };
}
