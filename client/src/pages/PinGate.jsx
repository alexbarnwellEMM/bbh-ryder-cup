import { useState } from 'react';

export default function PinGate({ onLogin }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await onLogin(pin);
    } catch (e) {
      setErr(e.message || 'invalid pin');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-3 max-w-sm mx-auto">
      <div className="text-sm text-ink/75 text-center">Enter scorekeeper PIN to continue.</div>
      <input
        autoFocus
        type="password"
        inputMode="numeric"
        className="input w-full text-2xl text-center tracking-[0.4em]"
        placeholder="••••"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />
      {err && <div className="text-flag text-sm text-center">{err}</div>}
      <button className="btn btn-primary w-full" disabled={busy || !pin}>
        Unlock
      </button>
    </form>
  );
}
