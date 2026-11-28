/**
 * Pure TypeScript domain types for the CRICS Event-Sourced Cricket Engine.
 * No UI or Database dependencies are allowed in this module.
 */

export type PlayerRole = 'Batter' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';
export type BattingStyle = 'Right-hand bat' | 'Left-hand bat';
export type BowlingStyle =
  | 'Right-arm fast'
  | 'Right-arm medium'
  | 'Right-arm offbreak'
  | 'Right-arm legbreak'
  | 'Left-arm fast'
  | 'Left-arm medium'
  | 'Left-arm orthodox'
  | 'Left-arm wrist-spin'
  | 'None';

export interface Player {
  id: string; // e.g., CRICS-PLR-1001
  name: string;
  hasPhoto?: boolean; // True when a binary Blob exists in playerPhotos table
  photoDataUrl?: string; // Used only inside exported backup JSON or legacy v1 migration
  dob: string; // YYYY-MM-DD or '' if unknown
  role: PlayerRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  jerseyNumber: number | null; // null if unassigned (never invented)
  phone?: string;
  notes?: string;
  archived?: boolean;
  isSample?: boolean;
  createdAt: number;
}

export interface PlayerPhotoRecord {
  playerId: string;
  blob: Blob;
  mimeType: string;
  updatedAt: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  playerIds: string[]; // A player can belong to many teams
  captainId?: string;
  viceCaptainId?: string;
  archived?: boolean;
  isSample?: boolean;
  createdAt: number;
}

export type MatchFormat = 'T20' | 'ODI' | 'T10' | 'Custom';

export interface MatchRulesConfig {
  oversPerInnings: number;
  ballsPerOver: number; // default 6
  wideRuns: number; // default 1
  noBallRuns: number; // default 1
  freeHitEnabled: boolean; // default true
  powerplayOvers: number; // e.g. 6 for T20
  maxOversPerBowler: number; // e.g. 4 for T20
}

export type WicketType =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run-out'
  | 'stumped'
  | 'hit-wicket'
  | 'retired-hurt'
  | 'retired-out'
  | 'obstructing-field'
  | 'hit-ball-twice'
  | 'timed-out';

export type ExtraType = 'none' | 'wide' | 'no-ball' | 'bye' | 'leg-bye' | 'penalty';

export type MatchActionType =
  | 'delivery'
  | 'manual-strike-swap'
  | 'bowler-change'
  | 'batter-retire'
  | 'batter-replace'
  | 'declare-innings';

/**
 * Every action on the field is recorded as an immutable BallEvent.
 * Scoreboard, scorecards, and career stats are 100% derived from the ordered list of BallEvents.
 */
export interface BallEvent {
  id: string;
  matchId: string;
  inningsNumber: 1 | 2 | 3 | 4; // 3 and 4 used for Super Over innings 1 & 2
  sequence: number; // Monotonically increasing within the match
  timestamp: number;
  actionType: MatchActionType;

  // Context at time of event (or overridden during replay)
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;

  // Delivery details (when actionType === 'delivery')
  runsOffBat: number; // 0, 1, 2, 3, 4, 5, 6
  extraType: ExtraType;
  secondaryExtraType?: 'bye' | 'leg-bye'; // Used when byes or leg-byes are run on a No-Ball
  extraRuns: number; // Additional runs run on a wide/no-ball, or total byes/leg-byes/penalty
  isBoundaryFour?: boolean;
  isBoundarySix?: boolean;

  // Wicket / Dismissal details
  isWicket: boolean;
  wicketType?: WicketType;
  dismissedPlayerId?: string;
  fielderId?: string;
  incomingBatterId?: string;
  runOutEnd?: 'striker' | 'non-striker'; // Which end the new batter goes to or whether batters crossed

  // Bowler change / retire / replace metadata
  newBowlerId?: string;
  bowlerChangeReason?: BowlerChangeReason;
  retiredPlayerId?: string;
  replacementPlayerId?: string;
  isRetiredHurt?: boolean; // true = can return later, false = retired out
  commentaryNote?: string;
  isSample?: boolean;
}

export type BowlerChangeReason = 'end-of-over' | 'injury' | 'suspension';

export interface InningsSetup {
  inningsNumber: 1 | 2 | 3 | 4;
  battingTeamId: string;
  bowlingTeamId: string;
  openingStrikerId: string;
  openingNonStrikerId: string;
  openingBowlerId: string;
  isSuperOver?: boolean;
  revisedTargetRuns?: number; // Manual DLS or revised target for chasing team
  revisedOvers?: number;
}

export interface MatchInningsSummary {
  inningsNumber: 1 | 2 | 3 | 4;
  battingTeamId: string;
  bowlingTeamId?: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  oversText: string;
  maxOvers?: number;
  currentRunRate?: number;
  targetRuns?: number;
  requiredRuns?: number;
  remainingBalls?: number;
  requiredRunRate?: number;
  strikerId?: string;
  nonStrikerId?: string;
  currentBowlerId?: string;
  isCompleted?: boolean;
  completionReason?: 'all-out' | 'overs-completed' | 'target-chased' | 'declared';
  isSuperOver?: boolean;
}

export type MatchResultKind =
  | 'win-by-runs'
  | 'win-by-wickets'
  | 'super-over-win'
  | 'super-over-tie'
  | 'tie'
  | 'no-result'
  | 'chase-need'
  | 'innings-break'
  | 'completed'
  | 'in-progress';

export interface MatchSummary {
  innings: MatchInningsSummary[];
  status: 'live' | 'innings-break' | 'completed';
  resultText: string;
  resultKind?: MatchResultKind;
  winnerTeamId?: string | 'tied' | 'no-result';
  marginRuns?: number;
  marginWickets?: number;
  chasingTeamId?: string;
  requiredRuns?: number;
  remainingBalls?: number;
  targetRuns?: number;
  recordedBallsCount?: number;
}

export interface MatchRecord {
  id: string;
  title: string;
  format: MatchFormat;
  season: string; // e.g., "2026"
  tournamentId?: string;
  fixtureId?: string;
  venue: string;
  date: string; // YYYY-MM-DD
  scorerName: string;
  teamAId: string;
  teamBId: string;
  teamAXI: string[];
  teamBXI: string[];
  tossWinnerTeamId: string;
  tossDecision: 'bat' | 'bowl';
  rules: MatchRulesConfig;
  innings: InningsSetup[];
  currentInningsNumber: 1 | 2 | 3 | 4;
  status: 'live' | 'innings-break' | 'completed';
  isNoResult?: boolean;
  manualPlayerOfTheMatchId?: string;
  summary?: MatchSummary;
  archived?: boolean;
  isSample?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BatterCardRow {
  playerId: string;
  battingOrder: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  status: 'batting' | 'out' | 'retired-hurt' | 'did-not-bat';
  dismissalText: string;
  wicketType?: WicketType;
  bowlerId?: string;
  fielderId?: string;
}

export interface BowlerCardRow {
  playerId: string;
  legalBalls: number;
  oversFormatted: string; // e.g. "3.4"
  maidens: number;
  runsConceded: number;
  wickets: number;
  wides: number;
  noBalls: number;
  dotBalls: number;
  economy: number;
}

export interface ExtrasBreakdown {
  total: number;
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalty: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  scoreAtDismissal: number;
  oversFormatted: string;
  dismissedPlayerId: string;
  wicketType: WicketType;
  bowlerId: string;
  fielderId?: string;
}

export interface PartnershipRow {
  wicketNumber: number; // 1st wicket, 2nd wicket, etc.
  batter1Id: string;
  batter2Id: string;
  runs: number;
  balls: number;
  batter1Contribution: number;
  batter2Contribution: number;
  extrasContribution: number;
  isUnbroken: boolean;
}

export interface BallDisplayChip {
  eventId: string;
  sequence: number;
  overNumber: number; // 0-indexed over
  ballInOver: number; // 1-indexed legal ball
  label: string; // e.g., "0", "1", "4", "6", "Wd", "Nb+4", "W"
  totalRunsOnBall: number;
  isWicket: boolean;
  isBoundary: boolean;
  isExtra: boolean;
  isLegal: boolean;
  strikerId: string;
  nonStrikerId?: string;
  bowlerId: string;
}

export interface OverSummary {
  overNumber: number; // 1-indexed for display (Over 1, Over 2...)
  bowlerId: string;
  runsInOver: number;
  wicketsInOver: number;
  cumulativeRuns: number;
  cumulativeWickets: number;
  isMaiden: boolean;
  balls: BallDisplayChip[];
}

export interface DerivedInningsState {
  inningsNumber: 1 | 2 | 3 | 4;
  battingTeamId: string;
  bowlingTeamId: string;
  isSuperOver: boolean;
  totalRuns: number;
  wickets: number;
  legalBalls: number;
  maxOvers: number;
  oversFormatted: string;
  currentRunRate: number;
  targetRuns?: number;
  requiredRuns?: number;
  remainingBalls?: number;
  requiredRunRate?: number;
  strikerId: string;
  nonStrikerId: string;
  currentBowlerId: string;
  isFreeHit: boolean;
  isEndOfOver: boolean;
  needsBowlerChange: boolean;
  eligibleBowlerIds: string[];
  lastOverBowlerIds: string[];
  validationErrors: string[];
  isInningsCompleted: boolean;
  completionReason?: 'all-out' | 'overs-completed' | 'target-chased' | 'declared';
  extras: ExtrasBreakdown;
  battingCard: BatterCardRow[];
  bowlingCard: BowlerCardRow[];
  fallOfWickets: FallOfWicket[];
  partnerships: PartnershipRow[];
  overSummaries: OverSummary[];
  currentOverBalls: BallDisplayChip[];
  availableBatters: string[];
  retiredHurtBatters: string[];
}

export interface DerivedMatchState {
  matchId: string;
  inningsStates: Record<number, DerivedInningsState>;
  currentInnings: DerivedInningsState;
  isMatchCompleted: boolean;
  winnerTeamId?: string | 'tied' | 'no-result';
  resultSummaryText: string;
  calculatedPotmPlayerId?: string;
}

export interface PlayerCareerStats {
  playerId: string;
  matches: number;
  inningsBatted: number;
  notOuts: number;
  runs: number;
  ballsFaced: number;
  highestScore: number;
  highestScoreNotOut: boolean;
  average: number;
  strikeRate: number;
  fours: number;
  sixes: number;
  ducks: number;
  thirties: number;
  fifties: number;
  hundreds: number;

  // Bowling
  inningsBowled: number;
  legalBallsBowled: number;
  oversBowledFormatted: string;
  maidens: number;
  runsConceded: number;
  wickets: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
  bowlingAverage: number;
  economy: number;
  bowlingStrikeRate: number;
  threeWicketHauls: number;
  fiveWicketHauls: number;
  hatTricks: number;

  // Fielding & Awards
  catches: number;
  stumpings: number;
  runOuts: number;
  potmCount: number;
  potmMatchIds?: string[];
  recentForm: { matchId: string; date: string; opponentTeamId: string; runs: number; balls: number; wickets: number; runsConceded: number }[];
  badges: string[];
}

export interface HeadToHeadStats {
  batterId: string;
  bowlerId: string;
  balls: number;
  runs: number;
  dismissals: number;
  dotBalls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  average: number;
}

export type KnockoutStagePreset =
  | 'none'
  | 'final-only'
  | 'semi-finals'
  | 'quarter-finals'
  | 'custom';

export type FixtureStage =
  | 'league'
  | 'quarter-final'
  | 'semi-final'
  | 'final'
  | 'custom-knockout';

export interface TournamentFixture {
  id: string;
  tournamentId: string;
  roundName: string;
  stage?: FixtureStage;
  slotNumber?: number;
  seedLabelA?: string;
  seedLabelB?: string;
  nextFixtureId?: string;
  nextFixtureSlot?: 'A' | 'B';
  winnerTeamId?: string;
  teamAId: string;
  teamBId: string;
  date: string;
  venue: string;
  matchId?: string; // Linked MatchRecord ID once started/completed
}

export interface Tournament {
  id: string;
  name: string;
  season: string;
  format: MatchFormat;
  type: 'League' | 'Groups';
  teamIds: string[];
  teamGroups?: Record<string, string>; // teamId -> 'Group A' | 'Group B' etc.
  knockoutPreset?: KnockoutStagePreset;
  fixtures: TournamentFixture[];
  pointsForWin: number;
  pointsForTie: number;
  pointsForNoResult?: number;
  archived?: boolean;
  isSample?: boolean;
  createdAt: number;
}

export interface TournamentStandingRow {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult?: number;
  points: number;
  runsScored: number;
  oversFacedForNrr: number;
  runsConceded: number;
  oversBowledForNrr: number;
  netRunRate: number;
}
