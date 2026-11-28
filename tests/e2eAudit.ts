import {
  db,
  exportDatabaseToJson,
  importDatabaseFromJson,
  recordBallEventWithAutoSequenceAtomic,
  validateBackupPayload,
} from '../src/db/database';
import { deriveCareerStats, deriveMatchState } from '../src/engine/scoringEngine';
import { MatchRecord, Player, Team } from '../src/engine/types';

export interface EndToEndOfflineAuditReport {
  coldStartEmpty: boolean;
  innings1Score: { runs: number; wickets: number; legalBalls: number };
  innings2Score: { runs: number; wickets: number; legalBalls: number };
  isMatchCompleted: boolean;
  resultText: string;
  careerVerified: boolean;
  backupRestoredIdentically: boolean;
}

export async function runEndToEndOfflineAudit(): Promise<EndToEndOfflineAuditReport> {
  const [initPlayers, initTeams, initMatches, initBalls] = await Promise.all([
    db.players.count(),
    db.teams.count(),
    db.matches.count(),
    db.ballEvents.count(),
  ]);
  const coldStartEmpty =
    initPlayers === 0 && initTeams === 0 && initMatches === 0 && initBalls === 0;

  const now = Date.now();
  const players: Player[] = [];
  const playersMap: Record<string, Player> = {};

  for (let i = 1; i <= 11; i++) {
    const pA: Player = {
      id: `P-A${i}`,
      name: `Alpha Player ${i}`,
      dob: '1998-01-01',
      role: i === 1 ? 'Wicket-Keeper' : i <= 5 ? 'Batter' : 'Bowler',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm medium',
      jerseyNumber: i,
      createdAt: now,
    };
    const pB: Player = {
      id: `P-B${i}`,
      name: `Bravo Player ${i}`,
      dob: '1998-06-15',
      role: i === 1 ? 'Wicket-Keeper' : i <= 5 ? 'Batter' : 'Bowler',
      battingStyle: 'Left-hand bat',
      bowlingStyle: 'Right-arm fast',
      jerseyNumber: i + 10,
      createdAt: now,
    };
    players.push(pA, pB);
    playersMap[pA.id] = pA;
    playersMap[pB.id] = pB;
  }

  const teamA: Team = {
    id: 'TEAM-A',
    name: 'Alpha XI',
    shortName: 'ALP',
    primaryColor: '#059669',
    playerIds: Array.from({ length: 11 }, (_, i) => `P-A${i + 1}`),
    captainId: 'P-A1',
    viceCaptainId: 'P-A2',
    createdAt: now,
  };
  const teamB: Team = {
    id: 'TEAM-B',
    name: 'Bravo XI',
    shortName: 'BRV',
    primaryColor: '#2563eb',
    playerIds: Array.from({ length: 11 }, (_, i) => `P-B${i + 1}`),
    captainId: 'P-B1',
    viceCaptainId: 'P-B2',
    createdAt: now,
  };

  const match: MatchRecord = {
    id: 'MATCH-E2E-1',
    title: 'Alpha XI vs Bravo XI',
    format: 'Custom',
    season: '2026',
    venue: 'Offline Oval',
    date: '2026-11-13',
    scorerName: 'Offline E2E Scorer',
    status: 'live',
    teamAId: teamA.id,
    teamBId: teamB.id,
    teamAXI: teamA.playerIds,
    teamBXI: teamB.playerIds,
    tossWinnerTeamId: teamA.id,
    tossDecision: 'bat',
    rules: {
      oversPerInnings: 1,
      ballsPerOver: 6,
      wideRuns: 1,
      noBallRuns: 1,
      freeHitEnabled: true,
      powerplayOvers: 1,
      maxOversPerBowler: 1,
    },
    currentInningsNumber: 1,
    innings: [
      {
        inningsNumber: 1,
        battingTeamId: teamA.id,
        bowlingTeamId: teamB.id,
        openingStrikerId: 'P-A1',
        openingNonStrikerId: 'P-A2',
        openingBowlerId: 'P-B6',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  await db.players.bulkPut(players);
  await db.teams.bulkPut([teamA, teamB]);
  await db.matches.put(match);

  // Innings 1 deliveries (1 over = 6 legal balls, total 18/1)
  const inn1Deliveries = [
    { strikerId: 'P-A1', nonStrikerId: 'P-A2', runsOffBat: 4, extraType: 'none' as const, extraRuns: 0, isWicket: false },
    { strikerId: 'P-A1', nonStrikerId: 'P-A2', runsOffBat: 0, extraType: 'wide' as const, extraRuns: 0, isWicket: false },
    { strikerId: 'P-A1', nonStrikerId: 'P-A2', runsOffBat: 2, extraType: 'no-ball' as const, extraRuns: 0, isWicket: false },
    { strikerId: 'P-A1', nonStrikerId: 'P-A2', runsOffBat: 6, extraType: 'none' as const, extraRuns: 0, isWicket: false },
    {
      strikerId: 'P-A1',
      nonStrikerId: 'P-A2',
      runsOffBat: 0,
      extraType: 'none' as const,
      extraRuns: 0,
      isWicket: true,
      wicketType: 'bowled' as const,
      dismissedPlayerId: 'P-A1',
      incomingBatterId: 'P-A3',
    },
    { strikerId: 'P-A3', nonStrikerId: 'P-A2', runsOffBat: 1, extraType: 'none' as const, extraRuns: 0, isWicket: false },
    { strikerId: 'P-A2', nonStrikerId: 'P-A3', runsOffBat: 2, extraType: 'none' as const, extraRuns: 0, isWicket: false },
    { strikerId: 'P-A2', nonStrikerId: 'P-A3', runsOffBat: 1, extraType: 'none' as const, extraRuns: 0, isWicket: false },
  ];

  for (const ball of inn1Deliveries) {
    await recordBallEventWithAutoSequenceAtomic(
      match.id,
      {
        inningsNumber: 1,
        actionType: 'delivery',
        bowlerId: 'P-B6',
        ...ball,
      },
      playersMap
    );
  }

  // Start Innings 2 chasing target 19 (derived automatically from Innings 1 score of 18)
  const currentMatch = (await db.matches.get(match.id))!;
  const updatedForInn2: MatchRecord = {
    ...currentMatch,
    currentInningsNumber: 2,
    innings: [
      ...currentMatch.innings,
      {
        inningsNumber: 2,
        battingTeamId: teamB.id,
        bowlingTeamId: teamA.id,
        openingStrikerId: 'P-B1',
        openingNonStrikerId: 'P-B2',
        openingBowlerId: 'P-A6',
      },
    ],
  };
  await db.matches.put(updatedForInn2);

  const inn2Deliveries = [
    { strikerId: 'P-B1', nonStrikerId: 'P-B2', runsOffBat: 6 },
    { strikerId: 'P-B1', nonStrikerId: 'P-B2', runsOffBat: 4 },
    { strikerId: 'P-B1', nonStrikerId: 'P-B2', runsOffBat: 4 },
    { strikerId: 'P-B1', nonStrikerId: 'P-B2', runsOffBat: 5 },
  ];

  for (const ball of inn2Deliveries) {
    await recordBallEventWithAutoSequenceAtomic(
      match.id,
      {
        inningsNumber: 2,
        actionType: 'delivery',
        bowlerId: 'P-A6',
        strikerId: ball.strikerId,
        nonStrikerId: ball.nonStrikerId,
        runsOffBat: ball.runsOffBat,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      },
      playersMap
    );
  }

  const finalMatch = (await db.matches.get(match.id))!;
  const finalEvents = await db.ballEvents.where('matchId').equals(match.id).toArray();
  const derived = deriveMatchState(finalMatch, finalEvents, playersMap);

  const allCareers = deriveCareerStats(players, [finalMatch], finalEvents);
  const careerB1 = allCareers['P-B1'];
  const careerVerified =
    Boolean(careerB1) &&
    careerB1.runs === 19 &&
    careerB1.ballsFaced === 4 &&
    careerB1.fours === 2 &&
    careerB1.sixes === 1;

  // Export backup, validate, wipe DB, and restore
  const backupPayload = await exportDatabaseToJson();
  const validation = validateBackupPayload(JSON.stringify(backupPayload));
  if (!validation.valid || !validation.payload) {
    throw new Error(`Backup validation failed: ${validation.error}`);
  }

  await Promise.all([
    db.players.clear(),
    db.teams.clear(),
    db.matches.clear(),
    db.ballEvents.clear(),
  ]);

  await importDatabaseFromJson(validation.payload, 'replace');

  const restoredMatch = (await db.matches.get(match.id))!;
  const restoredEvents = await db.ballEvents.where('matchId').equals(match.id).toArray();
  const restoredDerived = deriveMatchState(restoredMatch, restoredEvents, playersMap);

  const backupRestoredIdentically =
    restoredDerived.isMatchCompleted === derived.isMatchCompleted &&
    restoredDerived.resultSummaryText === derived.resultSummaryText &&
    restoredDerived.inningsStates[1]?.totalRuns === derived.inningsStates[1]?.totalRuns &&
    restoredDerived.inningsStates[2]?.totalRuns === derived.inningsStates[2]?.totalRuns;

  return {
    coldStartEmpty,
    innings1Score: {
      runs: derived.inningsStates[1]?.totalRuns ?? 0,
      wickets: derived.inningsStates[1]?.wickets ?? 0,
      legalBalls: derived.inningsStates[1]?.legalBalls ?? 0,
    },
    innings2Score: {
      runs: derived.inningsStates[2]?.totalRuns ?? 0,
      wickets: derived.inningsStates[2]?.wickets ?? 0,
      legalBalls: derived.inningsStates[2]?.legalBalls ?? 0,
    },
    isMatchCompleted: derived.isMatchCompleted,
    resultText: derived.resultSummaryText,
    careerVerified,
    backupRestoredIdentically,
  };
}
