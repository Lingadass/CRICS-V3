import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { CricsDatabase, db } from '../db/database';
import { deriveMatchState } from '../engine/scoringEngine';
import { BallEvent, MatchRecord, Player, Team } from '../engine/types';
import { EN_TRANSLATIONS } from '../i18n/en';
import { ES_TRANSLATIONS } from '../i18n/es';
import { HI_TRANSLATIONS } from '../i18n/hi';
import { useCricsStore } from '../store/useCricsStore';
import {
  buildMatchSummary,
  formatChaseEquationText,
  formatMatchResultText,
} from './matchSummaryUtils';

const rootDir = path.resolve(import.meta.dirname, '../..');

function makeDelivery(
  matchId: string,
  inningsNumber: 1 | 2 | 3 | 4,
  sequence: number,
  runsOffBat: number,
  isWicket = false,
  strikerId = 'P1',
  nonStrikerId = 'P2',
  bowlerId = 'P3'
): BallEvent {
  return {
    id: `${matchId}-E-${sequence}`,
    matchId,
    inningsNumber,
    sequence,
    timestamp: 1700000000000 + sequence * 1000,
    actionType: 'delivery',
    strikerId,
    nonStrikerId,
    bowlerId,
    runsOffBat,
    extraType: 'none',
    extraRuns: 0,
    isWicket,
    wicketType: isWicket ? 'bowled' : undefined,
    dismissedPlayerId: isWicket ? strikerId : undefined,
    incomingBatterId: isWicket ? strikerId : undefined,
  };
}

describe('Stage 11 Group A — Match Summary Persistence, Dexie v12 Migration, Pluralization & Zero-Event Home Parity', () => {
  beforeEach(async () => {
    await Promise.all([
      db.players.clear(),
      db.playerPhotos.clear(),
      db.teams.clear(),
      db.matches.clear(),
      db.ballEvents.clear(),
      db.tournaments.clear(),
      db.careerCache.clear(),
    ]);
  });

  it('1. updates match.summary atomically on createMatch, recordBall, undoLastBall, redoBall, editBallEvent, updateRevisedTarget, and completeMatch', async () => {
    const teams: Team[] = [
      { id: 'T-CSK', name: 'Chennai Super Kings', shortName: 'CSK', primaryColor: 'var(--color-brand-600)', playerIds: ['P1', 'P2'], createdAt: 1 },
      { id: 'T-MI', name: 'Mumbai Indians', shortName: 'MI', primaryColor: 'var(--color-four)', playerIds: ['P3', 'P4'], createdAt: 1 },
    ];
    const players: Player[] = [
      { id: 'P1', name: 'Ruturaj', dob: '', role: 'Batter', battingStyle: 'Right-hand bat', bowlingStyle: 'None', jerseyNumber: 31, createdAt: 1 },
      { id: 'P2', name: 'Jadeja', dob: '', role: 'All-Rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm orthodox', jerseyNumber: 8, createdAt: 1 },
      { id: 'P3', name: 'Rohit', dob: '', role: 'Batter', battingStyle: 'Right-hand bat', bowlingStyle: 'None', jerseyNumber: 45, createdAt: 1 },
      { id: 'P4', name: 'Bumrah', dob: '', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', jerseyNumber: 93, createdAt: 1 },
    ];
    await db.teams.bulkPut(teams);
    await db.players.bulkPut(players);
    await useCricsStore.getState().initApp();

    const match: MatchRecord = {
      id: 'M-ATOMIC-1',
      title: 'CSK vs MI',
      format: 'T10',
      season: '2026',
      venue: 'Chepauk',
      date: '2026-11-18',
      scorerName: 'Scorer',
      teamAId: 'T-CSK',
      teamBId: 'T-MI',
      teamAXI: ['P1', 'P2'],
      teamBXI: ['P3', 'P4'],
      tossWinnerTeamId: 'T-CSK',
      tossDecision: 'bat',
      rules: {
        oversPerInnings: 1,
        ballsPerOver: 6,
        wideRuns: 1,
        noBallRuns: 1,
        freeHitEnabled: true,
        powerplayOvers: 0,
        maxOversPerBowler: 1,
      },
      innings: [
        {
          inningsNumber: 1,
          battingTeamId: 'T-CSK',
          bowlingTeamId: 'T-MI',
          openingStrikerId: 'P1',
          openingNonStrikerId: 'P2',
          openingBowlerId: 'P4',
        },
      ],
      currentInningsNumber: 1,
      status: 'live',
      createdAt: 100,
      updatedAt: 100,
    };

    await useCricsStore.getState().createMatch(match);
    let stored = await db.matches.get('M-ATOMIC-1');
    expect(stored?.summary).toBeDefined();
    expect(stored?.summary?.innings[0]).toMatchObject({
      battingTeamId: 'T-CSK',
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      oversText: '0.0',
    });

    // Record a 4
    await useCricsStore.getState().recordBall('M-ATOMIC-1', {
      inningsNumber: 1,
      actionType: 'delivery',
      strikerId: 'P1',
      nonStrikerId: 'P2',
      bowlerId: 'P4',
      runsOffBat: 4,
      extraType: 'none',
      extraRuns: 0,
      isBoundaryFour: true,
      isWicket: false,
    });
    stored = await db.matches.get('M-ATOMIC-1');
    expect(stored?.summary?.innings[0]).toMatchObject({
      battingTeamId: 'T-CSK',
      runs: 4,
      wickets: 0,
      legalBalls: 1,
      oversText: '0.1',
    });

    // Undo last ball
    await useCricsStore.getState().undoLastBall('M-ATOMIC-1');
    stored = await db.matches.get('M-ATOMIC-1');
    expect(stored?.summary?.innings[0].runs).toBe(0);
    expect(stored?.summary?.innings[0].legalBalls).toBe(0);
    expect(stored?.summary?.innings[0].oversText).toBe('0.0');

    // Redo last ball
    await useCricsStore.getState().redoBall('M-ATOMIC-1');
    stored = await db.matches.get('M-ATOMIC-1');
    expect(stored?.summary?.innings[0].runs).toBe(4);
    expect(stored?.summary?.innings[0].legalBalls).toBe(1);

    // Edit ball from 4 to 6
    const firstEv = useCricsStore.getState().ballEvents.find((e) => e.matchId === 'M-ATOMIC-1')!;
    await useCricsStore.getState().editBallEvent({
      ...firstEv,
      runsOffBat: 6,
      isBoundaryFour: false,
      isBoundarySix: true,
    });
    stored = await db.matches.get('M-ATOMIC-1');
    expect(stored?.summary?.innings[0].runs).toBe(6);

    // Start 2nd innings (chase target 7)
    await useCricsStore.getState().startNextInnings('M-ATOMIC-1', {
      inningsNumber: 2,
      battingTeamId: 'T-MI',
      bowlingTeamId: 'T-CSK',
      openingStrikerId: 'P3',
      openingNonStrikerId: 'P4',
      openingBowlerId: 'P2',
    });
    stored = await db.matches.get('M-ATOMIC-1');
    expect(stored?.summary?.innings).toHaveLength(2);
    expect(stored?.summary?.resultText).toBe('Mumbai Indians need 7 runs in 6 balls');

    // Score 6 runs so MI needs 1 run in 5 balls (pluralization: "need 1 run")
    await useCricsStore.getState().recordBall('M-ATOMIC-1', {
      inningsNumber: 2,
      actionType: 'delivery',
      strikerId: 'P3',
      nonStrikerId: 'P4',
      bowlerId: 'P2',
      runsOffBat: 6,
      extraType: 'none',
      extraRuns: 0,
      isBoundarySix: true,
      isWicket: false,
    });
    stored = await db.matches.get('M-ATOMIC-1');
    expect(stored?.summary?.resultText).toBe('Mumbai Indians need 1 run in 5 balls');

    // Update revised target (DLS) to 9 runs in 1 over -> MI needs 3 runs in 5 balls
    await useCricsStore.getState().updateRevisedTarget('M-ATOMIC-1', 2, 9, 1);
    stored = await db.matches.get('M-ATOMIC-1');
    expect(stored?.summary?.resultText).toBe('Mumbai Indians need 3 runs in 5 balls');

    // Complete match as No Result
    await useCricsStore.getState().completeMatch('M-ATOMIC-1', undefined, true);
    stored = await db.matches.get('M-ATOMIC-1');
    expect(stored?.summary?.status).toBe('completed');
    expect(stored?.summary?.resultText).toBe('Match Abandoned — No Result');
    expect(stored?.summary?.resultText).not.toContain('need');
  });

  it('2. Dexie v12 migration backfills summary for existing matches from a saved pre-v12 database (CSK 165/5 (10.0) vs MI 170/2 (8.5), won by 8 wickets)', async () => {
    const fixturePath = path.join(rootDir, 'tests/fixtures/pre-v12-db.json');
    const rawFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    // Build deterministic events for CSK 165/5 (10.0) and MI 170/2 (8.5)
    // Innings 1: 60 legal balls totaling 165 runs and 5 wickets
    // 25 balls of 6 = 150, 3 balls of 4 = 12, 3 balls of 1 = 3 => 31 balls = 165 runs; remaining 29 balls = 0 (with 5 wickets)
    const legacyEvents: BallEvent[] = [];
    let seq = 1;
    for (let i = 0; i < 60; i++) {
      const runs = i < 25 ? 6 : i < 28 ? 4 : i < 31 ? 1 : 0;
      const isWkt = i >= 55; // 5 wickets on balls 56..60
      legacyEvents.push(
        makeDelivery('MATCH-LEGACY-CSK-MI', 1, seq++, runs, isWkt, 'P-CSK-1', 'P-CSK-2', 'P-MI-5')
      );
    }
    // Innings 2: 8.5 overs = 53 legal balls totaling 170 runs and 2 wickets
    // 27 balls of 6 = 162, 2 balls of 4 = 8 => 29 balls = 170 runs; plus 24 dot balls before the winning hit (with 2 wickets)
    for (let i = 0; i < 53; i++) {
      const isWkt = i === 0 || i === 1;
      const runs = i >= 24 ? (i < 51 ? 6 : 4) : 0;
      legacyEvents.push(
        makeDelivery('MATCH-LEGACY-CSK-MI', 2, seq++, runs, isWkt, 'P-MI-1', 'P-MI-2', 'P-CSK-6')
      );
    }

    const dbName = `PreV12MigrationTest_${Date.now()}`;
    const v11Db = new Dexie(dbName);
    const v5Stores = {
      players: 'id, name, dob, role, jerseyNumber, archived, isSample, createdAt',
      playerPhotos: 'playerId, updatedAt',
      teams: 'id, name, shortName, archived, isSample, createdAt',
      matches: 'id, status, format, season, tournamentId, date, archived, isSample, createdAt, updatedAt',
      ballEvents: 'id, matchId, [matchId+inningsNumber], [matchId+sequence], sequence, isSample',
      tournaments: 'id, name, season, format, archived, isSample, createdAt',
      settings: 'id',
      careerCache: 'id, playerId, format, season, [playerId+format+season]',
    };
    v11Db.version(11).stores(v5Stores);
    await v11Db.open();
    await v11Db.table('teams').bulkPut(rawFixture.teams);
    await v11Db.table('players').bulkPut(rawFixture.players);
    // Match record in pre-v12 database has NO summary field!
    expect(rawFixture.matches[0].summary).toBeUndefined();
    await v11Db.table('matches').bulkPut(rawFixture.matches);
    await v11Db.table('ballEvents').bulkPut(legacyEvents);
    v11Db.close();

    // Open with CricsDatabase (which runs v12 upgrade)
    const upgradedDb = new CricsDatabase(dbName);
    await upgradedDb.open();

    const migratedMatch = await upgradedDb.matches.get('MATCH-LEGACY-CSK-MI');
    expect(migratedMatch?.summary).toBeDefined();
    expect(migratedMatch?.summary?.status).toBe('completed');
    expect(migratedMatch?.summary?.innings).toHaveLength(2);
    expect(migratedMatch?.summary?.innings[0]).toMatchObject({
      battingTeamId: 'TEAM-CSK',
      runs: 165,
      wickets: 5,
      legalBalls: 60,
      oversText: '10.0',
    });
    expect(migratedMatch?.summary?.innings[1]).toMatchObject({
      battingTeamId: 'TEAM-MI',
      runs: 170,
      wickets: 2,
      legalBalls: 53,
      oversText: '8.5',
    });
    expect(migratedMatch?.summary?.resultText).toBe('Mumbai Indians won by 8 wickets');
    expect(migratedMatch?.summary?.resultText).not.toContain('need');

    await upgradedDb.delete();
  });

  it('3. cold-start loads zero ballEvents at Home and matches Scorecard totals & result for live match, completed chase, defended total, tie, and super over', async () => {
    const teams: Team[] = [
      { id: 'T-A', name: 'Chennai Super Kings', shortName: 'CSK', primaryColor: 'var(--color-brand-600)', playerIds: ['P1', 'P2', 'P3'], createdAt: 1 },
      { id: 'T-B', name: 'Mumbai Indians', shortName: 'MI', primaryColor: 'var(--color-four)', playerIds: ['P4', 'P5', 'P6'], createdAt: 1 },
    ];
    const players: Player[] = [
      { id: 'P1', name: 'Batter A1', dob: '', role: 'Batter', battingStyle: 'Right-hand bat', bowlingStyle: 'None', jerseyNumber: 1, createdAt: 1 },
      { id: 'P2', name: 'Batter A2', dob: '', role: 'Batter', battingStyle: 'Right-hand bat', bowlingStyle: 'None', jerseyNumber: 2, createdAt: 1 },
      { id: 'P3', name: 'Bowler A3', dob: '', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', jerseyNumber: 3, createdAt: 1 },
      { id: 'P4', name: 'Batter B1', dob: '', role: 'Batter', battingStyle: 'Right-hand bat', bowlingStyle: 'None', jerseyNumber: 4, createdAt: 1 },
      { id: 'P5', name: 'Batter B2', dob: '', role: 'Batter', battingStyle: 'Right-hand bat', bowlingStyle: 'None', jerseyNumber: 5, createdAt: 1 },
      { id: 'P6', name: 'Bowler B3', dob: '', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', jerseyNumber: 6, createdAt: 1 },
    ];
    const playersMap = Object.fromEntries(players.map((p) => [p.id, p]));
    const teamsNameMap = Object.fromEntries(teams.map((tm) => [tm.id, tm.name]));

    const baseRules = {
      oversPerInnings: 1,
      ballsPerOver: 6,
      wideRuns: 1,
      noBallRuns: 1,
      freeHitEnabled: true,
      powerplayOvers: 0,
      maxOversPerBowler: 1,
    };
    const twoInningsSetup = [
      { inningsNumber: 1 as const, battingTeamId: 'T-A', bowlingTeamId: 'T-B', openingStrikerId: 'P1', openingNonStrikerId: 'P2', openingBowlerId: 'P6' },
      { inningsNumber: 2 as const, battingTeamId: 'T-B', bowlingTeamId: 'T-A', openingStrikerId: 'P4', openingNonStrikerId: 'P5', openingBowlerId: 'P3' },
    ];

    // 1. Live match (2nd innings chase: T-A scored 12 in 1.0 over; T-B is 12/0 in 0.5 overs needing 1 run in 1 ball)
    const liveMatchBase: MatchRecord = {
      id: 'M-LIVE', title: 'Live Chase Match', format: 'T10', season: '2026', venue: 'Oval', date: '2026-11-18', scorerName: 'Scorer',
      teamAId: 'T-A', teamBId: 'T-B', teamAXI: ['P1', 'P2', 'P3'], teamBXI: ['P4', 'P5', 'P6'], tossWinnerTeamId: 'T-A', tossDecision: 'bat',
      rules: baseRules, innings: twoInningsSetup, currentInningsNumber: 2, status: 'live', createdAt: 1, updatedAt: 500,
    };
    const liveEvents: BallEvent[] = [
      ...[2, 2, 2, 2, 2, 2].map((r, i) => makeDelivery('M-LIVE', 1, i + 1, r, false, 'P1', 'P2', 'P6')),
      ...[4, 4, 2, 2, 0].map((r, i) => makeDelivery('M-LIVE', 2, i + 7, r, false, 'P4', 'P5', 'P3')),
    ];

    // 2. Completed chase (T-A 10/0 in 1.0 over, T-B 12/0 in 0.2 overs -> MI won by 2 wickets since 3-player XI has max 2 wickets)
    const chaseMatchBase: MatchRecord = {
      id: 'M-CHASE', title: 'Completed Chase Match', format: 'T10', season: '2026', venue: 'Oval', date: '2026-11-18', scorerName: 'Scorer',
      teamAId: 'T-A', teamBId: 'T-B', teamAXI: ['P1', 'P2', 'P3'], teamBXI: ['P4', 'P5', 'P6'], tossWinnerTeamId: 'T-A', tossDecision: 'bat',
      rules: baseRules, innings: twoInningsSetup, currentInningsNumber: 2, status: 'completed', createdAt: 1, updatedAt: 400,
    };
    const chaseEvents: BallEvent[] = [
      ...[2, 2, 2, 2, 2, 0].map((r, i) => makeDelivery('M-CHASE', 1, i + 1, r, false, 'P1', 'P2', 'P6')),
      ...[6, 6].map((r, i) => makeDelivery('M-CHASE', 2, i + 7, r, false, 'P4', 'P5', 'P3')),
    ];

    // 3. Defended total (T-A 12/0 in 1.0 over, T-B 11/1 in 1.0 over -> CSK won by 1 run)
    const defendedMatchBase: MatchRecord = {
      id: 'M-DEFEND', title: 'Defended Total Match', format: 'T10', season: '2026', venue: 'Oval', date: '2026-11-18', scorerName: 'Scorer',
      teamAId: 'T-A', teamBId: 'T-B', teamAXI: ['P1', 'P2', 'P3'], teamBXI: ['P4', 'P5', 'P6'], tossWinnerTeamId: 'T-A', tossDecision: 'bat',
      rules: baseRules, innings: twoInningsSetup, currentInningsNumber: 2, status: 'completed', createdAt: 1, updatedAt: 300,
    };
    const defendedEvents: BallEvent[] = [
      ...[2, 2, 2, 2, 2, 2].map((r, i) => makeDelivery('M-DEFEND', 1, i + 1, r, false, 'P1', 'P2', 'P6')),
      ...[2, 2, 2, 2, 3, 0].map((r, i) => makeDelivery('M-DEFEND', 2, i + 7, r, i === 5, 'P4', 'P5', 'P3')),
    ];

    // 4. Tie (T-A 10/0 in 1.0 over, T-B 10/0 in 1.0 over -> Match Tied — Super Over available)
    const tieMatchBase: MatchRecord = {
      id: 'M-TIE', title: 'Tied Match', format: 'T10', season: '2026', venue: 'Oval', date: '2026-11-18', scorerName: 'Scorer',
      teamAId: 'T-A', teamBId: 'T-B', teamAXI: ['P1', 'P2', 'P3'], teamBXI: ['P4', 'P5', 'P6'], tossWinnerTeamId: 'T-A', tossDecision: 'bat',
      rules: baseRules, innings: twoInningsSetup, currentInningsNumber: 2, status: 'completed', createdAt: 1, updatedAt: 200,
    };
    const tieEvents: BallEvent[] = [
      ...[2, 2, 2, 2, 2, 0].map((r, i) => makeDelivery('M-TIE', 1, i + 1, r, false, 'P1', 'P2', 'P6')),
      ...[2, 2, 2, 2, 2, 0].map((r, i) => makeDelivery('M-TIE', 2, i + 7, r, false, 'P4', 'P5', 'P3')),
    ];

    // 5. Super Over (Innings 1 & 2 tied at 10/0; Innings 3 T-B 8/0 (1.0), Innings 4 T-A 10/0 (0.2) -> CSK won in Super Over)
    const superOverMatchBase: MatchRecord = {
      id: 'M-SUPER', title: 'Super Over Match', format: 'T10', season: '2026', venue: 'Oval', date: '2026-11-18', scorerName: 'Scorer',
      teamAId: 'T-A', teamBId: 'T-B', teamAXI: ['P1', 'P2', 'P3'], teamBXI: ['P4', 'P5', 'P6'], tossWinnerTeamId: 'T-A', tossDecision: 'bat',
      rules: baseRules,
      innings: [
        ...twoInningsSetup,
        { inningsNumber: 3, battingTeamId: 'T-B', bowlingTeamId: 'T-A', openingStrikerId: 'P4', openingNonStrikerId: 'P5', openingBowlerId: 'P3', isSuperOver: true },
        { inningsNumber: 4, battingTeamId: 'T-A', bowlingTeamId: 'T-B', openingStrikerId: 'P1', openingNonStrikerId: 'P2', openingBowlerId: 'P6', isSuperOver: true },
      ],
      currentInningsNumber: 4,
      status: 'completed',
      createdAt: 1,
      updatedAt: 100,
    };
    const superOverEvents: BallEvent[] = [
      ...[2, 2, 2, 2, 2, 0].map((r, i) => makeDelivery('M-SUPER', 1, i + 1, r, false, 'P1', 'P2', 'P6')),
      ...[2, 2, 2, 2, 2, 0].map((r, i) => makeDelivery('M-SUPER', 2, i + 7, r, false, 'P4', 'P5', 'P3')),
      ...[2, 2, 2, 2, 0, 0].map((r, i) => makeDelivery('M-SUPER', 3, i + 13, r, false, 'P4', 'P5', 'P3')),
      ...[6, 4].map((r, i) => makeDelivery('M-SUPER', 4, i + 19, r, false, 'P1', 'P2', 'P6')),
    ];

    const allTestPairs: [MatchRecord, BallEvent[]][] = [
      [liveMatchBase, liveEvents],
      [chaseMatchBase, chaseEvents],
      [defendedMatchBase, defendedEvents],
      [tieMatchBase, tieEvents],
      [superOverMatchBase, superOverEvents],
    ];

    for (const [m, evs] of allTestPairs) {
      const withSummary: MatchRecord = {
        ...m,
        summary: buildMatchSummary(m, evs, playersMap, teamsNameMap, EN_TRANSLATIONS),
      };
      await db.matches.put(withSummary);
      await db.ballEvents.bulkPut(evs);
    }
    await db.teams.bulkPut(teams);
    await db.players.bulkPut(players);

    // Cold-start on Home tab: must load ZERO ballEvents into memory
    if (typeof window !== 'undefined') window.location.hash = '#/';
    useCricsStore.setState({ ballEvents: [], matches: [], isInitialized: false });
    await useCricsStore.getState().initApp();

    const stateAfterColdStart = useCricsStore.getState();
    expect(stateAfterColdStart.activeTab).toBe('home');
    expect(stateAfterColdStart.ballEvents).toHaveLength(0);

    // Compare Home (from match.summary with 0 ballEvents) against Scorecard (derived from full ballEvents)
    for (const [m, evs] of allTestPairs) {
      const homeMatch = stateAfterColdStart.matches.find((item) => item.id === m.id)!;
      expect(homeMatch.summary).toBeDefined();

      const scorecardDerived = deriveMatchState(m, evs, playersMap, teamsNameMap);

      for (const innSummary of homeMatch.summary!.innings) {
        const scInn = scorecardDerived.inningsStates[innSummary.inningsNumber];
        expect(innSummary.battingTeamId).toBe(scInn.battingTeamId);
        expect(innSummary.runs).toBe(scInn.totalRuns);
        expect(innSummary.wickets).toBe(scInn.wickets);
        expect(innSummary.legalBalls).toBe(scInn.legalBalls);
        expect(innSummary.oversText).toBe(scInn.oversFormatted);
      }

      const homeResult = formatMatchResultText(homeMatch.summary!, teamsNameMap, EN_TRANSLATIONS);
      expect(homeResult).toBe(scorecardDerived.resultSummaryText);
    }
  });

  it('4. pluralizes "need 1 run" / "need 2 runs" and "1 ball" / "2 balls" in English, Hindi, and Spanish, and never shows a "need" chase line for completed matches', () => {
    expect(formatChaseEquationText('Mumbai Indians', 1, 1, EN_TRANSLATIONS)).toBe(
      'Mumbai Indians need 1 run in 1 ball'
    );
    expect(formatChaseEquationText('Mumbai Indians', 1, 6, EN_TRANSLATIONS)).toBe(
      'Mumbai Indians need 1 run in 6 balls'
    );
    expect(formatChaseEquationText('Mumbai Indians', 2, 1, EN_TRANSLATIONS)).toBe(
      'Mumbai Indians need 2 runs in 1 ball'
    );
    expect(formatChaseEquationText('Mumbai Indians', 2, 6, EN_TRANSLATIONS)).toBe(
      'Mumbai Indians need 2 runs in 6 balls'
    );

    // Hindi
    expect(formatChaseEquationText('MI', 1, 1, HI_TRANSLATIONS)).toBe('MI को 1 गेंद में 1 रन चाहिए');
    expect(formatChaseEquationText('MI', 2, 6, HI_TRANSLATIONS)).toBe('MI को 6 गेंदों में 2 रन चाहिए');

    // Spanish
    expect(formatChaseEquationText('MI', 1, 1, ES_TRANSLATIONS)).toBe(
      'MI necesita 1 carrera en 1 bola'
    );
    expect(formatChaseEquationText('MI', 2, 6, ES_TRANSLATIONS)).toBe(
      'MI necesita 2 carreras en 6 bolas'
    );

    // Completed match must NEVER show a "need" chase line even if deriveMatchState is called with 0 events
    const completedWithNoEvents: MatchRecord = {
      id: 'M-COMP-EMPTY', title: 'CSK vs MI', format: 'T10', season: '2026',
      venue: 'Chepauk', date: '2026-11-18', scorerName: 'Scorer',
      teamAId: 'T-A', teamBId: 'T-B', teamAXI: ['P1', 'P2'], teamBXI: ['P3', 'P4'],
      tossWinnerTeamId: 'T-A', tossDecision: 'bat',
      rules: {
        oversPerInnings: 10, ballsPerOver: 6, wideRuns: 1, noBallRuns: 1,
        freeHitEnabled: true, powerplayOvers: 3, maxOversPerBowler: 2,
      },
      innings: [
        { inningsNumber: 1, battingTeamId: 'T-A', bowlingTeamId: 'T-B', openingStrikerId: 'P1', openingNonStrikerId: 'P2', openingBowlerId: 'P4' },
        { inningsNumber: 2, battingTeamId: 'T-B', bowlingTeamId: 'T-A', openingStrikerId: 'P3', openingNonStrikerId: 'P4', openingBowlerId: 'P2' },
      ],
      currentInningsNumber: 2, status: 'completed', createdAt: 1, updatedAt: 1,
    };
    const derivedEmpty = deriveMatchState(completedWithNoEvents, [], {}, { 'T-A': 'CSK', 'T-B': 'MI' });
    expect(derivedEmpty.resultSummaryText.toLowerCase()).not.toContain('need');

    // Verify list screens (DashboardView, TournamentsView, PlayersView) do not read ballEvents
    const dashboardSrc = fs.readFileSync(path.join(rootDir, 'src/components/DashboardView.tsx'), 'utf8');
    const tournamentsSrc = fs.readFileSync(path.join(rootDir, 'src/components/TournamentsView.tsx'), 'utf8');
    const playersSrc = fs.readFileSync(path.join(rootDir, 'src/components/PlayersView.tsx'), 'utf8');

    expect(dashboardSrc).not.toMatch(/\bballEvents\b/);
    expect(dashboardSrc).not.toContain('deriveMatchState');
    expect(tournamentsSrc).not.toMatch(/\bballEvents\b/);
    expect(tournamentsSrc).not.toContain('loadMatchBallEvents');
    expect(playersSrc).not.toMatch(/\bballEvents\b/);
  });
});
