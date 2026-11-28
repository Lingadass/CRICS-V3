import { BallEvent, MatchRecord, Player, Team, Tournament } from '../engine/types';
import {
  backfillMatchSummariesPure,
  normalizeLegacyBowlerChanges,
} from '../utils/matchSummaryUtils';
import { blobToDataUrl, dataUrlToBlob } from '../utils/mediaUtils';
import { normalizeTournamentRecordGroups } from '../utils/tournamentGroupUtils';
import {
  AppSettingsRecord,
  db,
  rebuildCareerStatsCache,
} from './database';

export interface CricsBackupPayload {
  schemaVersion: 1 | 2 | 3 | 4 | 5 | 6;
  exportedAt: string;
  app: 'CRICS';
  players: Player[];
  teams: Team[];
  matches: MatchRecord[];
  ballEvents: BallEvent[];
  tournaments: Tournament[];
  settings: AppSettingsRecord[];
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  payload?: CricsBackupPayload;
}

export const MAX_BACKUP_FILE_BYTES = 25 * 1024 * 1024; // 25 MB limit

export function validateBackupFileSize(
  byteLength: number,
  maxBytes = MAX_BACKUP_FILE_BYTES
): BackupValidationResult {
  if (byteLength > maxBytes) {
    const limitLabel =
      maxBytes >= 1024 * 1024
        ? `${Math.round(maxBytes / (1024 * 1024))} MB`
        : `${maxBytes} bytes`;
    return {
      valid: false,
      error: `Backup file exceeds maximum allowed size (${limitLabel}).`,
    };
  }
  return { valid: true };
}

/**
 * Upgrades a v1..v6 backup payload to latest format in-memory, including legacy bowler-change normalization
 * and match summary backfill.
 */
export function upgradeBackupPayloadToLatest(
  payload: CricsBackupPayload
): CricsBackupPayload {
  const upgradedPlayers = (payload.players || []).map((p) => ({
    ...p,
    archived: p.archived ?? false,
    hasPhoto: Boolean(p.photoDataUrl || p.hasPhoto),
  }));
  const upgradedTeams = (payload.teams || []).map((t) => ({
    ...t,
    archived: t.archived ?? false,
  }));
  const rawMatches = (payload.matches || []).map((m) => ({
    ...m,
    archived: m.archived ?? false,
  }));
  const { normalizedEvents } = normalizeLegacyBowlerChanges(
    rawMatches,
    payload.ballEvents || []
  );
  const upgradedMatches = backfillMatchSummariesPure(
    rawMatches,
    normalizedEvents,
    upgradedPlayers,
    upgradedTeams
  );

  return {
    ...payload,
    schemaVersion: 3,
    players: upgradedPlayers,
    teams: upgradedTeams,
    matches: upgradedMatches,
    ballEvents: normalizedEvents,
    tournaments: (payload.tournaments || []).map((tr) =>
      normalizeTournamentRecordGroups({
        ...tr,
        archived: tr.archived ?? false,
        pointsForNoResult: tr.pointsForNoResult ?? 1,
        knockoutPreset: tr.knockoutPreset ?? 'none',
        fixtures: (tr.fixtures || []).map((f) => ({
          ...f,
          stage: f.stage ?? 'league',
        })),
      })
    ),
  };
}

/**
 * Hand-written schema validator for backup JSON files.
 */
export function validateBackupPayload(
  rawText: string,
  maxBytes = MAX_BACKUP_FILE_BYTES
): BackupValidationResult {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { valid: false, error: 'Backup file is empty.' };
  }
  const byteLength = new TextEncoder().encode(rawText).byteLength;
  const sizeCheck = validateBackupFileSize(byteLength, maxBytes);
  if (!sizeCheck.valid) {
    return sizeCheck;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { valid: false, error: 'Invalid JSON syntax in backup file.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'Backup root must be a JSON object.' };
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.app !== 'CRICS') {
    return {
      valid: false,
      error: 'Invalid backup identifier: expected "app": "CRICS".',
    };
  }

  if (
    obj.schemaVersion !== 1 &&
    obj.schemaVersion !== 2 &&
    obj.schemaVersion !== 3 &&
    obj.schemaVersion !== 4 &&
    obj.schemaVersion !== 5 &&
    obj.schemaVersion !== 6 &&
    obj.schemaVersion !== 7
  ) {
    return {
      valid: false,
      error: `Unsupported backup schemaVersion: ${String(obj.schemaVersion)}.`,
    };
  }

  const arrayKeys = [
    'players',
    'teams',
    'matches',
    'ballEvents',
    'tournaments',
    'settings',
  ] as const;

  for (const key of arrayKeys) {
    if (!Array.isArray(obj[key])) {
      return {
        valid: false,
        error: `Missing or invalid array field "${key}" in backup file.`,
      };
    }
  }

  const isNonEmptyStr = (v: unknown): v is string =>
    typeof v === 'string' && v.trim().length > 0;

  for (const p of obj.players as Record<string, unknown>[]) {
    if (!p || !isNonEmptyStr(p.id) || !isNonEmptyStr(p.name) || !isNonEmptyStr(p.role)) {
      return {
        valid: false,
        error: 'Invalid player record in backup (missing id, name, or role).',
      };
    }
  }

  for (const t of obj.teams as Record<string, unknown>[]) {
    if (!t || !isNonEmptyStr(t.id) || !isNonEmptyStr(t.name) || !Array.isArray(t.playerIds)) {
      return {
        valid: false,
        error: 'Invalid team record in backup (missing id, name, or playerIds).',
      };
    }
  }

  for (const m of obj.matches as Record<string, unknown>[]) {
    if (!m || !isNonEmptyStr(m.id) || !isNonEmptyStr(m.teamAId) || !isNonEmptyStr(m.teamBId)) {
      return {
        valid: false,
        error: 'Invalid match record in backup (missing id, teamAId, or teamBId).',
      };
    }
  }

  for (const b of obj.ballEvents as Record<string, unknown>[]) {
    if (!b || !isNonEmptyStr(b.id) || !isNonEmptyStr(b.matchId) || typeof b.sequence !== 'number') {
      return {
        valid: false,
        error: 'Invalid ballEvent record in backup (missing id, matchId, or sequence).',
      };
    }
  }

  for (const tr of obj.tournaments as Record<string, unknown>[]) {
    if (!tr || !isNonEmptyStr(tr.id) || !isNonEmptyStr(tr.name)) {
      return {
        valid: false,
        error: 'Invalid tournament record in backup (missing id or name).',
      };
    }
  }

  const upgraded = upgradeBackupPayloadToLatest(obj as unknown as CricsBackupPayload);
  return { valid: true, payload: upgraded };
}

export interface CollectionDiffSummary {
  newCount: number;
  changedCount: number;
  unchangedCount: number;
  conflictIds: string[];
}

export interface BackupDiffReport {
  players: CollectionDiffSummary;
  teams: CollectionDiffSummary;
  matches: CollectionDiffSummary;
  ballEvents: CollectionDiffSummary;
  tournaments: CollectionDiffSummary;
  totalNew: number;
  totalChanged: number;
  totalUnchanged: number;
}

function diffCollection<T extends { id: string }>(
  existing: T[],
  incoming: T[]
): CollectionDiffSummary {
  const existingMap = new Map<string, string>();
  for (const item of existing) {
    existingMap.set(item.id, JSON.stringify(item));
  }

  let newCount = 0;
  let changedCount = 0;
  let unchangedCount = 0;
  const conflictIds: string[] = [];

  for (const item of incoming) {
    const existingJson = existingMap.get(item.id);
    if (existingJson === undefined) {
      newCount += 1;
    } else if (existingJson === JSON.stringify(item)) {
      unchangedCount += 1;
    } else {
      changedCount += 1;
      conflictIds.push(item.id);
    }
  }

  return { newCount, changedCount, unchangedCount, conflictIds };
}

export async function analyzeBackupDiff(
  payload: CricsBackupPayload
): Promise<BackupDiffReport> {
  const [players, teams, matches, ballEvents, tournaments] = await Promise.all([
    db.players.toArray(),
    db.teams.toArray(),
    db.matches.toArray(),
    db.ballEvents.toArray(),
    db.tournaments.toArray(),
  ]);

  const strippedIncomingPlayers = (payload.players || []).map((p) => {
    const copy = { ...p };
    delete copy.photoDataUrl;
    return copy;
  });

  const pDiff = diffCollection(players, strippedIncomingPlayers);
  const tDiff = diffCollection(teams, payload.teams || []);
  const mDiff = diffCollection(matches, payload.matches || []);
  const bDiff = diffCollection(ballEvents, payload.ballEvents || []);
  const trDiff = diffCollection(tournaments, payload.tournaments || []);

  return {
    players: pDiff,
    teams: tDiff,
    matches: mDiff,
    ballEvents: bDiff,
    tournaments: trDiff,
    totalNew:
      pDiff.newCount +
      tDiff.newCount +
      mDiff.newCount +
      bDiff.newCount +
      trDiff.newCount,
    totalChanged:
      pDiff.changedCount +
      tDiff.changedCount +
      mDiff.changedCount +
      bDiff.changedCount +
      trDiff.changedCount,
    totalUnchanged:
      pDiff.unchangedCount +
      tDiff.unchangedCount +
      mDiff.unchangedCount +
      bDiff.unchangedCount +
      trDiff.unchangedCount,
  };
}

export async function exportDatabaseToJson(options?: {
  includePin?: boolean;
}): Promise<CricsBackupPayload> {
  const [players, photos, teams, matches, ballEvents, tournaments, settings] =
    await Promise.all([
      db.players.toArray(),
      db.playerPhotos.toArray(),
      db.teams.toArray(),
      db.matches.toArray(),
      db.ballEvents.toArray(),
      db.tournaments.toArray(),
      db.settings.toArray(),
    ]);

  const photosMap = new Map<string, Blob>();
  for (const ph of photos) {
    photosMap.set(ph.playerId, ph.blob);
  }

  const playersWithEmbeddedPhotos: Player[] = await Promise.all(
    players.map(async (p) => {
      const blob = photosMap.get(p.id);
      if (!blob) return p;
      const dataUrl = await blobToDataUrl(blob);
      return {
        ...p,
        photoDataUrl: dataUrl,
      };
    })
  );

  const sanitizedSettings: AppSettingsRecord[] = settings.map((s) => {
    if (options?.includePin) {
      return { ...s };
    }
    const copy: AppSettingsRecord = { ...s };
    delete copy.scorerPinSalt;
    delete copy.scorerPinHash;
    delete copy.isScoringLocked;
    return copy;
  });

  return {
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    app: 'CRICS',
    players: playersWithEmbeddedPhotos,
    teams,
    matches,
    ballEvents,
    tournaments,
    settings: sanitizedSettings,
  };
}

export async function markBackupSavedSuccess(): Promise<AppSettingsRecord | undefined> {
  const currentSetting = await db.settings.get('singleton');
  if (!currentSetting) return undefined;
  const updated: AppSettingsRecord = {
    ...currentSetting,
    matchesSinceLastBackup: 0,
    lastBackupTimestamp: Date.now(),
  };
  await db.settings.put(updated);
  return updated;
}

export type MergeConflictPolicy = 'keep-mine' | 'keep-imported' | 'keep-both';

function resolveMergeRecords<T extends { id: string }>(
  existing: T[],
  incoming: T[],
  conflictPolicy: MergeConflictPolicy,
  idPrefix: string
): T[] {
  const existingJsonMap = new Map<string, string>();
  for (const item of existing) existingJsonMap.set(item.id, JSON.stringify(item));

  const toWrite: T[] = [];
  let suffixCounter = 1;

  for (const item of incoming) {
    const existingJson = existingJsonMap.get(item.id);
    if (existingJson === undefined) {
      toWrite.push(item);
    } else if (existingJson === JSON.stringify(item)) {
      // Unchanged
    } else if (conflictPolicy === 'keep-imported') {
      toWrite.push(item);
    } else if (conflictPolicy === 'keep-both') {
      toWrite.push({ ...item, id: `${idPrefix}-${Date.now()}-DUP${suffixCounter++}` });
    }
  }
  return toWrite;
}

export async function importDatabaseFromJson(
  rawPayload: CricsBackupPayload,
  mode: 'replace' | 'merge',
  conflictPolicy: MergeConflictPolicy = 'keep-imported'
): Promise<void> {
  const payload = upgradeBackupPayloadToLatest(rawPayload);

  await db.transaction(
    'rw',
    [db.players, db.playerPhotos, db.teams, db.matches, db.ballEvents, db.tournaments, db.settings],
    async () => {
      const incomingPhotoBlobs = new Map<string, Blob>();
      const cleanIncomingPlayers: Player[] = (payload.players || []).map((p) => {
        const copy: Player = { ...p };
        if (copy.photoDataUrl) {
          incomingPhotoBlobs.set(copy.id, dataUrlToBlob(copy.photoDataUrl));
          delete copy.photoDataUrl;
          copy.hasPhoto = true;
        }
        return copy;
      });

      if (mode === 'replace') {
        await Promise.all([
          db.players.clear(), db.playerPhotos.clear(), db.teams.clear(),
          db.matches.clear(), db.ballEvents.clear(), db.tournaments.clear(),
        ]);

        if (cleanIncomingPlayers.length) await db.players.bulkPut(cleanIncomingPlayers);
        for (const [playerId, blob] of incomingPhotoBlobs.entries()) {
          await db.playerPhotos.put({ playerId, blob, mimeType: blob.type || 'image/jpeg', updatedAt: Date.now() });
        }
        if (payload.teams?.length) await db.teams.bulkPut(payload.teams);
        if (payload.matches?.length) await db.matches.bulkPut(payload.matches);
        if (payload.ballEvents?.length) await db.ballEvents.bulkPut(payload.ballEvents);
        if (payload.tournaments?.length) await db.tournaments.bulkPut(payload.tournaments);
        if (payload.settings?.length) await db.settings.bulkPut(payload.settings);
        return;
      }

      const [exPlayers, exTeams, exMatches, exEvents, exTournaments] = await Promise.all([
        db.players.toArray(), db.teams.toArray(), db.matches.toArray(),
        db.ballEvents.toArray(), db.tournaments.toArray(),
      ]);

      const playersToPut = resolveMergeRecords(exPlayers, cleanIncomingPlayers, conflictPolicy, 'CRICS-PLR-99');
      const teamsToPut = resolveMergeRecords(exTeams, payload.teams || [], conflictPolicy, 'TEAM');
      const matchesToPut = resolveMergeRecords(exMatches, payload.matches || [], conflictPolicy, 'MATCH');
      const eventsToPut = resolveMergeRecords(exEvents, payload.ballEvents || [], conflictPolicy, 'BALL');
      const tournamentsToPut = resolveMergeRecords(exTournaments, payload.tournaments || [], conflictPolicy, 'TOUR');

      if (playersToPut.length) await db.players.bulkPut(playersToPut);
      for (const p of playersToPut) {
        const blob = incomingPhotoBlobs.get(p.id);
        if (blob) {
          await db.playerPhotos.put({ playerId: p.id, blob, mimeType: blob.type || 'image/jpeg', updatedAt: Date.now() });
        }
      }
      if (teamsToPut.length) await db.teams.bulkPut(teamsToPut);
      if (matchesToPut.length) await db.matches.bulkPut(matchesToPut);
      if (eventsToPut.length) await db.ballEvents.bulkPut(eventsToPut);
      if (tournamentsToPut.length) await db.tournaments.bulkPut(tournamentsToPut);
    }
  );
  await rebuildCareerStatsCache();
}
