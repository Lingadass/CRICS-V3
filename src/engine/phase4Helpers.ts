import {
  formatTournamentGroupLabel,
  normalizeTournamentGroupKey,
  normalizeTournamentRecordGroups,
} from '../utils/tournamentGroupUtils';
import { OverSummary, PlayerCareerStats, TournamentFixture } from './types';

export {
  formatTournamentGroupLabel,
  normalizeTournamentGroupKey,
  normalizeTournamentRecordGroups,
};

export interface MatchSetupValidationInput {
  teamAId: string;
  teamBId: string;
  teamAXI: string[];
  teamBXI: string[];
  openingStrikerId: string;
  openingNonStrikerId: string;
  openingBowlerId: string;
  battingFirstTeamId: string;
  oversPerInnings: number;
  powerplayOvers: number;
  maxOversPerBowler: number;
}

export function validateMatchSetup(
  input: MatchSetupValidationInput
): { valid: boolean; error?: string } {
  const {
    teamAId,
    teamBId,
    teamAXI,
    teamBXI,
    openingStrikerId,
    openingNonStrikerId,
    openingBowlerId,
    battingFirstTeamId,
    oversPerInnings,
    powerplayOvers,
    maxOversPerBowler,
  } = input;

  if (!teamAId || !teamBId || teamAId === teamBId) {
    return { valid: false, error: 'Please select two distinct teams for the match.' };
  }

  if (teamAXI.length < 2 || teamBXI.length < 2) {
    return {
      valid: false,
      error: 'Each team must have at least 2 players selected in Playing XI.',
    };
  }

  const teamASet = new Set(teamAXI);
  const overlappingPlayers = teamBXI.filter((id) => teamASet.has(id));
  if (overlappingPlayers.length > 0) {
    return {
      valid: false,
      error: `Player(s) (${overlappingPlayers.join(', ')}) cannot appear in both Playing XIs in the same match.`,
    };
  }

  if (!Number.isFinite(oversPerInnings) || oversPerInnings < 1) {
    return { valid: false, error: 'Overs per innings must be at least 1.' };
  }

  if (powerplayOvers < 0 || powerplayOvers > oversPerInnings) {
    return {
      valid: false,
      error: 'Powerplay overs cannot exceed total overs per innings.',
    };
  }

  if (maxOversPerBowler < 1 || maxOversPerBowler > oversPerInnings) {
    return {
      valid: false,
      error: 'Max overs per bowler must be between 1 and total overs per innings.',
    };
  }

  const battingXI = battingFirstTeamId === teamAId ? teamAXI : teamBXI;
  const bowlingXI = battingFirstTeamId === teamAId ? teamBXI : teamAXI;

  if (!openingStrikerId || !openingNonStrikerId || openingStrikerId === openingNonStrikerId) {
    return {
      valid: false,
      error: 'Please select two distinct opening batters (Striker and Non-Striker).',
    };
  }

  if (!battingXI.includes(openingStrikerId) || !battingXI.includes(openingNonStrikerId)) {
    return {
      valid: false,
      error: 'Opening batters must belong to the batting team Playing XI.',
    };
  }

  if (!openingBowlerId || !bowlingXI.includes(openingBowlerId)) {
    return {
      valid: false,
      error: 'Opening bowler must belong to the bowling team Playing XI.',
    };
  }

  return { valid: true };
}

export function generateRoundRobinFixtures(
  tournamentId: string,
  teamIds: string[],
  startDate: string,
  defaultVenue: string,
  teamGroups?: Record<string, string>
): TournamentFixture[] {
  const fixtures: TournamentFixture[] = [];
  const baseTime = Date.now();
  let counter = 1;

  const hasGroups =
    teamGroups && Object.keys(teamGroups).length > 0 && new Set(Object.values(teamGroups)).size > 0;

  if (hasGroups && teamGroups) {
    const groupsMap = new Map<string, string[]>();
    for (const tid of teamIds) {
      const gName = teamGroups[tid] || 'A';
      const list = groupsMap.get(gName) || [];
      list.push(tid);
      groupsMap.set(gName, list);
    }

    for (const [groupName, members] of groupsMap.entries()) {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          fixtures.push({
            id: `FIX-${baseTime}-${counter++}`,
            tournamentId,
            roundName: groupName,
            stage: 'league',
            teamAId: members[i],
            teamBId: members[j],
            date: startDate,
            venue: defaultVenue || 'Main Oval',
          });
        }
      }
    }
    return fixtures;
  }

  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      fixtures.push({
        id: `FIX-${baseTime}-${counter++}`,
        tournamentId,
        roundName: `Match ${counter - 1}`,
        stage: 'league',
        teamAId: teamIds[i],
        teamBId: teamIds[j],
        date: startDate,
        venue: defaultVenue || 'Main Oval',
      });
    }
  }
  return fixtures;
}

export type LeaderboardCategory =
  | 'runs'
  | 'wickets'
  | 'strikeRate'
  | 'economy'
  | 'catches';

export function rankLeaderboardEntries(
  entries: PlayerCareerStats[],
  category: LeaderboardCategory
): PlayerCareerStats[] {
  return entries
    .filter((s) => {
      if (s.matches <= 0) return false;
      if (category === 'economy') return s.legalBallsBowled > 0;
      if (category === 'strikeRate') return s.ballsFaced > 0;
      return true;
    })
    .sort((a, b) => {
      if (category === 'runs') {
        return b.runs - a.runs || b.strikeRate - a.strikeRate || a.ballsFaced - b.ballsFaced;
      }
      if (category === 'wickets') {
        return (
          b.wickets - a.wickets ||
          (a.legalBallsBowled > 0 && b.legalBallsBowled > 0 ? a.economy - b.economy : 0) ||
          a.runsConceded - b.runsConceded
        );
      }
      if (category === 'strikeRate') {
        return b.strikeRate - a.strikeRate || b.runs - a.runs;
      }
      if (category === 'economy') {
        return a.economy - b.economy || b.wickets - a.wickets;
      }
      const totalA = a.catches + a.stumpings + a.runOuts;
      const totalB = b.catches + b.stumpings + b.runOuts;
      return totalB - totalA || b.catches - a.catches;
    });
}

export interface ScorecardChartRow {
  over: string;
  inn1Runs: number;
  inn2Runs: number;
  inn1Cumulative: number | null;
  inn2Cumulative: number | null;
}

export function buildScorecardChartData(
  oversPerInnings: number,
  inn1?: { overSummaries: OverSummary[] },
  inn2?: { overSummaries: OverSummary[] }
): ScorecardChartRow[] {
  const maxRecordedOver = Math.max(
    inn1?.overSummaries.length || 0,
    inn2?.overSummaries.length || 0
  );
  const maxO = Math.min(
    Math.max(oversPerInnings, maxRecordedOver),
    Math.max(1, maxRecordedOver)
  );
  const rows: ScorecardChartRow[] = [];

  for (let o = 1; o <= maxO; o++) {
    const os1 = inn1?.overSummaries.find((s) => s.overNumber === o);
    const os2 = inn2?.overSummaries.find((s) => s.overNumber === o);
    if (!os1 && !os2) break;

    rows.push({
      over: `Ov ${o}`,
      inn1Runs: os1?.runsInOver ?? 0,
      inn2Runs: os2?.runsInOver ?? 0,
      inn1Cumulative: os1 ? os1.cumulativeRuns : null,
      inn2Cumulative: os2 ? os2.cumulativeRuns : null,
    });
  }
  return rows;
}
