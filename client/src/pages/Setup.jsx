import { useMemo, useState } from 'react';
import PinGate from './PinGate.jsx';
import { api } from '../lib/api.js';
import { hexToRgba } from '../lib/colors.js';

const FORMAT_LABEL = {
  best_ball: 'Best Ball',
  scramble: 'Scramble',
  alt_shot: 'Alt Shot',
  singles: 'Singles',
};

export default function Setup({ state, isScorekeeper, isAdmin, onLogin, onLogout }) {
  if (!isScorekeeper) return <PinGate onLogin={onLogin} />;
  return <SetupInner state={state} isAdmin={isAdmin} onLogout={onLogout} />;
}

function SetupInner({ state, isAdmin, onLogout }) {
  const [openId, setOpenId] = useState(null);
  const [a, b] = state.teams;

  return (
    <div className="space-y-5">
      <div className="card p-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Scorekeeper</div>
          <div className="text-xs text-ink/60">
            Set handicaps, lineups + starting holes per match.
          </div>
        </div>
        <button className="btn" onClick={onLogout}>Lock</button>
      </div>

      {isAdmin && <FactoryResetCard />}

      <HandicapsCard teams={state.teams} />

      {state.sessions.map((s) => (
        <section key={s.id} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="ribbon">{s.name}</span>
            <span className="flex-1 h-px bg-bunker/60" />
          </div>
          <div className="space-y-2">
            {s.matches.map((m) => (
              <SetupRow
                key={m.id}
                match={m}
                teamA={a}
                teamB={b}
                isOpen={openId === m.id}
                onToggle={() => setOpenId(openId === m.id ? null : m.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SetupRow({ match, teamA, teamB, isOpen, onToggle }) {
  const sideAIds = useMemo(() => match.sideA.map((p) => p.id), [match.sideA]);
  const sideBIds = useMemo(() => match.sideB.map((p) => p.id), [match.sideB]);
  const [aSel, setASel] = useState(sideAIds);
  const [bSel, setBSel] = useState(sideBIds);
  const [startHole, setStartHole] = useState(match.startHole || 1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const aOk = aSel.length === match.teamASize;
  const bOk = bSel.length === match.teamBSize;
  const hasHoles = match.holes.length > 0;
  // Lineup is editable until any hole has been scored.
  const locked = hasHoles || match.status === 'final';
  const canReset = match.status !== 'pending' || hasHoles;

  async function save() {
    setErr('');
    setBusy(true);
    try {
      await api.setupMatch(match.id, {
        startHole,
        teamAPlayerIds: aSel,
        teamBPlayerIds: bSel,
      });
    } catch (e) {
      setErr(e.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setErr('');
    setBusy(true);
    try {
      if (
        match.startHole !== startHole ||
        !sameSet(sideAIds, aSel) ||
        !sameSet(sideBIds, bSel)
      ) {
        await api.setupMatch(match.id, {
          startHole,
          teamAPlayerIds: aSel,
          teamBPlayerIds: bSel,
        });
      }
      await api.startMatch(match.id);
    } catch (e) {
      setErr(e.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  async function resetMatch() {
    const msg = hasHoles
      ? `Reset Match ${match.id}? This wipes ALL ${match.holes.length} scored hole(s) and reverts the match to pending. Lineup is kept.`
      : `Reset Match ${match.id} back to pending?`;
    if (!window.confirm(msg)) return;
    setErr('');
    setBusy(true);
    try {
      await api.resetMatch(match.id);
    } catch (e) {
      setErr(e.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle} className="w-full p-3 text-left flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="pill-muted">{FORMAT_LABEL[match.format]}</span>
            <span className="pill-muted">{match.teamASize}v{match.teamBSize}</span>
            {match.startHole && <span className="pill-muted">Hole {match.startHole}</span>}
            <span className="pill-muted">{match.status}</span>
          </div>
          <div className="text-sm mt-1 truncate">
            <span className="font-medium" style={{ color: teamA.color }}>
              {summarize(match.sideA) || '—'}
            </span>
            <span className="text-ink/40"> vs </span>
            <span className="font-medium" style={{ color: teamB.color }}>
              {summarize(match.sideB) || '—'}
            </span>
          </div>
        </div>
        <div className="text-ink/40">{isOpen ? '▾' : '▸'}</div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3 border-t border-bunker/60 pt-3 bg-cream-dark/30">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink/60 mb-1">
              Starting hole
            </div>
            <div className="grid grid-cols-9 gap-1">
              {Array.from({ length: 9 }).map((_, i) => {
                const h = i + 1;
                return (
                  <button
                    key={h}
                    disabled={locked}
                    onClick={() => setStartHole(h)}
                    className={`py-1.5 rounded-full text-sm font-semibold transition ${
                      startHole === h
                        ? 'bg-fairway text-white'
                        : 'bg-white border border-bunker text-ink'
                    } ${locked ? 'opacity-60' : ''}`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </div>

          <PlayerPicker team={teamA} limit={match.teamASize} selected={aSel} onChange={setASel} disabled={locked} />
          <PlayerPicker team={teamB} limit={match.teamBSize} selected={bSel} onChange={setBSel} disabled={locked} />

          {err && <div className="text-flag text-sm">{err}</div>}

          <div className="flex gap-2 flex-wrap">
            {match.status === 'pending' && (
              <>
                <button className="btn flex-1" onClick={save} disabled={busy || locked || !aOk || !bOk}>
                  Save lineup
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={start}
                  disabled={busy || locked || !aOk || !bOk}
                >
                  Start match
                </button>
              </>
            )}
            {match.status === 'in_progress' && !hasHoles && (
              <button className="btn flex-1" onClick={save} disabled={busy || !aOk || !bOk}>
                Save lineup
              </button>
            )}
            {canReset && (
              <button
                className="btn btn-flag flex-1"
                onClick={resetMatch}
                disabled={busy}
              >
                Reset match
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerPicker({ team, limit, selected, onChange, disabled }) {
  function toggle(id) {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else if (selected.length < limit) {
      onChange([...selected, id]);
    } else {
      onChange([...selected.slice(1), id]);
    }
  }
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-widest mb-1">
        <span style={{ color: team.color }} className="font-semibold">
          {team.name}
        </span>
        <span className="text-ink/50">
          pick {limit} ({selected.length}/{limit})
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {team.players.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              key={p.id}
              disabled={disabled}
              onClick={() => toggle(p.id)}
              className={`px-3 py-1.5 rounded-full text-sm transition ${
                on ? 'text-white' : 'text-ink bg-white border border-bunker'
              } ${disabled ? 'opacity-60' : ''}`}
              style={
                on
                  ? { background: team.color, borderColor: team.color }
                  : { background: hexToRgba(team.color, 0.06) }
              }
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FactoryResetCard() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  async function reset() {
    if (
      !window.confirm(
        'Factory reset — wipes ALL scoring, bets, bettors, lineups, and tiebreaker state. Handicaps + teams are kept. Continue?'
      )
    )
      return;
    if (!window.confirm('Are you sure? This cannot be undone.')) return;
    setErr('');
    setDone('');
    setBusy(true);
    try {
      await api.factoryReset();
      setDone('All data wiped. Fresh start.');
    } catch (e) {
      setErr(e.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card border-flag/40 bg-flag/5 p-3 flex items-center justify-between gap-2">
      <div>
        <div className="text-sm font-semibold text-flag">Factory reset</div>
        <div className="text-xs text-ink/70">
          Admin only. Wipes scoring, bets, bettors, lineups, tiebreaker. Keeps handicaps + teams.
        </div>
        {err && <div className="text-flag text-xs mt-1">{err}</div>}
        {done && <div className="text-fairway text-xs mt-1">{done}</div>}
      </div>
      <button className="btn btn-flag whitespace-nowrap" disabled={busy} onClick={reset}>
        Wipe all
      </button>
    </div>
  );
}

function HandicapsCard({ teams }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="card overflow-hidden"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="px-3 py-3 cursor-pointer flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Handicaps</div>
          <div className="text-xs text-ink/60">
            Used in live odds. Gross match play — no strokes given.
          </div>
        </div>
        <div className="text-ink/40">{open ? '▾' : '▸'}</div>
      </summary>
      <div className="px-3 pb-3 grid grid-cols-2 gap-3 border-t border-bunker/60 pt-3 bg-cream-dark/30">
        {teams.map((team) => (
          <div key={team.id}>
            <div
              className="text-[10px] uppercase tracking-widest font-semibold mb-1"
              style={{ color: team.color }}
            >
              {team.name}
            </div>
            <div className="space-y-1.5">
              {team.players.map((p) => (
                <HandicapRow key={p.id} player={p} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function HandicapRow({ player }) {
  const [val, setVal] = useState(String(player.handicap ?? 0));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // sync if server pushes a change while focused elsewhere
  const remote = String(player.handicap ?? 0);
  if (remote !== val && !busy && document.activeElement?.dataset?.playerId !== String(player.id)) {
    // no-op: we just compare inside the closure to update if needed via effect
  }

  async function commit(next) {
    const num = Number(next);
    if (!Number.isFinite(num)) {
      setErr('number required');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      await api.setHandicap(player.id, num);
    } catch (e) {
      setErr(e.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-ink truncate">{player.name}</span>
      <span className="flex items-center gap-1">
        <input
          data-player-id={player.id}
          type="number"
          inputMode="decimal"
          step="0.1"
          className="input w-16 text-right text-sm py-1 px-2"
          value={val}
          disabled={busy}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => commit(val)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
        {err && <span className="text-flag text-[10px]">{err}</span>}
      </span>
    </label>
  );
}

function summarize(players) {
  return players.map((p) => p.name).join(' / ');
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}
