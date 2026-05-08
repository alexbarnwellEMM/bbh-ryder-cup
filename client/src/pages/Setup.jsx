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

export default function Setup({ state, isScorekeeper, onLogin, onLogout }) {
  if (!isScorekeeper) return <PinGate onLogin={onLogin} />;
  return <SetupInner state={state} onLogout={onLogout} />;
}

function SetupInner({ state, onLogout }) {
  const [openId, setOpenId] = useState(null);
  const [a, b] = state.teams;

  return (
    <div className="space-y-5">
      <div className="card p-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Scorekeeper</div>
          <div className="text-xs text-ink/60">
            Set lineups + starting holes per match.
          </div>
        </div>
        <button className="btn" onClick={onLogout}>Lock</button>
      </div>

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
  const locked = match.status === 'in_progress' || match.status === 'final';

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

          <div className="flex gap-2">
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

function summarize(players) {
  return players.map((p) => p.name).join(' / ');
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}
