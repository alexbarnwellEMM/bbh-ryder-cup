import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PinGate from './PinGate.jsx';
import HoleEntry from '../components/HoleEntry.jsx';
import { api } from '../lib/api.js';
import { hexToRgba } from '../lib/colors.js';

export default function Scorekeeper({ state, isScorekeeper, onLogin, onLogout }) {
  if (!isScorekeeper) return <PinGate onLogin={onLogin} />;
  return <ScoreInner state={state} onLogout={onLogout} />;
}

function ScoreInner({ state, onLogout }) {
  const [params, setParams] = useSearchParams();
  const matchIdParam = Number(params.get('match')) || null;

  const inProgress = useMemo(
    () => state.matches.filter((m) => m.status === 'in_progress'),
    [state.matches]
  );
  const setupReady = useMemo(
    () =>
      state.matches.filter(
        (m) =>
          m.status === 'pending' &&
          m.startHole &&
          m.sideA.length === m.teamASize &&
          m.sideB.length === m.teamBSize
      ),
    [state.matches]
  );

  const defaultId =
    matchIdParam || inProgress[0]?.id || setupReady[0]?.id || state.matches[0]?.id;
  const match = state.matches.find((m) => m.id === defaultId);

  function pick(id) {
    setParams({ match: String(id) });
  }

  return (
    <div className="space-y-4">
      <div className="card p-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Scorekeeper</div>
          <div className="text-xs text-ink/60">
            {inProgress.length} live · {setupReady.length} ready
          </div>
        </div>
        <button className="btn" onClick={onLogout}>Lock</button>
      </div>

      <MatchPicker matches={state.matches} value={defaultId} onChange={pick} />

      {match ? (
        <MatchScoring state={state} match={match} />
      ) : (
        <div className="text-center text-ink/60 py-12">No match selected.</div>
      )}
    </div>
  );
}

function MatchPicker({ matches, value, onChange }) {
  return (
    <div className="card p-2">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
        {matches.map((m) => {
          const live = m.status === 'in_progress';
          const done = m.status === 'final';
          const active = m.id === value;
          return (
            <button
              key={m.id}
              onClick={() => onChange(m.id)}
              className={`text-xs py-2 rounded-xl border transition ${
                active
                  ? 'border-fairway bg-fairway/10 text-fairway'
                  : live
                    ? 'border-fairway/50 bg-white text-ink'
                    : done
                      ? 'border-bunker/40 bg-cream-dark/30 text-ink/40'
                      : 'border-bunker bg-white text-ink/80'
              }`}
            >
              <div className="font-semibold">M{m.id}</div>
              <div className="text-[10px] uppercase tracking-widest">
                {live ? 'live' : done ? 'final' : m.startHole ? 'ready' : 'pending'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchScoring({ state, match }) {
  const [a, b] = state.teams;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const c = match.computed;
  const playOrder = match.holePlayOrder || [];
  const holesByIndex = useMemo(() => {
    const m = new Map();
    for (const h of match.holes) m.set(h.holeIndex, h);
    return m;
  }, [match.holes]);

  const nextIndex = useMemo(() => {
    if (match.computed?.isClosed) return null;
    for (let i = 0; i < 9; i++) {
      if (!holesByIndex.has(i)) return i;
    }
    return null;
  }, [holesByIndex, match.computed]);

  async function submit(payload) {
    setErr('');
    setBusy(true);
    try {
      if (match.status === 'pending') {
        if (!match.startHole) {
          throw new Error('Set start hole in Setup first.');
        }
        await api.startMatch(match.id).catch(() => {});
      }
      await api.scoreHole(match.id, payload);
    } catch (e) {
      setErr(e.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  async function undoLast() {
    setErr('');
    setBusy(true);
    try {
      const last = [...holesByIndex.keys()].sort((x, y) => y - x)[0];
      if (last == null) return;
      await api.undoHole(match.id, last);
    } catch (e) {
      setErr(e.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  if (!match.startHole || match.sideA.length === 0 || match.sideB.length === 0) {
    return (
      <div className="card p-4 text-sm text-ink/75">
        Match isn’t set up yet. Open the <span className="font-semibold">Setup</span> tab to assign players and a starting hole.
      </div>
    );
  }

  const leader = c.lead > 0 ? a : c.lead < 0 ? b : null;

  return (
    <div className="space-y-3">
      <div
        className="card p-3"
        style={
          match.status === 'in_progress' && leader
            ? { borderColor: hexToRgba(leader.color, 0.45) }
            : {}
        }
      >
        <div className="flex items-center justify-between text-[11px]">
          <div className="text-ink/55 uppercase tracking-widest">
            Match {match.id} · {match.format.replace('_', ' ')}
          </div>
          <div
            className="font-semibold"
            style={leader ? { color: leader.color } : { color: '#2c2418' }}
          >
            {c.status} · thru {c.holesPlayed}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: a.color }}>
              {a.name}
            </div>
            <div className="text-sm">{match.sideA.map((p) => p.name).join(' / ')}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: b.color }}>
              {b.name}
            </div>
            <div className="text-sm">{match.sideB.map((p) => p.name).join(' / ')}</div>
          </div>
        </div>
      </div>

      {err && <div className="card border-flag/50 bg-flag/10 text-flag text-sm p-3">{err}</div>}

      <div className="grid grid-cols-9 gap-1">
        {playOrder.map((holeNumber, idx) => {
          const has = holesByIndex.has(idx);
          const hole = holesByIndex.get(idx);
          const winner = hole?.winner;
          const winColor =
            winner === 'A' ? a.color : winner === 'B' ? b.color : null;
          return (
            <div
              key={idx}
              className={`text-center rounded-xl py-1.5 text-[11px] border transition ${
                idx === nextIndex
                  ? 'border-fairway bg-fairway/10'
                  : has
                    ? 'border-bunker bg-white'
                    : 'border-bunker/50 bg-cream-dark/30'
              }`}
              style={winColor ? { borderColor: hexToRgba(winColor, 0.6) } : undefined}
            >
              <div className="font-semibold text-ink">{holeNumber}</div>
              <div
                className="text-[10px]"
                style={winColor ? { color: winColor, fontWeight: 700 } : { color: '#a3a39a' }}
              >
                {winner === 'A' ? 'A' : winner === 'B' ? 'B' : winner === 'tie' ? '½' : '·'}
              </div>
            </div>
          );
        })}
      </div>

      {match.computed.isClosed ? (
        <div className="card p-4 text-center">
          <div className="text-fairway font-display font-semibold text-lg">
            Match closed: {match.result}
          </div>
          <button className="btn mt-3" onClick={undoLast} disabled={busy}>
            Undo last hole
          </button>
        </div>
      ) : nextIndex == null ? (
        <div className="card p-4 text-center">
          <div className="text-ink/75">All 9 holes scored — {match.result || c.status}</div>
          <button className="btn mt-3" onClick={undoLast} disabled={busy}>
            Undo last hole
          </button>
        </div>
      ) : (
        <>
          <HoleEntry
            holeNumber={playOrder[nextIndex]}
            holeIndex={nextIndex}
            par={state.course?.holes?.[playOrder[nextIndex] - 1]?.par}
            teamA={a}
            teamB={b}
            existing={holesByIndex.get(nextIndex)}
            onSubmit={submit}
            disabled={busy}
          />
          {holesByIndex.size > 0 && (
            <button className="btn w-full" onClick={undoLast} disabled={busy}>
              Undo last hole
            </button>
          )}
        </>
      )}

      {holesByIndex.size > 0 && (
        <details className="card p-3">
          <summary className="text-sm text-ink/75 cursor-pointer">Edit a previous hole</summary>
          <div className="mt-2 space-y-2">
            {[...holesByIndex.values()].sort((x, y) => x.holeIndex - y.holeIndex).map((h) => (
              <HoleEntry
                key={h.id}
                holeNumber={h.holeNumber}
                holeIndex={h.holeIndex}
                par={state.course?.holes?.[h.holeNumber - 1]?.par}
                teamA={a}
                teamB={b}
                existing={h}
                onSubmit={submit}
                disabled={busy}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
