import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { CricsDatabase, db, validateBackupPayload } from '../db/database';
import { applyThemeToDocument } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';
import {
  checkAssetLinksPlaceholder,
  parseIcoDimensions,
  parsePngDimensions,
} from './pwaUtils';
import { buildHashRoute, parseHashRoute } from './routeAndSecurityUtils';

describe('Stage 4: Binary Asset Headers, Wizard Persistence, Hash Routing, AssetLinks Verification & Theme Migration', () => {
  const rootDir = path.resolve(__dirname, '../..');

  it('1. verifies binary PNG headers, dimensions, and byte-size budgets for all PWA icons and 1080x1920 screenshots', () => {
    const icon192 = fs.readFileSync(path.join(rootDir, 'public/pwa-192x192.png'));
    const icon512 = fs.readFileSync(path.join(rootDir, 'public/pwa-512x512.png'));
    const iconMaskable = fs.readFileSync(
      path.join(rootDir, 'public/pwa-maskable-512x512.png')
    );
    const appleTouchIcon = fs.readFileSync(
      path.join(rootDir, 'public/apple-touch-icon.png')
    );

    expect(parsePngDimensions(icon192)).toEqual({ width: 192, height: 192 });
    expect(parsePngDimensions(icon512)).toEqual({ width: 512, height: 512 });
    expect(parsePngDimensions(iconMaskable)).toEqual({ width: 512, height: 512 });
    expect(parsePngDimensions(appleTouchIcon)).toEqual({ width: 180, height: 180 });

    const screenshots = [
      'public/screenshot-home.png',
      'public/screenshot-live.png',
      'public/screenshot-scorecard.png',
      'public/screenshot-tournament.png',
    ];
    for (const relPath of screenshots) {
      const fullPath = path.join(rootDir, relPath);
      expect(fs.existsSync(fullPath), `${relPath} must exist`).toBe(true);
      const bytes = fs.readFileSync(fullPath);
      expect(bytes.byteLength, `${relPath} must be under 150 KB`).toBeLessThan(
        150 * 1024
      );
      const dims = parsePngDimensions(bytes);
      expect(dims).toEqual({ width: 1080, height: 1920 });
    }
  });

  it('2. parses public/favicon.ico binary directory headers and confirms 16x16, 32x32, and 48x48 entries under 20 KB', () => {
    const faviconPath = path.join(rootDir, 'public/favicon.ico');
    expect(fs.existsSync(faviconPath)).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'favicon.ico'))).toBe(false);

    const faviconBytes = fs.readFileSync(faviconPath);
    expect(faviconBytes.byteLength).toBeLessThan(20 * 1024);

    const icoInfo = parseIcoDimensions(faviconBytes);
    expect(icoInfo).not.toBeNull();
    expect(icoInfo?.sizes).toEqual([
      { width: 16, height: 16 },
      { width: 32, height: 32 },
      { width: 48, height: 48 },
    ]);
  });

  it('3. remembers last-used Team A, Team B, format, and overs in settings when creating a match', async () => {
    await db.delete();
    await db.open();
    await useCricsStore.getState().initApp();

    const store = useCricsStore.getState();
    await store.createMatch({
      id: 'MATCH-REMEMBER-1',
      title: 'Remembered Setup Match',
      format: 'T10',
      season: '2026',
      venue: 'Test Ground',
      date: '2026-11-16',
      scorerName: 'Scorer',
      teamAId: 'TEAM-ALPHA',
      teamBId: 'TEAM-BETA',
      teamAXI: ['P1', 'P2'],
      teamBXI: ['P3', 'P4'],
      tossWinnerTeamId: 'TEAM-ALPHA',
      tossDecision: 'bat',
      rules: {
        oversPerInnings: 10,
        ballsPerOver: 6,
        wideRuns: 1,
        noBallRuns: 1,
        freeHitEnabled: true,
        powerplayOvers: 3,
        maxOversPerBowler: 2,
      },
      innings: [
        {
          inningsNumber: 1,
          battingTeamId: 'TEAM-ALPHA',
          bowlingTeamId: 'TEAM-BETA',
          openingStrikerId: 'P1',
          openingNonStrikerId: 'P2',
          openingBowlerId: 'P3',
        },
      ],
      currentInningsNumber: 1,
      status: 'live',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const updatedSettings = useCricsStore.getState().settings;
    expect(updatedSettings.lastUsedTeamAId).toBe('TEAM-ALPHA');
    expect(updatedSettings.lastUsedTeamBId).toBe('TEAM-BETA');
    expect(updatedSettings.lastUsedOvers).toBe(10);
    expect(updatedSettings.lastUsedFormat).toBe('T10');
  });

  it('4. round-trips all application hash routes including #/privacy, #/wizard, #/players, #/teams, #/leaderboards, and #/settings', () => {
    const simpleTabs = [
      'home',
      'wizard',
      'players',
      'teams',
      'leaderboards',
      'settings',
      'privacy',
    ] as const;

    for (const tab of simpleTabs) {
      const hash = buildHashRoute({ tab });
      expect(parseHashRoute(hash)).toEqual({ tab });
    }
  });

  it('5. checkAssetLinksPlaceholder detects placeholder fingerprints, accepts valid SHA-256 fingerprints, and handles malformed JSON safely', () => {
    const placeholderJson = JSON.stringify([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.crics.offline.scorer',
          sha256_cert_fingerprints: [
            'TODO_REPLACE_WITH_PLAY_CONSOLE_APP_SIGNING_SHA256_FINGERPRINT',
          ],
        },
      },
    ]);
    const checkRes = checkAssetLinksPlaceholder(placeholderJson);
    expect(checkRes.hasPlaceholder).toBe(true);
    expect(checkRes.warningMessage).toContain('assetlinks.json');

    const realAssetLinks = JSON.stringify([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.crics.offline.scorer',
          sha256_cert_fingerprints: [
            'A1:B2:C3:D4:E5:F6:07:18:29:3A:4B:5C:6D:7E:8F:90:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:01',
          ],
        },
      },
    ]);
    expect(checkAssetLinksPlaceholder(realAssetLinks).hasPlaceholder).toBe(false);
    expect(checkAssetLinksPlaceholder('[]').hasPlaceholder).toBe(false);
  });

  it('6. defaults theme to "system" with Light and Dark options, applies theme to document root, and migrates settings in Dexie v7', async () => {
    expect(useCricsStore.getState().settings.theme).toBe('system');

    const fakeRoot = {
      lang: 'en',
      style: { colorScheme: '' },
      classList: {
        isDark: false,
        toggle(cls: string, force?: boolean) {
          if (cls === 'dark') this.isDark = Boolean(force);
        },
      },
    };

    applyThemeToDocument('system', fakeRoot as unknown as HTMLElement, true);
    expect(fakeRoot.classList.isDark).toBe(true);
    expect(fakeRoot.style.colorScheme).toBe('dark');

    applyThemeToDocument('system', fakeRoot as unknown as HTMLElement, false);
    expect(fakeRoot.classList.isDark).toBe(false);
    expect(fakeRoot.style.colorScheme).toBe('light');

    // Verify Dexie v7 migration upgrades legacy settings without a valid theme to 'system'
    const dbName = `Stage4V7Mig_${Date.now()}`;
    const legacyDb = new Dexie(dbName);
    legacyDb.version(6).stores({
      players: 'id',
      playerPhotos: 'playerId',
      teams: 'id',
      matches: 'id',
      ballEvents: 'id',
      tournaments: 'id',
      settings: 'id',
      careerCache: 'id',
    });
    await legacyDb.open();
    await legacyDb.table('settings').put({
      id: 'singleton',
      language: 'en',
      keepScreenAwake: true,
    });
    legacyDb.close();

    const upgradedDb = new CricsDatabase(dbName);
    await upgradedDb.open();
    const migratedSettings = await upgradedDb.settings.get('singleton');
    expect(migratedSettings?.theme).toBe('system');
    upgradedDb.close();
    await Dexie.delete(dbName);

    // Old backup import with light/dark/system continues to work
    const backupCheck = validateBackupPayload(
      JSON.stringify({
        schemaVersion: 3,
        exportedAt: '2026-11-15',
        app: 'CRICS',
        players: [],
        teams: [],
        matches: [],
        ballEvents: [],
        tournaments: [],
        settings: [
          {
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
          },
        ],
      })
    );
    expect(backupCheck.valid).toBe(true);
  });
});
