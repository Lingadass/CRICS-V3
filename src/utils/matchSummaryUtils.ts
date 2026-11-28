import { deriveMatchState } from '../engine/matchEngine';
import {
  BallEvent,
  DerivedMatchState,
  MatchInningsSummary,
  MatchRecord,
  MatchResultKind,
  MatchSummary,
  Player,
  Team,
} from '../engine/types';
import { EN_TRANSLATIONS } from '../i18n/en';
import { TranslationDictionary } from '../i18n/translations';

export function formatChaseEquationText(
  teamName: string,
  requiredRuns: number,
  remainingBalls: number,
  t: TranslationDictionary = EN_TRANSLATIONS
): string {
  const runs = Math.max(0, requiredRuns);
  const balls = Math.max(0, remainingBalls);
  let template = t.scoring.chaseNeedManyRunsManyBalls;
  if (runs === 1 && balls === 1) {
    template = t.scoring.chaseNeedOneRunOneBall;
  } else if (runs === 1) {
    template = t.scoring.chaseNeedOneRunManyBalls;
  } else if (balls === 1) {
    template = t.scoring.chaseNeedManyRunsOneBall;
  }
  return template
    .replace('{team}', teamName)
    .replace('{runs}', String(runs))
    .replace('{balls}', String(balls));
}

export function formatChaseStripEquationText(
  requiredRuns: number,
  remainingBalls: number,
  t: TranslationDictionary = EN_TRANSLATIONS
): string {
  const runs = Math.max(0, requiredRuns);
  const balls = Math.max(0, remainingBalls);
  let template = t.scoring.chaseStripManyRunsManyBalls;
  if (runs === 1 && balls === 1) {
    template = t.scoring.chaseStripOneRunOneBall;
  } else if (runs === 1) {
    template = t.scoring.chaseStripOneRunManyBalls;
  } else if (balls === 1) {
    template = t.scoring.chaseStripManyRunsOneBall;
  }
  return template.replace('{runs}', String(runs)).replace('{balls}', String(balls));
}

export function formatWinByRunsText(
  teamName: string,
  marginRuns: number,
  t: TranslationDictionary = EN_TRANSLATIONS
): string {
  const margin = Math.max(1, marginRuns);
  const template = margin === 1 ? t.scoring.wonByOneRun : t.scoring.wonByManyRuns;
  return template.replace('{team}', teamName).replace('{runs}', String(margin));
}

export function formatWinByWicketsText(
  teamName: string,
  marginWickets: number,
  t: TranslationDictionary = EN_TRANSLATIONS
): string {
  const margin = Math.max(1, marginWickets);
  const template = margin === 1 ? t.scoring.wonByOneWicket : t.scoring.wonByManyWickets;
  return template.replace('{team}', teamName).replace('{wickets}', String(margin));
}

export function formatMatchResultText(
  summary: MatchSummary,
  teamsNameMap: Record<string, string> = {},
  t: TranslationDictionary = EN_TRANSLATIONS
): string {
  const getTeamName = (teamId?: string) =>
    teamId ? teamsNameMap[teamId] || teamId : '';

  switch (summary.resultKind) {
    case 'no-result':
      return t.scoring.resultNoResult;
    case 'super-over-win': {
      const winner = getTeamName(
        summary.winnerTeamId &&
          summary.winnerTeamId !== 'tied' &&
          summary.winnerTeamId !== 'no-result'
          ? summary.winnerTeamId
          : undefined
      );
      return t.scoring.resultWonSuperOver.replace('{team}', winner);
    }
    case 'super-over-tie':
      return t.scoring.resultSuperOverTied;
    case 'win-by-wickets': {
      const winner = getTeamName(
        summary.winnerTeamId &&
          summary.winnerTeamId !== 'tied' &&
          summary.winnerTeamId !== 'no-result'
          ? summary.winnerTeamId
          : undefined
      );
      return formatWinByWicketsText(winner, summary.marginWickets ?? 1, t);
    }
    case 'win-by-runs': {
      const winner = getTeamName(
        summary.winnerTeamId &&
          summary.winnerTeamId !== 'tied' &&
          summary.winnerTeamId !== 'no-result'
          ? summary.winnerTeamId
          : undefined
      );
      return formatWinByRunsText(winner, summary.marginRuns ?? 1, t);
    }
    case 'tie':
      return t.scoring.resultMatchTied;
    case 'chase-need': {
      if (summary.status === 'completed') {
        return t.scoring.matchCompletedTitle;
      }
      const chaser = getTeamName(summary.chasingTeamId);
      return formatChaseEquationText(
        chaser,
        summary.requiredRuns ?? 0,
        summary.remainingBalls ?? 0,
        t
      );
    }
    case 'innings-break': {
      if (summary.status === 'completed') {
        return t.scoring.matchCompletedTitle;
      }
      return t.scoring.resultInningsBreakTarget.replace(
        '{target}',
        String(summary.targetRuns ?? 1)
      );
    }
    case 'completed':
      return t.scoring.matchCompletedTitle;
    case 'in-progress':
      return summary.status === 'completed'
        ? t.scoring.matchCompletedTitle
        : t.scoring.resultInProgress;
    default: {
      if (
        summary.status === 'completed' &&
        summary.resultText &&
        /\bneed\b/i.test(summary.resultText)
      ) {
        return t.scoring.matchCompletedTitle;
      }
      return summary.resultText || t.scoring.resultInProgress;
    }
  }
}

export function buildMatchSummaryFromDerived(
  match: MatchRecord,
  derived: DerivedMatchState,
  recordedBallsCount: number,
  teamsNameMap: Record<string, string> = {},
  t: TranslationDictionary = EN_TRANSLATIONS
): MatchSummary {
  const orderedNums = ([1, 2, 3, 4] as const).filter(
    (n) => Boolean(derived.inningsStates[n])
  );
  const innings: MatchInningsSummary[] = orderedNums.map((num) => {
    const st = derived.inningsStates[num];
    return {
      inningsNumber: st.inningsNumber,
      battingTeamId: st.battingTeamId,
      bowlingTeamId: st.bowlingTeamId,
      runs: st.totalRuns,
      wickets: st.wickets,
      legalBalls: st.legalBalls,
      oversText: st.oversFormatted,
      maxOvers: st.maxOvers,
      currentRunRate: st.currentRunRate,
      targetRuns: st.targetRuns,
      requiredRuns: st.requiredRuns,
      remainingBalls: st.remainingBalls,
      requiredRunRate: st.requiredRunRate,
      strikerId: st.strikerId,
      nonStrikerId: st.nonStrikerId,
      currentBowlerId: st.currentBowlerId,
      isCompleted: st.isInningsCompleted,
      completionReason: st.completionReason,
      isSuperOver: st.isSuperOver,
    };
  });

  const inn1 = derived.inningsStates[1];
  const inn2 = derived.inningsStates[2];
  const inn3 = derived.inningsStates[3];
  const inn4 = derived.inningsStates[4];

  const isCompleted =
    match.status === 'completed' || Boolean(match.isNoResult) || derived.isMatchCompleted;
  const status: 'live' | 'innings-break' | 'completed' = isCompleted
    ? 'completed'
    : match.status === 'innings-break' || (inn1?.isInningsCompleted && !inn2)
    ? 'innings-break'
    : 'live';

  let resultKind: MatchResultKind = isCompleted ? 'completed' : 'in-progress';
  let winnerTeamId: string | 'tied' | 'no-result' | undefined = derived.winnerTeamId;
  let marginRuns: number | undefined;
  let marginWickets: number | undefined;
  let chasingTeamId: string | undefined;
  let requiredRuns: number | undefined;
  let remainingBalls: number | undefined;
  let targetRuns: number | undefined;

  if (match.isNoResult || derived.winnerTeamId === 'no-result') {
    resultKind = 'no-result';
    winnerTeamId = 'no-result';
  } else if (
    inn3 &&
    inn4 &&
    ((inn3.isInningsCompleted && inn4.isInningsCompleted) || isCompleted)
  ) {
    if (inn4.totalRuns > inn3.totalRuns) {
      resultKind = 'super-over-win';
      winnerTeamId = inn4.battingTeamId;
    } else if (inn3.totalRuns > inn4.totalRuns) {
      resultKind = 'super-over-win';
      winnerTeamId = inn3.battingTeamId;
    } else {
      resultKind = 'super-over-tie';
      winnerTeamId = 'tied';
    }
  } else if (
    inn1 &&
    inn2 &&
    !inn3 &&
    ((inn1.isInningsCompleted && inn2.isInningsCompleted) ||
      (isCompleted && (inn1.legalBalls > 0 || inn2.legalBalls > 0)))
  ) {
    const target = inn2.targetRuns ?? inn1.totalRuns + 1;
    const parScore = target - 1;
    if (inn2.totalRuns >= target) {
      resultKind = 'win-by-wickets';
      winnerTeamId = inn2.battingTeamId;
      const battingXI =
        inn2.battingTeamId === match.teamAId ? match.teamAXI : match.teamBXI;
      const maxWkts = Math.max(1, battingXI.length - 1);
      marginWickets = Math.max(1, maxWkts - inn2.wickets);
    } else if (inn2.totalRuns < parScore) {
      resultKind = 'win-by-runs';
      winnerTeamId = inn1.battingTeamId;
      marginRuns = Math.max(1, parScore - inn2.totalRuns);
    } else {
      resultKind = 'tie';
      winnerTeamId = 'tied';
    }
  } else if (!isCompleted && inn3 && inn4 && !inn4.isInningsCompleted) {
    resultKind = 'chase-need';
    chasingTeamId = inn4.battingTeamId;
    targetRuns = inn4.targetRuns ?? inn3.totalRuns + 1;
    requiredRuns = inn4.requiredRuns ?? Math.max(0, targetRuns - inn4.totalRuns);
    remainingBalls =
      inn4.remainingBalls ?? Math.max(0, inn4.maxOvers * 6 - inn4.legalBalls);
  } else if (!isCompleted && inn1 && inn2 && !inn2.isInningsCompleted) {
    resultKind = 'chase-need';
    chasingTeamId = inn2.battingTeamId;
    targetRuns = inn2.targetRuns ?? inn1.totalRuns + 1;
    requiredRuns = inn2.requiredRuns ?? Math.max(0, targetRuns - inn2.totalRuns);
    remainingBalls =
      inn2.remainingBalls ?? Math.max(0, inn2.maxOvers * 6 - inn2.legalBalls);
  } else if (!isCompleted && inn1 && inn1.isInningsCompleted && !inn2) {
    resultKind = 'innings-break';
    targetRuns = inn1.totalRuns + 1;
  }

  const partialSummary: MatchSummary = {
    innings,
    status,
    resultText: '',
    resultKind,
    winnerTeamId,
    marginRuns,
    marginWickets,
    chasingTeamId,
    requiredRuns,
    remainingBalls,
    targetRuns,
    recordedBallsCount,
  };

  partialSummary.resultText = formatMatchResultText(partialSummary, teamsNameMap, t);
  return partialSummary;
}

export function buildMatchSummary(
  match: MatchRecord,
  events: BallEvent[],
  playersMap: Record<string, Player> = {},
  teamsNameMap: Record<string, string> = {},
  t: TranslationDictionary = EN_TRANSLATIONS
): MatchSummary {
  const matchEvents = events.filter((e) => e.matchId === match.id);
  const derived = deriveMatchState(match, matchEvents, playersMap, teamsNameMap);
  return buildMatchSummaryFromDerived(
    match,
    derived,
    matchEvents.length,
    teamsNameMap,
    t
  );
}

export function backfillMatchSummariesPure(
  matches: MatchRecord[],
  ballEvents: BallEvent[],
  players: Player[],
  teams: Team[],
  t: TranslationDictionary = EN_TRANSLATIONS
): MatchRecord[] {
  const playersMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const teamsNameMap = Object.fromEntries(teams.map((tm) => [tm.id, tm.name]));
  const eventsByMatch = new Map<string, BallEvent[]>();

  for (const ev of ballEvents) {
    const list = eventsByMatch.get(ev.matchId) || [];
    list.push(ev);
    eventsByMatch.set(ev.matchId, list);
  }

  return matches.map((m) => {
    const matchEvents = eventsByMatch.get(m.id) || [];
    if (m.summary && matchEvents.length === 0 && (m.summary.recordedBallsCount ?? 0) > 0) {
      return m;
    }
    const summary = buildMatchSummary(m, matchEvents, playersMap, teamsNameMap, t);
    return {
      ...m,
      status: summary.status === 'completed' ? 'completed' : m.status,
      summary,
    };
  });
}

/**
 * Pure helper that scans ballEvents per match/innings and inserts explicit 'bowler-change'
 * events wherever a legacy 'delivery' event changed bowlerId without an explicit bowler-change event.
 */
export function normalizeLegacyBowlerChanges(
  matches: MatchRecord[],
  ballEvents: BallEvent[]
): { normalizedEvents: BallEvent[]; insertedCount: number } {
  const matchMap = new Map<string, MatchRecord>();
  for (const m of matches) matchMap.set(m.id, m);

  const eventsByMatch = new Map<string, BallEvent[]>();
  for (const ev of ballEvents) {
    const list = eventsByMatch.get(ev.matchId) || [];
    list.push(ev);
    eventsByMatch.set(ev.matchId, list);
  }

  const normalizedEvents: BallEvent[] = [];
  let insertedCount = 0;

  for (const [matchId, matchEvents] of eventsByMatch.entries()) {
    const match = matchMap.get(matchId);
    const activeBowlerByInnings = new Map<number, string>();
    if (match) {
      for (const inn of match.innings || []) {
        if (inn.openingBowlerId) activeBowlerByInnings.set(inn.inningsNumber, inn.openingBowlerId);
      }
    }

    const sorted = [...matchEvents].sort((a, b) => a.sequence - b.sequence);
    let nextSeq = 1;

    for (const ev of sorted) {
      if (ev.actionType === 'bowler-change' && ev.newBowlerId) {
        activeBowlerByInnings.set(ev.inningsNumber, ev.newBowlerId);
        normalizedEvents.push({ ...ev, sequence: nextSeq++ });
        continue;
      }

      if (ev.actionType === 'delivery') {
        const currentBowler = activeBowlerByInnings.get(ev.inningsNumber);
        if (!currentBowler && ev.bowlerId) {
          activeBowlerByInnings.set(ev.inningsNumber, ev.bowlerId);
        } else if (currentBowler && ev.bowlerId && ev.bowlerId !== currentBowler) {
          normalizedEvents.push({
            id: `${ev.matchId}-BC-MIG-${ev.id}`,
            matchId: ev.matchId,
            inningsNumber: ev.inningsNumber,
            sequence: nextSeq++,
            timestamp: ev.timestamp,
            actionType: 'bowler-change',
            strikerId: ev.strikerId,
            nonStrikerId: ev.nonStrikerId,
            bowlerId: currentBowler,
            newBowlerId: ev.bowlerId,
            bowlerChangeReason: 'end-of-over',
            runsOffBat: 0,
            extraType: 'none',
            extraRuns: 0,
            isWicket: false,
            isSample: ev.isSample,
          });
          activeBowlerByInnings.set(ev.inningsNumber, ev.bowlerId);
          insertedCount += 1;
        }
      }

      normalizedEvents.push({ ...ev, sequence: nextSeq++ });
    }
  }

  return { normalizedEvents, insertedCount };
}

