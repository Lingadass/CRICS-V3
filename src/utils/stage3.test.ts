import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { CricsDatabase, db } from '../db/database';
import {
  advanceTournamentKnockoutPure,
  deriveTournamentStandings,
  generateKnockoutFixturesFromStandings,
  generateRoundRobinFixtures,
} from '../engine/scoringEngine';
import { BallEvent, MatchRecord, Player, Team, Tournament } from '../engine/types';
import { useCricsStore } from '../store/useCricsStore';

function createPlayersForTeam(teamPrefix: string): Player[] {
  return [
    {
      id: `${teamPrefix}-P1`,
      name: `${teamPrefix} Batter 1`,
      dob: '',
      role: 'Batter',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm medium',
      jerseyNumber: 1,
      createdAt: 1000,
    },
    {
      id: `${teamPrefix}-P2`,
      name: `${teamPrefix} Batter 2`,
      dob: '',
      role: 'All-Rounder',
      battingStyle: 'Left-hand bat',
      bowlingStyle: 'Left-arm orthodox',
      jerseyNumber: 2,
      createdAt: 1000,
    },
  ];
}

function buildOneOverMatch(
  matchId: string,
  tournamentId: string,
  fixtureId: string,
  teamAId: string,
  teamBId: string,
  inn1RunsPerBall: number,
  inn2RunsPerBall: number,
  options?: {
    isNoResult?: boolean;
    superOverRunsA?: number;
    superOverRunsB?: number;
  }
): { match: MatchRecord; events: BallEvent[] } {
  const teamAXI = [`${teamAId}-P1`, `${teamAId}-P2`];
  const teamBXI = [`${teamBId}-P1`, `${teamBId}-P2`];

  const innings: MatchRecord['innings'] = [
    {
      inningsNumber: 1,
      battingTeamId: teamAId,
      bowlingTeamId: teamBId,
      openingStrikerId: teamAXI[0],
      openingNonStrikerId: teamAXI[1],
      openingBowlerId: teamBXI[0],
    },
    {
      inningsNumber: 2,
      battingTeamId: teamBId,
      bowlingTeamId: teamAId,
      openingStrikerId: teamBXI[0],
      openingNonStrikerId: teamBXI[1],
      openingBowlerId: teamAXI[0],
    },
  ];

  if (options?.superOverRunsA !== undefined && options?.superOverRunsB !== undefined) {
    innings.push(
      {
        inningsNumber: 3,
        battingTeamId: teamBId,
        bowlingTeamId: teamAId,
        openingStrikerId: teamBXI[0],
        openingNonStrikerId: teamBXI[1],
        openingBowlerId: teamAXI[0],
        isSuperOver: true,
      },
      {
        inningsNumber: 4,
        battingTeamId: teamAId,
        bowlingTeamId: teamBId,
        openingStrikerId: teamAXI[0],
        openingNonStrikerId: teamAXI[1],
        openingBowlerId: teamBXI[0],
        isSuperOver: true,
      }
    );
  }

  const match: MatchRecord = {
    id: matchId,
    title: `${teamAId} vs ${teamBId}`,
    format: 'Custom',
    season: '2026',
    tournamentId,
    fixtureId,
    venue: 'Main Oval',
    date: '2026-06-15',
    scorerName: 'Scorer',
    teamAId,
    teamBId,
    teamAXI,
    teamBXI,
    tossWinnerTeamId: teamAId,
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
    innings,
    currentInningsNumber: innings.length as 1 | 2 | 3 | 4,
    status: 'completed',
    isNoResult: options?.isNoResult,
    createdAt: 1000,
    updatedAt: 2000,
  };

  if (options?.isNoResult) {
    return { match, events: [] };
  }

  const events: BallEvent[] = [];
  let seq = 1;

  for (let b = 1; b <= 6; b++) {
    events.push({
      id: `${matchId}-B-${seq}`,
      matchId,
      inningsNumber: 1,
      sequence: seq++,
      timestamp: 1000 + seq,
      actionType: 'delivery',
      strikerId: teamAXI[0],
      nonStrikerId: teamAXI[1],
      bowlerId: teamBXI[0],
      runsOffBat: inn1RunsPerBall,
      extraType: 'none',
      extraRuns: 0,
      isBoundaryFour: inn1RunsPerBall === 4,
      isBoundarySix: inn1RunsPerBall === 6,
      isWicket: false,
    });
  }

  for (let b = 1; b <= 6; b++) {
    events.push({
      id: `${matchId}-B-${seq}`,
      matchId,
      inningsNumber: 2,
      sequence: seq++,
      timestamp: 1000 + seq,
      actionType: 'delivery',
      strikerId: teamBXI[0],
      nonStrikerId: teamBXI[1],
      bowlerId: teamAXI[0],
      runsOffBat: inn2RunsPerBall,
      extraType: 'none',
      extraRuns: 0,
      isBoundaryFour: inn2RunsPerBall === 4,
      isBoundarySix: inn2RunsPerBall === 6,
      isWicket: false,
    });
  }

  if (options?.superOverRunsA !== undefined && options?.superOverRunsB !== undefined) {
    for (let b = 1; b <= 6; b++) {
      events.push({
        id: `${matchId}-B-${seq}`,
        matchId,
        inningsNumber: 3,
        sequence: seq++,
        timestamp: 1000 + seq,
        actionType: 'delivery',
        strikerId: teamBXI[0],
        nonStrikerId: teamBXI[1],
        bowlerId: teamAXI[0],
        runsOffBat: b === 1 ? options.superOverRunsB : 0,
        extraType: 'none',
        extraRuns: 0,
        isBoundaryFour: options.superOverRunsB === 4 && b === 1,
        isBoundarySix: options.superOverRunsB === 6 && b === 1,
        isWicket: false,
      });
    }
    for (let b = 1; b <= 6; b++) {
      events.push({
        id: `${matchId}-B-${seq}`,
        matchId,
        inningsNumber: 4,
        sequence: seq++,
        timestamp: 1000 + seq,
        actionType: 'delivery',
        strikerId: teamAXI[0],
        nonStrikerId: teamAXI[1],
        bowlerId: teamBXI[0],
        runsOffBat: b === 1 ? options.superOverRunsA : 0,
        extraType: 'none',
        extraRuns: 0,
        isBoundaryFour: options.superOverRunsA === 4 && b === 1,
        isBoundarySix: options.superOverRunsA === 6 && b === 1,
        isWicket: false,
      });
    }
  }

  return { match, events };
}

describe('Stage 3: Knockout Tournaments (Seeding, Advancing, Ties, No-Result & 6-Team E2E)', () => {
  it('1. seeds Quarter-Finals, Semi-Finals, Final, and Custom brackets from League and Group standings', () => {
    const teamIds = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];
    const tournament: Tournament = {
      id: 'TOUR-SEED-8',
      name: '8 Team Championship',
      season: '2026',
      format: 'T20',
      type: 'League',
      teamIds,
      pointsForWin: 2,
      pointsForTie: 1,
      pointsForNoResult: 1,
      fixtures: [],
      createdAt: 1000,
    };

    const mockStandings = teamIds.map((teamId, idx) => ({
      teamId,
      played: 7,
      won: 7 - idx,
      lost: idx,
      tied: 0,
      noResult: 0,
      points: (7 - idx) * 2,
      runsScored: 700,
      oversFacedForNrr: 70,
      runsConceded: 600 + idx * 10,
      oversBowledForNrr: 70,
      netRunRate: Number((1 - idx * 0.1).toFixed(3)),
    }));

    const qfBracket = generateKnockoutFixturesFromStandings(
      tournament,
      mockStandings,
      'quarter-finals',
      '2026-07-01',
      'Main Oval'
    );
    expect(qfBracket).toHaveLength(7); // 4 QF + 2 SF + 1 Final
    const qfs = qfBracket.filter((f) => f.stage === 'quarter-final');
    const sfs = qfBracket.filter((f) => f.stage === 'semi-final');
    const finals = qfBracket.filter((f) => f.stage === 'final');
    expect(qfs).toHaveLength(4);
    expect(sfs).toHaveLength(2);
    expect(finals).toHaveLength(1);

    // Standard 1v8, 4v5, 2v7, 3v6 seeding
    expect([qfs[0].teamAId, qfs[0].teamBId]).toEqual(['T1', 'T8']);
    expect([qfs[1].teamAId, qfs[1].teamBId]).toEqual(['T4', 'T5']);
    expect([qfs[2].teamAId, qfs[2].teamBId]).toEqual(['T2', 'T7']);
    expect([qfs[3].teamAId, qfs[3].teamBId]).toEqual(['T3', 'T6']);

    // Custom bracket seeding
    const customBracket = generateKnockoutFixturesFromStandings(
      tournament,
      mockStandings,
      'custom',
      '2026-07-01',
      'Main Oval',
      [
        { roundName: 'Qualifier 1', teamAId: 'T1', teamBId: 'T2' },
        { roundName: 'Eliminator', teamAId: 'T3', teamBId: 'T4' },
      ]
    );
    expect(customBracket.length).toBeGreaterThanOrEqual(2);
    expect(customBracket[0].teamAId).toBe('T1');
    expect(customBracket[0].teamBId).toBe('T2');
  });

  it('2. handles ties (Super Over result), No-Result matches (points split in league, higher seed advances in knockout), and Dexie v6 migration', async () => {
    const teamIds = ['T1', 'T2', 'T3', 'T4'];
    const players: Player[] = teamIds.flatMap((tid) => createPlayersForTeam(tid));
    const playersMap = Object.fromEntries(players.map((p) => [p.id, p]));

    const tournament: Tournament = {
      id: 'TOUR-TIE-NR',
      name: 'Rain & Super Over Cup',
      season: '2026',
      format: 'Custom',
      type: 'League',
      teamIds,
      pointsForWin: 2,
      pointsForTie: 1,
      pointsForNoResult: 1,
      fixtures: [
        {
          id: 'FX-NR-1',
          tournamentId: 'TOUR-TIE-NR',
          roundName: 'Match 1',
          stage: 'league',
          teamAId: 'T1',
          teamBId: 'T2',
          date: '2026-06-10',
          venue: 'Main Oval',
          matchId: 'M-NR-1',
        },
      ],
      createdAt: 1000,
    };

    const { match: nrLeagueMatch, events: nrEvents } = buildOneOverMatch(
      'M-NR-1',
      'TOUR-TIE-NR',
      'FX-NR-1',
      'T1',
      'T2',
      0,
      0,
      { isNoResult: true }
    );

    const standingsAfterNr = deriveTournamentStandings(
      tournament,
      [nrLeagueMatch],
      nrEvents,
      playersMap
    );
    const t1Row = standingsAfterNr.find((r) => r.teamId === 'T1')!;
    const t2Row = standingsAfterNr.find((r) => r.teamId === 'T2')!;
    expect(t1Row.played).toBe(1);
    expect(t1Row.noResult).toBe(1);
    expect(t1Row.points).toBe(1);
    expect(t2Row.noResult).toBe(1);
    expect(t2Row.points).toBe(1);

    // Seed Semi-Finals where T1 is higher seed than T4, and T2 plays T3
    const rankedStandings = [
      { ...t1Row, teamId: 'T1', points: 6, netRunRate: 1.5 },
      { ...t2Row, teamId: 'T2', points: 4, netRunRate: 0.8 },
      { ...t1Row, teamId: 'T3', points: 2, netRunRate: -0.4 },
      { ...t2Row, teamId: 'T4', points: 0, netRunRate: -1.2 },
    ];
    const koFixtures = generateKnockoutFixturesFromStandings(
      tournament,
      rankedStandings,
      'semi-finals',
      '2026-06-20',
      'Main Oval'
    );
    const sf1 = koFixtures.find((f) => f.stage === 'semi-final' && f.slotNumber === 1)!;
    const sf2 = koFixtures.find((f) => f.stage === 'semi-final' && f.slotNumber === 2)!;

    // SF1 (T1 vs T4) is Tied in regulation (12 vs 12) and T4 wins in Super Over (6 vs 4)
    const { match: sf1Match, events: sf1Events } = buildOneOverMatch(
      'M-SF1-SO',
      tournament.id,
      sf1.id,
      sf1.teamAId, // T1
      sf1.teamBId, // T4
      2, // 12 runs
      2, // 12 runs (Tie!)
      { superOverRunsA: 4, superOverRunsB: 6 } // T4 scores 6 in SO, T1 scores 4 -> T4 wins!
    );

    // SF2 (T2 vs T3) is abandoned as No-Result -> higher seed T2 advances!
    const { match: sf2Match, events: sf2Events } = buildOneOverMatch(
      'M-SF2-NR',
      tournament.id,
      sf2.id,
      sf2.teamAId, // T2
      sf2.teamBId, // T3
      0,
      0,
      { isNoResult: true }
    );

    const tourWithLinkedSfs: Tournament = {
      ...tournament,
      fixtures: koFixtures.map((f) => {
        if (f.id === sf1.id) return { ...f, matchId: sf1Match.id };
        if (f.id === sf2.id) return { ...f, matchId: sf2Match.id };
        return f;
      }),
    };

    // Provide a league win for T2 over T3 so T2 is higher seed in standings
    const { match: leagueWinT2, events: leagueWinT2Events } = buildOneOverMatch(
      'M-LG-T2-T3',
      tournament.id,
      'FX-LG-2',
      'T2',
      'T3',
      4,
      1
    );

    const advancedTour = advanceTournamentKnockoutPure(
      tourWithLinkedSfs,
      [leagueWinT2, sf1Match, sf2Match],
      [...leagueWinT2Events, ...sf1Events, ...sf2Events],
      playersMap
    );

    const finalFix = advancedTour.fixtures.find((f) => f.stage === 'final')!;
    expect(finalFix.teamAId).toBe('T4'); // Super Over winner from SF1
    expect(finalFix.teamBId).toBe('T2'); // Higher seed from No-Result SF2

    // Verify Dexie v5 -> v6 migration upgrades existing tournaments with default pointsForNoResult and fixture stage
    const migDbName = `CricsStage3Mig_${Date.now()}`;
    const rawDexie = new Dexie(migDbName);
    rawDexie.version(5).stores({
      players: 'id, name, dob, role, jerseyNumber, archived, isSample, createdAt',
      playerPhotos: 'playerId, updatedAt',
      teams: 'id, name, shortName, archived, isSample, createdAt',
      matches:
        'id, status, format, season, tournamentId, date, archived, isSample, createdAt, updatedAt',
      ballEvents:
        'id, matchId, [matchId+inningsNumber], [matchId+sequence], sequence, isSample',
      tournaments: 'id, name, season, format, archived, isSample, createdAt',
      settings: 'id',
      careerCache: 'id, playerId, format, season, [playerId+format+season]',
    });
    await rawDexie.open();
    await rawDexie.table('tournaments').put({
      id: 'LEGACY-TOUR-V5',
      name: 'Legacy League',
      season: '2025',
      format: 'T20',
      type: 'League',
      teamIds: ['T1', 'T2'],
      pointsForWin: 2,
      pointsForTie: 1,
      fixtures: [
        {
          id: 'LEGACY-FX-1',
          tournamentId: 'LEGACY-TOUR-V5',
          roundName: 'Match 1',
          teamAId: 'T1',
          teamBId: 'T2',
          date: '2025-05-01',
          venue: 'Oval',
        },
      ],
      createdAt: 1000,
    });
    rawDexie.close();

    const upgradedDb = new CricsDatabase(migDbName);
    await upgradedDb.open();
    const migratedTour = await upgradedDb.tournaments.get('LEGACY-TOUR-V5');
    expect(migratedTour?.pointsForNoResult).toBe(1);
    expect(migratedTour?.fixtures[0]?.stage).toBe('league');
    upgradedDb.close();
    await Dexie.delete(migDbName);
  });

  it('3. runs a 6-team tournament with two groups, semi-finals, and a final end to end via store actions', async () => {
    await Promise.all([
      db.players.clear(),
      db.teams.clear(),
      db.matches.clear(),
      db.ballEvents.clear(),
      db.tournaments.clear(),
      db.careerCache.clear(),
    ]);

    const teamIds = ['GA1', 'GA2', 'GA3', 'GB1', 'GB2', 'GB3'];
    const allPlayers: Player[] = teamIds.flatMap((tid) => createPlayersForTeam(tid));
    const allTeams: Team[] = teamIds.map((tid) => ({
      id: tid,
      name: `Team ${tid}`,
      shortName: tid,
      primaryColor: 'var(--color-brand-600)',
      playerIds: [`${tid}-P1`, `${tid}-P2`],
      createdAt: 1000,
    }));

    await db.players.bulkPut(allPlayers);
    for (const tm of allTeams) {
      await useCricsStore.getState().saveTeam(tm);
    }
    await useCricsStore.getState().initApp();

    const teamGroups: Record<string, string> = {
      GA1: 'Group A',
      GA2: 'Group A',
      GA3: 'Group A',
      GB1: 'Group B',
      GB2: 'Group B',
      GB3: 'Group B',
    };

    const tourId = 'TOUR-6TEAM-E2E';
    const groupFixtures = generateRoundRobinFixtures(
      tourId,
      teamIds,
      '2026-08-01',
      'Main Oval',
      teamGroups
    );
    expect(groupFixtures).toHaveLength(6); // 3 in Group A + 3 in Group B

    const tournament: Tournament = {
      id: tourId,
      name: '6-Team Two-Group Cup',
      season: '2026',
      format: 'Custom',
      type: 'Groups',
      teamIds,
      teamGroups,
      knockoutPreset: 'semi-finals',
      pointsForWin: 2,
      pointsForTie: 1,
      pointsForNoResult: 1,
      fixtures: groupFixtures,
      createdAt: 1000,
    };

    await useCricsStore.getState().saveTournament(tournament);

    // Helper to play a fixture through the store so automatic advancement triggers on completion
    const playFixtureToCompletion = async (
      fxId: string,
      teamAId: string,
      teamBId: string,
      teamAWins: boolean
    ) => {
      const mId = `MATCH-${fxId}`;
      const { match, events } = buildOneOverMatch(
        mId,
        tourId,
        fxId,
        teamAId,
        teamBId,
        teamAWins ? 4 : 1,
        teamAWins ? 1 : 4
      );
      await useCricsStore.getState().createMatch({ ...match, status: 'live' });
      for (const ev of events) {
        const { id: _id, matchId: _m, sequence: _s, timestamp: _t, ...partial } = ev;
        await useCricsStore.getState().recordBall(mId, partial);
      }
    };

    // Play all 6 group matches:
    // Group A desired order: GA1 (2W), GA2 (1W), GA3 (0W)
    // Group B desired order: GB1 (2W), GB2 (1W), GB3 (0W)
    const desiredWinners: Record<string, string> = {
      'GA1-GA2': 'GA1',
      'GA1-GA3': 'GA1',
      'GA2-GA3': 'GA2',
      'GB1-GB2': 'GB1',
      'GB1-GB3': 'GB1',
      'GB2-GB3': 'GB2',
    };

    for (const fx of groupFixtures) {
      const key1 = `${fx.teamAId}-${fx.teamBId}`;
      const key2 = `${fx.teamBId}-${fx.teamAId}`;
      const desiredWinner = desiredWinners[key1] || desiredWinners[key2];
      await playFixtureToCompletion(fx.id, fx.teamAId, fx.teamBId, fx.teamAId === desiredWinner);
    }

    // Seed / verify Semi-Finals & Final bracket (A1 vs B2 = GA1 vs GB2, B1 vs A2 = GB1 vs GA2)
    await useCricsStore.getState().seedTournamentKnockout(tourId, 'semi-finals', '2026-08-10', 'Main Oval');

    let updatedTour = useCricsStore.getState().tournaments.find((t) => t.id === tourId)!;
    const sf1 = updatedTour.fixtures.find((f) => f.stage === 'semi-final' && f.slotNumber === 1)!;
    const sf2 = updatedTour.fixtures.find((f) => f.stage === 'semi-final' && f.slotNumber === 2)!;
    expect(sf1.teamAId).toBe('GA1');
    expect(sf1.teamBId).toBe('GB2');
    expect(sf2.teamAId).toBe('GB1');
    expect(sf2.teamBId).toBe('GA2');

    // Play Semi-Final 1: GA1 beats GB2 -> GA1 automatically advances to Final Slot A!
    await playFixtureToCompletion(sf1.id, sf1.teamAId, sf1.teamBId, true);
    updatedTour = useCricsStore.getState().tournaments.find((t) => t.id === tourId)!;
    let finalFix = updatedTour.fixtures.find((f) => f.stage === 'final')!;
    expect(finalFix.teamAId).toBe('GA1');
    expect(finalFix.teamBId).toBe('');

    // Play Semi-Final 2: GA2 beats GB1 -> GA2 automatically advances to Final Slot B!
    await playFixtureToCompletion(sf2.id, sf2.teamAId, sf2.teamBId, false);
    updatedTour = useCricsStore.getState().tournaments.find((t) => t.id === tourId)!;
    finalFix = updatedTour.fixtures.find((f) => f.stage === 'final')!;
    expect(finalFix.teamAId).toBe('GA1');
    expect(finalFix.teamBId).toBe('GA2');

    // Play Final: GA1 beats GA2 -> GA1 is crowned Tournament Winner!
    await playFixtureToCompletion(finalFix.id, finalFix.teamAId, finalFix.teamBId, true);
    updatedTour = useCricsStore.getState().tournaments.find((t) => t.id === tourId)!;
    finalFix = updatedTour.fixtures.find((f) => f.stage === 'final')!;
    expect(finalFix.winnerTeamId).toBe('GA1');
  });
});
