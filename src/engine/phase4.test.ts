import { describe, expect, it } from 'vitest';
import { deriveCareerStats } from './careerStatsEngine';
import {
  buildScorecardChartData,
  generateRoundRobinFixtures,
  rankLeaderboardEntries,
  validateMatchSetup,
} from './phase4Helpers';
import { deriveTournamentStandings } from './matchEngine';
import { BallEvent, MatchRecord, Player, Tournament } from './types';

const SAMPLE_PLAYERS: Player[] = [
  {
    id: 'P1',
    name: 'Aarav',
    dob: '1998-01-01',
    role: 'Batter',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm offbreak',
    jerseyNumber: 7,
    phone: '',
    notes: '',
    createdAt: 1,
  },
  {
    id: 'P2',
    name: 'Rohan',
    dob: '1999-02-02',
    role: 'All-Rounder',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Left-arm orthodox',
    jerseyNumber: 18,
    phone: '',
    notes: '',
    createdAt: 2,
  },
  {
    id: 'P3',
    name: 'Vikram',
    dob: '1997-03-03',
    role: 'Bowler',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm fast',
    jerseyNumber: 99,
    phone: '',
    notes: '',
    createdAt: 3,
  },
  {
    id: 'P4',
    name: 'Kabir',
    dob: '2000-04-04',
    role: 'Wicket-Keeper',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'None',
    jerseyNumber: 1,
    phone: '',
    notes: '',
    createdAt: 4,
  },
];

describe('Phase 4: Match Setup, Scorecards, Careers, Tournaments, Leaderboards & Players', () => {
  it('1. validateMatchSetup blocks overlapping Playing XIs, identical openers, and invalid over limits', () => {
    // Overlapping player P2 in both Team A XI and Team B XI
    const overlapCheck = validateMatchSetup({
      teamAId: 'TEAM-A',
      teamBId: 'TEAM-B',
      teamAXI: ['P1', 'P2'],
      teamBXI: ['P2', 'P3'],
      openingStrikerId: 'P1',
      openingNonStrikerId: 'P2',
      openingBowlerId: 'P3',
      battingFirstTeamId: 'TEAM-A',
      oversPerInnings: 20,
      powerplayOvers: 6,
      maxOversPerBowler: 4,
    });
    expect(overlapCheck.valid).toBe(false);
    expect(overlapCheck.error).toMatch(/both Playing XIs/i);

    // Identical striker and non-striker
    const sameOpenersCheck = validateMatchSetup({
      teamAId: 'TEAM-A',
      teamBId: 'TEAM-B',
      teamAXI: ['P1', 'P2'],
      teamBXI: ['P3', 'P4'],
      openingStrikerId: 'P1',
      openingNonStrikerId: 'P1',
      openingBowlerId: 'P3',
      battingFirstTeamId: 'TEAM-A',
      oversPerInnings: 20,
      powerplayOvers: 6,
      maxOversPerBowler: 4,
    });
    expect(sameOpenersCheck.valid).toBe(false);
    expect(sameOpenersCheck.error).toMatch(/distinct opening batters/i);

    // Powerplay overs exceeding total overs
    const badRulesCheck = validateMatchSetup({
      teamAId: 'TEAM-A',
      teamBId: 'TEAM-B',
      teamAXI: ['P1', 'P2'],
      teamBXI: ['P3', 'P4'],
      openingStrikerId: 'P1',
      openingNonStrikerId: 'P2',
      openingBowlerId: 'P3',
      battingFirstTeamId: 'TEAM-A',
      oversPerInnings: 10,
      powerplayOvers: 12,
      maxOversPerBowler: 2,
    });
    expect(badRulesCheck.valid).toBe(false);
    expect(badRulesCheck.error).toMatch(/Powerplay overs/i);
  });

  it('2. deriveCareerStats filters fielding stats by teamId/opponentTeamId and tracks 0-wicket best bowling & POTM history', () => {
    const match: MatchRecord = {
      id: 'M-1',
      title: 'Team A vs Team B',
      format: 'T20',
      season: '2026',
      venue: 'Oval',
      date: '2026-11-10',
      scorerName: 'Scorer',
      teamAId: 'TEAM-A',
      teamBId: 'TEAM-B',
      teamAXI: ['P1', 'P2'],
      teamBXI: ['P3', 'P4'],
      tossWinnerTeamId: 'TEAM-A',
      tossDecision: 'bat',
      rules: {
        oversPerInnings: 2,
        ballsPerOver: 6,
        wideRuns: 1,
        noBallRuns: 1,
        freeHitEnabled: true,
        powerplayOvers: 1,
        maxOversPerBowler: 2,
      },
      innings: [
        {
          inningsNumber: 1,
          battingTeamId: 'TEAM-A',
          bowlingTeamId: 'TEAM-B',
          openingStrikerId: 'P1',
          openingNonStrikerId: 'P2',
          openingBowlerId: 'P3',
        },
        {
          inningsNumber: 2,
          battingTeamId: 'TEAM-B',
          bowlingTeamId: 'TEAM-A',
          openingStrikerId: 'P3',
          openingNonStrikerId: 'P4',
          openingBowlerId: 'P2',
        },
      ],
      currentInningsNumber: 2,
      status: 'completed',
      manualPlayerOfTheMatchId: 'P1',
      createdAt: 1,
      updatedAt: 2,
    };

    const events: BallEvent[] = [
      // Innings 1: P1 hits 6, then P1 caught by P4 off P3
      {
        id: 'E1',
        matchId: 'M-1',
        inningsNumber: 1,
        sequence: 1,
        timestamp: 1,
        actionType: 'delivery',
        strikerId: 'P1',
        nonStrikerId: 'P2',
        bowlerId: 'P3',
        runsOffBat: 6,
        extraType: 'none',
        extraRuns: 0,
        isBoundarySix: true,
        isWicket: false,
      },
      {
        id: 'E2',
        matchId: 'M-1',
        inningsNumber: 1,
        sequence: 2,
        timestamp: 2,
        actionType: 'delivery',
        strikerId: 'P1',
        nonStrikerId: 'P2',
        bowlerId: 'P3',
        runsOffBat: 0,
        extraType: 'none',
        extraRuns: 0,
        isWicket: true,
        wicketType: 'caught',
        dismissedPlayerId: 'P1',
        fielderId: 'P4',
      },
      // Innings 2: P2 bowls 1 ball conceding 4 runs, 0 wickets
      {
        id: 'E3',
        matchId: 'M-1',
        inningsNumber: 2,
        sequence: 3,
        timestamp: 3,
        actionType: 'delivery',
        strikerId: 'P3',
        nonStrikerId: 'P4',
        bowlerId: 'P2',
        runsOffBat: 4,
        extraType: 'none',
        extraRuns: 0,
        isBoundaryFour: true,
        isWicket: false,
      },
    ];

    // Filter for TEAM-A only: P4 plays for TEAM-B, so P4's catch for TEAM-B must be 0 under teamId: 'TEAM-A'
    const teamAStats = deriveCareerStats(SAMPLE_PLAYERS, [match], events, {
      teamId: 'TEAM-A',
    });
    expect(teamAStats['P4'].catches).toBe(0);

    // P2 bowled 0/4 in 1 innings: bestBowlingRuns should be 4 (0/4), not 0/0
    expect(teamAStats['P2'].bestBowlingWickets).toBe(0);
    expect(teamAStats['P2'].bestBowlingRuns).toBe(4);

    // P1 won manual POTM in M-1
    expect(teamAStats['P1'].potmCount).toBe(1);
    expect(teamAStats['P1'].potmMatchIds).toEqual(['M-1']);
  });

  it('3. generateRoundRobinFixtures & deriveTournamentStandings support group-stage filtering', () => {
    const fixtures = generateRoundRobinFixtures(
      'TOUR-1',
      ['T1', 'T2', 'T3', 'T4'],
      '2026-11-15',
      'Main Oval',
      { T1: 'Group A', T2: 'Group A', T3: 'Group B', T4: 'Group B' }
    );
    // Group A has 1 fixture (T1 vs T2) and Group B has 1 fixture (T3 vs T4)
    expect(fixtures).toHaveLength(2);
    expect(fixtures[0].roundName).toBe('Group A');
    expect(fixtures[1].roundName).toBe('Group B');

    const tournament: Tournament = {
      id: 'TOUR-1',
      name: 'Club Cup',
      season: '2026',
      format: 'T20',
      type: 'Groups',
      teamIds: ['T1', 'T2', 'T3', 'T4'],
      teamGroups: { T1: 'Group A', T2: 'Group A', T3: 'Group B', T4: 'Group B' },
      fixtures,
      pointsForWin: 2,
      pointsForTie: 1,
      createdAt: 1,
    };

    const groupAStandings = deriveTournamentStandings(
      tournament,
      [],
      [],
      {},
      'Group A'
    );
    expect(groupAStandings.map((r) => r.teamId)).toEqual(['T1', 'T2']);
  });

  it('4. rankLeaderboardEntries excludes 0-match players and breaks ties accurately', () => {
    const stats = deriveCareerStats(SAMPLE_PLAYERS, [], []);
    stats['P1'].matches = 2;
    stats['P1'].runs = 80;
    stats['P1'].ballsFaced = 50;
    stats['P1'].strikeRate = 160;

    stats['P2'].matches = 2;
    stats['P2'].runs = 80;
    stats['P2'].ballsFaced = 40;
    stats['P2'].strikeRate = 200;

    // P3 has 0 matches in the filtered period
    stats['P3'].matches = 0;
    stats['P3'].runs = 0;

    const ranked = rankLeaderboardEntries(Object.values(stats), 'runs');
    expect(ranked.map((r) => r.playerId)).toEqual(['P2', 'P1']);
  });

  it('5. buildScorecardChartData stops cumulative worm line when an innings ends early', () => {
    const rows = buildScorecardChartData(
      5,
      {
        overSummaries: [
          {
            overNumber: 1,
            bowlerId: 'P3',
            runsInOver: 10,
            wicketsInOver: 0,
            cumulativeRuns: 10,
            cumulativeWickets: 0,
            isMaiden: false,
            balls: [],
          },
          {
            overNumber: 2,
            bowlerId: 'P4',
            runsInOver: 12,
            wicketsInOver: 0,
            cumulativeRuns: 22,
            cumulativeWickets: 0,
            isMaiden: false,
            balls: [],
          },
        ],
      },
      {
        overSummaries: [
          {
            overNumber: 1,
            bowlerId: 'P1',
            runsInOver: 8,
            wicketsInOver: 2,
            cumulativeRuns: 8,
            cumulativeWickets: 2,
            isMaiden: false,
            balls: [],
          },
        ],
      }
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].inn1Cumulative).toBe(10);
    expect(rows[0].inn2Cumulative).toBe(8);
    expect(rows[1].inn1Cumulative).toBe(22);
    // Innings 2 ended after over 1, so over 2 cumulative for inn2 is null (not a flat 8)
    expect(rows[1].inn2Cumulative).toBeNull();
  });
});
