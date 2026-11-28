import { EN_TRANSLATIONS } from '../i18n/en';
import { TranslationDictionary } from '../i18n/translations';
import {
  formatChaseEquationText,
  formatWinByRunsText,
  formatWinByWicketsText,
} from '../utils/matchSummaryUtils';
import { deriveInningsState } from './inningsEngine';
import { normalizeTournamentGroupKey } from './phase4Helpers';
import {
  BallEvent, DerivedInningsState, DerivedMatchState,
  MatchRecord, Player, Tournament, TournamentStandingRow,
} from './types';

export function deriveMatchState(
  match: MatchRecord,
  events: BallEvent[],
  playersMap: Record<string, Player>,
  teamsNameMap: Record<string, string> = {},
  t: TranslationDictionary = EN_TRANSLATIONS
): DerivedMatchState {
  const inningsStates: Record<number, DerivedInningsState> = {};

  const inn1Setup = match.innings.find((i) => i.inningsNumber === 1);
  if (inn1Setup) {
    inningsStates[1] = deriveInningsState(match, inn1Setup, events, playersMap);
  }

  const inn2Setup = match.innings.find((i) => i.inningsNumber === 2);
  if (inn2Setup) {
    const inn1Target = inningsStates[1] ? inningsStates[1].totalRuns + 1 : undefined;
    inningsStates[2] = deriveInningsState(match, inn2Setup, events, playersMap, inn1Target);
  }

  const inn3Setup = match.innings.find((i) => i.inningsNumber === 3);
  if (inn3Setup) {
    inningsStates[3] = deriveInningsState(match, inn3Setup, events, playersMap);
  }

  const inn4Setup = match.innings.find((i) => i.inningsNumber === 4);
  if (inn4Setup) {
    const inn3Target = inningsStates[3] ? inningsStates[3].totalRuns + 1 : undefined;
    inningsStates[4] = deriveInningsState(match, inn4Setup, events, playersMap, inn3Target);
  }

  const currentInnings =
    inningsStates[match.currentInningsNumber] ||
    inningsStates[1] ||
    deriveInningsState(
      match,
      {
        inningsNumber: 1,
        battingTeamId: match.teamAId,
        bowlingTeamId: match.teamBId,
        openingStrikerId: match.teamAXI[0] || '',
        openingNonStrikerId: match.teamAXI[1] || '',
        openingBowlerId: match.teamBXI[0] || '',
      },
      events,
      playersMap
    );

  let isMatchCompleted = match.status === 'completed' || Boolean(match.isNoResult);
  let winnerTeamId: string | 'tied' | 'no-result' | undefined;
  let resultSummaryText = isMatchCompleted
    ? t.scoring.matchCompletedTitle
    : t.scoring.resultInProgress;

  const inn1 = inningsStates[1];
  const inn2 = inningsStates[2];
  const inn3 = inningsStates[3];
  const inn4 = inningsStates[4];

  if (match.isNoResult) {
    isMatchCompleted = true;
    winnerTeamId = 'no-result';
    resultSummaryText = t.scoring.resultNoResult;
  } else if (inn3 && inn4 && ((inn3.isInningsCompleted && inn4.isInningsCompleted) || isMatchCompleted)) {
    isMatchCompleted = true;
    const team3Name = teamsNameMap[inn3.battingTeamId] || inn3.battingTeamId;
    const team4Name = teamsNameMap[inn4.battingTeamId] || inn4.battingTeamId;
    if (inn4.totalRuns > inn3.totalRuns) {
      winnerTeamId = inn4.battingTeamId;
      resultSummaryText = t.scoring.resultWonSuperOver.replace('{team}', team4Name);
    } else if (inn3.totalRuns > inn4.totalRuns) {
      winnerTeamId = inn3.battingTeamId;
      resultSummaryText = t.scoring.resultWonSuperOver.replace('{team}', team3Name);
    } else {
      winnerTeamId = 'tied';
      resultSummaryText = t.scoring.resultSuperOverTied;
    }
  } else if (
    inn1 &&
    inn2 &&
    !inn3 &&
    ((inn1.isInningsCompleted && inn2.isInningsCompleted) ||
      (isMatchCompleted && (inn1.legalBalls > 0 || inn2.legalBalls > 0)))
  ) {
    isMatchCompleted = true;
    const team1Name = teamsNameMap[inn1.battingTeamId] || inn1.battingTeamId;
    const team2Name = teamsNameMap[inn2.battingTeamId] || inn2.battingTeamId;
    const target = inn2.targetRuns ?? inn1.totalRuns + 1;
    const parScore = target - 1;

    if (inn2.totalRuns >= target) {
      winnerTeamId = inn2.battingTeamId;
      const battingXI = inn2.battingTeamId === match.teamAId ? match.teamAXI : match.teamBXI;
      const maxWkts = Math.max(1, battingXI.length - 1);
      const wktsRemaining = Math.max(1, maxWkts - inn2.wickets);
      resultSummaryText = formatWinByWicketsText(team2Name, wktsRemaining, t);
    } else if (inn2.totalRuns < parScore) {
      winnerTeamId = inn1.battingTeamId;
      const margin = parScore - inn2.totalRuns;
      resultSummaryText = formatWinByRunsText(team1Name, margin, t);
    } else {
      winnerTeamId = 'tied';
      resultSummaryText = t.scoring.resultMatchTied;
    }
  } else if (!isMatchCompleted && inn3 && inn4 && !inn4.isInningsCompleted) {
    const team4Name = teamsNameMap[inn4.battingTeamId] || inn4.battingTeamId;
    resultSummaryText = formatChaseEquationText(
      team4Name,
      inn4.requiredRuns ?? 0,
      inn4.remainingBalls ?? 0,
      t
    );
  } else if (!isMatchCompleted && inn1 && inn2 && !inn2.isInningsCompleted) {
    const team2Name = teamsNameMap[inn2.battingTeamId] || inn2.battingTeamId;
    resultSummaryText = formatChaseEquationText(
      team2Name,
      inn2.requiredRuns ?? 0,
      inn2.remainingBalls ?? 0,
      t
    );
  } else if (!isMatchCompleted && inn1 && inn1.isInningsCompleted && !inn2) {
    resultSummaryText = t.scoring.resultInningsBreakTarget.replace(
      '{target}',
      String(inn1.totalRuns + 1)
    );
  }

  const impactPoints = new Map<string, number>();
  const addPts = (id: string, pts: number) => {
    if (!id) return;
    impactPoints.set(id, (impactPoints.get(id) || 0) + pts);
  };

  Object.values(inningsStates).forEach((st) => {
    st.battingCard.forEach((b) => {
      if (b.status !== 'did-not-bat') {
        addPts(b.playerId, b.runs * 1.2 + b.fours * 1 + b.sixes * 2 + (b.runs >= 50 ? 15 : 0));
      }
    });
    st.bowlingCard.forEach((bw) => {
      addPts(bw.playerId, bw.wickets * 25 + bw.maidens * 8 + bw.dotBalls * 0.5);
    });
    st.fallOfWickets.forEach((fow) => {
      if (fow.fielderId) addPts(fow.fielderId, 10);
    });
  });

  let calculatedPotmPlayerId = match.manualPlayerOfTheMatchId;
  if (!calculatedPotmPlayerId && impactPoints.size > 0) {
    let bestPts = -1;
    for (const [pid, pts] of impactPoints.entries()) {
      if (pts > bestPts) {
        bestPts = pts;
        calculatedPotmPlayerId = pid;
      }
    }
  }

  return {
    matchId: match.id,
    inningsStates,
    currentInnings,
    isMatchCompleted,
    winnerTeamId,
    resultSummaryText,
    calculatedPotmPlayerId,
  };
}

export function recalculateWithEditedEvent(
  match: MatchRecord,
  events: BallEvent[],
  editedEvent: BallEvent,
  playersMap: Record<string, Player>,
  teamsNameMap: Record<string, string> = {}
): { updatedEvents: BallEvent[]; derivedState: DerivedMatchState } {
  const updatedEvents = events.map((ev) => (ev.id === editedEvent.id ? { ...editedEvent } : ev));
  const derivedState = deriveMatchState(match, updatedEvents, playersMap, teamsNameMap);
  return { updatedEvents, derivedState };
}

export function deriveTournamentStandings(
  tournament: Tournament,
  matches: MatchRecord[],
  allEvents: BallEvent[],
  playersMap: Record<string, Player>,
  groupFilter?: string
): TournamentStandingRow[] {
  const rowsMap: Record<string, TournamentStandingRow> = {};

  const filteredTeamIds = tournament.teamIds.filter((teamId) => {
    if (!groupFilter || groupFilter === 'ALL') return true;
    return (
      normalizeTournamentGroupKey(tournament.teamGroups?.[teamId]) ===
      normalizeTournamentGroupKey(groupFilter)
    );
  });

  for (const teamId of filteredTeamIds) {
    rowsMap[teamId] = {
      teamId,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      noResult: 0,
      points: 0,
      runsScored: 0,
      oversFacedForNrr: 0,
      runsConceded: 0,
      oversBowledForNrr: 0,
      netRunRate: 0,
    };
  }

  const knockoutFixtureIds = new Set(
    (tournament.fixtures || [])
      .filter((f) => f.stage && f.stage !== 'league')
      .map((f) => f.id)
  );
  const knockoutMatchIds = new Set(
    (tournament.fixtures || [])
      .filter((f) => f.stage && f.stage !== 'league' && f.matchId)
      .map((f) => f.matchId as string)
  );

  const tournamentMatches = matches.filter(
    (m) =>
      m.tournamentId === tournament.id &&
      (!m.fixtureId || !knockoutFixtureIds.has(m.fixtureId)) &&
      !knockoutMatchIds.has(m.id)
  );

  const ptsNoResult = tournament.pointsForNoResult ?? tournament.pointsForTie ?? 1;

  for (const match of tournamentMatches) {
    const matchEvents = allEvents.filter((e) => e.matchId === match.id);
    const useSummary =
      matchEvents.length === 0 &&
      Boolean(match.summary) &&
      (Boolean(match.isNoResult) || (match.summary?.innings.length ?? 0) > 0);

    const isCompleted = useSummary
      ? match.summary!.status === 'completed' || Boolean(match.isNoResult)
      : deriveMatchState(match, matchEvents, playersMap).isMatchCompleted;
    if (!isCompleted) continue;

    const derived = useSummary ? null : deriveMatchState(match, matchEvents, playersMap);
    const winnerTeamId = useSummary ? match.summary!.winnerTeamId : derived!.winnerTeamId;

    if (match.isNoResult || winnerTeamId === 'no-result') {
      const rA = rowsMap[match.teamAId];
      const rB = rowsMap[match.teamBId];
      if (rA) {
        rA.played += 1;
        rA.noResult = (rA.noResult || 0) + 1;
        rA.points += ptsNoResult;
      }
      if (rB) {
        rB.played += 1;
        rB.noResult = (rB.noResult || 0) + 1;
        rB.points += ptsNoResult;
      }
      continue;
    }

    const inn1 = useSummary
      ? match.summary!.innings.find((i) => i.inningsNumber === 1)
      : derived!.inningsStates[1];
    const inn2 = useSummary
      ? match.summary!.innings.find((i) => i.inningsNumber === 2)
      : derived!.inningsStates[2];
    if (!inn1 || !inn2) continue;

    const inn1Runs = 'totalRuns' in inn1 ? inn1.totalRuns : inn1.runs;
    const inn2Runs = 'totalRuns' in inn2 ? inn2.totalRuns : inn2.runs;
    const inn1MaxOvers = inn1.maxOvers ?? match.rules.oversPerInnings;
    const inn2MaxOvers = inn2.maxOvers ?? match.rules.oversPerInnings;

    const row1 = rowsMap[inn1.battingTeamId];
    const row2 = rowsMap[inn2.battingTeamId];
    if (!row1 && !row2) continue;

    if (row1) row1.played += 1;
    if (row2) row2.played += 1;

    if (winnerTeamId === inn1.battingTeamId) {
      if (row1) {
        row1.won += 1;
        row1.points += tournament.pointsForWin;
      }
      if (row2) row2.lost += 1;
    } else if (winnerTeamId === inn2.battingTeamId) {
      if (row2) {
        row2.won += 1;
        row2.points += tournament.pointsForWin;
      }
      if (row1) row1.lost += 1;
    } else {
      if (row1) {
        row1.tied += 1;
        row1.points += tournament.pointsForTie;
      }
      if (row2) {
        row2.tied += 1;
        row2.points += tournament.pointsForTie;
      }
    }

    const ballsPerOver = match.rules.ballsPerOver || 6;
    const oversFaced1 =
      inn1.completionReason === 'all-out' ? inn1MaxOvers : inn1.legalBalls / ballsPerOver;
    const oversFaced2 =
      inn2.completionReason === 'all-out' ? inn2MaxOvers : inn2.legalBalls / ballsPerOver;

    if (row1) {
      row1.runsScored += inn1Runs;
      row1.oversFacedForNrr += oversFaced1;
      row1.runsConceded += inn2Runs;
      row1.oversBowledForNrr += oversFaced2;
    }

    if (row2) {
      row2.runsScored += inn2Runs;
      row2.oversFacedForNrr += oversFaced2;
      row2.runsConceded += inn1Runs;
      row2.oversBowledForNrr += oversFaced1;
    }
  }

  const standings = Object.values(rowsMap).map((row) => {
    const forRate = row.oversFacedForNrr > 0 ? row.runsScored / row.oversFacedForNrr : 0;
    const againstRate = row.oversBowledForNrr > 0 ? row.runsConceded / row.oversBowledForNrr : 0;
    return {
      ...row,
      oversFacedForNrr: Number(row.oversFacedForNrr.toFixed(2)),
      oversBowledForNrr: Number(row.oversBowledForNrr.toFixed(2)),
      netRunRate: Number((forRate - againstRate).toFixed(3)),
    };
  });

  return standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.netRunRate !== a.netRunRate) return b.netRunRate - a.netRunRate;
    return b.won - a.won;
  });
}
