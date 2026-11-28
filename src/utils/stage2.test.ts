import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  aggregateCareerStatsFromCache,
  CricsDatabase,
  db,
  queryBallEventsByMatch,
  rebuildCareerStatsCache,
  updateCareerCacheForMatch,
} from '../db/database';
import { rankLeaderboardEntries } from '../engine/scoringEngine';
import { BallEvent, MatchRecord, Player, Team } from '../engine/types';
import { useCricsStore } from '../store/useCricsStore';

function createTestPlayers(count = 22): Player[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, idx) => {
    const num = idx + 1;
    return {
      id: `P-${num}`,
      name: `Player ${num}`,
      dob: '1996-04-10',
      role: num % 4 === 0 ? 'Bowler' : num % 3 === 0 ? 'All-Rounder' : 'Batter',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm medium',
      jerseyNumber: num,
      createdAt: now,
    };
  });
}

function createTestTeams(players: Player[]): [Team, Team] {
  const now = Date.now();
  const teamA: Team = {
    id: 'TEAM-A',
    name: 'Falcons XI',
    shortName: 'FAL',
    primaryColor: 'var(--color-brand-600)',
    playerIds: players.slice(0, 11).map((p) => p.id),
    createdAt: now,
  };
  const teamB: Team = {
    id: 'TEAM-B',
    name: 'Titans XI',
    shortName: 'TIT',
    primaryColor: 'var(--color-accent)',
    playerIds: players.slice(11, 22).map((p) => p.id),
    createdAt: now,
  };
  return [teamA, teamB];
}

describe('Stage 2: Performance (On-Demand Ball Events & Career Cache)', () => {
  beforeEach(async () => {
    await db.transaction(
      'rw',
      [
        db.players,
        db.playerPhotos,
        db.teams,
        db.matches,
        db.ballEvents,
        db.tournaments,
        db.settings,
        db.careerCache,
      ],
      async () => {
        await Promise.all([
          db.players.clear(),
          db.playerPhotos.clear(),
          db.teams.clear(),
          db.matches.clear(),
          db.ballEvents.clear(),
          db.tournaments.clear(),
          db.settings.clear(),
          db.careerCache.clear(),
        ]);
      }
    );
  });

  it('1. does not load all ball events at startup and provides indexed query helper by match and innings', async () => {
    const players = createTestPlayers(22);
    const [teamA, teamB] = createTestTeams(players);
    const now = Date.now();

    const match1: MatchRecord = {
      id: 'M-STARTUP-1',
      title: 'Match 1',
      format: 'T20',
      season: '2026',
      venue: 'Oval 1',
      date: '2026-05-01',
      scorerName: 'Scorer',
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAXI: teamA.playerIds,
      teamBXI: teamB.playerIds,
      tossWinnerTeamId: teamA.id,
      tossDecision: 'bat',
      rules: {
        oversPerInnings: 2,
        ballsPerOver: 6,
        wideRuns: 1,
        noBallRuns: 1,
        freeHitEnabled: true,
        powerplayOvers: 1,
        maxOversPerBowler: 1,
      },
      innings: [
        {
          inningsNumber: 1,
          battingTeamId: teamA.id,
          bowlingTeamId: teamB.id,
          openingStrikerId: 'P-1',
          openingNonStrikerId: 'P-2',
          openingBowlerId: 'P-12',
        },
        {
          inningsNumber: 2,
          battingTeamId: teamB.id,
          bowlingTeamId: teamA.id,
          openingStrikerId: 'P-12',
          openingNonStrikerId: 'P-13',
          openingBowlerId: 'P-1',
        },
      ],
      currentInningsNumber: 2,
      status: 'completed',
      createdAt: now - 10000,
      updatedAt: now - 10000,
    };

    const match2: MatchRecord = {
      ...match1,
      id: 'M-STARTUP-2',
      title: 'Match 2',
      createdAt: now - 5000,
      updatedAt: now - 5000,
    };

    const events: BallEvent[] = [
      {
        id: 'B-M1-1',
        matchId: match1.id,
        inningsNumber: 1,
        sequence: 1,
        timestamp: now - 9000,
        actionType: 'delivery',
        strikerId: 'P-1',
        nonStrikerId: 'P-2',
        bowlerId: 'P-12',
        runsOffBat: 4,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      },
      {
        id: 'B-M1-2',
        matchId: match1.id,
        inningsNumber: 2,
        sequence: 2,
        timestamp: now - 8000,
        actionType: 'delivery',
        strikerId: 'P-12',
        nonStrikerId: 'P-13',
        bowlerId: 'P-1',
        runsOffBat: 6,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      },
      {
        id: 'B-M2-1',
        matchId: match2.id,
        inningsNumber: 1,
        sequence: 1,
        timestamp: now - 4000,
        actionType: 'delivery',
        strikerId: 'P-1',
        nonStrikerId: 'P-2',
        bowlerId: 'P-12',
        runsOffBat: 2,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      },
    ];

    await db.players.bulkPut(players);
    await db.teams.bulkPut([teamA, teamB]);
    await db.matches.bulkPut([match1, match2]);
    await db.ballEvents.bulkPut(events);

    // Startup on home tab must NOT load all ball events into memory
    if (typeof window !== 'undefined') window.location.hash = '#/home';
    useCricsStore.setState({ isInitialized: false, ballEvents: [] });
    await useCricsStore.getState().initApp();
    expect(useCricsStore.getState().matches.length).toBe(2);
    expect(useCricsStore.getState().players.length).toBe(22);
    expect(useCricsStore.getState().teams.length).toBe(2);
    expect(useCricsStore.getState().ballEvents.length).toBe(0);

    // Indexed query helper by match and innings
    const m1All = await queryBallEventsByMatch(match1.id);
    expect(m1All.map((e) => e.id)).toEqual(['B-M1-1', 'B-M1-2']);

    const m1Inn1 = await queryBallEventsByMatch(match1.id, 1);
    expect(m1Inn1.map((e) => e.id)).toEqual(['B-M1-1']);

    const m1Inn2 = await queryBallEventsByMatch(match1.id, 2);
    expect(m1Inn2.map((e) => e.id)).toEqual(['B-M1-2']);

    // Opening match1 loads only match1's ball events on demand
    await useCricsStore.getState().loadMatchBallEvents(match1.id);
    expect(useCricsStore.getState().ballEvents.map((e) => e.id)).toEqual([
      'B-M1-1',
      'B-M1-2',
    ]);
  });

  it('2. updates careerCache when an old match is completed, edited, or deleted, and supports Rebuild career stats & Dexie v5 migration', async () => {
    const players = createTestPlayers(22);
    const [teamA, teamB] = createTestTeams(players);
    await db.players.bulkPut(players);
    await db.teams.bulkPut([teamA, teamB]);
    await useCricsStore.getState().initApp();

    const now = Date.now();
    const oldMatch: MatchRecord = {
      id: 'M-OLD-EDIT',
      title: 'Old League Match',
      format: 'T20',
      season: '2025',
      venue: 'Main Oval',
      date: '2025-08-15',
      scorerName: 'Scorer',
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
      innings: [
        {
          inningsNumber: 1,
          battingTeamId: teamA.id,
          bowlingTeamId: teamB.id,
          openingStrikerId: 'P-1',
          openingNonStrikerId: 'P-2',
          openingBowlerId: 'P-12',
        },
      ],
      currentInningsNumber: 1,
      status: 'live',
      createdAt: now - 50000,
      updatedAt: now - 50000,
    };

    await useCricsStore.getState().createMatch(oldMatch);
    await useCricsStore.getState().recordBall(oldMatch.id, {
      inningsNumber: 1,
      actionType: 'delivery',
      strikerId: 'P-1',
      nonStrikerId: 'P-2',
      bowlerId: 'P-12',
      runsOffBat: 1,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    });
    await useCricsStore.getState().completeMatch(oldMatch.id);

    // Check initial cached stats for P-1 in T20 / 2025
    let cacheRows = await db.careerCache.toArray();
    let statsFromCache = aggregateCareerStatsFromCache(players, cacheRows, {
      format: 'T20',
      season: '2025',
    });
    expect(statsFromCache['P-1']?.runs).toBe(1);
    expect(statsFromCache['P-1']?.sixes).toBe(0);

    // Edit the ball in the old completed match from 1 run to 6 runs
    const existingBalls = await queryBallEventsByMatch(oldMatch.id);
    expect(existingBalls.length).toBe(1);
    await useCricsStore.getState().editBallEvent({
      ...existingBalls[0],
      runsOffBat: 6,
    });

    cacheRows = await db.careerCache.toArray();
    statsFromCache = aggregateCareerStatsFromCache(players, cacheRows, {
      format: 'T20',
      season: '2025',
    });
    expect(statsFromCache['P-1']?.runs).toBe(6);
    expect(statsFromCache['P-1']?.sixes).toBe(1);
    expect(statsFromCache['P-12']?.runsConceded).toBe(6);

    // Test "Rebuild career stats" after wiping careerCache
    await db.careerCache.clear();
    expect(await db.careerCache.count()).toBe(0);
    await rebuildCareerStatsCache();
    cacheRows = await db.careerCache.toArray();
    statsFromCache = aggregateCareerStatsFromCache(players, cacheRows, {
      format: 'T20',
      season: '2025',
    });
    expect(statsFromCache['P-1']?.runs).toBe(6);

    // Delete match removes its contribution from careerCache
    await useCricsStore.getState().deleteMatch(oldMatch.id);
    cacheRows = await db.careerCache.toArray();
    statsFromCache = aggregateCareerStatsFromCache(players, cacheRows, {
      format: 'T20',
      season: '2025',
    });
    expect(statsFromCache['P-1']?.matches).toBe(0);
    expect(statsFromCache['P-1']?.runs).toBe(0);

    // Verify Dexie v4 -> v5 migration builds careerCache automatically
    const migName = `CricsV5MigTest_${Date.now()}`;
    const v4Db = new Dexie(migName);
    v4Db.version(4).stores({
      players: 'id',
      playerPhotos: 'playerId',
      teams: 'id',
      matches: 'id',
      ballEvents: 'id, matchId',
      tournaments: 'id',
      settings: 'id',
    });
    await v4Db.open();
    await v4Db.table('players').bulkPut(players.slice(0, 4));
    await v4Db.table('matches').put({
      ...oldMatch,
      id: 'M-MIG-V5',
      status: 'completed',
      teamAXI: ['P-1', 'P-2'],
      teamBXI: ['P-3', 'P-4'],
    });
    await v4Db.table('ballEvents').put({
      id: 'B-MIG-1',
      matchId: 'M-MIG-V5',
      inningsNumber: 1,
      sequence: 1,
      timestamp: now,
      actionType: 'delivery',
      strikerId: 'P-1',
      nonStrikerId: 'P-2',
      bowlerId: 'P-3',
      runsOffBat: 4,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    });
    v4Db.close();

    const upgradedV5 = new CricsDatabase(migName);
    await upgradedV5.open();
    const migratedCache = await upgradedV5.careerCache.toArray();
    const migratedStats = aggregateCareerStatsFromCache(
      players.slice(0, 4),
      migratedCache
    );
    expect(migratedStats['P-1']?.runs).toBe(4);
    expect(migratedStats['P-1']?.fours).toBe(1);
    upgradedV5.close();
    await Dexie.delete(migName);
  });

  it('3. benchmark: 500 matches and 120,000 balls produces Careers and Leaderboards data in under 300 ms', async () => {
    const players = createTestPlayers(22);
    const [teamA, teamB] = createTestTeams(players);
    const playersMap = Object.fromEntries(players.map((p) => [p.id, p]));
    await db.players.bulkPut(players);
    await db.teams.bulkPut([teamA, teamB]);

    const TOTAL_MATCHES = 500;
    const BALLS_PER_MATCH = 240; // 500 * 240 = 120,000 balls

    // Build 5 template matches and 240-ball patterns, then replicate across 500 matches
    const allMatches: MatchRecord[] = [];
    let totalGeneratedBalls = 0;

    for (let mIdx = 0; mIdx < TOTAL_MATCHES; mIdx++) {
      const mId = `M-PERF-${mIdx + 1}`;
      const format = mIdx % 2 === 0 ? 'T20' : 'ODI';
      const season = mIdx % 3 === 0 ? '2024' : mIdx % 3 === 1 ? '2025' : '2026';
      const match: MatchRecord = {
        id: mId,
        title: `Perf Match ${mIdx + 1}`,
        format,
        season,
        venue: 'Benchmark Arena',
        date: `${season}-06-${String((mIdx % 28) + 1).padStart(2, '0')}`,
        scorerName: 'Benchmark',
        teamAId: teamA.id,
        teamBId: teamB.id,
        teamAXI: teamA.playerIds,
        teamBXI: teamB.playerIds,
        tossWinnerTeamId: teamA.id,
        tossDecision: 'bat',
        rules: {
          oversPerInnings: 20,
          ballsPerOver: 6,
          wideRuns: 1,
          noBallRuns: 1,
          freeHitEnabled: true,
          powerplayOvers: 6,
          maxOversPerBowler: 4,
        },
        innings: [
          {
            inningsNumber: 1,
            battingTeamId: teamA.id,
            bowlingTeamId: teamB.id,
            openingStrikerId: 'P-1',
            openingNonStrikerId: 'P-2',
            openingBowlerId: 'P-12',
          },
          {
            inningsNumber: 2,
            battingTeamId: teamB.id,
            bowlingTeamId: teamA.id,
            openingStrikerId: 'P-12',
            openingNonStrikerId: 'P-13',
            openingBowlerId: 'P-1',
          },
        ],
        currentInningsNumber: 2,
        status: 'completed',
        createdAt: 1_700_000_000_000 + mIdx * 1000,
        updatedAt: 1_700_000_000_000 + mIdx * 1000,
      };
      allMatches.push(match);

      const matchBalls: BallEvent[] = [];
      for (let b = 0; b < BALLS_PER_MATCH; b++) {
        const innNum: 1 | 2 = b < 120 ? 1 : 2;
        const ballInInn = b % 120;
        const overIdx = Math.floor(ballInInn / 6);
        const strikerId =
          innNum === 1
            ? `P-${(overIdx % 5) + 1}`
            : `P-${(overIdx % 5) + 12}`;
        const nonStrikerId =
          innNum === 1
            ? `P-${((overIdx + 1) % 5) + 1}`
            : `P-${((overIdx + 1) % 5) + 12}`;
        const bowlerId =
          innNum === 1
            ? `P-${(overIdx % 5) + 17}`
            : `P-${(overIdx % 5) + 6}`;
        const runsOffBat = (b + mIdx) % 7 === 0 ? 4 : (b + mIdx) % 11 === 0 ? 6 : b % 3;

        matchBalls.push({
          id: `${mId}-B-${b + 1}`,
          matchId: mId,
          inningsNumber: innNum,
          sequence: b + 1,
          timestamp: 1_700_000_000_000 + b,
          actionType: 'delivery',
          strikerId,
          nonStrikerId,
          bowlerId,
          runsOffBat,
          extraType: 'none',
          extraRuns: 0,
          isWicket: false,
        });
      }
      totalGeneratedBalls += matchBalls.length;
      await updateCareerCacheForMatch(match, matchBalls, playersMap);
    }

    expect(allMatches.length).toBe(500);
    expect(totalGeneratedBalls).toBe(120_000);

    const cacheRecords = await db.careerCache.toArray();
    expect(cacheRecords.length).toBeGreaterThan(0);

    // Measure Careers data production
    const t0Careers = performance.now();
    const allCareerStats = aggregateCareerStatsFromCache(players, cacheRecords, {
      format: 'ALL',
      season: 'ALL',
    });
    const t20CareerStats = aggregateCareerStatsFromCache(players, cacheRecords, {
      format: 'T20',
      season: '2025',
    });
    const careersElapsedMs = performance.now() - t0Careers;

    // Measure Leaderboards data production across all 5 categories
    const t0Leaderboards = performance.now();
    const statValues = Object.values(allCareerStats);
    const topRuns = rankLeaderboardEntries(statValues, 'runs');
    const topWickets = rankLeaderboardEntries(statValues, 'wickets');
    const topSr = rankLeaderboardEntries(statValues, 'strikeRate');
    const topEcon = rankLeaderboardEntries(statValues, 'economy');
    const topCatches = rankLeaderboardEntries(statValues, 'catches');
    const leaderboardsElapsedMs = performance.now() - t0Leaderboards;

    console.info(
      `[STAGE 2 BENCHMARK] 500 matches / 120,000 balls -> Careers: ${careersElapsedMs.toFixed(
        2
      )} ms, Leaderboards: ${leaderboardsElapsedMs.toFixed(2)} ms (Cache rows: ${
        cacheRecords.length
      })`
    );

    expect(allCareerStats['P-1']?.matches).toBe(500);
    expect(t20CareerStats['P-1']?.matches).toBeGreaterThan(0);
    expect(topRuns.length).toBe(22);
    expect(topWickets.length).toBe(22);
    expect(topSr.length).toBeGreaterThan(0);
    expect(topEcon.length).toBeGreaterThan(0);
    expect(topCatches.length).toBe(22);

    expect(careersElapsedMs).toBeLessThan(300);
    expect(leaderboardsElapsedMs).toBeLessThan(300);
  }, 30000);
});
