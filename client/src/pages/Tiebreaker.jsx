import { useState } from 'react';
import PinGate from './PinGate.jsx';
import { api } from '../lib/api.js';
import { hexToRgba } from '../lib/colors.js';
import FlagIcon from '../components/FlagIcon.jsx';

export default function Tiebreaker({ state, isScorekeeper, onLogin }) {
  const { tiebreaker, totals, allMatchesFinal, tieAfterAll } = state;

  if (!allMatchesFinal && !tiebreaker?.active) {
    return (
      <div className="card p-4 text-sm text-ink/75">
        Tiebreaker unlocks when all 12 matches are final and the score is 6–6.
      </div>
    );
  }

  if (!tieAfterAll && !tiebreaker?.active) {
    return (
      <div className="card p-4 text-sm text-ink/75">
        No tiebreaker needed — final score {totals.a}–{totals.b}.
      </div>
    );
  }

  if (!isScorekeeper) return <PinGate onLogin={onLogin} />;

  if (!tiebreaker?.active) return <PickHoles state={state} />;
  return <TiebreakerLive state={state} />;
}

function PickHoles({ state }) {
  const [a, b] = state.teams;
  const [picks, setPicks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function toggle(h) {
    if (picks.includes(h)) setPicks(picks.filter((x) => x !== h));
    else if (picks.length < 3) setPicks([...picks, h]);
  }

  async function start() {
    setErr('');
    setBusy(true);
    try {
      await api.startTiebreaker(picks);
    } catch (e) {
      setErr(e.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="card p-4 text-center">
        <FlagIcon className="w-8 h-8 mx-auto" />
        <div className="ribbon mt-1">Tiebreaker</div>
        <div className="text-2xl font-display font-black mt-1">
          5v5 · Alt Shot · 3 holes
        </div>
        <div className="text-sm text-ink/70 mt-1 italic">
          {a.name} <span className="text-ink/40">vs</span> {b.name}
        </div>
      </div>

      <div className="card p-3 space-y-2">
        <div className="text-sm font-semibold">Captains, pick 3 holes</div>
        <div className="grid grid-cols-9 gap-1">
          {Array.from({ length: 9 }).map((_, i) => {
            const h = i + 1;
            const on = picks.includes(h);
            return (
              <button
                key={h}
                onClick={() => toggle(h)}
                className={`py-2 rounded-full text-sm font-semibold transition ${
                  on
                    ? 'bg-fairway text-white'
                    : 'bg-white border border-bunker text-ink'
                }`}
              >
                {h}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-ink/55">{picks.length}/3 selected</div>
        {err && <div className="text-flag text-sm">{err}</div>}
        <button
          className="btn btn-primary w-full"
          disabled={busy || picks.length !== 3}
          onClick={start}
        >
          Start tiebreaker
        </button>
      </div>
    </div>
  );
}

function TiebreakerLive({ state }) {
  const { tiebreaker, teams } = state;
  const [a, b] = teams;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function setScore(holeNumber, teamAScore, teamBScore) {
    setErr('');
    setBusy(true);
    try {
      await api.scoreTiebreaker({ holeNumber, teamAScore, teamBScore });
    } catch (e) {
      setErr(e.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  const totalA = tiebreaker.teamATotal ?? 0;
  const totalB = tiebreaker.teamBTotal ?? 0;
  const winner = tiebreaker.winner;

  return (
    <div className="space-y-3">
      <div className="card p-3 text-center">
        <div className="ribbon">Tiebreaker · stroke total</div>
        <div className="grid grid-cols-2 mt-2 gap-2">
          <Side team={a} total={totalA} winner={winner === 'A'} />
          <Side team={b} total={totalB} winner={winner === 'B'} />
        </div>
        {winner && winner !== 'tie' && (
          <div className="mt-3 text-fairway font-display font-bold">
            {winner === 'A' ? a.name : b.name} wins the cup
          </div>
        )}
        {winner === 'tie' && (
          <div className="mt-3 text-flag font-semibold">
            Still tied — sudden death
          </div>
        )}
      </div>

      {err && <div className="card border-flag/50 bg-flag/10 text-flag text-sm p-3">{err}</div>}

      <div className="space-y-2">
        {tiebreaker.scores.map((s) => (
          <TiebreakerHole
            key={s.id}
            score={s}
            teamA={a}
            teamB={b}
            onSubmit={setScore}
            disabled={busy}
            par={state.course?.holes?.[s.holeNumber - 1]?.par}
          />
        ))}
      </div>
    </div>
  );
}

function Side({ team, total, winner }) {
  return (
    <div
      className="rounded-2xl p-2 border"
      style={{
        background: `linear-gradient(180deg, ${hexToRgba(team.color, 0.12)}, white 90%)`,
        borderColor: hexToRgba(team.color, 0.3),
      }}
    >
      <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: team.color }}>
        {team.name}
      </div>
      <div className="text-3xl font-display font-black tabular-nums" style={{ color: team.color }}>
        {total}
      </div>
      {winner && <div className="text-[10px] text-fairway uppercase tracking-widest font-semibold">winner</div>}
    </div>
  );
}

function TiebreakerHole({ score, teamA, teamB, par, onSubmit, disabled }) {
  const [a, setA] = useState(score.teamAScore ?? par ?? 4);
  const [b, setB] = useState(score.teamBScore ?? par ?? 4);

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-ink/55">
        <div>Hole {score.holeNumber} · Par {par}</div>
        {score.teamAScore != null && (
          <div className="text-ink/75">
            {score.teamAScore < score.teamBScore
              ? 'A wins'
              : score.teamAScore > score.teamBScore
                ? 'B wins'
                : 'Halved'}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <Stepper label={teamA.name} color={teamA.color} value={a} setValue={setA} />
        <Stepper label={teamB.name} color={teamB.color} value={b} setValue={setB} />
      </div>
      <div className="mt-3 flex justify-end">
        <button
          className="btn btn-primary"
          disabled={disabled}
          onClick={() => onSubmit(score.holeNumber, a, b)}
        >
          {score.teamAScore != null ? 'Update' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function Stepper({ label, color, value, setValue }) {
  return (
    <div
      className="rounded-2xl border border-bunker p-2"
      style={{ background: `linear-gradient(180deg, ${hexToRgba(color, 0.08)}, transparent)` }}
    >
      <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color }}>
        {label}
      </div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <button
          className="w-12 h-12 rounded-full bg-white border border-bunker hover:bg-cream-dark active:scale-95 text-2xl font-bold text-ink"
          onClick={() => setValue(Math.max(1, value - 1))}
        >
          −
        </button>
        <div className="text-4xl font-display font-black tabular-nums w-12 text-center text-ink">
          {value}
        </div>
        <button
          className="w-12 h-12 rounded-full bg-white border border-bunker hover:bg-cream-dark active:scale-95 text-2xl font-bold text-ink"
          onClick={() => setValue(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
