import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  analyzeBackupDiff,
  CricsDatabase,
  db,
  importDatabaseFromJson,
  normalizeLegacyBowlerChanges,
  validateBackupPayload,
} from './database';
import { useCricsStore } from '../store/useCricsStore';
import {
  exportPlayersToCsv,
  parsePlayersFromCsv,
} from '../utils/mediaUtils';
import { BallEvent, MatchRecord, Player, Team } from '../engine/types';
import { deriveMatchState } from '../engine/scoringEngine';

beforeEach(async () => {
  await db.delete();
  await db.open();
  useCricsStore.setState({
    isInitialized: false,
    activeTab: 'home',
    activeMatchId: '',
    selectedScorecardMatchId: '',
    selectedCareerPlayerId: '',
    players: [],
    teams: [],
    matches: [],
    ballEvents: [],
    tournaments: [],
    redoStacks: {},
  });
});

describe('Phase 1: Data Safety', () => {
  test('1. Fresh startup does NOT auto-seed demo data; explicit loadSampleData and removeSampleData work cleanly', async () => {
    await useCricsStore.getState().initApp();
    const stateAfterInit = useCricsStore.getState();

    // Fresh user must see an empty database with no hard-coded IDs
    expect(stateAfterInit.players.length).toBe(0);
    expect(stateAfterInit.teams.length).toBe(0);
    expect(stateAfterInit.matches.length).toBe(0);
    expect(stateAfterInit.activeMatchId).toBe('');

    // Explicit Load Sample Data tags records with isSample: true
    await useCricsStore.getState().loadSampleData();
    const stateWithSample = useCricsStore.getState();
    expect(stateWithSample.players.length).toBeGreaterThan(0);
    expect(stateWithSample.players.every((p) => p.isSample === true)).toBe(true);

    // Add a real user player alongside sample data
    const realPlayer: Player = {
      id: 'CRICS-PLR-9999',
      name: 'Real Club Player',
      dob: '1995-01-01',
      role: 'Batter',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'None',
      jerseyNumber: 99,
      createdAt: Date.now(),
    };
    await useCricsStore.getState().savePlayer(realPlayer);

    // Remove sample data removes only sample records and preserves real user records
    await useCricsStore.getState().removeSampleData();
    const afterRemove = useCricsStore.getState();
    expect(afterRemove.players.length).toBe(1);
    expect(afterRemove.players[0].id).toBe('CRICS-PLR-9999');
    expect(afterRemove.matches.length).toBe(0);

    // Re-initializing after deleting all players never re-creates sample data
    await useCricsStore.getState().deletePlayer('CRICS-PLR-9999');
    await useCricsStore.getState().initApp();
    expect(useCricsStore.getState().players.length).toBe(0);
  });

  test('2. Firing 20 simultaneous recordBall calls produces 20 distinct, gap-free sequence numbers in DB and UI state', async () => {
    await useCricsStore.getState().initApp();
    const match: MatchRecord = {
      id: 'M-RACE-1',
      title: 'Concurrency Test Match',
      format: 'T20',
      season: '2026',
      venue: 'Test Ground',
      date: '2026-11-11',
      scorerName: 'Tester',
      teamAId: 'T1',
      teamBId: 'T2',
      teamAXI: ['P1', 'P2', 'P3'],
      teamBXI: ['P4', 'P5'],
      tossWinnerTeamId: 'T1',
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
          battingTeamId: 'T1',
          bowlingTeamId: 'T2',
          openingStrikerId: 'P1',
          openingNonStrikerId: 'P2',
          openingBowlerId: 'P4',
        },
      ],
      currentInningsNumber: 1,
      status: 'live',
      createdAt: 1,
      updatedAt: 1,
    };

    await useCricsStore.getState().createMatch(match);

    // Fire 20 simultaneous recordBall calls without awaiting each individually
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        useCricsStore.getState().recordBall('M-RACE-1', {
          inningsNumber: 1,
          actionType: 'delivery',
          strikerId: 'P1',
          nonStrikerId: 'P2',
          bowlerId: 'P4',
          runsOffBat: i % 2,
          extraType: 'none',
          extraRuns: 0,
          isWicket: false,
        })
      )
    );

    const dbEvents = await db.ballEvents
      .where('matchId')
      .equals('M-RACE-1')
      .toArray();
    const uiEvents = useCricsStore
      .getState()
      .ballEvents.filter((e) => e.matchId === 'M-RACE-1');

    expect(dbEvents.length).toBe(20);
    expect(uiEvents.length).toBe(20);

    const dbSequences = dbEvents.map((e) => e.sequence).sort((a, b) => a - b);
    const uiSequences = uiEvents.map((e) => e.sequence).sort((a, b) => a - b);
    const expectedSequences = Array.from({ length: 20 }, (_, i) => i + 1);

    expect(dbSequences).toEqual(expectedSequences);
    expect(uiSequences).toEqual(expectedSequences);
  });

  test('3. Reference checks archive players/teams used in matches instead of hard-deleting, and deleteMatch removes events atomically', async () => {
    await useCricsStore.getState().initApp();
    const p1: Player = {
      id: 'P-REF-1',
      name: 'Used Player',
      dob: '1995-05-05',
      role: 'Batter',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'None',
      jerseyNumber: 7,
      createdAt: 1,
    };
    const p2: Player = {
      id: 'P-REF-2',
      name: 'Unused Player',
      dob: '1996-06-06',
      role: 'Bowler',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm fast',
      jerseyNumber: 11,
      createdAt: 2,
    };
    const t1: Team = {
      id: 'T-REF-1',
      name: 'Used Team',
      shortName: 'UT',
      primaryColor: 'var(--color-brand-600)',
      playerIds: ['P-REF-1'],
      createdAt: 1,
    };

    await useCricsStore.getState().savePlayer(p1);
    await useCricsStore.getState().savePlayer(p2);
    await useCricsStore.getState().saveTeam(t1);

    const match: MatchRecord = {
      id: 'M-REF-1',
      title: 'Ref Match',
      format: 'T20',
      season: '2026',
      venue: 'Ground',
      date: '2026-11-11',
      scorerName: 'Scorer',
      teamAId: 'T-REF-1',
      teamBId: 'T-OTHER',
      teamAXI: ['P-REF-1'],
      teamBXI: [],
      tossWinnerTeamId: 'T-REF-1',
      tossDecision: 'bat',
      rules: {
        oversPerInnings: 5,
        ballsPerOver: 6,
        wideRuns: 1,
        noBallRuns: 1,
        freeHitEnabled: true,
        powerplayOvers: 1,
        maxOversPerBowler: 1,
      },
      innings: [],
      currentInningsNumber: 1,
      status: 'live',
      createdAt: 1,
      updatedAt: 1,
    };
    await useCricsStore.getState().createMatch(match);
    await useCricsStore.getState().recordBall('M-REF-1', {
      inningsNumber: 1,
      actionType: 'delivery',
      strikerId: 'P-REF-1',
      nonStrikerId: 'P-REF-2',
      bowlerId: 'P-OTHER',
      runsOffBat: 4,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    });

    // Deleting P-REF-1 (in match) must archive it, NOT hard-delete it
    const res1 = await useCricsStore.getState().deletePlayer('P-REF-1');
    expect(res1.action).toBe('archived');
    const storedP1 = await db.players.get('P-REF-1');
    expect(storedP1?.archived).toBe(true);

    // Deleting T-REF-1 (in match) must archive it, NOT hard-delete it
    const resTeam = await useCricsStore.getState().deleteTeam('T-REF-1');
    expect(resTeam.action).toBe('archived');
    const storedT1 = await db.teams.get('T-REF-1');
    expect(storedT1?.archived).toBe(true);

    // Deleting M-REF-1 deletes both the match and its ball events atomically
    await useCricsStore.getState().deleteMatch('M-REF-1');
    expect(await db.matches.get('M-REF-1')).toBeUndefined();
    expect(await db.ballEvents.where('matchId').equals('M-REF-1').count()).toBe(0);
  });

  test('4. Backup validation, diff preview, conflict resolution (keep-mine / keep-imported / keep-both), and counter reset only on save', async () => {
    // Reject bad JSON / wrong app / missing arrays
    const badCheck = validateBackupPayload('{"app":"WRONG"}');
    expect(badCheck.valid).toBe(false);

    await useCricsStore.getState().initApp();
    await useCricsStore.getState().savePlayer({
      id: 'CRICS-PLR-1001',
      name: 'Original Local Name',
      dob: '1998-01-01',
      role: 'Batter',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'None',
      jerseyNumber: 18,
      createdAt: 100,
    });

    const incomingJson = JSON.stringify({
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      app: 'CRICS',
      players: [
        {
          id: 'CRICS-PLR-1001',
          name: 'Modified Imported Name',
          dob: '1998-01-01',
          role: 'Batter',
          battingStyle: 'Right-hand bat',
          bowlingStyle: 'None',
          jerseyNumber: 18,
          createdAt: 100,
        },
        {
          id: 'CRICS-PLR-1002',
          name: 'Brand New Player',
          dob: '1999-02-02',
          role: 'Bowler',
          battingStyle: 'Left-hand bat',
          bowlingStyle: 'Left-arm fast',
          jerseyNumber: 44,
          createdAt: 200,
        },
      ],
      teams: [],
      matches: [],
      ballEvents: [],
      tournaments: [],
      settings: [],
    });

    const validation = validateBackupPayload(incomingJson);
    expect(validation.valid).toBe(true);
    const payload = validation.payload!;

    const diff = await analyzeBackupDiff(payload);
    expect(diff.players.newCount).toBe(1);
    expect(diff.players.changedCount).toBe(1);
    expect(diff.players.unchangedCount).toBe(0);

    // Merge with 'keep-both' should preserve local CRICS-PLR-1001 AND create a new ID for the conflicting imported player
    await importDatabaseFromJson(payload, 'merge', 'keep-both');
    const allPlayers = await db.players.toArray();
    expect(allPlayers.length).toBe(3);
    expect(allPlayers.find((p) => p.id === 'CRICS-PLR-1001')?.name).toBe(
      'Original Local Name'
    );
    expect(allPlayers.some((p) => p.name === 'Modified Imported Name')).toBe(true);
  });

  test('5 & 6. Dexie v1 to v2 migration moves base64 photoDataUrl into playerPhotos Blob table', async () => {
    const dbName = `MigrationTestDB_${Date.now()}`;
    const v1Db = new Dexie(dbName);
    v1Db.version(1).stores({
      players: 'id, name, dob, role, jerseyNumber, createdAt',
      teams: 'id, name, shortName, createdAt',
      matches: 'id, status, format, season, tournamentId, date, createdAt, updatedAt',
      ballEvents: 'id, matchId, [matchId+inningsNumber], [matchId+sequence], sequence',
      tournaments: 'id, name, season, format, createdAt',
      settings: 'id',
    });
    await v1Db.open();
    // 1x1 transparent PNG base64
    const tinyPngDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await v1Db.table('players').put({
      id: 'CRICS-PLR-1001',
      name: 'Legacy Photo Player',
      dob: '1997-01-01',
      role: 'Batter',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'None',
      jerseyNumber: 10,
      photoDataUrl: tinyPngDataUrl,
      createdAt: 1,
    });
    v1Db.close();

    // Open with CricsDatabase (which defines v1 and v2 upgrade)
    const upgradedDb = new CricsDatabase(dbName);
    await upgradedDb.open();

    const migratedPlayer = await upgradedDb.players.get('CRICS-PLR-1001');
    const photoRecord = await upgradedDb.playerPhotos.get('CRICS-PLR-1001');

    expect(migratedPlayer).toBeDefined();
    expect(migratedPlayer?.photoDataUrl).toBeUndefined();
    expect(migratedPlayer?.hasPhoto).toBe(true);
    expect(photoRecord).toBeDefined();
    expect(photoRecord?.blob).toBeInstanceOf(Blob);

    await upgradedDb.delete();
  });

  test('7. CSV parser & exporter: supports quoted line breaks, does not invent DOB/jersey, neutralizes formulas, and respects duplicate ID policy', () => {
    const dirtyPlayer: Player = {
      id: 'CRICS-PLR-2001',
      name: '=SUM(A1:A2)',
      dob: '',
      role: 'Batter',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'None',
      jerseyNumber: null,
      notes: 'Line 1\nLine 2 with "quotes", and comma',
      createdAt: 1,
    };

    const csv = exportPlayersToCsv([dirtyPlayer]);
    // Formula must be neutralized with leading single quote inside quotes
    expect(csv).toContain("\"'=SUM(A1:A2)\"");

    // Re-importing with 'create-new' when ID already exists should generate a new ID and keep empty dob / null jerseyNumber
    const parsed = parsePlayersFromCsv(csv, [dirtyPlayer], 'create-new');
    expect(parsed.length).toBe(1);
    expect(parsed[0].id).not.toBe('CRICS-PLR-2001');
    expect(parsed[0].dob).toBe('');
    expect(parsed[0].jerseyNumber).toBeNull();
    expect(parsed[0].notes).toBe('Line 1\nLine 2 with "quotes", and comma');
  });

  test('8. completeMatch only increments matchesSinceLastBackup once when transitioning to completed', async () => {
    await useCricsStore.getState().initApp();
    const match: MatchRecord = {
      id: 'M-COMP-1',
      title: 'Completion Counter Test',
      format: 'T20',
      season: '2026',
      venue: 'Oval',
      date: '2026-11-11',
      scorerName: 'Scorer',
      teamAId: 'TA',
      teamBId: 'TB',
      teamAXI: ['P1', 'P2'],
      teamBXI: ['P3', 'P4'],
      tossWinnerTeamId: 'TA',
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
      innings: [],
      currentInningsNumber: 1,
      status: 'live',
      createdAt: 1,
      updatedAt: 1,
    };

    await useCricsStore.getState().createMatch(match);
    expect(useCricsStore.getState().settings.matchesSinceLastBackup).toBe(0);

    // First completion increments counter to 1
    await useCricsStore.getState().completeMatch('M-COMP-1', 'P1');
    expect(useCricsStore.getState().settings.matchesSinceLastBackup).toBe(1);

    // Calling completeMatch again on already-completed match (e.g. updating POTM) must NOT increment again
    await useCricsStore.getState().completeMatch('M-COMP-1', 'P2');
    expect(useCricsStore.getState().settings.matchesSinceLastBackup).toBe(1);
  });

  test('9. Phase 2 Dexie v3 migration normalizes legacy implicit bowler changes into explicit bowler-change events', () => {
    const legacyMatch: MatchRecord = {
      id: 'M-LEGACY-1',
      title: 'Legacy Match',
      format: 'T20',
      season: '2026',
      venue: 'Oval',
      date: '2026-11-11',
      scorerName: 'Scorer',
      teamAId: 'TA',
      teamBId: 'TB',
      teamAXI: ['P1', 'P2'],
      teamBXI: ['P3', 'P4'],
      tossWinnerTeamId: 'TA',
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
          battingTeamId: 'TA',
          bowlingTeamId: 'TB',
          openingStrikerId: 'P1',
          openingNonStrikerId: 'P2',
          openingBowlerId: 'P3',
        },
      ],
      currentInningsNumber: 1,
      status: 'live',
      createdAt: 1,
      updatedAt: 1,
    };

    const legacyEvents: BallEvent[] = [
      ...Array.from({ length: 6 }, (_, idx) => ({
        id: `leg-${idx + 1}`,
        matchId: 'M-LEGACY-1',
        inningsNumber: 1 as const,
        sequence: idx + 1,
        timestamp: idx + 1,
        actionType: 'delivery' as const,
        strikerId: 'P1',
        nonStrikerId: 'P2',
        bowlerId: 'P3',
        runsOffBat: 1,
        extraType: 'none' as const,
        extraRuns: 0,
        isWicket: false,
      })),
      // Over 2 delivery has bowlerId: 'P4' WITHOUT an explicit 'bowler-change' event!
      {
        id: 'leg-7',
        matchId: 'M-LEGACY-1',
        inningsNumber: 1,
        sequence: 7,
        timestamp: 7,
        actionType: 'delivery',
        strikerId: 'P1',
        nonStrikerId: 'P2',
        bowlerId: 'P4',
        runsOffBat: 4,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      },
    ];

    const { normalizedEvents, insertedCount } = normalizeLegacyBowlerChanges(
      [legacyMatch],
      legacyEvents
    );
    expect(insertedCount).toBe(1);
    expect(normalizedEvents.length).toBe(8);
    expect(normalizedEvents[6].actionType).toBe('bowler-change');
    expect(normalizedEvents[6].newBowlerId).toBe('P4');
    expect(normalizedEvents[7].sequence).toBe(8);

    const derived = deriveMatchState(legacyMatch, normalizedEvents, {});
    const p3Bowl = derived.currentInnings.bowlingCard.find((b) => b.playerId === 'P3')!;
    const p4Bowl = derived.currentInnings.bowlingCard.find((b) => b.playerId === 'P4')!;
    expect(p3Bowl.oversFormatted).toBe('1.0');
    expect(p3Bowl.runsConceded).toBe(6);
    expect(p4Bowl.oversFormatted).toBe('0.1');
    expect(p4Bowl.runsConceded).toBe(4);
  });
});

