import { Tournament } from '../engine/types';

export function normalizeTournamentGroupKey(rawGroup?: string): string {
  if (!rawGroup) return 'A';
  const trimmed = rawGroup.trim();
  if (
    trimmed === 'A' ||
    trimmed === 'Group A' ||
    trimmed === 'ग्रुप A' ||
    trimmed === 'Grupo A'
  ) {
    return 'A';
  }
  if (
    trimmed === 'B' ||
    trimmed === 'Group B' ||
    trimmed === 'ग्रुप B' ||
    trimmed === 'Grupo B'
  ) {
    return 'B';
  }
  return trimmed;
}

export function normalizeTournamentRecordGroups(tournament: Tournament): Tournament {
  const normalizedTeamGroups = tournament.teamGroups
    ? Object.fromEntries(
        Object.entries(tournament.teamGroups).map(([teamId, groupVal]) => [
          teamId,
          normalizeTournamentGroupKey(groupVal),
        ])
      )
    : undefined;

  const normalizedFixtures = (tournament.fixtures || []).map((fx) => {
    if (!fx.stage || fx.stage === 'league') {
      const normRound = normalizeTournamentGroupKey(fx.roundName);
      if (normRound === 'A' || normRound === 'B') {
        return { ...fx, roundName: normRound };
      }
    }
    return fx;
  });

  return {
    ...tournament,
    teamGroups: normalizedTeamGroups,
    fixtures: normalizedFixtures,
  };
}

export function formatTournamentGroupLabel(
  groupKey: string,
  t: { tournaments: { groupAOption: string; groupBOption: string } }
): string {
  const norm = normalizeTournamentGroupKey(groupKey);
  if (norm === 'A') return t.tournaments.groupAOption;
  if (norm === 'B') return t.tournaments.groupBOption;
  return groupKey;
}

export function createTournamentTimestampMs(): number {
  return Date.now();
}
