import {
  AppSettingsRecord,
  buildMatchSummary,
  db,
  deleteMatchAndEventsAtomic,
  syncTournamentProgressionInDb,
  updateCareerCacheForMatch,
} from '../db/database';
import {
  CustomKnockoutPairing,
  deriveTournamentStandings,
  generateKnockoutFixturesFromStandings,
} from '../engine/scoringEngine';
import {
  InningsSetup,
  KnockoutStagePreset,
  MatchRecord,
  Player,
  Team,
  Tournament,
} from '../engine/types';
import { getLocalDateString } from '../utils/dateUtils';

async function attachFreshSummaryInTx(match: MatchRecord): Promise<MatchRecord> {
  const [matchEvents, allPlayers, allTeams] = await Promise.all([
    db.ballEvents.where('matchId').equals(match.id).toArray(),
    db.players.toArray(),
    db.teams.toArray(),
  ]);
  const playersMap = Object.fromEntries(allPlayers.map((p) => [p.id, p]));
  const teamsNameMap = Object.fromEntries(allTeams.map((tm) => [tm.id, tm.name]));
  return {
    ...match,
    summary: buildMatchSummary(match, matchEvents, playersMap, teamsNameMap),
  };
}

export interface DeleteResult {
  action: 'deleted' | 'archived';
}

export async function savePlayerWithPhotoToDb(
  player: Player,
  photoBlob?: Blob
): Promise<Player[]> {
  const cleanPlayer: Player = {
    ...player,
    hasPhoto: Boolean(photoBlob || player.hasPhoto),
    archived: player.archived ?? false,
  };
  delete cleanPlayer.photoDataUrl;

  await db.transaction('rw', [db.players, db.playerPhotos], async () => {
    await db.players.put(cleanPlayer);
    if (photoBlob) {
      await db.playerPhotos.put({
        playerId: cleanPlayer.id,
        blob: photoBlob,
        mimeType: photoBlob.type || 'image/jpeg',
        updatedAt: Date.now(),
      });
    }
  });

  return db.players.toArray();
}

export async function deleteOrArchivePlayerInDb(
  playerId: string
): Promise<{ result: DeleteResult; players: Player[]; teams: Team[] }> {
  const [matches, cachedCount] = await Promise.all([
    db.matches.toArray(),
    db.careerCache.where('playerId').equals(playerId).count(),
  ]);

  let isReferenced =
    cachedCount > 0 ||
    matches.some(
      (m) =>
        m.teamAXI.includes(playerId) ||
        m.teamBXI.includes(playerId) ||
        m.manualPlayerOfTheMatchId === playerId ||
        m.innings.some(
          (inn) =>
            inn.openingStrikerId === playerId ||
            inn.openingNonStrikerId === playerId ||
            inn.openingBowlerId === playerId
        )
    );

  if (!isReferenced) {
    const firstBallRef = await db.ballEvents
      .filter(
        (e) =>
          e.strikerId === playerId ||
          e.nonStrikerId === playerId ||
          e.bowlerId === playerId ||
          e.dismissedPlayerId === playerId ||
          e.fielderId === playerId ||
          e.incomingBatterId === playerId ||
          e.newBowlerId === playerId ||
          e.retiredPlayerId === playerId ||
          e.replacementPlayerId === playerId
      )
      .first();
    isReferenced = Boolean(firstBallRef);
  }

  if (isReferenced) {
    const existing = await db.players.get(playerId);
    if (existing) await db.players.put({ ...existing, archived: true });
    const [players, teams] = await Promise.all([db.players.toArray(), db.teams.toArray()]);
    return { result: { action: 'archived' }, players, teams };
  }

  await db.transaction('rw', [db.players, db.playerPhotos, db.teams], async () => {
    await db.players.delete(playerId);
    await db.playerPhotos.delete(playerId);
    const allTeams = await db.teams.toArray();
    for (const t of allTeams) {
      if (t.playerIds.includes(playerId)) {
        await db.teams.put({
          ...t,
          playerIds: t.playerIds.filter((id) => id !== playerId),
          captainId: t.captainId === playerId ? undefined : t.captainId,
          viceCaptainId: t.viceCaptainId === playerId ? undefined : t.viceCaptainId,
        });
      }
    }
  });

  const [players, teams] = await Promise.all([db.players.toArray(), db.teams.toArray()]);
  return { result: { action: 'deleted' }, players, teams };
}

export async function deleteOrArchiveTeamInDb(
  teamId: string
): Promise<{ result: DeleteResult; teams: Team[] }> {
  const [matches, tournaments] = await Promise.all([
    db.matches.toArray(),
    db.tournaments.toArray(),
  ]);

  const isReferenced =
    matches.some((m) => m.teamAId === teamId || m.teamBId === teamId) ||
    tournaments.some((tr) => tr.teamIds.includes(teamId));

  if (isReferenced) {
    const existing = await db.teams.get(teamId);
    if (existing) await db.teams.put({ ...existing, archived: true });
    return { result: { action: 'archived' }, teams: await db.teams.toArray() };
  }

  await db.teams.delete(teamId);
  return { result: { action: 'deleted' }, teams: await db.teams.toArray() };
}

export async function createMatchInDb(
  match: MatchRecord
): Promise<{ matches: MatchRecord[]; tournaments: Tournament[] }> {
  await db.transaction(
    'rw',
    [db.matches, db.ballEvents, db.players, db.teams, db.tournaments],
    async () => {
      const withSummary = await attachFreshSummaryInTx({
        ...match,
        archived: match.archived ?? false,
      });
      await db.matches.put(withSummary);
      if (match.tournamentId && match.fixtureId) {
        const tour = await db.tournaments.get(match.tournamentId);
        if (tour) {
          await db.tournaments.put({
            ...tour,
            fixtures: tour.fixtures.map((f) =>
              f.id === match.fixtureId ? { ...f, matchId: match.id } : f
            ),
          });
        }
      }
    }
  );
  const [matches, tournaments] = await Promise.all([
    db.matches.toArray(),
    db.tournaments.toArray(),
  ]);
  return {
    matches: matches.sort((a, b) => b.updatedAt - a.updatedAt),
    tournaments,
  };
}

export async function deleteMatchInDb(matchId: string): Promise<{
  removedBalls: number;
  matches: MatchRecord[];
  tournaments: Tournament[];
}> {
  const removedBalls = await deleteMatchAndEventsAtomic(matchId);
  const [matches, tournaments] = await Promise.all([
    db.matches.toArray(),
    db.tournaments.toArray(),
  ]);
  return {
    removedBalls,
    matches: matches.sort((a, b) => b.updatedAt - a.updatedAt),
    tournaments,
  };
}

export async function startNextInningsInDb(
  match: MatchRecord,
  setup: InningsSetup
): Promise<MatchRecord> {
  return db.transaction('rw', [db.matches, db.ballEvents, db.players, db.teams], async () => {
    const filteredInnings = match.innings.filter((i) => i.inningsNumber !== setup.inningsNumber);
    const candidate: MatchRecord = {
      ...match,
      innings: [...filteredInnings, setup],
      currentInningsNumber: setup.inningsNumber,
      status: 'live',
      updatedAt: Date.now(),
    };
    const updatedMatch = await attachFreshSummaryInTx(candidate);
    await db.matches.put(updatedMatch);
    return updatedMatch;
  });
}

export async function updateRevisedTargetInDb(
  match: MatchRecord,
  inningsNumber: 1 | 2 | 3 | 4,
  revisedTargetRuns: number,
  revisedOvers?: number
): Promise<MatchRecord> {
  return db.transaction('rw', [db.matches, db.ballEvents, db.players, db.teams], async () => {
    const candidate: MatchRecord = {
      ...match,
      innings: match.innings.map((inn) =>
        inn.inningsNumber === inningsNumber
          ? { ...inn, revisedTargetRuns, revisedOvers: revisedOvers ?? inn.revisedOvers }
          : inn
      ),
      updatedAt: Date.now(),
    };
    const updatedMatch = await attachFreshSummaryInTx(candidate);
    await db.matches.put(updatedMatch);
    return updatedMatch;
  });
}

export async function updateManualPotmInDb(
  match: MatchRecord,
  playerId: string
): Promise<MatchRecord> {
  const updatedMatch = await db.transaction(
    'rw',
    [db.matches, db.ballEvents, db.players, db.teams],
    async () => {
      const candidate: MatchRecord = {
        ...match,
        manualPlayerOfTheMatchId: playerId || undefined,
        updatedAt: Date.now(),
      };
      const withSummary = await attachFreshSummaryInTx(candidate);
      await db.matches.put(withSummary);
      return withSummary;
    }
  );
  await updateCareerCacheForMatch(updatedMatch);
  return updatedMatch;
}

export async function completeMatchInDb(
  matchId: string,
  currentSettings: AppSettingsRecord,
  potmPlayerId?: string,
  isNoResult?: boolean
): Promise<{ updatedMatch: MatchRecord; nextSettings: AppSettingsRecord } | null> {
  const txResult = await db.transaction(
    'rw',
    [db.matches, db.ballEvents, db.players, db.teams, db.settings],
    async () => {
      const match = await db.matches.get(matchId);
      if (!match) return null;
      const wasAlreadyCompleted = match.status === 'completed';
      const candidate: MatchRecord = {
        ...match,
        status: 'completed',
        isNoResult: isNoResult ?? match.isNoResult,
        manualPlayerOfTheMatchId: potmPlayerId || match.manualPlayerOfTheMatchId,
        updatedAt: Date.now(),
      };
      const updatedMatch = await attachFreshSummaryInTx(candidate);
      let nextSettings = currentSettings;
      if (!wasAlreadyCompleted) {
        nextSettings = {
          ...nextSettings,
          matchesSinceLastBackup: (nextSettings.matchesSinceLastBackup || 0) + 1,
        };
      }
      await db.matches.put(updatedMatch);
      if (!wasAlreadyCompleted) await db.settings.put(nextSettings);
      return { updatedMatch, nextSettings };
    }
  );
  if (!txResult) return null;
  await updateCareerCacheForMatch(txResult.updatedMatch);
  if (txResult.updatedMatch.tournamentId) {
    const allPlayers = await db.players.toArray();
    const playersMap = Object.fromEntries(allPlayers.map((p) => [p.id, p]));
    await syncTournamentProgressionInDb(txResult.updatedMatch.tournamentId, playersMap);
  }
  return txResult;
}

export async function seedTournamentKnockoutInDb(
  tournamentId: string,
  preset: KnockoutStagePreset,
  startDate?: string,
  venue?: string,
  customPairings?: CustomKnockoutPairing[]
): Promise<Tournament[]> {
  const tournament = await db.tournaments.get(tournamentId);
  if (!tournament) return db.tournaments.toArray();

  const [linkedMatches, allPlayers] = await Promise.all([
    db.matches.where('tournamentId').equals(tournamentId).toArray(),
    db.players.toArray(),
  ]);
  const matchIds = linkedMatches.map((m) => m.id);
  const linkedEvents =
    matchIds.length > 0 ? await db.ballEvents.where('matchId').anyOf(matchIds).toArray() : [];

  const playersMap = Object.fromEntries(allPlayers.map((p) => [p.id, p]));
  const standings = deriveTournamentStandings(
    tournament,
    linkedMatches,
    linkedEvents,
    playersMap,
    'ALL'
  );

  const knockoutFixtures = generateKnockoutFixturesFromStandings(
    tournament,
    standings,
    preset,
    startDate || getLocalDateString(),
    venue || '',
    customPairings
  );

  const leagueFixtures = (tournament.fixtures || []).filter(
    (f) => !f.stage || f.stage === 'league'
  );

  await db.tournaments.put({
    ...tournament,
    knockoutPreset: preset,
    fixtures: [...leagueFixtures, ...knockoutFixtures],
  });

  return db.tournaments.toArray();
}
