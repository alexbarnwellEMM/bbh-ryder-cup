import { Link } from 'react-router-dom';
import { hexToRgba } from '../lib/colors.js';

const FORMAT_LABEL = {
  best_ball: 'Best Ball',
  scramble: 'Scramble',
  alt_shot: 'Alt Shot',
  singles: 'Singles',
};

export default function MatchCard({ match, teams }) {
  const [a, b] = teams;
  const inProgress = match.status === 'in_progress';
  const isFinal = match.status === 'final';
  const c = match.computed;

  const leaderTeam = c?.lead > 0 ? a : c?.lead < 0 ? b : null;
  const leaderColor = leaderTeam?.color;

  const cardStyle = {};
  if (inProgress && leaderColor) {
    cardStyle['--ring'] = hexToRgba(leaderColor, 0.5);
    cardStyle.borderColor = hexToRgba(leaderColor, 0.5);
  } else if (inProgress) {
    cardStyle['--ring'] = 'rgba(47,90,61,0.45)';
    cardStyle.borderColor = 'rgba(47,90,61,0.5)';
  } else if (isFinal && leaderColor) {
    cardStyle.borderColor = hexToRgba(leaderColor, 0.35);
  }

  return (
    <Link
      to={`/score?match=${match.id}`}
      className={`block card p-3 ${inProgress ? 'lead-pulse' : ''}`}
      style={cardStyle}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="pill-muted">{FORMAT_LABEL[match.format] || match.format}</span>
          <span className="pill-muted">{match.teamASize}v{match.teamBSize}</span>
          {match.startHole && (
            <span className="pill-muted">Hole {match.startHole}</span>
          )}
        </div>
        {inProgress && (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-fairway">
            <span className="w-1.5 h-1.5 rounded-full bg-fairway animate-pulse" />
            Live
          </span>
        )}
        {match.status === 'pending' && (
          <span className="text-[10px] uppercase tracking-widest text-ink/40">Pending</span>
        )}
        {isFinal && (
          <span className="text-[10px] uppercase tracking-widest text-ink/50">Final</span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mt-3">
        <PlayerSide team={a} players={match.sideA} dim={isFinal && c?.lead < 0} />
        <ScoreCenter match={match} teams={teams} />
        <PlayerSide
          team={b}
          players={match.sideB}
          alignRight
          dim={isFinal && c?.lead > 0}
        />
      </div>

      <HoleStrip match={match} teamA={a} teamB={b} />
    </Link>
  );
}

function PlayerSide({ team, players, alignRight, dim }) {
  return (
    <div className={`min-w-0 ${alignRight ? 'text-right' : ''}`}>
      <div
        className="text-[10px] uppercase tracking-widest font-semibold"
        style={{ color: team.color }}
      >
        {team.name}
      </div>
      {players.length === 0 ? (
        <div className="text-ink/40 text-sm italic">tbd</div>
      ) : (
        <div
          className={`text-sm font-medium leading-tight ${dim ? 'text-ink/40' : 'text-ink'}`}
        >
          {players.map((p) => p.name).join(' / ')}
        </div>
      )}
    </div>
  );
}

function ScoreCenter({ match, teams }) {
  const [a, b] = teams;
  const c = match.computed;

  if (match.status === 'pending') {
    return (
      <div className="text-center min-w-[80px]">
        <div className="text-3xl font-display font-black text-ink/20 leading-none">—</div>
      </div>
    );
  }

  if (match.status === 'final') {
    if (c.lead === 0) {
      return (
        <div className="text-center min-w-[80px]">
          <div className="text-3xl font-display font-black text-ink leading-none">AS</div>
          <div className="text-[10px] uppercase tracking-widest text-ink/55 mt-1">halved</div>
        </div>
      );
    }
    const winner = c.lead > 0 ? a : b;
    return (
      <div className="text-center min-w-[80px]">
        <div
          className="text-3xl font-display font-black tabular-nums leading-none"
          style={{ color: winner.color }}
        >
          {formatResult(match.result)}
        </div>
        <div
          className="text-[10px] uppercase tracking-widest mt-1 font-semibold"
          style={{ color: winner.color }}
        >
          {winner.name}
        </div>
      </div>
    );
  }

  const leader = c.lead > 0 ? a : c.lead < 0 ? b : null;
  const big = bigStatus(c);
  return (
    <div className="text-center min-w-[80px]">
      <div
        className="text-3xl font-display font-black tabular-nums leading-none"
        style={{ color: leader?.color || '#2c2418' }}
      >
        {big}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-ink/55 mt-1">
        thru {c.holesPlayed}
      </div>
    </div>
  );
}

function HoleStrip({ match, teamA, teamB }) {
  if (!match.holePlayOrder || match.holePlayOrder.length === 0) return null;
  const byIndex = new Map(match.holes.map((h) => [h.holeIndex, h]));
  const order = match.holePlayOrder;

  const gridCols = 'grid grid-cols-[72px_repeat(9,minmax(0,1fr))] items-center gap-x-1';

  return (
    <div className="mt-3 pt-3 border-t border-bunker/50 space-y-1.5">
      <div className={gridCols}>
        <div className="text-[10px] uppercase tracking-[0.15em] text-ink/55 font-semibold text-right pr-1 whitespace-nowrap">
          Hole
        </div>
        {order.map((holeNumber, idx) => {
          const hole = byIndex.get(idx);
          return (
            <HoleDot
              key={idx}
              holeNumber={holeNumber}
              hole={hole}
              teamA={teamA}
              teamB={teamB}
            />
          );
        })}
      </div>
      <div className={gridCols}>
        <TeamLabel team={teamA} />
        {order.map((_, idx) => {
          const hole = byIndex.get(idx);
          return (
            <ScoreCell
              key={`a${idx}`}
              hole={hole}
              side="A"
              teamColor={teamA.color}
            />
          );
        })}
      </div>
      <div className={gridCols}>
        <TeamLabel team={teamB} />
        {order.map((_, idx) => {
          const hole = byIndex.get(idx);
          return (
            <ScoreCell
              key={`b${idx}`}
              hole={hole}
              side="B"
              teamColor={teamB.color}
            />
          );
        })}
      </div>
    </div>
  );
}

function TeamLabel({ team }) {
  return (
    <div
      className="text-[10px] uppercase tracking-[0.15em] font-semibold text-right pr-1 whitespace-nowrap"
      style={{ color: team.color }}
    >
      {team.name}
    </div>
  );
}

function HoleDot({ holeNumber, hole, teamA, teamB }) {
  const winner = hole?.winner;
  let extra = 'bg-cream-dark/60 text-ink/65 border-bunker/60';
  let style = {};

  if (winner === 'A') {
    extra = 'text-white border-transparent';
    style = { background: teamA.color };
  } else if (winner === 'B') {
    extra = 'text-white border-transparent';
    style = { background: teamB.color };
  } else if (winner === 'tie') {
    extra = 'bg-ink/15 text-ink border-bunker/60';
  }

  return (
    <div
      className={`mx-auto w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold tabular-nums ${extra}`}
      style={style}
      aria-label={`Hole ${holeNumber}`}
    >
      {holeNumber}
    </div>
  );
}

function ScoreCell({ hole, side, teamColor }) {
  if (!hole) {
    return <div className="text-center text-[11px] leading-none">&nbsp;</div>;
  }
  const score = side === 'A' ? hole.teamAScore : hole.teamBScore;
  const won = hole.winner === side;
  return (
    <div
      className={`text-center text-[11px] tabular-nums leading-none ${won ? 'font-bold' : 'opacity-60'}`}
      style={{ color: teamColor }}
    >
      {score}
    </div>
  );
}

function bigStatus(c) {
  if (c.lead === 0) return 'AS';
  const abs = Math.abs(c.lead);
  if (abs === c.remaining && c.remaining > 0) return 'DORMIE';
  return `${abs} UP`;
}

function formatResult(r) {
  if (!r) return '';
  if (r.includes('&')) {
    const [w, h] = r.split('&');
    return `${w} & ${h}`;
  }
  return r;
}
