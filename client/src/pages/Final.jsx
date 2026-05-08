import { formatPoints } from '../components/TeamScore.jsx';
import FlagIcon from '../components/FlagIcon.jsx';
import { hexToRgba } from '../lib/colors.js';

const FORMAT_LABEL = {
  best_ball: 'Best Ball',
  scramble: 'Scramble',
  alt_shot: 'Alt Shot',
  singles: 'Singles',
};

export default function Final({ state }) {
  const { teams, totals, sessions, tournamentFinal, tiebreaker } = state;
  const [a, b] = teams;

  if (!tournamentFinal) {
    return (
      <div className="card p-4 text-sm text-ink/75">
        Tournament isn’t final yet. Keep scoring.
      </div>
    );
  }

  const aWin = totals.a > totals.b;
  const bWin = totals.b > totals.a;
  const winnerTeam = aWin ? a : bWin ? b : null;
  const loserTeam = aWin ? b : bWin ? a : null;

  const decidedByTiebreaker = tiebreaker?.winner && tiebreaker.winner !== 'tie';

  return (
    <div className="space-y-4">
      <div
        className="card p-5 text-center"
        style={
          winnerTeam
            ? {
                background: `linear-gradient(180deg, ${hexToRgba(winnerTeam.color, 0.18)}, white 80%)`,
                borderColor: hexToRgba(winnerTeam.color, 0.4),
              }
            : {}
        }
      >
        <FlagIcon className="w-9 h-9 mx-auto" flagColor={winnerTeam?.color || '#a3392a'} />
        <div className="ribbon mt-1">Champions</div>
        <div className="text-4xl font-display font-black mt-1" style={{ color: winnerTeam?.color }}>
          {winnerTeam?.name || 'Tied'}
        </div>
        <div className="text-ink/75 mt-1 text-lg tabular-nums">
          {formatPoints(totals.a)} – {formatPoints(totals.b)}
        </div>
        {decidedByTiebreaker && (
          <div className="text-[11px] uppercase tracking-widest text-fairway mt-1 font-semibold">
            Decided in tiebreaker
          </div>
        )}
        {loserTeam && (
          <div className="text-xs text-ink/50 mt-1 italic">
            {loserTeam.name} fall short
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-3 py-2 text-[11px] uppercase tracking-widest text-ink/55 border-b border-bunker/60 flex items-center justify-between">
          <span className="font-semibold">Full Results</span>
          <a href="/api/export" className="btn text-xs">Download CSV</a>
        </div>
        <div className="divide-y divide-bunker/50">
          {sessions.map((s) => (
            <div key={s.id} className="p-3">
              <div className="ribbon mb-1">{s.name}</div>
              <div className="space-y-1.5">
                {s.matches.map((m) => (
                  <ResultRow key={m.id} match={m} teamA={a} teamB={b} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {tiebreaker?.active && (
        <div className="card p-3">
          <div className="ribbon">Tiebreaker</div>
          <div className="text-sm mt-1">
            Holes: {tiebreaker.holes.join(', ')} ·{' '}
            <span style={{ color: a.color }} className="font-semibold">{tiebreaker.teamATotal ?? 0}</span> –{' '}
            <span style={{ color: b.color }} className="font-semibold">{tiebreaker.teamBTotal ?? 0}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultRow({ match, teamA, teamB }) {
  const c = match.computed;
  const aWin = c?.lead > 0;
  const bWin = c?.lead < 0;
  const halved = match.status === 'final' && c?.lead === 0;

  return (
    <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center text-sm">
      <span className="pill-muted">{FORMAT_LABEL[match.format]}</span>
      <div className="truncate">
        <span
          className={aWin ? 'font-semibold' : 'text-ink/55'}
          style={aWin ? { color: teamA.color } : {}}
        >
          {match.sideA.map((p) => p.name).join(' / ') || 'tbd'}
        </span>
        <span className="text-ink/40"> vs </span>
        <span
          className={bWin ? 'font-semibold' : 'text-ink/55'}
          style={bWin ? { color: teamB.color } : {}}
        >
          {match.sideB.map((p) => p.name).join(' / ') || 'tbd'}
        </span>
      </div>
      <div className="text-right text-xs tabular-nums text-ink/75">
        {halved ? 'halved' : match.result || '—'}
      </div>
    </div>
  );
}
