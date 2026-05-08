import { useEffect, useState } from 'react';
import { parFor } from '../lib/api.js';
import { hexToRgba } from '../lib/colors.js';

export default function BestBallHoleEntry({
  holeNumber,
  holeIndex,
  par,
  teamA,
  teamB,
  sideA,
  sideB,
  existing,
  onSubmit,
  disabled,
}) {
  const par0 = par ?? parFor(holeNumber);
  const initial = (player) => existing?.playerScores?.[player.id] ?? par0;

  const [scores, setScores] = useState(() => ({
    [sideA[0].id]: initial(sideA[0]),
    [sideA[1].id]: initial(sideA[1]),
    [sideB[0].id]: initial(sideB[0]),
    [sideB[1].id]: initial(sideB[1]),
  }));

  useEffect(() => {
    setScores({
      [sideA[0].id]: initial(sideA[0]),
      [sideA[1].id]: initial(sideA[1]),
      [sideB[0].id]: initial(sideB[0]),
      [sideB[1].id]: initial(sideB[1]),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeIndex, par0, existing?.id]);

  const a1 = scores[sideA[0].id];
  const a2 = scores[sideA[1].id];
  const b1 = scores[sideB[0].id];
  const b2 = scores[sideB[1].id];

  const aBest = Math.min(a1, a2);
  const bBest = Math.min(b1, b2);
  const winner = aBest < bBest ? 'A' : aBest > bBest ? 'B' : 'tie';

  function set(playerId, value) {
    setScores((s) => ({ ...s, [playerId]: value }));
  }

  function submit() {
    onSubmit({
      holeIndex,
      teamAPlayerScores: { [sideA[0].id]: a1, [sideA[1].id]: a2 },
      teamBPlayerScores: { [sideB[0].id]: b1, [sideB[1].id]: b2 },
    });
  }

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-ink/55">
        <div>
          Hole {holeNumber} · Par {par0} · Best Ball
        </div>
        <div className="text-ink/40">play #{holeIndex + 1}</div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <PlayerStepper
          player={sideA[0]}
          color={teamA.color}
          value={a1}
          setValue={(v) => set(sideA[0].id, v)}
          par={par0}
          counts={a1 === aBest}
        />
        <PlayerStepper
          player={sideB[0]}
          color={teamB.color}
          value={b1}
          setValue={(v) => set(sideB[0].id, v)}
          par={par0}
          counts={b1 === bBest}
        />
        <PlayerStepper
          player={sideA[1]}
          color={teamA.color}
          value={a2}
          setValue={(v) => set(sideA[1].id, v)}
          par={par0}
          counts={a2 === aBest}
        />
        <PlayerStepper
          player={sideB[1]}
          color={teamB.color}
          value={b2}
          setValue={(v) => set(sideB[1].id, v)}
          par={par0}
          counts={b2 === bBest}
        />
      </div>

      <div className="mt-3 flex justify-between items-center gap-2 flex-wrap">
        <div className="text-[11px] text-ink/65 leading-tight">
          Best ball:{' '}
          <span className="font-bold tabular-nums" style={{ color: teamA.color }}>
            {aBest}
          </span>{' '}
          –{' '}
          <span className="font-bold tabular-nums" style={{ color: teamB.color }}>
            {bBest}
          </span>{' '}
          ·{' '}
          <span className="font-semibold">
            {winner === 'A'
              ? `${teamA.name} wins`
              : winner === 'B'
                ? `${teamB.name} wins`
                : 'Halved'}
          </span>
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={disabled}>
          {existing ? 'Update' : 'Save hole'}
        </button>
      </div>
    </div>
  );
}

function PlayerStepper({ player, color, value, setValue, par, counts }) {
  const ringColor = hexToRgba(color, 0.55);
  return (
    <div
      className="rounded-lg border p-2 transition-shadow"
      style={{
        background: `linear-gradient(180deg, ${hexToRgba(color, 0.08)}, transparent)`,
        borderColor: counts ? ringColor : 'rgba(232,220,181,0.65)',
        boxShadow: counts ? `0 0 0 2px ${hexToRgba(color, 0.2)}` : 'none',
      }}
    >
      <div
        className="text-[10px] uppercase tracking-widest font-semibold flex items-center justify-between"
        style={{ color }}
      >
        <span className="truncate">{player.name}</span>
        {counts && (
          <span className="text-[9px] uppercase tracking-widest">counts</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-1.5 mt-1">
        <button
          className="w-10 h-10 rounded-lg bg-white border border-bunker hover:bg-cream-dark active:scale-95 text-xl font-bold text-ink"
          onClick={() => setValue(Math.max(1, value - 1))}
          aria-label={`${player.name} minus`}
        >
          −
        </button>
        <div className="text-3xl font-display font-black tabular-nums w-10 text-center text-ink">
          {value}
        </div>
        <button
          className="w-10 h-10 rounded-lg bg-white border border-bunker hover:bg-cream-dark active:scale-95 text-xl font-bold text-ink"
          onClick={() => setValue(value + 1)}
          aria-label={`${player.name} plus`}
        >
          +
        </button>
      </div>
      <div className="text-[10px] text-ink/55 text-center mt-1">
        {scoreLabel(value, par)}
      </div>
    </div>
  );
}

function scoreLabel(value, par) {
  const d = value - par;
  if (value === 1) return 'Ace';
  if (d <= -3) return 'Albatross';
  if (d === -2) return 'Eagle';
  if (d === -1) return 'Birdie';
  if (d === 0) return 'Par';
  if (d === 1) return 'Bogey';
  if (d === 2) return 'Double';
  if (d === 3) return 'Triple';
  return `+${d}`;
}
