import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSSE } from './hooks/useSSE.js';
import { api } from './lib/api.js';
import FlagIcon from './components/FlagIcon.jsx';
import Join from './pages/Join.jsx';
import Scoreboard from './pages/Scoreboard.jsx';
import Setup from './pages/Setup.jsx';
import Scorekeeper from './pages/Scorekeeper.jsx';
import Players from './pages/Players.jsx';
import Picks from './pages/Picks.jsx';
import Tiebreaker from './pages/Tiebreaker.jsx';
import Final from './pages/Final.jsx';

export default function App() {
  const { state, connected } = useSSE('/api/sse');
  const [isScorekeeper, setIsScorekeeper] = useState(false);

  useEffect(() => {
    api.authMe().then((r) => setIsScorekeeper(!!r?.isScorekeeper)).catch(() => {});
  }, []);

  async function login(pin) {
    await api.authPin(pin);
    setIsScorekeeper(true);
  }

  async function logout() {
    await api.logout();
    setIsScorekeeper(false);
  }

  if (!state) {
    return (
      <div className="h-full flex items-center justify-center text-ink/60">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-full pb-24">
      <header className="sticky top-0 z-30 bg-cream/85 backdrop-blur border-b border-bunker/60">
        <div className="max-w-3xl mx-auto px-3 py-2.5 flex items-center justify-between gap-3">
          <NavLink to="/scoreboard" className="flex items-center gap-2 text-ink">
            <FlagIcon className="w-5 h-5" />
            <div className="leading-tight">
              <div className="font-display font-bold text-base tracking-tight">BBH Ryder Cup</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-fairway/80 font-semibold">
                Sweetens Cove
              </div>
            </div>
          </NavLink>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-fairway' : 'bg-fescue'}`}
              title={connected ? 'live' : 'reconnecting'}
            />
            <span className="text-ink/60">{connected ? 'Live' : 'Connecting…'}</span>
          </div>
        </div>
        <nav className="max-w-3xl mx-auto px-3 pb-2 flex gap-1 text-sm overflow-x-auto">
          <Tab to="/scoreboard">Board</Tab>
          <Tab to="/setup">Setup</Tab>
          <Tab to="/score">Scorekeeper</Tab>
          <Tab to="/players">Records</Tab>
          <Tab to="/picks">Picks</Tab>
          {(state.tieAfterAll || state.tiebreaker?.active) && <Tab to="/tiebreaker">Tiebreaker</Tab>}
          {state.tournamentFinal && <Tab to="/final">Final</Tab>}
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-3 py-4">
        <Routes>
          <Route path="/" element={<Navigate to="/join" replace />} />
          <Route path="/join" element={<Join state={state} />} />
          <Route path="/scoreboard" element={<Scoreboard state={state} />} />
          <Route
            path="/setup"
            element={
              <Setup
                state={state}
                isScorekeeper={isScorekeeper}
                onLogin={login}
                onLogout={logout}
              />
            }
          />
          <Route
            path="/score"
            element={
              <Scorekeeper
                state={state}
                isScorekeeper={isScorekeeper}
                onLogin={login}
                onLogout={logout}
              />
            }
          />
          <Route path="/players" element={<Players state={state} />} />
          <Route path="/picks" element={<Picks state={state} />} />
          <Route
            path="/tiebreaker"
            element={
              <Tiebreaker
                state={state}
                isScorekeeper={isScorekeeper}
                onLogin={login}
              />
            }
          />
          <Route path="/final" element={<Final state={state} />} />
          <Route path="*" element={<Navigate to="/scoreboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Tab({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-full whitespace-nowrap transition ${
          isActive
            ? 'bg-white border border-bunker text-ink shadow-sm'
            : 'border border-transparent text-ink/55 hover:text-ink'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
