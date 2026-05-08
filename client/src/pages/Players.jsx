import { formatPoints } from '../components/TeamScore.jsx';
import { hexToRgba } from '../lib/colors.js';

export default function Players({ state }) {
  const { matches, teams } = state;
  const records = computeRecords(matches, teams);
  const [a, b] = teams;
  const aRows = sortRecords(records.filter((r) => r.teamId === a.id));
  const bRows = sortRecords(records.filter((r) => r.teamId === b.id));

  return (
    <div className="space-y-5">
      <TeamStandings team={a} rows={aRows} />
      <TeamStandings team={b} rows={bRows} />
    </div>
  );
}

function TeamStandings({ team, rows }) {
  const tint = hexToRgba(team.color, 0.08);
  return (
    <section className="card overflow-hidden">
      <div
        className="px-3 py-2 flex items-baseline justify-between border-b border-bunker/50"
        style={{ background: `linear-gradient(90deg, ${tint}, transparent 75%)` }}
      >
        <div className="flex items-baseline gap-2">
          <span
            className="font-display font-bold text-base"
            style={{ color: team.color }}
          >
            {team.name}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-ink/45 font-semibold">
            performance
          </span>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-ink/45 font-semibold">
          W · L · H · Pts
        </div>
      </div>
      <div className="divide-y divide-bunker/40">
        {rows.map((r, i) => (
          <Row key={r.id} rank={i + 1} record={r} team={team} />
        ))}
      </div>
    </section>
  );
}

function Row({ rank, record, team }) {
  const top = rank === 1 && record.matches > 0;
  return (
    <div className="px-3 py-2 grid grid-cols-[24px_1fr_auto] items-center gap-2">
      <div
        className={`text-sm tabular-nums font-semibold ${top ? '' : 'text-ink/45'}`}
        style={top ? { color: team.color } : undefined}
      >
        {rank}.
      </div>
      <div className="text-sm font-medium text-ink truncate">{record.name}</div>
      <div className="flex items-baseline gap-3 text-sm tabular-nums">
        <span className="text-ink/65">
          {record.wins}-{record.losses}-{record.halves}
        </span>
        <span className="font-display font-bold text-base" style={{ color: team.color }}>
          {formatPoints(record.points)}
        </span>
      </div>
    </div>
  );
}

function computeRecords(matches, teams) {
  const records = new Map();
  for (const team of teams) {
    for (const p of team.players) {
      records.set(p.id, {
        id: p.id,
        name: p.name,
        teamId: team.id,
        wins: 0,
        losses: 0,
        halves: 0,
        points: 0,
        matches: 0,
      });
    }
  }

  for (const m of matches) {
    if (m.status !== 'final') continue;
    const lead = m.computed?.lead ?? 0;
    const aIds = m.sideA.map((p) => p.id);
    const bIds = m.sideB.map((p) => p.id);

    const apply = (ids, outcome) => {
      for (const id of ids) {
        const r = records.get(id);
        if (!r) continue;
        r.matches += 1;
        if (outcome === 'win') {
          r.wins += 1;
          r.points += 1;
        } else if (outcome === 'loss') {
          r.losses += 1;
        } else {
          r.halves += 1;
          r.points += 0.5;
        }
      }
    };

    if (lead === 0) {
      apply(aIds, 'halve');
      apply(bIds, 'halve');
    } else if (lead > 0) {
      apply(aIds, 'win');
      apply(bIds, 'loss');
    } else {
      apply(aIds, 'loss');
      apply(bIds, 'win');
    }
  }

  return [...records.values()];
}

function sortRecords(rows) {
  return [...rows].sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.wins !== x.wins) return y.wins - x.wins;
    if (x.losses !== y.losses) return x.losses - y.losses;
    return x.name.localeCompare(y.name);
  });
}
