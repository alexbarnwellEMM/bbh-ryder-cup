import { Link } from 'react-router-dom';
import { hexToRgba } from '../lib/colors.js';
import { computeOdds, formatMoneyline } from '../lib/odds.js';

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
          <span className="pill-muted">{formatWeight(match.pointsWeight)} pt</span>
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

      {(() => {
        let odds = null;
        if (inProgress) odds = computeOdds(match);
        else if (match.status === 'pending') odds = computeOdds(match, { preMatch: true });
        else if (isFinal) odds = computeOdds(match, { preMatch: true });

        const aLabel = odds ? `ML ${formatMoneyline(odds.moneyA)}` : null;
        const bLabel = odds ? `ML ${formatMoneyline(odds.moneyB)}` : null;

        const winner = isFinal && c
          ? c.lead > 0 ? 'A' : c.lead < 0 ? 'B' : 'halve'
          : null;

        return (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mt-3">
              <PlayerSide
                team={a}
                players={match.sideA}
                odds={aLabel}
                oddsTone={oddsToneFor('A', winner)}
                dim={isFinal && c?.lead < 0}
              />
              <ScoreCenter match={match} teams={teams} />
              <PlayerSide
                team={b}
                players={match.sideB}
                odds={bLabel}
                oddsTone={oddsToneFor('B', winner)}
                alignRight
                dim={isFinal && c?.lead > 0}
              />
            </div>
            {odds && (match.status === 'pending' || isFinal) && (
              <HalveOddsLine
                odds={odds}
                highlight={winner === 'halve'}
                isFinal={isFinal}
              />
            )}
          </>
        );
      })()}

      <HoleStrip match={match} teamA={a} teamB={b} />
    </Link>
  );
}

function PlayerSide({ team, players, alignRight, dim, odds, oddsTone }) {
  const namesNode =
    players.length === 0 ? (
      <span className="text-ink/40 text-sm italic">tbd</span>
    ) : (
      <span
        className={`text-sm font-medium leading-tight ${dim ? 'text-ink/40' : 'text-ink'}`}
      >
        {players.map((p) => p.name).join(' / ')}
      </span>
    );

  let oddsClass = 'text-ink/55';
  let oddsStyle = undefined;
  let oddsWeight = 'font-semibold';
  if (oddsTone === 'win') {
    oddsClass = '';
    oddsStyle = { color: team.color };
    oddsWeight = 'font-bold';
  } else if (oddsTone === 'loss') {
    oddsClass = 'text-ink/30';
    oddsWeight = 'font-medium';
  }

  const oddsNode = odds ? (
    <span
      className={`text-[11px] tabular-nums leading-none ${oddsWeight} ${oddsClass}`}
      style={oddsStyle}
    >
      {odds}
      {oddsTone === 'win' && <span className="ml-1">✓</span>}
    </span>
  ) : null;

  return (
    <div className={`min-w-0 ${alignRight ? 'text-right' : ''}`}>
      <div
        className="text-[10px] uppercase tracking-widest font-semibold"
        style={{ color: team.color }}
      >
        {team.name}
      </div>
      <div
        className={`flex items-baseline gap-1.5 flex-wrap ${alignRight ? 'justify-end' : ''}`}
      >
        {alignRight ? (
          <>
            {oddsNode}
            {namesNode}
          </>
        ) : (
          <>
            {namesNode}
            {oddsNode}
          </>
        )}
      </div>
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

  if (c.inOvertime) {
    return (
      <div className="text-center min-w-[80px]">
        <div className="text-3xl font-display font-black text-flag leading-none">OT</div>
        <div className="text-[10px] uppercase tracking-widest text-ink/55 mt-1">
          next OT {c.holesPlayed - 8}
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
  const order = match.holePlayOrder.slice(0, 9);
  const otOrder = match.holePlayOrder.slice(9);
  const isBestBall =
    match.format === 'best_ball' &&
    match.sideA.length === 2 &&
    match.sideB.length === 2;

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

      {isBestBall ? (
        <>
          <TeamSubheader team={teamA} />
          {match.sideA.map((p) => (
            <PlayerScoreRow
              key={`a-${p.id}`}
              gridCols={gridCols}
              player={p}
              side="A"
              teamColor={teamA.color}
              order={order}
              byIndex={byIndex}
            />
          ))}
          <TeamSubheader team={teamB} />
          {match.sideB.map((p) => (
            <PlayerScoreRow
              key={`b-${p.id}`}
              gridCols={gridCols}
              player={p}
              side="B"
              teamColor={teamB.color}
              order={order}
              byIndex={byIndex}
            />
          ))}
        </>
      ) : (
        <>
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
        </>
      )}

      {otOrder.length > 0 && (
        <OTStrip
          otOrder={otOrder}
          byIndex={byIndex}
          teamA={teamA}
          teamB={teamB}
        />
      )}
    </div>
  );
}

function OTStrip({ otOrder, byIndex, teamA, teamB }) {
  return (
    <div className="mt-2 pt-2 border-t border-dashed border-bunker">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-widest text-flag font-bold">
          Overtime
        </span>
        <span className="flex-1 h-px bg-bunker/60" />
      </div>
      <div className="flex items-stretch gap-1 flex-wrap">
        {otOrder.map((holeNumber, i) => {
          const idx = 9 + i;
          const hole = byIndex.get(idx);
          return (
            <div key={idx} className="flex flex-col items-center gap-0.5 min-w-[36px]">
              <div className="text-[10px] uppercase tracking-widest font-semibold text-ink/55">
                OT {i + 1}
              </div>
              <HoleDot
                holeNumber={holeNumber}
                hole={hole}
                teamA={teamA}
                teamB={teamB}
              />
              {hole && (
                <div className="text-[10px] tabular-nums flex gap-1">
                  <span style={{ color: teamA.color }}>{hole.teamAScore}</span>
                  <span className="text-ink/30">·</span>
                  <span style={{ color: teamB.color }}>{hole.teamBScore}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamSubheader({ team }) {
  return (
    <div
      className="text-[10px] uppercase tracking-widest font-semibold pt-1 pl-1"
      style={{ color: team.color }}
    >
      {team.name}
    </div>
  );
}

function PlayerScoreRow({ gridCols, player, side, teamColor, order, byIndex }) {
  return (
    <div className={gridCols}>
      <div className="text-[10px] text-ink/70 text-right pr-1 truncate font-medium pl-3">
        {player.name}
      </div>
      {order.map((_, idx) => {
        const hole = byIndex.get(idx);
        if (!hole) {
          return (
            <div
              key={idx}
              className="text-center text-[11px] leading-none"
            >
              &nbsp;
            </div>
          );
        }
        const score = hole.playerScores?.[player.id];
        if (score == null) {
          return (
            <div
              key={idx}
              className="text-center text-[11px] leading-none text-ink/25"
            >
              &nbsp;
            </div>
          );
        }
        const teamBest = side === 'A' ? hole.teamAScore : hole.teamBScore;
        const isBest = score === teamBest;
        const won = hole.winner === side;
        let weight = 'opacity-45';
        if (isBest && won) weight = 'font-bold';
        else if (isBest) weight = 'font-semibold opacity-90';
        return (
          <div
            key={idx}
            className={`text-center text-[11px] tabular-nums leading-none ${weight}`}
            style={{ color: teamColor }}
          >
            {score}
          </div>
        );
      })}
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

function HalveOddsLine({ odds, highlight, isFinal }) {
  const labelTone = highlight
    ? 'text-fairway font-bold'
    : isFinal
      ? 'text-ink/35'
      : 'text-ink/55';
  return (
    <div className={`text-center text-[10px] uppercase tracking-widest mt-1.5 ${labelTone}`}>
      {isFinal ? 'Pre-match halve' : 'Halve'}{' '}
      <span className="tabular-nums normal-case">
        ML {formatMoneyline(odds.moneyHalve)}
      </span>
      {highlight && <span className="ml-1">✓</span>}
    </div>
  );
}

function oddsToneFor(side, winner) {
  if (!winner) return 'neutral';
  if (winner === side) return 'win';
  return 'loss';
}

function bigStatus(c) {
  if (c.lead === 0) return 'AS';
  const abs = Math.abs(c.lead);
  if (abs === c.remaining && c.remaining > 0) return 'DORMIE';
  return `${abs} UP`;
}

function formatWeight(w) {
  const v = w ?? 1;
  if (v === 0.5) return '½';
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/\.?0+$/, '');
}

function formatResult(r) {
  if (!r) return '';
  if (r.includes('&')) {
    const [w, h] = r.split('&');
    return `${w} & ${h}`;
  }
  return r;
}
