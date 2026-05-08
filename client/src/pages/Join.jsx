import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { hexToRgba } from '../lib/colors.js';
import FlagIcon from '../components/FlagIcon.jsx';

export default function Join({ state }) {
  const nav = useNavigate();
  const [code, setCode] = useState(localStorage.getItem('bbh_code') || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api.authJoin(code.trim());
      localStorage.setItem('bbh_code', code.trim().toUpperCase());
      nav('/scoreboard');
    } catch (e) {
      setErr(e.message || 'invalid code');
    } finally {
      setBusy(false);
    }
  }

  function skip() {
    nav('/scoreboard');
  }

  const [a, b] = state?.teams || [];

  return (
    <div className="space-y-6">
      <div className="text-center pt-6">
        <FlagIcon className="w-9 h-9 mx-auto" />
        <div className="text-[11px] uppercase tracking-[0.3em] text-fairway font-semibold mt-2">
          Welcome to
        </div>
        <h1 className="text-4xl font-display font-black mt-1 text-ink">BBH Ryder Cup</h1>
        <div className="text-ink/60 text-sm mt-1 italic">
          Sweetens Cove · 4 sessions · 12 points
        </div>
      </div>

      {a && b && (
        <div className="grid grid-cols-2 gap-3">
          <TeamPanel team={a} />
          <TeamPanel team={b} />
        </div>
      )}

      <form onSubmit={submit} className="card p-4 space-y-3">
        <div className="text-sm text-ink/75">Enter the tournament code to follow along.</div>
        <input
          autoFocus
          className="input w-full text-lg tracking-[0.3em] uppercase text-center"
          placeholder="CODE"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {err && <div className="text-flag text-sm">{err}</div>}
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" disabled={busy || !code.trim()}>
            Join
          </button>
          <button type="button" className="btn" onClick={skip}>
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}

function TeamPanel({ team }) {
  return (
    <div
      className="card p-3"
      style={{
        background: `linear-gradient(180deg, ${hexToRgba(team.color, 0.14)}, white 85%)`,
        borderColor: hexToRgba(team.color, 0.35),
      }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.25em] font-semibold"
        style={{ color: team.color }}
      >
        {team.name}
      </div>
      <ul className="mt-1 text-sm space-y-0.5 text-ink">
        {team.players.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}
