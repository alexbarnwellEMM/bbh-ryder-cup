import { hexToRgba } from '../lib/colors.js';

export default function TeamScore({ teams, totals, matches, tournamentFinal }) {
  const [a, b] = teams;
  const aLeads = totals.a > totals.b;
  const bLeads = totals.b > totals.a;
  const tied = totals.a === totals.b;
  const soft = projectedFromLive(matches || []);

  const completed = (matches || []).filter((m) => m.status === 'final').length;
  const totalMatches = (matches || []).length;

  return (
    <div className="card overflow-hidden">
      <div className="px-3 pt-3 pb-1 grid grid-cols-3 items-end gap-2">
        <div className="text-left">
          <div className="font-display font-bold text-base leading-tight" style={{ color: a.color }}>
            {a.name}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-ink/50 font-semibold">
            6.5 to win
          </div>
        </div>
        <div className="text-center text-[11px] uppercase tracking-widest text-ink/55 font-semibold">
          {completed}/{totalMatches} final
        </div>
        <div className="text-right">
          <div className="font-display font-bold text-base leading-tight" style={{ color: b.color }}>
            {b.name}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-ink/50 font-semibold">
            6.5 to win
          </div>
        </div>
      </div>

      <PointsTrack teams={teams} totals={totals} soft={soft} tournamentFinal={tournamentFinal} />

      <div className="text-center pb-2 mt-1 text-[11px] uppercase tracking-[0.25em] text-ink/55 font-semibold">
        {tournamentFinal
          ? aLeads
            ? `${a.name} wins`
            : bLeads
              ? `${b.name} wins`
              : 'Tied'
          : tied
            ? 'Tied'
            : aLeads
              ? `${a.name} leads`
              : `${b.name} leads`}
      </div>
    </div>
  );
}

function PointsTrack({ teams, totals, soft, tournamentFinal }) {
  const [a, b] = teams;
  const aWon = tournamentFinal && totals.a > totals.b;
  const bWon = tournamentFinal && totals.b > totals.a;

  return (
    <div className="px-3 pb-1">
      <div className="flex items-stretch h-12 rounded-md overflow-hidden border border-ink/15 bg-cream-dark/50 shadow-inner">
        <ScoreLabel team={a} total={totals.a} side="left" trophy={aWon} />
        <div className="relative flex-1 flex">
          <div className="flex flex-1">
            {Array.from({ length: 6 }).map((_, i) => {
              const finalFill = clamp01(totals.a - i);
              const projFill = clamp01(totals.a + soft.a - i) - finalFill;
              return (
                <Block
                  key={`a${i}`}
                  finalFill={finalFill}
                  projFill={projFill}
                  color={a.color}
                  fromRight={false}
                />
              );
            })}
          </div>
          <Midline />
          <div className="flex flex-1">
            {Array.from({ length: 6 }).map((_, j) => {
              const dist = 5 - j;
              const finalFill = clamp01(totals.b - dist);
              const projFill = clamp01(totals.b + soft.b - dist) - finalFill;
              return (
                <Block
                  key={`b${j}`}
                  finalFill={finalFill}
                  projFill={projFill}
                  color={b.color}
                  fromRight={true}
                />
              );
            })}
          </div>
        </div>
        <ScoreLabel team={b} total={totals.b} side="right" trophy={bWon} />
      </div>

      {(soft.a > 0 || soft.b > 0) && (
        <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-ink/50 mt-1.5 font-semibold">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{
              background: hexToRgba(a.color, 0.32),
              border: `1px solid ${hexToRgba(a.color, 0.5)}`,
            }}
          />
          <span>projected from live matches</span>
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{
              background: hexToRgba(b.color, 0.32),
              border: `1px solid ${hexToRgba(b.color, 0.5)}`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function ScoreLabel({ team, total, side, trophy }) {
  const isLeft = side === 'left';
  return (
    <div
      className={`flex items-center px-3 ${isLeft ? 'justify-start' : 'justify-end'} font-display font-black text-2xl tabular-nums`}
      style={{
        background: team.color,
        color: 'white',
        minWidth: 64,
      }}
    >
      {!isLeft && trophy && <TrophyIcon className="w-4 h-4 mr-1.5 text-fescue" />}
      {formatPoints(total)}
      {isLeft && trophy && <TrophyIcon className="w-4 h-4 ml-1.5 text-fescue" />}
    </div>
  );
}

function Block({ finalFill, projFill, color, fromRight }) {
  const finalEnd = finalFill * 100;
  const projEnd = (finalFill + projFill) * 100;
  const dir = fromRight ? 'to left' : 'to right';
  const faded = hexToRgba(color, 0.32);

  const bg = `linear-gradient(${dir},
    ${color} 0%,
    ${color} ${finalEnd}%,
    ${faded} ${finalEnd}%,
    ${faded} ${projEnd}%,
    transparent ${projEnd}%,
    transparent 100%)`;

  return (
    <div
      className="flex-1 border-r last:border-r-0 transition-all duration-500"
      style={{
        backgroundImage: bg,
        borderRightColor: 'rgba(255,255,255,0.55)',
      }}
    />
  );
}

function Midline() {
  return (
    <div
      className="w-[2px] bg-ink/40"
      aria-hidden
    />
  );
}

function TrophyIcon({ className = 'w-4 h-4', style }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      <path
        fill="currentColor"
        d="M7 4h10v2h3v3a4 4 0 0 1-4 4 5 5 0 0 1-2 2.5V18h2v2H8v-2h2v-2.5A5 5 0 0 1 8 13a4 4 0 0 1-4-4V6h3V4Zm0 4H6v1a2 2 0 0 0 2 2V8H7Zm10 0v3a2 2 0 0 0 2-2V8h-2Z"
      />
    </svg>
  );
}

function projectedFromLive(matches) {
  let a = 0;
  let b = 0;
  for (const m of matches) {
    if (m.status !== 'in_progress') continue;
    const lead = m.computed?.lead || 0;
    if (lead > 0) a += 1;
    else if (lead < 0) b += 1;
    else {
      a += 0.5;
      b += 0.5;
    }
  }
  return { a, b };
}

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function formatPoints(p) {
  if (p === Math.floor(p)) return String(p);
  return p.toFixed(1);
}
