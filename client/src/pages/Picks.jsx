import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { hexToRgba } from '../lib/colors.js';
import { computeOdds, formatMoneyline } from '../lib/odds.js';

const FORMAT_LABEL = {
  best_ball: 'Best Ball',
  scramble: 'Scramble',
  alt_shot: 'Alt Shot',
  singles: 'Singles',
};

export default function Picks({ state }) {
  const [name, setName] = useState(() => localStorage.getItem('bbh_bettor') || '');
  const [code, setCode] = useState(() => localStorage.getItem('bbh_bettor_code') || '');
  const [editing, setEditing] = useState(!name || !code);

  function logout() {
    localStorage.removeItem('bbh_bettor');
    localStorage.removeItem('bbh_bettor_code');
    setName('');
    setCode('');
    setEditing(true);
  }

  function onLogin(nextName, nextCode) {
    localStorage.setItem('bbh_bettor', nextName);
    localStorage.setItem('bbh_bettor_code', nextCode);
    setName(nextName);
    setCode(nextCode);
    setEditing(false);
  }

  if (!name || !code || editing) {
    return (
      <Login
        bettors={state.bets || []}
        existingName={name}
        onLogin={onLogin}
        onCancel={name && code ? () => setEditing(false) : null}
      />
    );
  }

  return (
    <PicksInner
      state={state}
      name={name}
      code={code}
      onSwitch={() => setEditing(true)}
      onLogout={logout}
    />
  );
}

function Login({ bettors, existingName, onLogin, onCancel }) {
  const [draftName, setDraftName] = useState(existingName || '');
  const [draftCode, setDraftCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [hint, setHint] = useState('');

  async function submit() {
    setErr('');
    setHint('');
    const n = draftName.trim().slice(0, 30);
    const c = draftCode.trim();
    if (!n) return setErr('name required');
    if (c.length < 3) return setErr('code must be 3+ characters');
    setBusy(true);
    try {
      const r = await api.authBettor(n, c);
      if (r?.isNew) setHint('account created');
      onLogin(n, c);
    } catch (e) {
      setErr(e.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 max-w-sm mx-auto space-y-3">
        <div className="text-center">
          <div className="ribbon">Spectator picks</div>
          <h2 className="font-display font-bold text-xl mt-1">
            {existingName ? 'Sign in' : 'Create your bettor'}
          </h2>
          <p className="text-sm text-ink/65 mt-1">
            Pick a name + a personal code. The code locks your picks so nobody
            else can place bets under your name. Win at +ML, lose 100. Bragging rights only.
          </p>
        </div>
        <input
          autoFocus
          className="input w-full text-center text-lg"
          placeholder="Your name"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          maxLength={30}
        />
        <input
          className="input w-full text-center text-lg tracking-widest"
          type="password"
          placeholder="Your code (3+ chars)"
          value={draftCode}
          onChange={(e) => setDraftCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          maxLength={30}
        />
        {err && (
          <div className="text-flag text-sm text-center">
            {err === 'wrong code for that name' ? (
              <>That name is taken. Use a different name, or enter the matching code.</>
            ) : (
              err
            )}
          </div>
        )}
        {hint && <div className="text-fairway text-sm text-center">{hint}</div>}
        <button
          className="btn btn-primary w-full"
          onClick={submit}
          disabled={busy || !draftName.trim() || draftCode.trim().length < 3}
        >
          {existingName ? 'Sign in' : "Let's go"}
        </button>
        {onCancel && (
          <button className="btn w-full" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      <Leaderboard bettors={bettors} highlight={existingName} />
    </div>
  );
}

function PicksInner({ state, name, code, onSwitch, onLogout }) {
  const myBets = useMemo(() => {
    const me = (state.bets || []).find(
      (b) => b.name.toLowerCase() === name.toLowerCase()
    );
    if (!me) return new Map();
    return new Map(me.bets.map((b) => [b.matchId, b]));
  }, [state.bets, name]);

  return (
    <div className="space-y-4">
      <div className="card p-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink/55 font-semibold">
            betting as
          </div>
          <div className="text-base font-display font-bold">{name}</div>
        </div>
        <div className="flex gap-1.5">
          <button className="btn" onClick={onSwitch}>Switch</button>
          <button className="btn" onClick={onLogout}>Sign out</button>
        </div>
      </div>

      <Leaderboard bettors={state.bets || []} highlight={name} />

      <div className="space-y-2">
        {state.sessions.map((s) => (
          <section key={s.id} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="ribbon">{s.name}</span>
              <span className="flex-1 h-px bg-bunker/60" />
            </div>
            {s.matches.map((m) => (
              <BetRow
                key={m.id}
                match={m}
                teams={state.teams}
                name={name}
                code={code}
                myBet={myBets.get(m.id)}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function BetRow({ match, teams, name, code, myBet }) {
  const [a, b] = teams;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const isPending = match.status === 'pending';
  const isFinal = match.status === 'final';
  const lineupReady = match.sideA.length > 0 && match.sideB.length > 0;

  const previewOdds = useMemo(() => {
    if (!isPending || !lineupReady) return null;
    if (myBet) return null;
    return computeOdds(match, { preMatch: true });
  }, [match, isPending, lineupReady, myBet]);

  async function place(pick) {
    if (!isPending) return;
    setErr('');
    setBusy(true);
    try {
      await api.placeBet(name, code, match.id, pick);
    } catch (e) {
      setErr(e.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!isPending || !myBet) return;
    setErr('');
    setBusy(true);
    try {
      await api.cancelBet(name, code, match.id);
    } catch (e) {
      setErr(e.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="pill-muted">{FORMAT_LABEL[match.format] || match.format}</span>
          <span className="pill-muted">{match.teamASize}v{match.teamBSize}</span>
          {match.startHole && <span className="pill-muted">Hole {match.startHole}</span>}
        </div>
        <span className="text-[10px] uppercase tracking-widest text-ink/55">
          {isPending ? 'open' : isFinal ? 'final' : 'live · locked'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <PickButton
          team={a}
          label={a.name}
          subLabel={match.sideA.map((p) => p.name).join(' / ')}
          ml={myBet?.moneyA ?? previewOdds?.moneyA}
          selected={myBet?.pick === 'A'}
          winner={isFinal && match.computed?.lead > 0}
          loser={isFinal && match.computed?.lead < 0}
          disabled={!isPending || busy}
          onClick={() => place('A')}
        />
        <PickButton
          neutral
          label="Halve"
          subLabel="match tied"
          ml={myBet?.moneyHalve ?? previewOdds?.moneyHalve}
          selected={myBet?.pick === 'halve'}
          winner={isFinal && match.computed?.lead === 0}
          loser={isFinal && match.computed?.lead !== 0}
          disabled={!isPending || busy}
          onClick={() => place('halve')}
        />
        <PickButton
          team={b}
          label={b.name}
          subLabel={match.sideB.map((p) => p.name).join(' / ')}
          ml={myBet?.moneyB ?? previewOdds?.moneyB}
          selected={myBet?.pick === 'B'}
          winner={isFinal && match.computed?.lead < 0}
          loser={isFinal && match.computed?.lead > 0}
          disabled={!isPending || busy}
          onClick={() => place('B')}
        />
      </div>

      {!isPending && !lineupReady && (
        <div className="text-xs text-ink/55">Lineup not set yet.</div>
      )}

      {err && <div className="text-flag text-xs">{err}</div>}

      {myBet && (
        <div className="flex items-center justify-between text-[11px]">
          <div className="text-ink/70">
            {myBet.outcome === 'pending' && (
              <>
                You picked{' '}
                <span className="font-semibold">
                  {labelFor(myBet.pick, a, b)}
                </span>{' '}
                — risking 100 to win {Math.max(0, payoutOf(myBet.moneyOnPick))}.
              </>
            )}
            {myBet.outcome === 'win' && (
              <span className="text-fairway font-semibold">
                Won {myBet.payout > 0 ? '+' : ''}
                {myBet.payout}
              </span>
            )}
            {myBet.outcome === 'loss' && (
              <span className="text-flag font-semibold">Lost {myBet.payout}</span>
            )}
          </div>
          {isPending && (
            <button className="text-flag text-xs underline" onClick={cancel} disabled={busy}>
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PickButton({
  team,
  neutral,
  label,
  subLabel,
  ml,
  selected,
  winner,
  loser,
  disabled,
  onClick,
}) {
  const color = team?.color;
  const bg = selected
    ? color
      ? hexToRgba(color, 0.12)
      : 'rgba(47,90,61,0.1)'
    : 'white';
  const border = winner
    ? color || '#2f5a3d'
    : selected
      ? color || '#2f5a3d'
      : 'rgba(232,220,181,0.7)';
  const opacity = loser ? 0.5 : 1;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border px-2 py-2 text-center transition active:scale-[0.98] disabled:cursor-not-allowed"
      style={{
        background: bg,
        borderColor: border,
        opacity,
        boxShadow: winner ? `0 0 0 2px ${hexToRgba(color || '#2f5a3d', 0.2)}` : 'none',
      }}
    >
      <div
        className="text-[10px] uppercase tracking-widest font-semibold truncate"
        style={{ color: color || '#2f5a3d' }}
      >
        {label} {winner && '✓'}
      </div>
      {subLabel && (
        <div className="text-[10px] text-ink/55 truncate">{subLabel}</div>
      )}
      <div
        className="text-sm font-bold tabular-nums mt-0.5"
        style={{ color: color || '#2f5a3d' }}
      >
        ML {formatMoneyline(ml)}
      </div>
    </button>
  );
}

function Leaderboard({ bettors, highlight }) {
  if (!bettors.length) {
    return (
      <div className="card p-3 text-sm text-ink/60">
        No picks yet. Be the first.
      </div>
    );
  }
  const sorted = [...bettors];
  return (
    <div className="card overflow-hidden">
      <div className="px-3 py-2 flex items-baseline justify-between border-b border-bunker/60">
        <span className="ribbon">Bettor leaderboard</span>
        <span className="text-[10px] uppercase tracking-widest text-ink/45 font-semibold">
          W · open · pts
        </span>
      </div>
      <div className="divide-y divide-bunker/40">
        {sorted.map((b, i) => (
          <div
            key={b.id}
            className={`px-3 py-2 grid grid-cols-[24px_1fr_auto] items-center gap-2 ${
              highlight && b.name.toLowerCase() === highlight.toLowerCase()
                ? 'bg-fairway/5'
                : ''
            }`}
          >
            <div className="text-sm tabular-nums text-ink/55 font-semibold">
              {i + 1}.
            </div>
            <div className="text-sm font-medium truncate">{b.name}</div>
            <div className="flex items-baseline gap-3 text-sm tabular-nums">
              <span className="text-ink/65">
                {b.wins}/{b.settled} · {b.open} open
              </span>
              <span
                className={`font-display font-bold text-base ${
                  b.points >= 0 ? 'text-fairway' : 'text-flag'
                }`}
              >
                {b.points > 0 ? '+' : ''}
                {b.points}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function labelFor(pick, a, b) {
  if (pick === 'A') return a.name;
  if (pick === 'B') return b.name;
  return 'Halve';
}

function payoutOf(ml) {
  if (ml == null) return 0;
  if (ml > 0) return ml;
  return Math.round((100 / Math.abs(ml)) * 100);
}
