import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CricsDatabase,
  db,
  exportDatabaseToJson,
  importDatabaseFromJson,
  validateBackupFileSize,
  validateBackupPayload,
} from '../db/database';
import { useCricsStore } from '../store/useCricsStore';
import { getLocalDateString, getLocalYearString } from './dateUtils';
import { shouldShowSwUpdateBanner } from './pwaUtils';

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, acc);
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx')
    ) {
      acc.push(fullPath);
    }
  }
  return acc;
}

describe('Stage 1: Bug Fixes & Repository Hygiene', () => {
  const rootDir = path.resolve(__dirname, '../..');

  beforeEach(async () => {
    await db.transaction(
      'rw',
      [
        db.players,
        db.playerPhotos,
        db.teams,
        db.matches,
        db.ballEvents,
        db.tournaments,
        db.settings,
      ],
      async () => {
        await Promise.all([
          db.players.clear(),
          db.playerPhotos.clear(),
          db.teams.clear(),
          db.matches.clear(),
          db.ballEvents.clear(),
          db.tournaments.clear(),
          db.settings.clear(),
        ]);
      }
    );
  });

  it('1. getLocalDateString & getLocalYearString respect explicit Asia/Kolkata and Pacific/Auckland timeZone at 01:00 local time and dateUtils has no process.env.TZ branch', () => {
    // 2026-11-13T19:30:00Z is 2026-11-14 01:00:00 in Asia/Kolkata (+05:30)
    const kolkataOneAm = new Date('2026-11-13T19:30:00.000Z');
    expect(kolkataOneAm.toISOString().slice(0, 10)).toBe('2026-11-13');
    expect(getLocalDateString(kolkataOneAm, 'Asia/Kolkata')).toBe('2026-11-14');
    expect(getLocalYearString(kolkataOneAm, 'Asia/Kolkata')).toBe('2026');

    // 2026-12-31T12:00:00Z is 2027-01-01 01:00:00 in Pacific/Auckland (+13:00 NZDT)
    const aucklandOneAm = new Date('2026-12-31T12:00:00.000Z');
    expect(aucklandOneAm.toISOString().slice(0, 10)).toBe('2026-12-31');
    expect(getLocalDateString(aucklandOneAm, 'Pacific/Auckland')).toBe('2027-01-01');
    expect(getLocalYearString(aucklandOneAm, 'Pacific/Auckland')).toBe('2027');

    const dateUtilsSrc = fs.readFileSync(path.join(rootDir, 'src/utils/dateUtils.ts'), 'utf8');
    expect(dateUtilsSrc).not.toContain('process.env.TZ');

    const srcFiles = collectSourceFiles(path.join(rootDir, 'src'));
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(
        content,
        `${path.relative(rootDir, file)} must not use .toISOString().slice(0, 10)`
      ).not.toContain('.toISOString().slice(0, 10)');
    }
  });

  it('2. shouldShowSwUpdateBanner allows update prompts off the live screen when no scoring action happened in the last 10 minutes even if an old match is marked live', () => {
    const now = 1_700_000_000_000;
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const elevenMinutesAgo = now - 11 * 60 * 1000;

    // Never show on the live scoring screen
    expect(
      shouldShowSwUpdateBanner({
        swUpdateAvailable: true,
        activeTab: 'live',
        hasLiveMatch: true,
        lastScoringActionTimestamp: elevenMinutesAgo,
        now,
      })
    ).toBe(false);

    // Suppress when a scoring action happened 5 minutes ago (< 10 min)
    expect(
      shouldShowSwUpdateBanner({
        swUpdateAvailable: true,
        activeTab: 'home',
        hasLiveMatch: true,
        lastScoringActionTimestamp: fiveMinutesAgo,
        now,
      })
    ).toBe(false);

    // Show when not on live screen and last scoring action was 11 minutes ago (>= 10 min), even if hasLiveMatch is true
    expect(
      shouldShowSwUpdateBanner({
        swUpdateAvailable: true,
        activeTab: 'home',
        hasLiveMatch: true,
        lastScoringActionTimestamp: elevenMinutesAgo,
        now,
      })
    ).toBe(true);

    // Show when not on live screen and no scoring action timestamp exists, even if an old match is marked live
    expect(
      shouldShowSwUpdateBanner({
        swUpdateAvailable: true,
        activeTab: 'settings',
        hasLiveMatch: true,
        lastScoringActionTimestamp: undefined,
        now,
      })
    ).toBe(true);
  });

  it('3. persists scoring lock across page refresh when a PIN exists and excludes PIN hash/salt from backups by default', async () => {
    await useCricsStore.getState().initApp();
    await useCricsStore.getState().setScorerPin('2468');
    await useCricsStore.getState().setScoringLocked(true);

    const savedSetting = await db.settings.get('singleton');
    expect(savedSetting?.isScoringLocked).toBe(true);
    expect(savedSetting?.scorerPinHash).toBeTruthy();

    // Simulate page refresh by resetting in-memory store state to unlocked, then running initApp()
    useCricsStore.setState({ isInitialized: false, isScoringLocked: false });
    await useCricsStore.getState().initApp();
    expect(useCricsStore.getState().isScoringLocked).toBe(true);

    // Default backup export excludes PIN hash, salt, and lock state
    const defaultBackup = await exportDatabaseToJson();
    expect(defaultBackup.settings[0]?.scorerPinHash).toBeUndefined();
    expect(defaultBackup.settings[0]?.scorerPinSalt).toBeUndefined();

    // Explicit opt-in includes PIN hash and salt
    const backupWithPin = await exportDatabaseToJson({ includePin: true });
    expect(backupWithPin.settings[0]?.scorerPinHash).toBeTruthy();
    expect(backupWithPin.settings[0]?.scorerPinSalt).toBeTruthy();

    // Verify Dexie v3 -> v4 upgrade normalizes isScoringLocked based on PIN presence
    const migDbName = `CricsV4MigTest_${Date.now()}`;
    const v3Db = new Dexie(migDbName);
    v3Db.version(3).stores({
      players: 'id',
      playerPhotos: 'playerId',
      teams: 'id',
      matches: 'id',
      ballEvents: 'id',
      tournaments: 'id',
      settings: 'id',
    });
    await v3Db.open();
    await v3Db.table('settings').put({
      id: 'singleton',
      theme: 'dark',
      language: 'en',
      keepScreenAwake: true,
      defaultOvers: 20,
      defaultWideRuns: 1,
      defaultNoBallRuns: 1,
      defaultFreeHit: true,
      backupReminderIntervalMatches: 3,
      matchesSinceLastBackup: 0,
      isScoringLocked: true, // No PIN present, v4 upgrade should reset to false
    });
    v3Db.close();

    const upgradedV4Db = new CricsDatabase(migDbName);
    await upgradedV4Db.open();
    const migratedSettings = await upgradedV4Db.settings.get('singleton');
    expect(migratedSettings?.isScoringLocked).toBe(false);
    upgradedV4Db.close();
    await Dexie.delete(migDbName);

    // Old v2 backup without isScoringLocked still imports cleanly
    const legacyV2Backup = {
      schemaVersion: 2 as const,
      exportedAt: '2025-05-01T00:00:00.000Z',
      app: 'CRICS' as const,
      players: [],
      teams: [],
      matches: [],
      ballEvents: [],
      tournaments: [],
      settings: [
        {
          id: 'singleton',
          theme: 'light' as const,
          language: 'en' as const,
          keepScreenAwake: true,
          defaultOvers: 20,
          defaultWideRuns: 1,
          defaultNoBallRuns: 1,
          defaultFreeHit: true,
          backupReminderIntervalMatches: 3,
          matchesSinceLastBackup: 0,
        },
      ],
    };
    const validatedLegacy = validateBackupPayload(JSON.stringify(legacyV2Backup));
    expect(validatedLegacy.valid).toBe(true);
    await importDatabaseFromJson(validatedLegacy.payload!, 'replace');
    const importedSettings = await db.settings.get('singleton');
    expect(importedSettings?.theme).toBe('light');
  });

  it('4. checks backup size in bytes before reading file and measures UTF-8 byte length in validateBackupPayload', () => {
    const preCheckTooLarge = validateBackupFileSize(26 * 1024 * 1024, 25 * 1024 * 1024);
    expect(preCheckTooLarge.valid).toBe(false);
    expect(preCheckTooLarge.error).toContain('exceeds maximum allowed size');

    const preCheckOk = validateBackupFileSize(1024, 25 * 1024 * 1024);
    expect(preCheckOk.valid).toBe(true);

    // Multi-byte UTF-8 characters: 40 characters of 3-byte Devanagari = 120 bytes (> 100 byte limit)
    const multiByteString = '{"name":"' + 'अ'.repeat(40) + '"}';
    expect(multiByteString.length).toBeLessThan(100);
    const payloadByteCheck = validateBackupPayload(multiByteString, 100);
    expect(payloadByteCheck.valid).toBe(false);
    expect(payloadByteCheck.error).toContain('exceeds maximum allowed size');
  });

  it('5. removes leftover files and moves e2eAudit.ts out of src into tests/e2eAudit.ts', () => {
    expect(fs.existsSync(path.join(rootDir, '.env.example'))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, 'metadata.json'))).toBe(false);
    expect(
      fs.existsSync(path.join(rootDir, 'src/components/PlayersAndTeamsView.tsx'))
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(rootDir, 'src/components/TournamentsAndSettingsView.tsx')
      )
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(rootDir, 'src/components/CareersAndLeaderboardsView.tsx')
      )
    ).toBe(false);
    expect(fs.existsSync(path.join(rootDir, 'src/utils/e2eAudit.ts'))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, 'tests/e2eAudit.ts'))).toBe(true);
  });
});
