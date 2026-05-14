import { computeCupOdds, formatMoneyline } from '../lib/odds.js';
import { hexToRgba } from '../lib/colors.js';

export default function CupOdds({ state }) {
  if (!state || state.tournamentFinal) return null;
  const odds = computeCupOdds(state);
  if (!odds) return null;
  const [a, b] = state.teams;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-stretch">
        <Side
          team={a}
          ml={odds.moneyA}
          pct={odds.pAWin}
          side="left"
        />
        <div className="self-center px-2 text-[10px] uppercase tracking-[0.2em] text-ink/50 font-semibold whitespace-nowrap">
          ML to win the cup
        </div>
        <Side
          team={b}
          ml={odds.moneyB}
          pct={odds.pBWin}
          side="right"
        />
      </div>
      {odds.pTiebreaker > 0.01 && (
        <div className="text-center text-[10px] uppercase tracking-widest text-ink/55 px-3 py-1 border-t border-bunker/40 bg-cream-dark/30">
          Tiebreaker chance:{' '}
          <span className="font-semibold tabular-nums text-flag">
            {Math.round(odds.pTiebreaker * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

function Side({ team, ml, pct, side }) {
  const align = side === 'left' ? 'text-left' : 'text-right';
  const tint = hexToRgba(team.color, 0.09);
  return (
    <div
      className={`flex-1 p-2.5 ${align}`}
      style={{
        background: `linear-gradient(${side === 'left' ? '90deg' : '270deg'}, ${tint}, transparent 80%)`,
      }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.2em] font-semibold leading-none"
        style={{ color: team.color }}
      >
        {team.name}
      </div>
      <div
        className="text-lg font-display font-bold tabular-nums leading-tight mt-0.5"
        style={{ color: team.color }}
      >
        ML {formatMoneyline(ml)}
      </div>
      <div className="text-[10px] text-ink/55 tabular-nums leading-none">
        {Math.round(pct * 100)}% to win
      </div>
    </div>
  );
}
