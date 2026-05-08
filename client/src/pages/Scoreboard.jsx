import TeamScore from '../components/TeamScore.jsx';
import MatchCard from '../components/MatchCard.jsx';

export default function Scoreboard({ state }) {
  const { teams, sessions, totals, tournamentFinal, tieAfterAll, tiebreaker } = state;

  return (
    <div className="space-y-5">
      <TeamScore
        teams={teams}
        totals={totals}
        matches={state.matches}
        tournamentFinal={tournamentFinal}
      />

      {tieAfterAll && !tiebreaker?.winner && (
        <div className="card p-3 border-flag/40 bg-flag/5">
          <div className="text-flag text-sm font-semibold">All matches complete · 6–6</div>
          <div className="text-ink/70 text-xs mt-1">
            Captains, head to the Tiebreaker tab to enter the 3 holes.
          </div>
        </div>
      )}

      {sessions.map((s) => (
        <section key={s.id} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="ribbon">{s.name}</span>
            <span className="flex-1 h-px bg-bunker/60" />
          </div>
          <div className="space-y-2">
            {s.matches.map((m) => (
              <MatchCard key={m.id} match={m} teams={teams} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
