import { useEffect, useState } from 'react';
import { parFor } from '../lib/api.js';
import { hexToRgba } from '../lib/colors.js';

export default function HoleEntry({
  holeNumber,
  holeIndex,
  par,
  teamA,
  teamB,
  existing,
  onSubmit,
  disabled,
}) {
  const par0 = par ?? parFor(holeNumber);
  const [a, setA] = useState(existing?.teamAScore ?? par0);
  const [b, setB] = useState(existing?.teamBScore ?? par0);

  useEffect(() => {
    setA(existing?.teamAScore ?? par0);
    setB(existing?.teamBScore ?? par0);
  }, [existing?.teamAScore, existing?.teamBScore, par0]);

  function submit() {
    onSubmit({ holeIndex, teamAScore: a, teamBScore: b });
  }

  const isOT = holeIndex >= 9;
  return (
    <div className={`card p-3 ${isOT ? 'border-flag/50' : ''}`}>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-ink/55">
        <div>
          {isOT && (
            <span className="text-flag font-bold mr-1">OT {holeIndex - 8} ·</span>
          )}
          Hole {holeNumber} · Par {par0}
        </div>
        <div className="text-ink/40">play #{holeIndex + 1}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        <Stepper label={teamA.name} color={teamA.color} value={a} setValue={setA} par={par0} />
        <Stepper label={teamB.name} color={teamB.color} value={b} setValue={setB} par={par0} />
      </div>

      <div className="mt-3 flex justify-between items-center">
        <div className="text-[11px] text-stone-500">
          {a < b ? 'A wins hole' : a > b ? 'B wins hole' : 'Halved'}
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={disabled}>
          {existing ? 'Update' : 'Save hole'}
        </button>
      </div>
    </div>
  );
}

function Stepper({ label, color, value, setValue, par }) {
  return (
    <div
      className="rounded-lg border border-stone-200 p-2"
      style={{ background: `linear-gradient(180deg, ${hexToRgba(color, 0.08)}, transparent)` }}
    >
      <div
        className="text-[10px] uppercase tracking-widest font-semibold"
        style={{ color }}
      >
        {label}
      </div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <button
          className="w-12 h-12 rounded-lg bg-stone-100 hover:bg-stone-200 active:scale-95 text-2xl font-bold text-slate-800 border border-stone-200"
          onClick={() => setValue(Math.max(1, value - 1))}
          aria-label={`${label} minus`}
        >
          −
        </button>
        <div className="text-4xl font-black tabular-nums w-12 text-center text-slate-900">
          {value}
        </div>
        <button
          className="w-12 h-12 rounded-lg bg-stone-100 hover:bg-stone-200 active:scale-95 text-2xl font-bold text-slate-800 border border-stone-200"
          onClick={() => setValue(value + 1)}
          aria-label={`${label} plus`}
        >
          +
        </button>
      </div>
      <div className="text-[10px] text-stone-500 text-center mt-1">
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
