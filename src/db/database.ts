import Dexie, { type Table } from 'dexie';
import {
  advanceTournamentKnockoutPure,
  deriveMatchState,
  normalizeTournamentRecordGroups,
} from '../engine/scoringEngine';
import {
  BallEvent,
  MatchFormat,
  MatchRecord,
  Player,
  PlayerPhotoRecord,
  Team,
  Tournament,
} from '../engine/types';
import { LanguageCode, ThemeMode } from '../i18n/translations';
import {
  backfillMatchSummariesPure,
  buildMatchSummary,
  buildMatchSummaryFromDerived,
  formatChaseEquationText,
  formatChaseStripEquationText,
  formatMatchResultText,
  normalizeLegacyBowlerChanges,
} from '../utils/matchSummaryUtils';
import { dataUrlToBlob } from '../utils/mediaUtils';
import {
  buildAllCareerCacheRecordsPure,
  CareerCacheRecord,
  removeMatchFromCareerCache,
  updateCareerCacheForMatch,
} from './careerCache';

export {
  backfillMatchSummariesPure,
  buildMatchSummary,
  buildMatchSummaryFromDerived,
  formatChaseEquationText,
  formatChaseStripEquationText,
  formatMatchResultText,
  normalizeLegacyBowlerChanges,
};

export interface AppSettingsRecord {
  id: string; // 'singleton'
  theme: ThemeMode;
  language: LanguageCode;
  keepScreenAwake: boolean;
  defaultOvers: number;
  defaultWideRuns: number;
  defaultNoBallRuns: number;
  defaultFreeHit: boolean;
  backupReminderIntervalMatches: number;
  matchesSinceLastBackup: number;
  lastBackupTimestamp?: number;
  storagePersisted?: boolean;
  scorerPinSalt?: string;
  scorerPinHash?: string;
  isScoringLocked?: boolean;
  vibrationEnabled?: boolean;
  highContrastScoring?: boolean;
  lastUsedTeamAId?: string;
  lastUsedTeamBId?: string;
  lastUsedOvers?: number;
  lastUsedFormat?: MatchFormat;
  showIntroAnimation?: boolean;
  clubSecurityCode?: string;
}

export class CricsDatabase extends Dexie {
  players!: Table<Player, string>;
  playerPhotos!: Table<PlayerPhotoRecord, string>;
  teams!: Table<Team, string>;
  matches!: Table<MatchRecord, string>;
  ballEvents!: Table<BallEvent, string>;
  tournaments!: Table<Tournament, string>;
  settings!: Table<AppSettingsRecord, string>;
  careerCache!: Table<CareerCacheRecord, string>;

  constructor(dbName = 'CricsOfflineDB') {
    super(dbName);

    const v2Stores = {
      players: 'id, name, dob, role, jerseyNumber, archived, isSample, createdAt',
      playerPhotos: 'playerId, updatedAt',
      teams: 'id, name, shortName, archived, isSample, createdAt',
      matches: 'id, status, format, season, tournamentId, date, archived, isSample, createdAt, updatedAt',
      ballEvents: 'id, matchId, [matchId+inningsNumber], [matchId+sequence], sequence, isSample',
      tournaments: 'id, name, season, format, archived, isSample, createdAt',
      settings: 'id',
    };
    const v5Stores = {
      ...v2Stores,
      careerCache: 'id, playerId, format, season, [playerId+format+season]',
    };

    // Schema Version 1
    this.version(1).stores({
      players: 'id, name, dob, role, jerseyNumber, createdAt',
      teams: 'id, name, shortName, createdAt',
      matches: 'id, status, format, season, tournamentId, date, createdAt, updatedAt',
      ballEvents: 'id, matchId, [matchId+inningsNumber], [matchId+sequence], sequence',
      tournaments: 'id, name, season, format, createdAt',
      settings: 'id',
    });

    // Schema Version 2: Separate playerPhotos Blob table + archived & isSample flags + automatic migration
    this.version(2)
      .stores(v2Stores)
      .upgrade(async (tx) => {
        const playersTable = tx.table<Player, string>('players');
        const photosTable = tx.table<PlayerPhotoRecord, string>('playerPhotos');
        const allPlayers = await playersTable.toArray();

        for (const p of allPlayers) {
          let updated = false;
          const copy: Player = { ...p };
          if (copy.photoDataUrl && typeof copy.photoDataUrl === 'string') {
            const blob = dataUrlToBlob(copy.photoDataUrl);
            await photosTable.put({
              playerId: copy.id,
              blob,
              mimeType: blob.type || 'image/jpeg',
              updatedAt: Date.now(),
            });
            delete copy.photoDataUrl;
            copy.hasPhoto = true;
            updated = true;
          }
          if (copy.archived === undefined) {
            copy.archived = false;
            updated = true;
          }
          if (updated) await playersTable.put(copy);
        }
      });

    // Schema Version 3: Normalize legacy implicit bowler changes into explicit bowler-change events for pure derivation
    this.version(3)
      .stores(v2Stores)
      .upgrade(async (tx) => {
        const matchesTable = tx.table<MatchRecord, string>('matches');
        const eventsTable = tx.table<BallEvent, string>('ballEvents');
        const [allMatches, allEvents] = await Promise.all([matchesTable.toArray(), eventsTable.toArray()]);
        const { normalizedEvents, insertedCount } = normalizeLegacyBowlerChanges(allMatches, allEvents);
        if (insertedCount > 0) {
          await eventsTable.clear();
          await eventsTable.bulkPut(normalizedEvents);
        }
      });

    // Schema Version 4: Persist scoring lock state in settings when a PIN exists
    this.version(4)
      .stores(v2Stores)
      .upgrade(async (tx) => {
        const settingsTable = tx.table<AppSettingsRecord, string>('settings');
        for (const s of await settingsTable.toArray()) {
          const hasPin = Boolean(s.scorerPinSalt && s.scorerPinHash);
          await settingsTable.put({ ...s, isScoringLocked: hasPin ? Boolean(s.isScoringLocked) : false });
        }
      });

    // Schema Version 5: Add careerCache table (per player, format, season) for instant Careers & Leaderboards
    this.version(5)
      .stores(v5Stores)
      .upgrade(async (tx) => {
        const [allPlayers, allMatches, allEvents] = await Promise.all([
          tx.table<Player, string>('players').toArray(),
          tx.table<MatchRecord, string>('matches').toArray(),
          tx.table<BallEvent, string>('ballEvents').toArray(),
        ]);
        const records = buildAllCareerCacheRecordsPure(allPlayers, allMatches, allEvents);
        if (records.length > 0) await tx.table<CareerCacheRecord, string>('careerCache').bulkPut(records);
      });

    // Schema Version 6: Knockout tournament fields, pointsForNoResult, and fixture stage normalization
    this.version(6)
      .stores(v5Stores)
      .upgrade(async (tx) => {
        const tournamentsTable = tx.table<Tournament, string>('tournaments');
        for (const tr of await tournamentsTable.toArray()) {
          await tournamentsTable.put({
            ...tr,
            pointsForNoResult: tr.pointsForNoResult ?? 1,
            knockoutPreset: tr.knockoutPreset ?? 'none',
            fixtures: (tr.fixtures || []).map((f) => ({ ...f, stage: f.stage ?? 'league' })),
          });
        }
      });

    // Schema Version 7: Support 'system' | 'light' | 'dark' theme with 'system' default
    this.version(7)
      .stores(v5Stores)
      .upgrade(async (tx) => {
        const settingsTable = tx.table<AppSettingsRecord, string>('settings');
        for (const s of await settingsTable.toArray()) {
          const validTheme =
            s.theme === 'light' || s.theme === 'dark' || s.theme === 'system' ? s.theme : 'system';
          await settingsTable.put({ ...s, theme: validTheme });
        }
      });

    // Schema Version 8: Add vibrationEnabled and highContrastScoring defaults (false) to settings
    this.version(8)
      .stores(v5Stores)
      .upgrade(async (tx) => {
        const settingsTable = tx.table<AppSettingsRecord, string>('settings');
        for (const s of await settingsTable.toArray()) {
          await settingsTable.put({
            ...s,
            vibrationEnabled: Boolean(s.vibrationEnabled),
            highContrastScoring: Boolean(s.highContrastScoring),
          });
        }
      });

    // Schema Version 9: Add remembered match setup defaults (lastUsedTeamAId, lastUsedTeamBId, lastUsedOvers, lastUsedFormat)
    this.version(9)
      .stores(v5Stores)
      .upgrade(async (tx) => {
        const settingsTable = tx.table<AppSettingsRecord, string>('settings');
        for (const s of await settingsTable.toArray()) {
          await settingsTable.put({
            ...s,
            lastUsedTeamAId: s.lastUsedTeamAId ?? '',
            lastUsedTeamBId: s.lastUsedTeamBId ?? '',
            lastUsedOvers: s.lastUsedOvers ?? s.defaultOvers ?? 20,
            lastUsedFormat: s.lastUsedFormat ?? 'T20',
          });
        }
      });

    // Schema Version 10: Add showIntroAnimation default (true) to settings
    this.version(10)
      .stores(v5Stores)
      .upgrade(async (tx) => {
        const settingsTable = tx.table<AppSettingsRecord, string>('settings');
        for (const s of await settingsTable.toArray()) {
          await settingsTable.put({ ...s, showIntroAnimation: s.showIntroAnimation ?? true });
        }
      });

    // Schema Version 11: Normalize legacy 'Group A' / 'Group B' tournament group keys to neutral 'A' / 'B'
    this.version(11)
      .stores(v5Stores)
      .upgrade(async (tx) => {
        const tournamentsTable = tx.table<Tournament, string>('tournaments');
        for (const tr of await tournamentsTable.toArray()) {
          await tournamentsTable.put(normalizeTournamentRecordGroups(tr));
        }
      });

    // Schema Version 12: Backfill summary on all matches so Home and lists never depend on loaded ballEvents
    this.version(12)
      .stores(v5Stores)
      .upgrade(async (tx) => {
        const matchesTable = tx.table<MatchRecord, string>('matches');
        const [allMatches, allEvents, allPlayers, allTeams] = await Promise.all([
          matchesTable.toArray(),
          tx.table<BallEvent, string>('ballEvents').toArray(),
          tx.table<Player, string>('players').toArray(),
          tx.table<Team, string>('teams').toArray(),
        ]);
        if (allMatches.length > 0) {
          const updatedMatches = backfillMatchSummariesPure(allMatches, allEvents, allPlayers, allTeams);
          await matchesTable.bulkPut(updatedMatches);
        }
      });
  }
}

export const db = new CricsDatabase();

export async function syncTournamentProgressionInDb(
  tournamentId: string,
  playersMap: Record<string, Player>
): Promise<Tournament | undefined> {
  const tournament = await db.tournaments.get(tournamentId);
  if (!tournament) return undefined;
  const linkedMatches = await db.matches.where('tournamentId').equals(tournamentId).toArray();
  const matchIds = linkedMatches.map((m) => m.id);
  const linkedEvents =
    matchIds.length > 0
      ? await db.ballEvents.where('matchId').anyOf(matchIds).toArray()
      : [];
  const updatedTournament = advanceTournamentKnockoutPure(
    tournament,
    linkedMatches,
    linkedEvents,
    playersMap
  );
  await db.tournaments.put(updatedTournament);
  return updatedTournament;
}

export async function recordBallEventWithAutoSequenceAtomic(
  matchId: string,
  partialEvent: Omit<BallEvent, 'id' | 'matchId' | 'sequence' | 'timestamp'>,
  playersMap: Record<string, Player>
): Promise<{
  newEvent: BallEvent;
  updatedMatch: MatchRecord;
  updatedSettings?: AppSettingsRecord;
} | null> {
  return db.transaction(
    'rw',
    [db.matches, db.ballEvents, db.settings, db.careerCache, db.tournaments, db.teams],
    async () => {
      const [match, existingEvents, allTeams] = await Promise.all([
        db.matches.get(matchId),
        db.ballEvents.where('matchId').equals(matchId).toArray(),
        db.teams.toArray(),
      ]);
      if (!match) return null;

      const teamsNameMap = Object.fromEntries(allTeams.map((tm) => [tm.id, tm.name]));
      const maxSeq = existingEvents.reduce((acc, e) => Math.max(acc, e.sequence), 0);
      const nextSeq = maxSeq + 1;

      const newEvent: BallEvent = {
        ...partialEvent,
        id: `${matchId}-B-${Date.now()}-${nextSeq}`,
        matchId,
        sequence: nextSeq,
        timestamp: Date.now(),
        isSample: match.isSample,
      };

      const allMatchEvents = [...existingEvents, newEvent];
      const derivedAfter = deriveMatchState(match, allMatchEvents, playersMap);

      const wasCompleted = match.status === 'completed';
      const isNowCompleted = derivedAfter.isMatchCompleted;

      const matchCandidate: MatchRecord = {
        ...match,
        status: isNowCompleted ? 'completed' : match.status,
        updatedAt: Date.now(),
      };
      const updatedMatch: MatchRecord = {
        ...matchCandidate,
        summary: buildMatchSummaryFromDerived(matchCandidate, derivedAfter, allMatchEvents.length, teamsNameMap),
      };

      await db.ballEvents.put(newEvent);
      await db.matches.put(updatedMatch);
      await updateCareerCacheForMatch(updatedMatch, allMatchEvents, playersMap, db.careerCache);

      if (updatedMatch.tournamentId && isNowCompleted) {
        await syncTournamentProgressionInDb(updatedMatch.tournamentId, playersMap);
      }

      let updatedSettings: AppSettingsRecord | undefined;
      if (!wasCompleted && isNowCompleted) {
        const currentSettings = await db.settings.get('singleton');
        if (currentSettings) {
          updatedSettings = {
            ...currentSettings,
            matchesSinceLastBackup: (currentSettings.matchesSinceLastBackup || 0) + 1,
          };
          await db.settings.put(updatedSettings);
        }
      }

      return { newEvent, updatedMatch, updatedSettings };
    }
  );
}

export async function undoLastBallAtomic(
  matchId: string
): Promise<{
  removedEvent: BallEvent;
  updatedMatch: MatchRecord;
} | null> {
  return db.transaction(
    'rw',
    [db.matches, db.ballEvents, db.players, db.careerCache, db.teams],
    async () => {
      const [match, existingEvents, allPlayers, allTeams] = await Promise.all([
        db.matches.get(matchId),
        db.ballEvents.where('matchId').equals(matchId).toArray(),
        db.players.toArray(),
        db.teams.toArray(),
      ]);
      if (!match || existingEvents.length === 0) return null;

      existingEvents.sort((a, b) => a.sequence - b.sequence);
      const lastEvent = existingEvents[existingEvents.length - 1];
      const remainingEvents = existingEvents.slice(0, -1);

      const playersMap = Object.fromEntries(allPlayers.map((p) => [p.id, p]));
      const teamsNameMap = Object.fromEntries(allTeams.map((tm) => [tm.id, tm.name]));

      const matchCandidate: MatchRecord = {
        ...match,
        status: 'live',
        updatedAt: Date.now(),
      };
      const derivedAfter = deriveMatchState(matchCandidate, remainingEvents, playersMap);
      const updatedMatch: MatchRecord = {
        ...matchCandidate,
        summary: buildMatchSummaryFromDerived(matchCandidate, derivedAfter, remainingEvents.length, teamsNameMap),
      };

      await db.ballEvents.delete(lastEvent.id);
      await db.matches.put(updatedMatch);
      await updateCareerCacheForMatch(updatedMatch, remainingEvents, playersMap, db.careerCache);

      return { removedEvent: lastEvent, updatedMatch };
    }
  );
}

export async function putBallEventAndRecalculateAtomic(
  eventToSave: BallEvent,
  playersMap: Record<string, Player>
): Promise<{
  savedEvent: BallEvent;
  updatedMatch: MatchRecord;
} | null> {
  return db.transaction(
    'rw',
    [db.matches, db.ballEvents, db.careerCache, db.tournaments, db.teams],
    async () => {
      const [match, allTeams] = await Promise.all([
        db.matches.get(eventToSave.matchId),
        db.teams.toArray(),
      ]);
      if (!match) return null;

      const teamsNameMap = Object.fromEntries(allTeams.map((tm) => [tm.id, tm.name]));
      await db.ballEvents.put(eventToSave);
      const allMatchEvents = await db.ballEvents.where('matchId').equals(match.id).toArray();
      const derivedAfter = deriveMatchState(match, allMatchEvents, playersMap);

      const matchCandidate: MatchRecord = {
        ...match,
        status: derivedAfter.isMatchCompleted ? 'completed' : 'live',
        updatedAt: Date.now(),
      };
      const updatedMatch: MatchRecord = {
        ...matchCandidate,
        summary: buildMatchSummaryFromDerived(matchCandidate, derivedAfter, allMatchEvents.length, teamsNameMap),
      };

      await db.matches.put(updatedMatch);
      await updateCareerCacheForMatch(updatedMatch, allMatchEvents, playersMap, db.careerCache);
      if (updatedMatch.tournamentId) {
        await syncTournamentProgressionInDb(updatedMatch.tournamentId, playersMap);
      }
      return { savedEvent: eventToSave, updatedMatch };
    }
  );
}

export async function deleteMatchAndEventsAtomic(matchId: string): Promise<number> {
  return db.transaction(
    'rw',
    [db.matches, db.ballEvents, db.tournaments, db.careerCache],
    async () => {
      const removedBalls = await db.ballEvents.where('matchId').equals(matchId).delete();
      await db.matches.delete(matchId);
      await removeMatchFromCareerCache(matchId, db.careerCache);

      const allTournaments = await db.tournaments.toArray();
      for (const tr of allTournaments) {
        if (tr.fixtures.some((f) => f.matchId === matchId)) {
          await db.tournaments.put({
            ...tr,
            fixtures: tr.fixtures.map((f) =>
              f.matchId === matchId ? { ...f, matchId: undefined } : f
            ),
          });
        }
      }
      return removedBalls;
    }
  );
}

export * from './backupRestore';
export * from './careerCache';
export * from './sampleData';
