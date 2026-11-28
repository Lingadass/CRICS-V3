import { BallEvent, MatchRecord, Player, Team, Tournament } from '../engine/types';
import { backfillMatchSummariesPure } from '../utils/matchSummaryUtils';
import { db, rebuildCareerStatsCache } from './database';

export interface SampleSeedBundle {
  players: Player[];
  teams: Team[];
  matches: MatchRecord[];
  events: BallEvent[];
  tournament: Tournament;
}

/**
 * Pure builder for deterministic sample seed data.
 */
export function buildSampleSeedBundle(): SampleSeedBundle {
  const seedPlayers: Player[] = [
    { id: 'CRICS-PLR-1001', name: 'Aarav Sharma', dob: '1997-04-15', role: 'Batter', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', jerseyNumber: 45, phone: '+91 98201 11001', notes: 'Aggressive opening batter', isSample: true, archived: false, createdAt: 1700000001000 },
    { id: 'CRICS-PLR-1002', name: 'Ishaan Deshmukh', dob: '1999-08-22', role: 'Batter', battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm medium', jerseyNumber: 18, phone: '+91 98201 11002', notes: 'Anchor at #2', isSample: true, archived: false, createdAt: 1700000002000 },
    { id: 'CRICS-PLR-1003', name: 'Rohan Kulkarni', dob: '1996-11-10', role: 'Wicket-Keeper', battingStyle: 'Right-hand bat', bowlingStyle: 'None', jerseyNumber: 7, phone: '+91 98201 11003', notes: 'Safe gloves & finisher', isSample: true, archived: false, createdAt: 1700000003000 },
    { id: 'CRICS-PLR-1004', name: 'Kabir Nair', dob: '1998-02-19', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', jerseyNumber: 33, phone: '+91 98201 11004', notes: 'Power hitter & seam', isSample: true, archived: false, createdAt: 1700000004000 },
    { id: 'CRICS-PLR-1005', name: 'Devansh Joshi', dob: '2000-06-04', role: 'All-Rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm orthodox', jerseyNumber: 8, phone: '+91 98201 11005', notes: 'Spin all-rounder', isSample: true, archived: false, createdAt: 1700000005000 },
    { id: 'CRICS-PLR-1006', name: 'Surya Prakash', dob: '1995-09-12', role: 'Batter', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', jerseyNumber: 63, phone: '+91 98201 11006', notes: '360-degree strokeplayer', isSample: true, archived: false, createdAt: 1700000006000 },
    { id: 'CRICS-PLR-1007', name: 'Arjun Malhotra', dob: '1999-01-30', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', jerseyNumber: 93, phone: '+91 98201 11007', notes: 'Yorker specialist', isSample: true, archived: false, createdAt: 1700000007000 },
    { id: 'CRICS-PLR-1008', name: 'Zaid Pathan', dob: '1998-07-18', role: 'Bowler', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm fast', jerseyNumber: 11, phone: '+91 98201 11008', notes: 'New ball swing bowler', isSample: true, archived: false, createdAt: 1700000008000 },
    { id: 'CRICS-PLR-1009', name: 'Yashvardhan Rao', dob: '2001-03-25', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', jerseyNumber: 23, phone: '+91 98201 11009', notes: 'Wrist spinner', isSample: true, archived: false, createdAt: 1700000009000 },
    { id: 'CRICS-PLR-1010', name: 'Pranav Sawant', dob: '2000-12-09', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', jerseyNumber: 14, phone: '+91 98201 11010', notes: 'Middle overs cutter bowler', isSample: true, archived: false, createdAt: 1700000010000 },
    { id: 'CRICS-PLR-1011', name: 'Nikhil Gokhale', dob: '1997-10-05', role: 'Batter', battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm offbreak', jerseyNumber: 27, phone: '+91 98201 11011', notes: 'Middle order stabilizer', isSample: true, archived: false, createdAt: 1700000011000 },
    { id: 'CRICS-PLR-1012', name: 'Vikramaditya Reddy', dob: '1996-05-14', role: 'Batter', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', jerseyNumber: 31, phone: '+91 98401 22001', notes: 'Titans Captain & Opener', isSample: true, archived: false, createdAt: 1700000012000 },
    { id: 'CRICS-PLR-1013', name: 'Rishabh Menon', dob: '1998-09-28', role: 'Wicket-Keeper', battingStyle: 'Left-hand bat', bowlingStyle: 'None', jerseyNumber: 17, phone: '+91 98401 22002', notes: 'Explosive keeper-batter', isSample: true, archived: false, createdAt: 1700000013000 },
    { id: 'CRICS-PLR-1014', name: 'Siddharth Verma', dob: '1997-12-11', role: 'Batter', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', jerseyNumber: 9, phone: '+91 98401 22003', notes: 'Classic #3 timer', isSample: true, archived: false, createdAt: 1700000014000 },
    { id: 'CRICS-PLR-1015', name: 'Harshvardhan Gill', dob: '2000-04-03', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', jerseyNumber: 77, phone: '+91 98401 22004', notes: 'Hard-hitting all-rounder', isSample: true, archived: false, createdAt: 1700000015000 },
    { id: 'CRICS-PLR-1016', name: 'Karanveer Singh', dob: '1995-08-19', role: 'All-Rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm orthodox', jerseyNumber: 12, phone: '+91 98401 22005', notes: 'Powerplay spinner', isSample: true, archived: false, createdAt: 1700000016000 },
    { id: 'CRICS-PLR-1017', name: 'Adil Qureshi', dob: '1999-02-07', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', jerseyNumber: 55, phone: '+91 98401 22006', notes: 'Express pace bowler', isSample: true, archived: false, createdAt: 1700000017000 },
    { id: 'CRICS-PLR-1018', name: 'Tanmay Chatterjee', dob: '1998-11-23', role: 'Bowler', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm wrist-spin', jerseyNumber: 44, phone: '+91 98401 22007', notes: 'Chinaman mystery spinner', isSample: true, archived: false, createdAt: 1700000018000 },
    { id: 'CRICS-PLR-1019', name: 'Deepak Chaharaj', dob: '1997-06-15', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', jerseyNumber: 90, phone: '+91 98401 22008', notes: 'Outswing specialist', isSample: true, archived: false, createdAt: 1700000019000 },
    { id: 'CRICS-PLR-1020', name: 'Manish Pandeyji', dob: '1994-03-17', role: 'Batter', battingStyle: 'Right-hand bat', bowlingStyle: 'None', jerseyNumber: 21, phone: '+91 98401 22009', notes: 'Experienced finisher', isSample: true, archived: false, createdAt: 1700000020000 },
    { id: 'CRICS-PLR-1021', name: 'Varun Chakravarthi', dob: '1999-07-02', role: 'Bowler', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', jerseyNumber: 29, phone: '+91 98401 22010', notes: 'Carrom ball specialist', isSample: true, archived: false, createdAt: 1700000021000 },
    { id: 'CRICS-PLR-1022', name: 'Abhishek Nayaraj', dob: '2001-01-19', role: 'All-Rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm medium', jerseyNumber: 4, phone: '+91 98401 22011', notes: 'Young utility player', isSample: true, archived: false, createdAt: 1700000022000 },
  ];

  const royalsIds = seedPlayers.slice(0, 11).map((p) => p.id);
  const titansIds = seedPlayers.slice(11, 22).map((p) => p.id);

  const seedTeams: Team[] = [
    {
      id: 'TEAM-ROYALS',
      name: 'Mumbai Royals',
      shortName: 'MR',
      primaryColor: 'var(--color-brand-600)',
      playerIds: royalsIds,
      captainId: 'CRICS-PLR-1001',
      viceCaptainId: 'CRICS-PLR-1003',
      isSample: true,
      archived: false,
      createdAt: 1700000001000,
    },
    {
      id: 'TEAM-TITANS',
      name: 'Deccan Titans',
      shortName: 'DT',
      primaryColor: 'var(--color-four)',
      playerIds: titansIds,
      captainId: 'CRICS-PLR-1012',
      viceCaptainId: 'CRICS-PLR-1013',
      isSample: true,
      archived: false,
      createdAt: 1700000002000,
    },
  ];

  const completedMatch: MatchRecord = {
    id: 'MATCH-101',
    title: 'Mumbai Royals vs Deccan Titans — Opener',
    format: 'T10',
    season: '2026',
    tournamentId: 'TOUR-2026',
    fixtureId: 'FIX-1',
    venue: 'Wankhede Oval',
    date: '2026-11-08',
    scorerName: 'Anil Raj',
    teamAId: 'TEAM-ROYALS',
    teamBId: 'TEAM-TITANS',
    teamAXI: royalsIds,
    teamBXI: titansIds,
    tossWinnerTeamId: 'TEAM-ROYALS',
    tossDecision: 'bat',
    rules: {
      oversPerInnings: 10,
      ballsPerOver: 6,
      wideRuns: 1,
      noBallRuns: 1,
      freeHitEnabled: true,
      powerplayOvers: 3,
      maxOversPerBowler: 2,
    },
    innings: [
      {
        inningsNumber: 1,
        battingTeamId: 'TEAM-ROYALS',
        bowlingTeamId: 'TEAM-TITANS',
        openingStrikerId: 'CRICS-PLR-1001',
        openingNonStrikerId: 'CRICS-PLR-1002',
        openingBowlerId: 'CRICS-PLR-1017',
      },
      {
        inningsNumber: 2,
        battingTeamId: 'TEAM-TITANS',
        bowlingTeamId: 'TEAM-ROYALS',
        openingStrikerId: 'CRICS-PLR-1012',
        openingNonStrikerId: 'CRICS-PLR-1013',
        openingBowlerId: 'CRICS-PLR-1007',
      },
    ],
    currentInningsNumber: 2,
    status: 'completed',
    isSample: true,
    archived: false,
    createdAt: 1700000100000,
    updatedAt: 1700000200000,
  };

  // Innings 1: 60 legal balls (10.0 overs) -> 165/5
  // 5 overs of 17 runs ([4, 2, 4, 1, 6, 0]) + 5 overs of 16 runs ([4, 1, 4, 1, 6, 0]) = 85 + 80 = 165 runs
  const inn1Bowlers = [
    'CRICS-PLR-1017', 'CRICS-PLR-1018', 'CRICS-PLR-1019', 'CRICS-PLR-1021', 'CRICS-PLR-1016',
    'CRICS-PLR-1017', 'CRICS-PLR-1018', 'CRICS-PLR-1019', 'CRICS-PLR-1021', 'CRICS-PLR-1016',
  ];
  const inn1Wickets: Record<number, { incoming: string; type: 'caught' | 'bowled' | 'lbw'; fielder?: string }> = {
    11: { incoming: 'CRICS-PLR-1003', type: 'caught', fielder: 'CRICS-PLR-1013' },
    23: { incoming: 'CRICS-PLR-1004', type: 'bowled' },
    35: { incoming: 'CRICS-PLR-1005', type: 'caught', fielder: 'CRICS-PLR-1012' },
    47: { incoming: 'CRICS-PLR-1006', type: 'lbw' },
    59: { incoming: 'CRICS-PLR-1007', type: 'caught', fielder: 'CRICS-PLR-1014' },
  };

  const completedEvents: BallEvent[] = [];
  let seq = 1;
  let striker1 = 'CRICS-PLR-1001';
  let nonStriker1 = 'CRICS-PLR-1002';

  for (let overIdx = 0; overIdx < 10; overIdx++) {
    const bowlerId = inn1Bowlers[overIdx];
    if (overIdx > 0) {
      completedEvents.push({
        id: `M101-E-BC1-${overIdx}`,
        matchId: 'MATCH-101',
        inningsNumber: 1,
        sequence: seq++,
        timestamp: 1700000100000 + overIdx * 10000 - 500,
        actionType: 'bowler-change',
        strikerId: striker1,
        nonStrikerId: nonStriker1,
        bowlerId: inn1Bowlers[overIdx - 1],
        newBowlerId: bowlerId,
        bowlerChangeReason: 'end-of-over',
        runsOffBat: 0,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
        isSample: true,
      });
    }
    const overRuns = overIdx < 5 ? [4, 2, 4, 1, 6, 0] : [4, 1, 4, 1, 6, 0];
    for (let ballInOver = 0; ballInOver < 6; ballInOver++) {
      const globalIdx = overIdx * 6 + ballInOver;
      const runs = overRuns[ballInOver];
      const wkt = inn1Wickets[globalIdx];
      completedEvents.push({
        id: `M101-E-${seq}`,
        matchId: 'MATCH-101',
        inningsNumber: 1,
        sequence: seq++,
        timestamp: 1700000100000 + globalIdx * 1000,
        actionType: 'delivery',
        strikerId: striker1,
        nonStrikerId: nonStriker1,
        bowlerId,
        runsOffBat: runs,
        extraType: 'none',
        extraRuns: 0,
        isWicket: Boolean(wkt),
        wicketType: wkt?.type,
        dismissedPlayerId: wkt ? striker1 : undefined,
        fielderId: wkt?.fielder,
        incomingBatterId: wkt?.incoming,
        isSample: true,
      });
      if (wkt) {
        striker1 = wkt.incoming;
      } else if (runs % 2 === 1) {
        [striker1, nonStriker1] = [nonStriker1, striker1];
      }
      if (ballInOver === 5) {
        [striker1, nonStriker1] = [nonStriker1, striker1];
      }
    }
  }

  // Innings 2: 53 legal balls (8.5 overs) -> 170/2 (Deccan Titans won by 8 wickets)
  // First 8 overs (48 balls): 19 runs per over ([4, 4, 4, 1, 6, 0]) = 152 runs
  // Over 9 (5 balls): [4, 4, 4, 2, 4] = 18 runs -> 152 + 18 = 170 runs
  const inn2Bowlers = [
    'CRICS-PLR-1007', 'CRICS-PLR-1008', 'CRICS-PLR-1009', 'CRICS-PLR-1010', 'CRICS-PLR-1005',
    'CRICS-PLR-1007', 'CRICS-PLR-1008', 'CRICS-PLR-1009', 'CRICS-PLR-1010',
  ];
  const inn2Wickets: Record<number, { incoming: string; type: 'caught' | 'bowled'; fielder?: string }> = {
    17: { incoming: 'CRICS-PLR-1014', type: 'caught', fielder: 'CRICS-PLR-1003' },
    35: { incoming: 'CRICS-PLR-1015', type: 'bowled' },
  };

  let striker2 = 'CRICS-PLR-1012';
  let nonStriker2 = 'CRICS-PLR-1013';

  for (let overIdx = 0; overIdx < 9; overIdx++) {
    const bowlerId = inn2Bowlers[overIdx];
    if (overIdx > 0) {
      completedEvents.push({
        id: `M101-E-BC2-${overIdx}`,
        matchId: 'MATCH-101',
        inningsNumber: 2,
        sequence: seq++,
        timestamp: 1700000180000 + overIdx * 10000 - 500,
        actionType: 'bowler-change',
        strikerId: striker2,
        nonStrikerId: nonStriker2,
        bowlerId: inn2Bowlers[overIdx - 1],
        newBowlerId: bowlerId,
        bowlerChangeReason: 'end-of-over',
        runsOffBat: 0,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
        isSample: true,
      });
    }
    const overRuns = overIdx < 8 ? [4, 4, 4, 1, 6, 0] : [4, 4, 4, 2, 4];
    for (let ballInOver = 0; ballInOver < overRuns.length; ballInOver++) {
      const globalIdx = overIdx * 6 + ballInOver;
      const runs = overRuns[ballInOver];
      const wkt = inn2Wickets[globalIdx];
      completedEvents.push({
        id: `M101-E-${seq}`,
        matchId: 'MATCH-101',
        inningsNumber: 2,
        sequence: seq++,
        timestamp: 1700000180000 + globalIdx * 1000,
        actionType: 'delivery',
        strikerId: striker2,
        nonStrikerId: nonStriker2,
        bowlerId,
        runsOffBat: runs,
        extraType: 'none',
        extraRuns: 0,
        isWicket: Boolean(wkt),
        wicketType: wkt?.type,
        dismissedPlayerId: wkt ? striker2 : undefined,
        fielderId: wkt?.fielder,
        incomingBatterId: wkt?.incoming,
        isSample: true,
      });
      if (wkt) {
        striker2 = wkt.incoming;
      } else if (runs % 2 === 1) {
        [striker2, nonStriker2] = [nonStriker2, striker2];
      }
      if (ballInOver === 5) {
        [striker2, nonStriker2] = [nonStriker2, striker2];
      }
    }
  }

  const liveMatch: MatchRecord = {
    id: 'MATCH-102',
    title: 'Mumbai Royals vs Deccan Titans — Match 2 (Live)',
    format: 'T20',
    season: '2026',
    tournamentId: 'TOUR-2026',
    fixtureId: 'FIX-2',
    venue: 'Brabourne Stadium',
    date: '2026-11-10',
    scorerName: 'Anil Raj',
    teamAId: 'TEAM-ROYALS',
    teamBId: 'TEAM-TITANS',
    teamAXI: royalsIds,
    teamBXI: titansIds,
    tossWinnerTeamId: 'TEAM-TITANS',
    tossDecision: 'bowl',
    rules: {
      oversPerInnings: 5,
      ballsPerOver: 6,
      wideRuns: 1,
      noBallRuns: 1,
      freeHitEnabled: true,
      powerplayOvers: 2,
      maxOversPerBowler: 2,
    },
    innings: [
      {
        inningsNumber: 1,
        battingTeamId: 'TEAM-ROYALS',
        bowlingTeamId: 'TEAM-TITANS',
        openingStrikerId: 'CRICS-PLR-1001',
        openingNonStrikerId: 'CRICS-PLR-1002',
        openingBowlerId: 'CRICS-PLR-1017',
      },
    ],
    currentInningsNumber: 1,
    status: 'live',
    isSample: true,
    archived: false,
    createdAt: 1700000300000,
    updatedAt: 1700000350000,
  };

  const liveEvents: BallEvent[] = [
    {
      id: 'M102-E-1',
      matchId: 'MATCH-102',
      inningsNumber: 1,
      sequence: 1,
      timestamp: 1700000301000,
      actionType: 'delivery',
      strikerId: 'CRICS-PLR-1001',
      nonStrikerId: 'CRICS-PLR-1002',
      bowlerId: 'CRICS-PLR-1017',
      runsOffBat: 4,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
      isSample: true,
    },
    {
      id: 'M102-E-2',
      matchId: 'MATCH-102',
      inningsNumber: 1,
      sequence: 2,
      timestamp: 1700000302000,
      actionType: 'delivery',
      strikerId: 'CRICS-PLR-1001',
      nonStrikerId: 'CRICS-PLR-1002',
      bowlerId: 'CRICS-PLR-1017',
      runsOffBat: 1,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
      isSample: true,
    },
    {
      id: 'M102-E-3',
      matchId: 'MATCH-102',
      inningsNumber: 1,
      sequence: 3,
      timestamp: 1700000303000,
      actionType: 'delivery',
      strikerId: 'CRICS-PLR-1002',
      nonStrikerId: 'CRICS-PLR-1001',
      bowlerId: 'CRICS-PLR-1017',
      runsOffBat: 6,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
      isSample: true,
    },
  ];

  const seedTournament: Tournament = {
    id: 'TOUR-2026',
    name: 'CRICS Champions Trophy 2026',
    season: '2026',
    format: 'T20',
    type: 'League',
    teamIds: ['TEAM-ROYALS', 'TEAM-TITANS'],
    pointsForWin: 2,
    pointsForTie: 1,
    isSample: true,
    archived: false,
    createdAt: 1700000000000,
    fixtures: [
      {
        id: 'FIX-1',
        tournamentId: 'TOUR-2026',
        roundName: 'League Match 1',
        teamAId: 'TEAM-ROYALS',
        teamBId: 'TEAM-TITANS',
        date: '2026-11-08',
        venue: 'Wankhede Oval',
        matchId: 'MATCH-101',
      },
      {
        id: 'FIX-2',
        tournamentId: 'TOUR-2026',
        roundName: 'League Match 2',
        teamAId: 'TEAM-ROYALS',
        teamBId: 'TEAM-TITANS',
        date: '2026-11-10',
        venue: 'Brabourne Stadium',
        matchId: 'MATCH-102',
      },
      {
        id: 'FIX-3',
        tournamentId: 'TOUR-2026',
        roundName: 'Grand Final',
        teamAId: 'TEAM-TITANS',
        teamBId: 'TEAM-ROYALS',
        date: '2026-11-15',
        venue: 'DY Patil Arena',
      },
    ],
  };

  const allSeedEvents = [...completedEvents, ...liveEvents];
  const seedMatchesWithSummary = backfillMatchSummariesPure(
    [completedMatch, liveMatch],
    allSeedEvents,
    seedPlayers,
    seedTeams
  );

  return {
    players: seedPlayers,
    teams: seedTeams,
    matches: seedMatchesWithSummary,
    events: allSeedEvents,
    tournament: seedTournament,
  };
}

/**
 * Loads deterministic sample data tagged with isSample: true ONLY when explicitly requested by user.
 */
export async function loadSampleSeedData(): Promise<void> {
  const bundle = buildSampleSeedBundle();
  await db.transaction(
    'rw',
    [db.players, db.teams, db.matches, db.ballEvents, db.tournaments],
    async () => {
      await db.players.bulkPut(bundle.players);
      await db.teams.bulkPut(bundle.teams);
      await db.matches.bulkPut(bundle.matches);
      await db.ballEvents.bulkPut(bundle.events);
      await db.tournaments.put(bundle.tournament);
    }
  );
  await rebuildCareerStatsCache();
}

/**
 * Removes all records tagged with isSample: true while leaving real user data intact.
 */
export async function removeSampleSeedData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.players, db.playerPhotos, db.teams, db.matches, db.ballEvents, db.tournaments],
    async () => {
      const samplePlayers = (await db.players.toArray()).filter((p) => p.isSample);
      for (const p of samplePlayers) {
        await db.players.delete(p.id);
        await db.playerPhotos.delete(p.id);
      }

      const sampleTeams = (await db.teams.toArray()).filter((t) => t.isSample);
      for (const t of sampleTeams) {
        await db.teams.delete(t.id);
      }

      const sampleMatches = (await db.matches.toArray()).filter((m) => m.isSample);
      for (const m of sampleMatches) {
        await db.matches.delete(m.id);
        await db.ballEvents.where('matchId').equals(m.id).delete();
      }

      const sampleEvents = (await db.ballEvents.toArray()).filter((e) => e.isSample);
      for (const e of sampleEvents) {
        await db.ballEvents.delete(e.id);
      }

      const sampleTournaments = (await db.tournaments.toArray()).filter(
        (tr) => tr.isSample
      );
      for (const tr of sampleTournaments) {
        await db.tournaments.delete(tr.id);
      }
    }
  );
  await rebuildCareerStatsCache();
}
