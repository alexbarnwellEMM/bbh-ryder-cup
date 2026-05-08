import { hexToRgba } from '../lib/colors.js';

const FORMAT_LABEL = {
  best_ball: 'Best Ball',
  scramble: 'Scramble',
  alt_shot: 'Alt Shot',
  singles: 'Singles',
};

export default function ActivityTicker({ activity, teams }) {
  if (!activity || activity.length === 0) return null;

  // newest first → oldest last; for the ticker we display in chronological
  // order so the eye reads left-to-right but the scroll surfaces newest soon.
  const items = activity.slice().reverse().slice(-30);
  // duplicate for seamless loop
  const looped = [...items, ...items];

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-bunker/60">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-fairway animate-pulse" />
        <span className="text-[10px] uppercase tracking-widest text-fairway font-semibold">
          Live activity
        </span>
      </div>
      <div className="ticker-mask">
        <div className="ticker-track">
          {looped.map((ev, i) => (
            <ActivityChip key={`${ev.matchId}-${ev.holeIndex}-${i}`} event={ev} teams={teams} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityChip({ event, teams }) {
  const [a, b] = teams;
  const isClose = event.type === 'match_close';

  let bg = 'bg-cream-dark/60';
  let borderColor = 'rgba(232,220,181,0.7)';
  let accent = '#2c2418';

  if (event.winner === 'A') {
    accent = a.color;
    bg = 'bg-white';
    borderColor = hexToRgba(a.color, 0.4);
  } else if (event.winner === 'B') {
    accent = b.color;
    bg = 'bg-white';
    borderColor = hexToRgba(b.color, 0.4);
  } else if (event.winner === 'tie') {
    bg = 'bg-cream-dark/40';
  }

  const text = isClose
    ? `Match ${event.matchId} closes ${event.result || ''} — ${
        event.winner === 'A' ? a.name : event.winner === 'B' ? b.name : 'halved'
      }`
    : event.winner === 'tie'
      ? `Halved on hole ${event.holeNumber} — Match ${event.matchId}`
      : event.winner === 'A'
        ? `${a.name} win hole ${event.holeNumber} — Match ${event.matchId}`
        : `${b.name} win hole ${event.holeNumber} — Match ${event.matchId}`;

  const sub = `${FORMAT_LABEL[event.matchFormat] || event.matchFormat} · ${event.sideA.join('/')} vs ${event.sideB.join('/')}`;

  return (
    <div
      className={`${bg} border rounded-full px-3 py-1.5 shrink-0`}
      style={{ borderColor }}
    >
      <div className="flex items-baseline gap-2 whitespace-nowrap">
        <span
          className="text-[11px] font-semibold leading-none"
          style={{ color: accent }}
        >
          {isClose && (
            <span className="text-fescue mr-1" aria-hidden>
              ★
            </span>
          )}
          {text}
        </span>
        <span className="text-[10px] text-ink/50 leading-none">{sub}</span>
      </div>
    </div>
  );
}
