import { deriveMatchState, deriveTournamentStandings } from './matchEngine';
import { normalizeTournamentGroupKey } from './phase4Helpers';
import {
  BallEvent,
  FixtureStage,
  KnockoutStagePreset,
  MatchRecord,
  Player,
  Tournament,
  TournamentFixture,
  TournamentStandingRow,
} from './types';

export interface CustomKnockoutPairing {
  roundName: string;
  stage?: FixtureStage;
  slotNumber?: number;
  teamAId: string;
  teamBId: string;
  seedLabelA?: string;
  seedLabelB?: string;
  nextFixtureSlot?: 'A' | 'B';
}

function rankGroupStandings(
  tournament: Tournament,
  overallStandings: TournamentStandingRow[],
  groupName: string
): TournamentStandingRow[] {
  const targetGroup = normalizeTournamentGroupKey(groupName);
  return overallStandings.filter(
    (r) => normalizeTournamentGroupKey(tournament.teamGroups?.[r.teamId]) === targetGroup
  );
}

/**
 * Generates knockout stage fixtures (Quarter-Finals, Semi-Finals, Final, or Custom)
 * seeded from the current points table (or Group A & Group B standings).
 */
export function generateKnockoutFixturesFromStandings(
  tournament: Tournament,
  standings: TournamentStandingRow[],
  preset: KnockoutStagePreset,
  startDate: string,
  defaultVenue: string,
  customPairings?: CustomKnockoutPairing[]
): TournamentFixture[] {
  if (preset === 'none') return [];
  const venue = defaultVenue || 'Main Oval';
  const tId = tournament.id;
  const hasTwoGroups =
    tournament.type === 'Groups' &&
    tournament.teamGroups &&
    new Set(Object.values(tournament.teamGroups).map((g) => normalizeTournamentGroupKey(g))).size >= 2;

  const groupA = hasTwoGroups ? rankGroupStandings(tournament, standings, 'A') : [];
  const groupB = hasTwoGroups ? rankGroupStandings(tournament, standings, 'B') : [];

  const finalId = `${tId}-KO-FINAL`;
  const sf1Id = `${tId}-KO-SF1`;
  const sf2Id = `${tId}-KO-SF2`;
  const qf1Id = `${tId}-KO-QF1`;
  const qf2Id = `${tId}-KO-QF2`;
  const qf3Id = `${tId}-KO-QF3`;
  const qf4Id = `${tId}-KO-QF4`;

  if (preset === 'final-only') {
    const teamAId = hasTwoGroups
      ? groupA[0]?.teamId || standings[0]?.teamId || ''
      : standings[0]?.teamId || '';
    const teamBId = hasTwoGroups
      ? groupB[0]?.teamId || standings[1]?.teamId || ''
      : standings[1]?.teamId || '';
    return [
      {
        id: finalId,
        tournamentId: tId,
        roundName: 'Final',
        stage: 'final',
        slotNumber: 1,
        seedLabelA: hasTwoGroups ? 'A1' : 'Seed 1',
        seedLabelB: hasTwoGroups ? 'B1' : 'Seed 2',
        teamAId,
        teamBId,
        date: startDate,
        venue,
      },
    ];
  }

  if (preset === 'semi-finals') {
    const sf1TeamA = hasTwoGroups ? groupA[0]?.teamId || '' : standings[0]?.teamId || '';
    const sf1TeamB = hasTwoGroups ? groupB[1]?.teamId || '' : standings[3]?.teamId || '';
    const sf2TeamA = hasTwoGroups ? groupB[0]?.teamId || '' : standings[1]?.teamId || '';
    const sf2TeamB = hasTwoGroups ? groupA[1]?.teamId || '' : standings[2]?.teamId || '';

    return [
      {
        id: sf1Id,
        tournamentId: tId,
        roundName: 'Semi-Final 1',
        stage: 'semi-final',
        slotNumber: 1,
        seedLabelA: hasTwoGroups ? 'A1' : 'Seed 1',
        seedLabelB: hasTwoGroups ? 'B2' : 'Seed 4',
        nextFixtureId: finalId,
        nextFixtureSlot: 'A',
        teamAId: sf1TeamA,
        teamBId: sf1TeamB,
        date: startDate,
        venue,
      },
      {
        id: sf2Id,
        tournamentId: tId,
        roundName: 'Semi-Final 2',
        stage: 'semi-final',
        slotNumber: 2,
        seedLabelA: hasTwoGroups ? 'B1' : 'Seed 2',
        seedLabelB: hasTwoGroups ? 'A2' : 'Seed 3',
        nextFixtureId: finalId,
        nextFixtureSlot: 'B',
        teamAId: sf2TeamA,
        teamBId: sf2TeamB,
        date: startDate,
        venue,
      },
      {
        id: finalId,
        tournamentId: tId,
        roundName: 'Final',
        stage: 'final',
        slotNumber: 1,
        seedLabelA: 'Winner SF 1',
        seedLabelB: 'Winner SF 2',
        teamAId: '',
        teamBId: '',
        date: startDate,
        venue,
      },
    ];
  }

  if (preset === 'quarter-finals') {
    const qf1A = hasTwoGroups ? groupA[0]?.teamId || '' : standings[0]?.teamId || '';
    const qf1B = hasTwoGroups ? groupB[3]?.teamId || '' : standings[7]?.teamId || '';
    const qf2A = hasTwoGroups ? groupB[1]?.teamId || '' : standings[3]?.teamId || '';
    const qf2B = hasTwoGroups ? groupA[2]?.teamId || '' : standings[4]?.teamId || '';
    const qf3A = hasTwoGroups ? groupB[0]?.teamId || '' : standings[1]?.teamId || '';
    const qf3B = hasTwoGroups ? groupA[3]?.teamId || '' : standings[6]?.teamId || '';
    const qf4A = hasTwoGroups ? groupA[1]?.teamId || '' : standings[2]?.teamId || '';
    const qf4B = hasTwoGroups ? groupB[2]?.teamId || '' : standings[5]?.teamId || '';

    return [
      {
        id: qf1Id,
        tournamentId: tId,
        roundName: 'Quarter-Final 1',
        stage: 'quarter-final',
        slotNumber: 1,
        seedLabelA: hasTwoGroups ? 'A1' : 'Seed 1',
        seedLabelB: hasTwoGroups ? 'B4' : 'Seed 8',
        nextFixtureId: sf1Id,
        nextFixtureSlot: 'A',
        teamAId: qf1A,
        teamBId: qf1B,
        date: startDate,
        venue,
      },
      {
        id: qf2Id,
        tournamentId: tId,
        roundName: 'Quarter-Final 2',
        stage: 'quarter-final',
        slotNumber: 2,
        seedLabelA: hasTwoGroups ? 'B2' : 'Seed 4',
        seedLabelB: hasTwoGroups ? 'A3' : 'Seed 5',
        nextFixtureId: sf1Id,
        nextFixtureSlot: 'B',
        teamAId: qf2A,
        teamBId: qf2B,
        date: startDate,
        venue,
      },
      {
        id: qf3Id,
        tournamentId: tId,
        roundName: 'Quarter-Final 3',
        stage: 'quarter-final',
        slotNumber: 3,
        seedLabelA: hasTwoGroups ? 'B1' : 'Seed 2',
        seedLabelB: hasTwoGroups ? 'A4' : 'Seed 7',
        nextFixtureId: sf2Id,
        nextFixtureSlot: 'A',
        teamAId: qf3A,
        teamBId: qf3B,
        date: startDate,
        venue,
      },
      {
        id: qf4Id,
        tournamentId: tId,
        roundName: 'Quarter-Final 4',
        stage: 'quarter-final',
        slotNumber: 4,
        seedLabelA: hasTwoGroups ? 'A2' : 'Seed 3',
        seedLabelB: hasTwoGroups ? 'B3' : 'Seed 6',
        nextFixtureId: sf2Id,
        nextFixtureSlot: 'B',
        teamAId: qf4A,
        teamBId: qf4B,
        date: startDate,
        venue,
      },
      {
        id: sf1Id,
        tournamentId: tId,
        roundName: 'Semi-Final 1',
        stage: 'semi-final',
        slotNumber: 1,
        seedLabelA: 'Winner QF 1',
        seedLabelB: 'Winner QF 2',
        nextFixtureId: finalId,
        nextFixtureSlot: 'A',
        teamAId: '',
        teamBId: '',
        date: startDate,
        venue,
      },
      {
        id: sf2Id,
        tournamentId: tId,
        roundName: 'Semi-Final 2',
        stage: 'semi-final',
        slotNumber: 2,
        seedLabelA: 'Winner QF 3',
        seedLabelB: 'Winner QF 4',
        nextFixtureId: finalId,
        nextFixtureSlot: 'B',
        teamAId: '',
        teamBId: '',
        date: startDate,
        venue,
      },
      {
        id: finalId,
        tournamentId: tId,
        roundName: 'Final',
        stage: 'final',
        slotNumber: 1,
        seedLabelA: 'Winner SF 1',
        seedLabelB: 'Winner SF 2',
        teamAId: '',
        teamBId: '',
        date: startDate,
        venue,
      },
    ];
  }

  if (preset === 'custom') {
    const list = customPairings && customPairings.length > 0
      ? customPairings
      : [
          {
            roundName: 'Final',
            stage: 'final' as FixtureStage,
            slotNumber: 1,
            teamAId: standings[0]?.teamId || '',
            teamBId: standings[1]?.teamId || '',
            seedLabelA: 'Seed 1',
            seedLabelB: 'Seed 2',
          },
        ];

    const hasMultiple = list.length >= 2;
    const customFixtures: TournamentFixture[] = list.map((p, idx) => ({
      id: `${tId}-KO-CUST-${idx + 1}`,
      tournamentId: tId,
      roundName: p.roundName || `Knockout ${idx + 1}`,
      stage: p.stage || (hasMultiple ? 'semi-final' : 'final'),
      slotNumber: p.slotNumber ?? idx + 1,
      seedLabelA: p.seedLabelA || `Seed ${idx * 2 + 1}`,
      seedLabelB: p.seedLabelB || `Seed ${idx * 2 + 2}`,
      nextFixtureId: hasMultiple ? finalId : undefined,
      nextFixtureSlot: hasMultiple ? (idx % 2 === 0 ? 'A' : 'B') : undefined,
      teamAId: p.teamAId,
      teamBId: p.teamBId,
      date: startDate,
      venue,
    }));

    if (hasMultiple) {
      customFixtures.push({
        id: finalId,
        tournamentId: tId,
        roundName: 'Final',
        stage: 'final',
        slotNumber: 1,
        seedLabelA: 'Winner KO 1',
        seedLabelB: 'Winner KO 2',
        teamAId: '',
        teamBId: '',
        date: startDate,
        venue,
      });
    }
    return customFixtures;
  }

  return [];
}

/**
 * Pure helper that evaluates a tournament's league/group standings and knockout fixtures:
 * 1. If all league/group fixtures have completed matches and knockout fixtures exist with empty initial seeds, seeds them from standings.
 * 2. When any knockout fixture's linked match is completed (including Super Over ties or No-Result higher-seed tie-break), records winnerTeamId and advances the winner to nextFixtureId.
 */
export function advanceTournamentKnockoutPure(
  tournament: Tournament,
  matches: MatchRecord[],
  allEvents: BallEvent[],
  playersMap: Record<string, Player>
): Tournament {
  const standings = deriveTournamentStandings(tournament, matches, allEvents, playersMap, 'ALL');
  const rankMap = new Map<string, number>();
  standings.forEach((row, idx) => rankMap.set(row.teamId, idx));

  const fixturesCopy: TournamentFixture[] = (tournament.fixtures || []).map((f) => ({ ...f }));
  const leagueFixtures = fixturesCopy.filter((f) => !f.stage || f.stage === 'league');
  const knockoutFixtures = fixturesCopy.filter((f) => f.stage && f.stage !== 'league');

  const allLeagueCompleted =
    leagueFixtures.length > 0 &&
    leagueFixtures.every((lf) => {
      if (!lf.matchId) return false;
      const m = matches.find((mc) => mc.id === lf.matchId);
      if (!m) return false;
      const mEvents = allEvents.filter((e) => e.matchId === m.id);
      if (mEvents.length === 0 && m.summary) {
        return m.summary.status === 'completed' || m.status === 'completed';
      }
      const d = deriveMatchState(m, mEvents, playersMap);
      return d.isMatchCompleted;
    });

  // If all league matches are completed and the tournament has a knockoutPreset,
  // populate any initial-round knockout fixtures that don't have teams assigned yet.
  if (allLeagueCompleted && tournament.knockoutPreset && tournament.knockoutPreset !== 'none') {
    const freshlySeeded = generateKnockoutFixturesFromStandings(
      tournament,
      standings,
      tournament.knockoutPreset,
      leagueFixtures[leagueFixtures.length - 1]?.date || '',
      leagueFixtures[0]?.venue || 'Main Oval'
    );
    if (knockoutFixtures.length === 0 && freshlySeeded.length > 0) {
      fixturesCopy.push(...freshlySeeded);
    } else {
      for (const seeded of freshlySeeded) {
        const target = fixturesCopy.find((f) => f.id === seeded.id);
        if (target && !target.matchId && (!target.teamAId || !target.teamBId)) {
          if (seeded.teamAId) target.teamAId = seeded.teamAId;
          if (seeded.teamBId) target.teamBId = seeded.teamBId;
        }
      }
    }
  }

  // Evaluate each knockout fixture in order and advance winners
  for (const fx of fixturesCopy) {
    if (!fx.stage || fx.stage === 'league' || !fx.matchId) continue;
    const match = matches.find((m) => m.id === fx.matchId);
    if (!match) continue;
    const matchEvents = allEvents.filter((e) => e.matchId === match.id);
    const useSummary = matchEvents.length === 0 && Boolean(match.summary);
    const derived = useSummary ? undefined : deriveMatchState(match, matchEvents, playersMap);
    const isCompleted = useSummary
      ? match.summary?.status === 'completed' || match.status === 'completed'
      : Boolean(derived?.isMatchCompleted);
    if (!isCompleted) continue;

    const rawWinnerTeamId = useSummary ? match.summary?.winnerTeamId : derived?.winnerTeamId;

    let winnerId: string | undefined;
    if (
      rawWinnerTeamId &&
      rawWinnerTeamId !== 'tied' &&
      rawWinnerTeamId !== 'no-result'
    ) {
      winnerId = rawWinnerTeamId;
    } else if (match.isNoResult || rawWinnerTeamId === 'no-result') {
      // In a knockout No-Result or abandoned match, higher seed from league/group standings advances
      const rankA = rankMap.get(fx.teamAId) ?? 999;
      const rankB = rankMap.get(fx.teamBId) ?? 999;
      winnerId = rankA <= rankB ? fx.teamAId : fx.teamBId;
    }

    if (winnerId) {
      fx.winnerTeamId = winnerId;
      if (fx.nextFixtureId) {
        const nextFx = fixturesCopy.find((f) => f.id === fx.nextFixtureId);
        if (nextFx) {
          if (fx.nextFixtureSlot === 'A') {
            nextFx.teamAId = winnerId;
          } else if (fx.nextFixtureSlot === 'B') {
            nextFx.teamBId = winnerId;
          }
        }
      }
    }
  }

  return {
    ...tournament,
    fixtures: fixturesCopy,
  };
}
