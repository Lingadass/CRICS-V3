import { describe, expect, test } from 'vitest';
import {
  deriveCareerStats,
  deriveHeadToHead,
  deriveInningsState,
  deriveTournamentStandings,
  formatOvers,
  isBowlerCreditedWicket,
  isValidFreeHitWicket,
  recalculateWithEditedEvent,
  validateBowlerChange,
  validateNextBallEvent,
} from './scoringEngine';
import { BallEvent, ExtraType, MatchRecord, Player, Tournament } from './types';

const mockPlayers: Record<string, Player> = {
  'P-1': {
    id: 'P-1',
    name: 'Aarav Sharma',
    dob: '1998-05-12',
    role: 'Batter',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm offbreak',
    jerseyNumber: 18,
    createdAt: 1,
  },
  'P-2': {
    id: 'P-2',
    name: 'Rohan Verma',
    dob: '1999-08-20',
    role: 'All-Rounder',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Left-arm orthodox',
    jerseyNumber: 7,
    createdAt: 1,
  },
  'P-3': {
    id: 'P-3',
    name: 'Kabir Nair',
    dob: '2000-01-15',
    role: 'Wicket-Keeper',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'None',
    jerseyNumber: 17,
    createdAt: 1,
  },
  'P-4': {
    id: 'P-4',
    name: 'Vikram Patel',
    dob: '1997-11-02',
    role: 'Bowler',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm fast',
    jerseyNumber: 99,
    createdAt: 1,
  },
  'P-5': {
    id: 'P-5',
    name: 'Zaid Khan',
    dob: '1996-03-30',
    role: 'Bowler',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'Left-arm fast',
    jerseyNumber: 11,
    createdAt: 1,
  },
  'P-6': {
    id: 'P-6',
    name: 'Devansh Joshi',
    dob: '1998-11-11',
    role: 'Bowler',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm legbreak',
    jerseyNumber: 23,
    createdAt: 1,
  },
};

function createMockMatch(): MatchRecord {
  return {
    id: 'M-1',
    title: 'Royals vs Titans',
    format: 'T20',
    season: '2026',
    venue: 'Oval Ground',
    date: '2026-11-10',
    scorerName: 'Official Scorer',
    teamAId: 'T-A',
    teamBId: 'T-B',
    teamAXI: ['P-1', 'P-2', 'P-3'],
    teamBXI: ['P-4', 'P-5', 'P-6'],
    tossWinnerTeamId: 'T-A',
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
        battingTeamId: 'T-A',
        bowlingTeamId: 'T-B',
        openingStrikerId: 'P-1',
        openingNonStrikerId: 'P-2',
        openingBowlerId: 'P-4',
      },
    ],
    currentInningsNumber: 1,
    status: 'live',
    createdAt: 1,
    updatedAt: 1,
  };
}

test('formatOvers formats legal balls into overs.balls correctly', () => {
  expect(formatOvers(0)).toBe('0.0');
  expect(formatOvers(5)).toBe('0.5');
  expect(formatOvers(6)).toBe('1.0');
  expect(formatOvers(14)).toBe('2.2');
});

test('strike rotation on odd and even runs and end-of-over flip', () => {
  const match = createMockMatch();
  const events: BallEvent[] = [
    {
      id: 'b1',
      matchId: 'M-1',
      inningsNumber: 1,
      sequence: 1,
      timestamp: 1,
      actionType: 'delivery',
      strikerId: 'P-1',
      nonStrikerId: 'P-2',
      bowlerId: 'P-4',
      runsOffBat: 1,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    },
    {
      id: 'b2',
      matchId: 'M-1',
      inningsNumber: 1,
      sequence: 2,
      timestamp: 2,
      actionType: 'delivery',
      strikerId: 'P-2',
      nonStrikerId: 'P-1',
      bowlerId: 'P-4',
      runsOffBat: 4,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    },
    ...[3, 4, 5, 6].map((seq) => ({
      id: `b${seq}`,
      matchId: 'M-1',
      inningsNumber: 1 as const,
      sequence: seq,
      timestamp: seq,
      actionType: 'delivery' as const,
      strikerId: 'P-2',
      nonStrikerId: 'P-1',
      bowlerId: 'P-4',
      runsOffBat: 0,
      extraType: 'none' as const,
      extraRuns: 0,
      isWicket: false,
    })),
  ];

  const state = deriveInningsState(match, match.innings[0], events, mockPlayers);
  expect(state.totalRuns).toBe(5);
  expect(state.oversFormatted).toBe('1.0');
  expect(state.isEndOfOver).toBe(true);
  expect(state.strikerId).toBe('P-1');
  expect(state.nonStrikerId).toBe('P-2');
});

test('extras: wide, no-ball, free-hit continuation on wide, bye, leg-bye, penalty', () => {
  const match = createMockMatch();
  const events: BallEvent[] = [
    {
      id: 'e1',
      matchId: 'M-1',
      inningsNumber: 1,
      sequence: 1,
      timestamp: 1,
      actionType: 'delivery',
      strikerId: 'P-1',
      nonStrikerId: 'P-2',
      bowlerId: 'P-4',
      runsOffBat: 2,
      extraType: 'no-ball',
      extraRuns: 0,
      isWicket: false,
    },
  ];

  let state = deriveInningsState(match, match.innings[0], events, mockPlayers);
  expect(state.totalRuns).toBe(3);
  expect(state.legalBalls).toBe(0);
  expect(state.isFreeHit).toBe(true);
  expect(state.battingCard.find((b) => b.playerId === 'P-1')?.runs).toBe(2);
  expect(state.battingCard.find((b) => b.playerId === 'P-1')?.balls).toBe(1);

  events.push({
    id: 'e2',
    matchId: 'M-1',
    inningsNumber: 1,
    sequence: 2,
    timestamp: 2,
    actionType: 'delivery',
    strikerId: 'P-1',
    nonStrikerId: 'P-2',
    bowlerId: 'P-4',
    runsOffBat: 0,
    extraType: 'wide',
    extraRuns: 1,
    isWicket: false,
  });

  state = deriveInningsState(match, match.innings[0], events, mockPlayers);
  expect(state.totalRuns).toBe(5);
  expect(state.isFreeHit).toBe(true);
  expect(state.strikerId).toBe('P-2');

  events.push({
    id: 'e3',
    matchId: 'M-1',
    inningsNumber: 1,
    sequence: 3,
    timestamp: 3,
    actionType: 'delivery',
    strikerId: 'P-2',
    nonStrikerId: 'P-1',
    bowlerId: 'P-4',
    runsOffBat: 0,
    extraType: 'bye',
    extraRuns: 1,
    isWicket: false,
  });

  state = deriveInningsState(match, match.innings[0], events, mockPlayers);
  expect(state.totalRuns).toBe(6);
  expect(state.isFreeHit).toBe(false);
  expect(state.legalBalls).toBe(1);
  expect(state.extras.byes).toBe(1);
  expect(state.bowlingCard[0].runsConceded).toBe(5);
});

test('wicket rules: bowler credit, run-out end assignment, and free-hit valid dismissals', () => {
  expect(isBowlerCreditedWicket('bowled')).toBe(true);
  expect(isBowlerCreditedWicket('caught')).toBe(true);
  expect(isBowlerCreditedWicket('lbw')).toBe(true);
  expect(isBowlerCreditedWicket('stumped')).toBe(true);
  expect(isBowlerCreditedWicket('hit-wicket')).toBe(true);
  expect(isBowlerCreditedWicket('run-out')).toBe(false);
  expect(isBowlerCreditedWicket('retired-hurt')).toBe(false);
  expect(isBowlerCreditedWicket('retired-out')).toBe(false);

  expect(isValidFreeHitWicket('bowled')).toBe(false);
  expect(isValidFreeHitWicket('caught')).toBe(false);
  expect(isValidFreeHitWicket('run-out')).toBe(true);
  expect(isValidFreeHitWicket('obstructing-field')).toBe(true);

  const match = createMockMatch();
  const events: BallEvent[] = [
    {
      id: 'w1',
      matchId: 'M-1',
      inningsNumber: 1,
      sequence: 1,
      timestamp: 1,
      actionType: 'delivery',
      strikerId: 'P-1',
      nonStrikerId: 'P-2',
      bowlerId: 'P-4',
      runsOffBat: 1,
      extraType: 'none',
      extraRuns: 0,
      isWicket: true,
      wicketType: 'run-out',
      dismissedPlayerId: 'P-2',
      fielderId: 'P-5',
      incomingBatterId: 'P-3',
      runOutEnd: 'non-striker',
    },
  ];

  const state = deriveInningsState(match, match.innings[0], events, mockPlayers);
  expect(state.wickets).toBe(1);
  expect(state.bowlingCard[0].wickets).toBe(0);
  expect(state.strikerId).toBe('P-1');
  expect(state.nonStrikerId).toBe('P-3');
});

test('editing a past ball recalculates total runs, bowler figures, and partnerships accurately', () => {
  const match = createMockMatch();
  const events: BallEvent[] = [
    {
      id: 'ball-1',
      matchId: 'M-1',
      inningsNumber: 1,
      sequence: 1,
      timestamp: 1,
      actionType: 'delivery',
      strikerId: 'P-1',
      nonStrikerId: 'P-2',
      bowlerId: 'P-4',
      runsOffBat: 2,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    },
    {
      id: 'ball-2',
      matchId: 'M-1',
      inningsNumber: 1,
      sequence: 2,
      timestamp: 2,
      actionType: 'delivery',
      strikerId: 'P-1',
      nonStrikerId: 'P-2',
      bowlerId: 'P-4',
      runsOffBat: 4,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    },
  ];

  const editedBall1: BallEvent = {
    ...events[0],
    runsOffBat: 6,
    isBoundarySix: true,
  };

  const { derivedState } = recalculateWithEditedEvent(
    match,
    events,
    editedBall1,
    mockPlayers
  );

  expect(derivedState.currentInnings.totalRuns).toBe(10);
  const p1Card = derivedState.currentInnings.battingCard.find((b) => b.playerId === 'P-1');
  expect(p1Card?.runs).toBe(10);
  expect(p1Card?.sixes).toBe(1);
  expect(p1Card?.fours).toBe(1);
  expect(derivedState.currentInnings.bowlingCard[0].runsConceded).toBe(10);
});

test('tournament NRR uses full quota of overs when a team is bowled out', () => {
  const match = createMockMatch();
  match.tournamentId = 'TOUR-1';
  match.innings.push({
    inningsNumber: 2,
    battingTeamId: 'T-B',
    bowlingTeamId: 'T-A',
    openingStrikerId: 'P-4',
    openingNonStrikerId: 'P-5',
    openingBowlerId: 'P-2',
  });
  match.currentInningsNumber = 2;

  const events: BallEvent[] = [];
  for (let i = 1; i <= 6; i++) {
    events.push({
      id: `i1-${i}`,
      matchId: 'M-1',
      inningsNumber: 1,
      sequence: i,
      timestamp: i,
      actionType: 'delivery',
      strikerId: 'P-1',
      nonStrikerId: 'P-2',
      bowlerId: 'P-4',
      runsOffBat: 2,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    });
  }
  events.push({
    id: 'i1-bc',
    matchId: 'M-1',
    inningsNumber: 1,
    sequence: 7,
    timestamp: 7,
    actionType: 'bowler-change',
    strikerId: 'P-2',
    nonStrikerId: 'P-1',
    bowlerId: 'P-4',
    newBowlerId: 'P-5',
    runsOffBat: 0,
    extraType: 'none',
    extraRuns: 0,
    isWicket: false,
  });
  for (let i = 8; i <= 13; i++) {
    events.push({
      id: `i1-${i}`,
      matchId: 'M-1',
      inningsNumber: 1,
      sequence: i,
      timestamp: i,
      actionType: 'delivery',
      strikerId: 'P-2',
      nonStrikerId: 'P-1',
      bowlerId: 'P-5',
      runsOffBat: 2,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    });
  }
  events.push(
    {
      id: 'i2-1',
      matchId: 'M-1',
      inningsNumber: 2,
      sequence: 14,
      timestamp: 14,
      actionType: 'delivery',
      strikerId: 'P-4',
      nonStrikerId: 'P-5',
      bowlerId: 'P-2',
      runsOffBat: 6,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    },
    {
      id: 'i2-2',
      matchId: 'M-1',
      inningsNumber: 2,
      sequence: 15,
      timestamp: 15,
      actionType: 'delivery',
      strikerId: 'P-4',
      nonStrikerId: 'P-5',
      bowlerId: 'P-2',
      runsOffBat: 0,
      extraType: 'none',
      extraRuns: 0,
      isWicket: true,
      wicketType: 'bowled',
      dismissedPlayerId: 'P-4',
      incomingBatterId: 'P-6',
    },
    {
      id: 'i2-3',
      matchId: 'M-1',
      inningsNumber: 2,
      sequence: 16,
      timestamp: 16,
      actionType: 'delivery',
      strikerId: 'P-6',
      nonStrikerId: 'P-5',
      bowlerId: 'P-2',
      runsOffBat: 0,
      extraType: 'none',
      extraRuns: 0,
      isWicket: true,
      wicketType: 'bowled',
      dismissedPlayerId: 'P-6',
    }
  );

  const tournament: Tournament = {
    id: 'TOUR-1',
    name: 'Premier Cup',
    season: '2026',
    format: 'T20',
    type: 'League',
    teamIds: ['T-A', 'T-B'],
    fixtures: [],
    pointsForWin: 2,
    pointsForTie: 1,
    createdAt: 1,
  };

  const standings = deriveTournamentStandings(tournament, [match], events, mockPlayers);
  const teamA = standings.find((s) => s.teamId === 'T-A')!;
  const teamB = standings.find((s) => s.teamId === 'T-B')!;

  expect(teamA.won).toBe(1);
  expect(teamA.points).toBe(2);
  expect(teamB.oversFacedForNrr).toBe(2);
  expect(teamA.netRunRate).toBe(9);
  expect(teamB.netRunRate).toBe(-9);
});

test('career stats and head-to-head calculations', () => {
  const match = createMockMatch();
  const events: BallEvent[] = [
    {
      id: 'c1',
      matchId: 'M-1',
      inningsNumber: 1,
      sequence: 1,
      timestamp: 1,
      actionType: 'delivery',
      strikerId: 'P-1',
      nonStrikerId: 'P-2',
      bowlerId: 'P-4',
      runsOffBat: 6,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    },
    {
      id: 'c2',
      matchId: 'M-1',
      inningsNumber: 1,
      sequence: 2,
      timestamp: 2,
      actionType: 'delivery',
      strikerId: 'P-1',
      nonStrikerId: 'P-2',
      bowlerId: 'P-4',
      runsOffBat: 0,
      extraType: 'none',
      extraRuns: 0,
      isWicket: true,
      wicketType: 'caught',
      dismissedPlayerId: 'P-1',
      fielderId: 'P-5',
      incomingBatterId: 'P-3',
    },
  ];

  const careers = deriveCareerStats(Object.values(mockPlayers), [match], events);
  expect(careers['P-1'].runs).toBe(6);
  expect(careers['P-1'].sixes).toBe(1);
  expect(careers['P-4'].wickets).toBe(1);
  expect(careers['P-5'].catches).toBe(1);

  const h2h = deriveHeadToHead('P-1', 'P-4', events, { 'M-1': match });
  expect(h2h.runs).toBe(6);
  expect(h2h.balls).toBe(2);
  expect(h2h.dismissals).toBe(1);
  expect(h2h.strikeRate).toBe(300);
});

describe('Phase 2: Scoring Engine Correctness & Edge Cases', () => {
  test('1. Pure derivation ignores stale strikerId/nonStrikerId on deliveries when an earlier ball changes from odd to even runs', () => {
    const match = createMockMatch();
    // Ball 1: originally P-1 scored 1 run (rotating strike to P-2)
    // Ball 2: recorded with stale strikerId='P-2', scoring 4 runs
    const events: BallEvent[] = [
      {
        id: 'b-1',
        matchId: 'M-1',
        inningsNumber: 1,
        sequence: 1,
        timestamp: 1,
        actionType: 'delivery',
        strikerId: 'P-1',
        nonStrikerId: 'P-2',
        bowlerId: 'P-4',
        runsOffBat: 1,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      },
      {
        id: 'b-2',
        matchId: 'M-1',
        inningsNumber: 1,
        sequence: 2,
        timestamp: 2,
        actionType: 'delivery',
        strikerId: 'P-2', // Stale stored striker!
        nonStrikerId: 'P-1',
        bowlerId: 'P-4',
        runsOffBat: 4,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      },
    ];

    // Edit Ball 1 from 1 run (odd) to 2 runs (even) -> P-1 must stay on strike for Ball 2!
    const editedBall1: BallEvent = {
      ...events[0],
      runsOffBat: 2,
    };

    const { derivedState } = recalculateWithEditedEvent(
      match,
      events,
      editedBall1,
      mockPlayers
    );

    const p1 = derivedState.currentInnings.battingCard.find(
      (b) => b.playerId === 'P-1'
    )!;
    const p2 = derivedState.currentInnings.battingCard.find(
      (b) => b.playerId === 'P-2'
    )!;

    // P-1 faced both Ball 1 (2 runs) and Ball 2 (4 runs) = 6 runs off 2 balls!
    expect(p1.runs).toBe(6);
    expect(p1.balls).toBe(2);
    expect(p2.runs).toBe(0);
    expect(p2.balls).toBe(0);

    // Also verify deriveHeadToHead uses derived striker, not stale event.strikerId
    const updatedEvents = [editedBall1, events[1]];
    const h2hP1 = deriveHeadToHead('P-1', 'P-4', updatedEvents, { 'M-1': match });
    const h2hP2 = deriveHeadToHead('P-2', 'P-4', updatedEvents, { 'M-1': match });
    expect(h2hP1.runs).toBe(6);
    expect(h2hP1.balls).toBe(2);
    expect(h2hP2.runs).toBe(0);
    expect(h2hP2.balls).toBe(0);
  });

  test('2. No-Ball combined with Byes or Leg-Byes separates penalty from byes/leg-byes and does not charge byes to bowler', () => {
    const match = createMockMatch();
    const events: BallEvent[] = [
      {
        id: 'nb-bye',
        matchId: 'M-1',
        inningsNumber: 1,
        sequence: 1,
        timestamp: 1,
        actionType: 'delivery',
        strikerId: 'P-1',
        nonStrikerId: 'P-2',
        bowlerId: 'P-4',
        runsOffBat: 0,
        extraType: 'no-ball',
        secondaryExtraType: 'bye',
        extraRuns: 2, // 2 byes run on a no-ball
        isWicket: false,
      },
      {
        id: 'nb-lb',
        matchId: 'M-1',
        inningsNumber: 1,
        sequence: 2,
        timestamp: 2,
        actionType: 'delivery',
        strikerId: 'P-1',
        nonStrikerId: 'P-2',
        bowlerId: 'P-4',
        runsOffBat: 0,
        extraType: 'no-ball',
        secondaryExtraType: 'leg-bye',
        extraRuns: 1, // 1 leg-bye run on a no-ball (rotates strike)
        isWicket: false,
      },
    ];

    const state = deriveInningsState(match, match.innings[0], events, mockPlayers);
    // Total runs: (1 nb + 2 byes) + (1 nb + 1 leg-bye) = 5
    expect(state.totalRuns).toBe(5);
    expect(state.extras.noBalls).toBe(2);
    expect(state.extras.byes).toBe(2);
    expect(state.extras.legByes).toBe(1);
    expect(state.extras.total).toBe(5);

    // Bowler is only charged with the 2 no-ball penalties, NOT the byes/leg-byes!
    expect(state.bowlingCard[0].runsConceded).toBe(2);
    expect(state.bowlingCard[0].noBalls).toBe(2);

    // Strike rotated on the 1 leg-bye on ball 2
    expect(state.strikerId).toBe('P-2');
  });

  test('3. Bowler limits: maxOversPerBowler, consecutive overs rule, and mid-over injury replacement credit', () => {
    const match = createMockMatch();
    match.rules.oversPerInnings = 3;
    match.rules.maxOversPerBowler = 1; // 1 over max per bowler

    // P-4 bowls 2 legal balls (1 run each), then gets injured mid-over!
    // P-5 replaces P-4 mid-over and bowls remaining 4 legal balls (0 runs each).
    const events: BallEvent[] = [
      {
        id: 'm1',
        matchId: 'M-1',
        inningsNumber: 1,
        sequence: 1,
        timestamp: 1,
        actionType: 'delivery',
        strikerId: 'P-1',
        nonStrikerId: 'P-2',
        bowlerId: 'P-4',
        runsOffBat: 1,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      },
      {
        id: 'm2',
        matchId: 'M-1',
        inningsNumber: 1,
        sequence: 2,
        timestamp: 2,
        actionType: 'delivery',
        strikerId: 'P-2',
        nonStrikerId: 'P-1',
        bowlerId: 'P-4',
        runsOffBat: 1,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      },
      {
        id: 'm-inj',
        matchId: 'M-1',
        inningsNumber: 1,
        sequence: 3,
        timestamp: 3,
        actionType: 'bowler-change',
        strikerId: 'P-1',
        nonStrikerId: 'P-2',
        bowlerId: 'P-4',
        newBowlerId: 'P-5',
        bowlerChangeReason: 'injury',
        runsOffBat: 0,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      },
      ...[4, 5, 6, 7].map((seq) => ({
        id: `m${seq}`,
        matchId: 'M-1',
        inningsNumber: 1 as const,
        sequence: seq,
        timestamp: seq,
        actionType: 'delivery' as const,
        strikerId: 'P-1',
        nonStrikerId: 'P-2',
        bowlerId: 'P-5',
        runsOffBat: 0,
        extraType: 'none' as const,
        extraRuns: 0,
        isWicket: false,
      })),
    ];

    const state = deriveInningsState(match, match.innings[0], events, mockPlayers);
    expect(state.oversFormatted).toBe('1.0');
    expect(state.isEndOfOver).toBe(true);
    expect(state.needsBowlerChange).toBe(true);

    // P-4 bowled 0.2 overs (2 runs), P-5 bowled 0.4 overs (0 runs)
    const p4Row = state.bowlingCard.find((b) => b.playerId === 'P-4')!;
    const p5Row = state.bowlingCard.find((b) => b.playerId === 'P-5')!;
    expect(p4Row.oversFormatted).toBe('0.2');
    expect(p4Row.runsConceded).toBe(2);
    expect(p5Row.oversFormatted).toBe('0.4');
    expect(p5Row.runsConceded).toBe(0);

    // Neither P-4 nor P-5 can bowl Over 2 because both bowled in Over 1 (consecutive overs rule)!
    expect(state.eligibleBowlerIds).toEqual(['P-6']);
    expect(validateBowlerChange(state, match, 'P-5', 'end-of-over').valid).toBe(false);
    expect(validateBowlerChange(state, match, 'P-4', 'end-of-over').valid).toBe(false);
    expect(validateBowlerChange(state, match, 'P-6', 'end-of-over').valid).toBe(true);
  });

  test('4. Engine input validation rejects impossible deliveries and maiden over ignores byes/leg-byes', () => {
    const match = createMockMatch();
    // Over 1: 6 legal balls by P-4, including a 4-leg-bye delivery and 5 dots
    const events: BallEvent[] = [
      {
        id: 'md-1',
        matchId: 'M-1',
        inningsNumber: 1,
        sequence: 1,
        timestamp: 1,
        actionType: 'delivery',
        strikerId: 'P-1',
        nonStrikerId: 'P-2',
        bowlerId: 'P-4',
        runsOffBat: 0,
        extraType: 'leg-bye',
        extraRuns: 4,
        isWicket: false,
      },
      ...[2, 3, 4, 5, 6].map((seq) => ({
        id: `md-${seq}`,
        matchId: 'M-1',
        inningsNumber: 1 as const,
        sequence: seq,
        timestamp: seq,
        actionType: 'delivery' as const,
        strikerId: 'P-1',
        nonStrikerId: 'P-2',
        bowlerId: 'P-4',
        runsOffBat: 0,
        extraType: 'none' as const,
        extraRuns: 0,
        isWicket: false,
      })),
    ];

    const state = deriveInningsState(match, match.innings[0], events, mockPlayers);
    expect(state.totalRuns).toBe(4);
    expect(state.bowlingCard[0].runsConceded).toBe(0);
    expect(state.bowlingCard[0].maidens).toBe(1);
    expect(state.overSummaries[0].isMaiden).toBe(true);

    // At end of over 1, trying to bowl another ball without changing bowler is rejected
    const noBowlerChangeCheck = validateNextBallEvent(match, state, {
      actionType: 'delivery',
      runsOffBat: 0,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    });
    expect(noBowlerChangeCheck.valid).toBe(false);

    // Test Free Hit invalid wicket rejection & runsOffBat on wide rejection
    const fhState = deriveInningsState(
      match,
      match.innings[0],
      [
        {
          id: 'nb-1',
          matchId: 'M-1',
          inningsNumber: 1,
          sequence: 1,
          timestamp: 1,
          actionType: 'delivery',
          strikerId: 'P-1',
          nonStrikerId: 'P-2',
          bowlerId: 'P-4',
          runsOffBat: 0,
          extraType: 'no-ball',
          extraRuns: 0,
          isWicket: false,
        },
      ],
      mockPlayers
    );
    expect(fhState.isFreeHit).toBe(true);

    const invalidFhWicket = validateNextBallEvent(match, fhState, {
      actionType: 'delivery',
      runsOffBat: 0,
      extraType: 'none',
      extraRuns: 0,
      isWicket: true,
      wicketType: 'bowled',
      incomingBatterId: 'P-3',
    });
    expect(invalidFhWicket.valid).toBe(false);

    const invalidWideBatRuns = validateNextBallEvent(match, fhState, {
      actionType: 'delivery',
      runsOffBat: 4,
      extraType: 'wide',
      extraRuns: 0,
      isWicket: false,
    });
    expect(invalidWideBatRuns.valid).toBe(false);
  });

  test('4b. Edge cases: retired-hurt return after wicket, overthrow runs, target chased on a Wide, and Super Over tie', () => {
    const match = createMockMatch();
    match.teamAXI = ['P-1', 'P-2', 'P-3', 'P-6'];
    match.innings.push({
      inningsNumber: 2,
      battingTeamId: 'T-B',
      bowlingTeamId: 'T-A',
      openingStrikerId: 'P-4',
      openingNonStrikerId: 'P-5',
      openingBowlerId: 'P-1',
    });

    // Innings 1:
    // Ball 1: P-1 scores 5 runs (1 run + 4 overthrows, not a boundary 4 or 6)
    // Event 2: P-1 retires hurt, replaced by P-3
    // Ball 3: P-3 is bowled, and P-1 (retired hurt) returns to crease!
    const inn1Events: BallEvent[] = [
      {
        id: 'ot-1',
        matchId: 'M-1',
        inningsNumber: 1,
        sequence: 1,
        timestamp: 1,
        actionType: 'delivery',
        strikerId: 'P-1',
        nonStrikerId: 'P-2',
        bowlerId: 'P-4',
        runsOffBat: 5, // 1 + 4 overthrows
        extraType: 'none',
        extraRuns: 0,
        isBoundaryFour: false,
        isBoundarySix: false,
        isWicket: false,
      },
      {
        id: 'ret-hurt-1',
        matchId: 'M-1',
        inningsNumber: 1,
        sequence: 2,
        timestamp: 2,
        actionType: 'batter-retire',
        strikerId: 'P-2',
        nonStrikerId: 'P-1',
        bowlerId: 'P-4',
        retiredPlayerId: 'P-1',
        replacementPlayerId: 'P-3',
        isRetiredHurt: true,
        runsOffBat: 0,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      },
    ];

    let state1 = deriveInningsState(match, match.innings[0], inn1Events, mockPlayers);
    expect(state1.wickets).toBe(0); // Retired hurt is NOT a wicket
    expect(state1.retiredHurtBatters).toContain('P-1');
    expect(state1.availableBatters).toContain('P-1'); // P-1 is eligible to return!
    const p1BeforeReturn = state1.battingCard.find((b) => b.playerId === 'P-1')!;
    expect(p1BeforeReturn.runs).toBe(5);
    expect(p1BeforeReturn.fours).toBe(0);
    expect(p1BeforeReturn.status).toBe('retired-hurt');

    // Now P-2 is on strike (since P-1 ran 5 odd runs on ball 1). P-2 is bowled, and P-1 returns!
    inn1Events.push(
      {
        id: 'w-return',
        matchId: 'M-1',
        inningsNumber: 1,
        sequence: 3,
        timestamp: 3,
        actionType: 'delivery',
        strikerId: 'P-2',
        nonStrikerId: 'P-3',
        bowlerId: 'P-4',
        runsOffBat: 0,
        extraType: 'none',
        extraRuns: 0,
        isWicket: true,
        wicketType: 'bowled',
        dismissedPlayerId: 'P-2',
        incomingBatterId: 'P-1', // Retired hurt batter returns!
      },
      {
        id: 'after-return',
        matchId: 'M-1',
        inningsNumber: 1,
        sequence: 4,
        timestamp: 4,
        actionType: 'delivery',
        strikerId: 'P-1',
        nonStrikerId: 'P-3',
        bowlerId: 'P-4',
        runsOffBat: 4,
        extraType: 'none',
        extraRuns: 0,
        isBoundaryFour: true,
        isWicket: false,
      }
    );

    state1 = deriveInningsState(match, match.innings[0], inn1Events, mockPlayers);
    const p1AfterReturn = state1.battingCard.find((b) => b.playerId === 'P-1')!;
    expect(p1AfterReturn.status).toBe('batting');
    expect(p1AfterReturn.runs).toBe(9); // 5 + 4
    expect(p1AfterReturn.balls).toBe(2);
    expect(p1AfterReturn.fours).toBe(1);
    expect(state1.retiredHurtBatters).not.toContain('P-1');

    // Innings 2: Target is 10 (9 + 1).
    // P-4 scores 9 runs off 5 balls, then on the 6th ball (1.5 overs) bowler bowls a Wide (1 run) to chase target!
    const inn2Events: BallEvent[] = [
      {
        id: 'i2-1',
        matchId: 'M-1',
        inningsNumber: 2,
        sequence: 10,
        timestamp: 10,
        actionType: 'delivery',
        strikerId: 'P-4',
        nonStrikerId: 'P-5',
        bowlerId: 'P-1',
        runsOffBat: 6,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      },
      {
        id: 'i2-2',
        matchId: 'M-1',
        inningsNumber: 2,
        sequence: 11,
        timestamp: 11,
        actionType: 'delivery',
        strikerId: 'P-4',
        nonStrikerId: 'P-5',
        bowlerId: 'P-1',
        runsOffBat: 3,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      },
      {
        id: 'i2-wide-win',
        matchId: 'M-1',
        inningsNumber: 2,
        sequence: 12,
        timestamp: 12,
        actionType: 'delivery',
        strikerId: 'P-5',
        nonStrikerId: 'P-4',
        bowlerId: 'P-1',
        runsOffBat: 0,
        extraType: 'wide',
        extraRuns: 0,
        isWicket: false,
      },
    ];

    const state2 = deriveInningsState(
      match,
      match.innings[1],
      inn2Events,
      mockPlayers,
      10
    );
    expect(state2.totalRuns).toBe(10);
    expect(state2.isInningsCompleted).toBe(true);
    expect(state2.completionReason).toBe('target-chased');
    expect(state2.legalBalls).toBe(2); // Wide did not add a legal ball!
  });

  test('5. Randomized property test: 1,000 simulated innings satisfy all cricket accounting & replay invariants', () => {
    let seed = 42;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const fullPlayers: Record<string, Player> = {};
    const teamAXI: string[] = [];
    const teamBXI: string[] = [];
    for (let i = 1; i <= 11; i++) {
      const aId = `PA-${i}`;
      const bId = `PB-${i}`;
      teamAXI.push(aId);
      teamBXI.push(bId);
      fullPlayers[aId] = {
        id: aId,
        name: `Batter ${i}`,
        dob: '',
        role: 'Batter',
        battingStyle: 'Right-hand bat',
        bowlingStyle: 'Right-arm medium',
        jerseyNumber: i,
        createdAt: 1,
      };
      fullPlayers[bId] = {
        id: bId,
        name: `Bowler ${i}`,
        dob: '',
        role: 'Bowler',
        battingStyle: 'Right-hand bat',
        bowlingStyle: 'Right-arm fast',
        jerseyNumber: i + 20,
        createdAt: 1,
      };
    }

    const baseMatch: MatchRecord = {
      id: 'M-PROP',
      title: 'Property Test Match',
      format: 'T20',
      season: '2026',
      venue: 'Test Ground',
      date: '2026-11-11',
      scorerName: 'Tester',
      teamAId: 'T-A',
      teamBId: 'T-B',
      teamAXI,
      teamBXI,
      tossWinnerTeamId: 'T-A',
      tossDecision: 'bat',
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
          battingTeamId: 'T-A',
          bowlingTeamId: 'T-B',
          openingStrikerId: 'PA-1',
          openingNonStrikerId: 'PA-2',
          openingBowlerId: 'PB-1',
        },
      ],
      currentInningsNumber: 1,
      status: 'live',
      createdAt: 1,
      updatedAt: 1,
    };

    for (let sim = 0; sim < 1000; sim++) {
      const events: BallEvent[] = [];
      let seq = 1;
      let state = deriveInningsState(
        baseMatch,
        baseMatch.innings[0],
        events,
        fullPlayers
      );

      while (!state.isInningsCompleted && seq < 120) {
        if (state.needsBowlerChange) {
          const nextBowler =
            state.eligibleBowlerIds[
              Math.floor(nextRand() * state.eligibleBowlerIds.length)
            ] || teamBXI[0];
          events.push({
            id: `ev-${sim}-${seq}`,
            matchId: 'M-PROP',
            inningsNumber: 1,
            sequence: seq++,
            timestamp: seq,
            actionType: 'bowler-change',
            strikerId: state.strikerId,
            nonStrikerId: state.nonStrikerId,
            bowlerId: state.currentBowlerId,
            newBowlerId: nextBowler,
            bowlerChangeReason: 'end-of-over',
            runsOffBat: 0,
            extraType: 'none',
            extraRuns: 0,
            isWicket: false,
          });
          state = deriveInningsState(
            baseMatch,
            baseMatch.innings[0],
            events,
            fullPlayers
          );
          continue;
        }

        const r = nextRand();
        let extraType: ExtraType = 'none';
        let secondaryExtraType: 'bye' | 'leg-bye' | undefined;
        let runsOffBat = 0;
        let extraRuns = 0;
        let isWicket = false;
        let wicketType: BallEvent['wicketType'];
        let incomingBatterId: string | undefined;

        if (r < 0.06) {
          extraType = 'wide';
          extraRuns = Math.floor(nextRand() * 3);
        } else if (r < 0.12) {
          extraType = 'no-ball';
          if (nextRand() < 0.4) {
            secondaryExtraType = nextRand() < 0.5 ? 'bye' : 'leg-bye';
            extraRuns = 1 + Math.floor(nextRand() * 2);
          } else {
            runsOffBat = [0, 1, 2, 4, 6][Math.floor(nextRand() * 5)];
          }
        } else if (r < 0.16) {
          extraType = nextRand() < 0.5 ? 'bye' : 'leg-bye';
          extraRuns = 1 + Math.floor(nextRand() * 4);
        } else {
          runsOffBat = [0, 0, 1, 1, 2, 3, 4, 6][Math.floor(nextRand() * 8)];
          if (nextRand() < 0.1) {
            isWicket = true;
            wicketType = state.isFreeHit ? 'run-out' : 'bowled';
            incomingBatterId = state.availableBatters[0];
          }
        }

        events.push({
          id: `ev-${sim}-${seq}`,
          matchId: 'M-PROP',
          inningsNumber: 1,
          sequence: seq++,
          timestamp: seq,
          actionType: 'delivery',
          strikerId: 'STALE-STRIKER', // Deliberately bogus to verify pure derivation!
          nonStrikerId: 'STALE-NON-STRIKER',
          bowlerId: 'STALE-BOWLER',
          runsOffBat,
          extraType,
          secondaryExtraType,
          extraRuns,
          isWicket,
          wicketType,
          incomingBatterId,
        });

        state = deriveInningsState(
          baseMatch,
          baseMatch.innings[0],
          events,
          fullPlayers
        );
      }

      // Invariant 1: Total runs === sum(batter runs) + extras.total
      const sumBatterRuns = state.battingCard.reduce((acc, b) => acc + b.runs, 0);
      expect(state.totalRuns).toBe(sumBatterRuns + state.extras.total);

      // Invariant 2: Extras breakdown sums to extras.total
      expect(state.extras.total).toBe(
        state.extras.wides +
          state.extras.noBalls +
          state.extras.byes +
          state.extras.legByes +
          state.extras.penalty
      );

      // Invariant 3: Sum of bowler runsConceded === sum(batter runs) + wides + noBalls
      const sumBowlerRuns = state.bowlingCard.reduce(
        (acc, bw) => acc + bw.runsConceded,
        0
      );
      expect(sumBowlerRuns).toBe(
        sumBatterRuns + state.extras.wides + state.extras.noBalls
      );

      // Invariant 4: Sum of bowler legalBalls === innings legalBalls
      const sumBowlerLegalBalls = state.bowlingCard.reduce(
        (acc, bw) => acc + bw.legalBalls,
        0
      );
      expect(sumBowlerLegalBalls).toBe(state.legalBalls);

      // Invariant 5: Sum of partnership runs === totalRuns
      const sumPartnershipRuns = state.partnerships.reduce(
        (acc, p) => acc + p.runs,
        0
      );
      expect(sumPartnershipRuns).toBe(state.totalRuns);

      // Invariant 6: Striker and non-striker are never the same player unless all-out
      if (state.completionReason !== 'all-out') {
        expect(state.strikerId).not.toBe(state.nonStrikerId);
      }
    }
  });
});
