import { deriveMatchState } from './matchEngine';
import {
  calculateBallRuns, doesBatterFaceBall, formatOvers,
  isBowlerCreditedWicket, oversToDecimal,
} from './scoringRules';
import {
  BallDisplayChip, BallEvent, HeadToHeadStats, MatchFormat,
  MatchRecord, MatchRulesConfig, Player, PlayerCareerStats,
} from './types';

export interface CareerFilterOptions {
  format?: MatchFormat | 'ALL';
  season?: string | 'ALL';
  teamId?: string | 'ALL';
  opponentTeamId?: string | 'ALL';
}

export function deriveCareerStats(
  players: Player[],
  matches: MatchRecord[],
  allEvents: BallEvent[],
  filters: CareerFilterOptions = {}
): Record<string, PlayerCareerStats> {
  const playersMap: Record<string, Player> = {};
  players.forEach((p) => { playersMap[p.id] = p; });

  const statsMap: Record<string, PlayerCareerStats> = {};
  const hasBestBowlingRecorded = new Set<string>();

  players.forEach((p) => {
    statsMap[p.id] = {
      playerId: p.id,
      matches: 0,
      inningsBatted: 0,
      notOuts: 0,
      runs: 0,
      ballsFaced: 0,
      highestScore: 0,
      highestScoreNotOut: false,
      average: 0,
      strikeRate: 0,
      fours: 0,
      sixes: 0,
      ducks: 0,
      thirties: 0,
      fifties: 0,
      hundreds: 0,
      inningsBowled: 0,
      legalBallsBowled: 0,
      oversBowledFormatted: '0.0',
      maidens: 0,
      runsConceded: 0,
      wickets: 0,
      bestBowlingWickets: 0,
      bestBowlingRuns: 0,
      bowlingAverage: 0,
      economy: 0,
      bowlingStrikeRate: 0,
      threeWicketHauls: 0,
      fiveWicketHauls: 0,
      hatTricks: 0,
      catches: 0,
      stumpings: 0,
      runOuts: 0,
      potmCount: 0,
      potmMatchIds: [],
      recentForm: [],
      badges: [],
    };
  });

  const filteredMatches = matches.filter((m) => {
    if (filters.format && filters.format !== 'ALL' && m.format !== filters.format) return false;
    if (filters.season && filters.season !== 'ALL' && m.season !== filters.season) return false;
    if (
      filters.teamId &&
      filters.teamId !== 'ALL' &&
      m.teamAId !== filters.teamId &&
      m.teamBId !== filters.teamId
    ) {
      return false;
    }
    if (
      filters.opponentTeamId &&
      filters.opponentTeamId !== 'ALL' &&
      m.teamAId !== filters.opponentTeamId &&
      m.teamBId !== filters.opponentTeamId
    ) {
      return false;
    }
    return true;
  });

  const sortedMatches = [...filteredMatches].sort((a, b) => a.date.localeCompare(b.date));

  for (const match of sortedMatches) {
    const matchEvents = allEvents.filter((e) => e.matchId === match.id);
    const derived = deriveMatchState(match, matchEvents, playersMap);

    const allParticipants = new Set<string>([...match.teamAXI, ...match.teamBXI]);
    for (const pid of allParticipants) {
      if (!statsMap[pid]) continue;
      const playerTeamId = match.teamAXI.includes(pid) ? match.teamAId : match.teamBId;
      const opponentId = playerTeamId === match.teamAId ? match.teamBId : match.teamAId;

      if (filters.teamId && filters.teamId !== 'ALL' && playerTeamId !== filters.teamId) continue;
      if (
        filters.opponentTeamId &&
        filters.opponentTeamId !== 'ALL' &&
        opponentId !== filters.opponentTeamId
      ) {
        continue;
      }

      statsMap[pid].matches += 1;
      if (derived.isMatchCompleted && derived.calculatedPotmPlayerId === pid) {
        statsMap[pid].potmCount += 1;
        statsMap[pid].potmMatchIds?.push(match.id);
      }
    }

    const matchFormTracker = new Map<
      string,
      { runs: number; balls: number; wickets: number; runsConceded: number; opponentTeamId: string }
    >();

    for (const innNum of [1, 2]) {
      const st = derived.inningsStates[innNum];
      if (!st) continue;

      const isBattingInningsAllowed =
        (!filters.teamId || filters.teamId === 'ALL' || st.battingTeamId === filters.teamId) &&
        (!filters.opponentTeamId ||
          filters.opponentTeamId === 'ALL' ||
          st.bowlingTeamId === filters.opponentTeamId);

      const isBowlingInningsAllowed =
        (!filters.teamId || filters.teamId === 'ALL' || st.bowlingTeamId === filters.teamId) &&
        (!filters.opponentTeamId ||
          filters.opponentTeamId === 'ALL' ||
          st.battingTeamId === filters.opponentTeamId);

      if (isBattingInningsAllowed) {
        for (const bRow of st.battingCard) {
          const ps = statsMap[bRow.playerId];
          if (!ps || bRow.status === 'did-not-bat') continue;

          ps.inningsBatted += 1;
          ps.runs += bRow.runs;
          ps.ballsFaced += bRow.balls;
          ps.fours += bRow.fours;
          ps.sixes += bRow.sixes;

          const isNotOut = bRow.status === 'batting' || bRow.status === 'retired-hurt';
          if (isNotOut) ps.notOuts += 1;
          if (
            bRow.runs > ps.highestScore ||
            (bRow.runs === ps.highestScore && isNotOut && !ps.highestScoreNotOut)
          ) {
            ps.highestScore = bRow.runs;
            ps.highestScoreNotOut = isNotOut;
          }
          if (bRow.runs === 0 && !isNotOut) ps.ducks += 1;
          if (bRow.runs >= 30 && bRow.runs < 50) ps.thirties += 1;
          if (bRow.runs >= 50 && bRow.runs < 100) ps.fifties += 1;
          if (bRow.runs >= 100) ps.hundreds += 1;

          const fEntry = matchFormTracker.get(bRow.playerId) || {
            runs: 0, balls: 0, wickets: 0, runsConceded: 0, opponentTeamId: st.bowlingTeamId,
          };
          fEntry.runs += bRow.runs;
          fEntry.balls += bRow.balls;
          matchFormTracker.set(bRow.playerId, fEntry);
        }
      }

      if (isBowlingInningsAllowed) {
        for (const bwRow of st.bowlingCard) {
          const ps = statsMap[bwRow.playerId];
          if (!ps) continue;

          if (bwRow.legalBalls > 0 || bwRow.runsConceded > 0) {
            ps.inningsBowled += 1;
            ps.legalBallsBowled += bwRow.legalBalls;
            ps.maidens += bwRow.maidens;
            ps.runsConceded += bwRow.runsConceded;
            ps.wickets += bwRow.wickets;

            if (
              !hasBestBowlingRecorded.has(bwRow.playerId) ||
              bwRow.wickets > ps.bestBowlingWickets ||
              (bwRow.wickets === ps.bestBowlingWickets && bwRow.runsConceded < ps.bestBowlingRuns)
            ) {
              ps.bestBowlingWickets = bwRow.wickets;
              ps.bestBowlingRuns = bwRow.runsConceded;
              hasBestBowlingRecorded.add(bwRow.playerId);
            }

            if (bwRow.wickets >= 3 && bwRow.wickets < 5) ps.threeWicketHauls += 1;
            if (bwRow.wickets >= 5) ps.fiveWicketHauls += 1;

            const fEntry = matchFormTracker.get(bwRow.playerId) || {
              runs: 0, balls: 0, wickets: 0, runsConceded: 0, opponentTeamId: st.battingTeamId,
            };
            fEntry.wickets += bwRow.wickets;
            fEntry.runsConceded += bwRow.runsConceded;
            matchFormTracker.set(bwRow.playerId, fEntry);
          }
        }

        for (const fow of st.fallOfWickets) {
          if (!fow.fielderId) continue;
          const ps = statsMap[fow.fielderId];
          if (!ps) continue;
          if (fow.wicketType === 'caught') ps.catches += 1;
          if (fow.wicketType === 'stumped') ps.stumpings += 1;
          if (fow.wicketType === 'run-out') ps.runOuts += 1;
        }

        const bowlerDeliveries = new Map<string, boolean[]>();
        const eventMap = new Map<string, BallEvent>();
        for (const ev of matchEvents) eventMap.set(ev.id, ev);
        const derivedChips = st.overSummaries.flatMap((os) => os.balls);
        for (const chip of derivedChips) {
          const ev = eventMap.get(chip.eventId);
          if (!ev || ev.extraType === 'penalty') continue;
          const arr = bowlerDeliveries.get(chip.bowlerId) || [];
          const creditedWkt = Boolean(ev.isWicket && isBowlerCreditedWicket(ev.wicketType));
          arr.push(creditedWkt);
          bowlerDeliveries.set(chip.bowlerId, arr);
        }
        for (const [bId, wktFlags] of bowlerDeliveries.entries()) {
          const ps = statsMap[bId];
          if (!ps) continue;
          let streak = 0;
          for (const isW of wktFlags) {
            if (isW) {
              streak += 1;
              if (streak === 3) {
                ps.hatTricks += 1;
                streak = 0;
              }
            } else {
              streak = 0;
            }
          }
        }
      }
    }

    for (const [pid, fData] of matchFormTracker.entries()) {
      const ps = statsMap[pid];
      if (ps) {
        ps.recentForm.push({
          matchId: match.id,
          date: match.date,
          opponentTeamId: fData.opponentTeamId,
          runs: fData.runs,
          balls: fData.balls,
          wickets: fData.wickets,
          runsConceded: fData.runsConceded,
        });
      }
    }
  }

  for (const ps of Object.values(statsMap)) {
    const dismissals = ps.inningsBatted - ps.notOuts;
    ps.average = dismissals > 0 ? Number((ps.runs / dismissals).toFixed(2)) : ps.runs;
    ps.strikeRate =
      ps.ballsFaced > 0 ? Number(((ps.runs / ps.ballsFaced) * 100).toFixed(2)) : 0;

    ps.oversBowledFormatted = formatOvers(ps.legalBallsBowled, 6);
    const decOvers = oversToDecimal(ps.legalBallsBowled, 6);
    ps.economy = decOvers > 0 ? Number((ps.runsConceded / decOvers).toFixed(2)) : 0;
    ps.bowlingAverage = ps.wickets > 0 ? Number((ps.runsConceded / ps.wickets).toFixed(2)) : 0;
    ps.bowlingStrikeRate =
      ps.wickets > 0 ? Number((ps.legalBallsBowled / ps.wickets).toFixed(1)) : 0;

    const badges: string[] = [];
    if (ps.hundreds > 0) badges.push('Centurion');
    if (ps.fifties > 0) badges.push('Half-Centurion');
    if (ps.fiveWicketHauls > 0) badges.push('5-Wicket Finisher');
    if (ps.hatTricks > 0) badges.push('Hat-Trick Hero');
    if (ps.sixes >= 5) badges.push('Boundary Six Hitter');
    if (ps.catches + ps.stumpings + ps.runOuts >= 3) badges.push('Safe Hands');
    if (ps.potmCount > 0) badges.push('Match Winner (POTM)');
    ps.badges = badges;
  }

  return statsMap;
}

export function deriveHeadToHead(
  batterId: string,
  bowlerId: string,
  allEvents: BallEvent[],
  matchesMap: Record<string, MatchRecord>
): HeadToHeadStats {
  let balls = 0;
  let runs = 0;
  let dismissals = 0;
  let dotBalls = 0;
  let fours = 0;
  let sixes = 0;

  const eventsByMatch = new Map<string, BallEvent[]>();
  for (const ev of allEvents) {
    const arr = eventsByMatch.get(ev.matchId) || [];
    arr.push(ev);
    eventsByMatch.set(ev.matchId, arr);
  }

  for (const [matchId, mEvents] of eventsByMatch.entries()) {
    const match = matchesMap[matchId];
    const rules: MatchRulesConfig = match?.rules || {
      oversPerInnings: 20,
      ballsPerOver: 6,
      wideRuns: 1,
      noBallRuns: 1,
      freeHitEnabled: true,
      powerplayOvers: 6,
      maxOversPerBowler: 4,
    };

    const chipByEventId = new Map<string, BallDisplayChip>();
    if (match) {
      const derived = deriveMatchState(match, mEvents, {});
      for (const st of Object.values(derived.inningsStates)) {
        for (const os of st.overSummaries) {
          for (const chip of os.balls) {
            chipByEventId.set(chip.eventId, chip);
          }
        }
      }
    }

    for (const ev of mEvents) {
      if (ev.actionType !== 'delivery') continue;
      const chip = chipByEventId.get(ev.id);
      const effectiveStrikerId = chip ? chip.strikerId : ev.strikerId;
      const effectiveBowlerId = chip ? chip.bowlerId : ev.bowlerId;

      if (effectiveStrikerId !== batterId || effectiveBowlerId !== bowlerId) continue;

      const calc = calculateBallRuns(ev, rules);
      const faced = doesBatterFaceBall(ev.extraType);
      if (faced) {
        balls += 1;
        if (calc.batterRuns === 0) dotBalls += 1;
      }
      runs += calc.batterRuns;
      if (calc.batterRuns === 4 || (ev.isBoundaryFour && calc.batterRuns > 0)) fours += 1;
      if (calc.batterRuns === 6 || (ev.isBoundarySix && calc.batterRuns > 0)) sixes += 1;

      if (ev.isWicket && isBowlerCreditedWicket(ev.wicketType)) {
        dismissals += 1;
      }
    }
  }

  return {
    batterId,
    bowlerId,
    balls,
    runs,
    dismissals,
    dotBalls,
    fours,
    sixes,
    strikeRate: balls > 0 ? Number(((runs / balls) * 100).toFixed(2)) : 0,
    average: dismissals > 0 ? Number((runs / dismissals).toFixed(2)) : runs,
  };
}
