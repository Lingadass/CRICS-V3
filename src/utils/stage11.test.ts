import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  db,
  importDatabaseFromJson,
  validateBackupPayload,
} from '../db/database';
import { EN_TRANSLATIONS } from '../i18n/en';
import { ES_TRANSLATIONS } from '../i18n/es';
import { HI_TRANSLATIONS } from '../i18n/hi';
import {
  formatTournamentGroupLabel,
  normalizeTournamentGroupKey,
  normalizeTournamentRecordGroups,
} from './tournamentGroupUtils';

const rootDir = path.resolve(import.meta.dirname, '../..');

describe('Stage 11 — Precache Verification, Pre-v11 Backup Group Migration & Dedicated Tournament Helper File', () => {
  it('1. hosts tournament group helpers in src/utils/tournamentGroupUtils.ts and keeps dateUtils.ts focused purely on dates', () => {
    expect(typeof normalizeTournamentGroupKey).toBe('function');
    expect(typeof normalizeTournamentRecordGroups).toBe('function');
    expect(typeof formatTournamentGroupLabel).toBe('function');

    expect(formatTournamentGroupLabel('Group A', EN_TRANSLATIONS)).toBe('Group A');
    expect(formatTournamentGroupLabel('Group A', HI_TRANSLATIONS)).toBe('ग्रुप A');
    expect(formatTournamentGroupLabel('Group B', ES_TRANSLATIONS)).toBe('Grupo B');

    const dateUtilsSrc = fs.readFileSync(
      path.join(rootDir, 'src/utils/dateUtils.ts'),
      'utf8'
    );
    expect(dateUtilsSrc).not.toContain('formatTournamentGroupLabel');
    expect(dateUtilsSrc).not.toContain('normalizeTournamentGroupKey');
    expect(dateUtilsSrc).not.toContain('getCurrentTimestampMs');
  });

  it('2. converts "Group A" and "Group B" in teamGroups and fixture roundName when importing a saved pre-v11 backup file from tests/fixtures/pre-v11-backup.json', async () => {
    const backupFilePath = path.join(rootDir, 'tests/fixtures/pre-v11-backup.json');
    expect(fs.existsSync(backupFilePath)).toBe(true);

    const rawJson = fs.readFileSync(backupFilePath, 'utf8');
    expect(rawJson).toContain('"Group A"');
    expect(rawJson).toContain('"Group B"');

    const validation = validateBackupPayload(rawJson);
    expect(validation.valid).toBe(true);
    expect(validation.payload).toBeDefined();

    // Verify upgraded payload in-memory has neutral keys
    const upgradedTour = validation.payload!.tournaments[0];
    expect(upgradedTour.teamGroups).toEqual({
      'T-OLD-1': 'A',
      'T-OLD-2': 'A',
      'T-OLD-3': 'B',
      'T-OLD-4': 'B',
    });
    expect(upgradedTour.fixtures[0].roundName).toBe('A');
    expect(upgradedTour.fixtures[1].roundName).toBe('B');

    // Also verify importing raw un-upgraded JSON directly via importDatabaseFromJson converts to neutral keys in IndexedDB
    const rawParsed = JSON.parse(rawJson);
    await importDatabaseFromJson(rawParsed, 'replace');

    const storedTour = await db.tournaments.get('TOUR-OLD-PRE-V11');
    expect(storedTour).toBeDefined();
    expect(storedTour?.teamGroups).toEqual({
      'T-OLD-1': 'A',
      'T-OLD-2': 'A',
      'T-OLD-3': 'B',
      'T-OLD-4': 'B',
    });
    expect(storedTour?.fixtures.map((f) => f.roundName)).toEqual(['A', 'B']);
  });

  it('3. verifies Workbox precache (dist/sw.js) has zero duplicate URLs and includes PDF/image export libraries and every lazy-loaded screen chunk', () => {
    const swPath = path.join(rootDir, 'dist/sw.js');
    expect(fs.existsSync(swPath)).toBe(true);
    const swContent = fs.readFileSync(swPath, 'utf8');

    const urlMatches = Array.from(swContent.matchAll(/\{url:"([^"]+)"/g)).map((m) => m[1]);
    expect(urlMatches.length).toBeGreaterThanOrEqual(35);

    // Zero duplicate precache URLs
    const uniqueUrls = new Set(urlMatches);
    expect(uniqueUrls.size).toBe(urlMatches.length);

    // Every lazy-loaded screen chunk and PDF/image export library must be precached
    const requiredPatterns = [
      /^index\.html$/,
      /^assets\/index-.*\.js$/,
      /^assets\/index-.*\.css$/,
      /^assets\/(jspdf\.es\.min|scorecardPdfGenerator)-.*\.js$/,
      /^assets\/html2canvas-.*\.js$/,
      /^assets\/index\.es-.*\.js$/,
      /^assets\/purify\.es-.*\.js$/,
      /^assets\/LineChart-.*\.js$/,
      /^assets\/ScorecardView-.*\.js$/,
      /^assets\/PlayersView-.*\.js$/,
      /^assets\/ScanPassView-.*\.js$/,
      /^assets\/playerQrUtils-.*\.js$/,
      /^assets\/jsQR-.*\.js$/,
      /^assets\/TeamsView-.*\.js$/,
      /^assets\/CareersView-.*\.js$/,
      /^assets\/TournamentsView-.*\.js$/,
      /^assets\/LeaderboardsView-.*\.js$/,
      /^assets\/MatchWizardView-.*\.js$/,
      /^assets\/BackupAndSettingsView-.*\.js$/,
      /^assets\/PrivacyPolicyView-.*\.js$/,
      /^assets\/es-.*\.js$/,
      /^intro-crics\.webp$/,
      /^intro-esz\.png$/,
      /^logo-128\.png$/,
      /^logo-256\.png$/,
      /^pwa-192x192\.png$/,
      /^pwa-512x512\.png$/,
      /^pwa-maskable-512x512\.png$/,
      /^apple-touch-icon\.png$/,
      /^favicon\.ico$/,
      /^icon\.svg$/,
      /^privacy-policy\.html$/,
      /^\.well-known\/assetlinks\.json$/,
      /^manifest\.webmanifest$/,
    ];

    for (const pattern of requiredPatterns) {
      const matched = urlMatches.some((u) => pattern.test(u));
      expect(matched, `Expected precache in dist/sw.js to match ${String(pattern)}`).toBe(true);
    }

    // Unused duplicate intro-esz.webp must not be in precache
    expect(urlMatches).not.toContain('intro-esz.webp');

    // Confirm jsQR is lazy-loaded (not bundled inside the main index-*.js entry chunk)
    const assetsDir = path.join(rootDir, 'dist/assets');
    const mainIndexFile = fs
      .readdirSync(assetsDir)
      .find((name) => /^index-.*\.js$/.test(name));
    expect(mainIndexFile).toBeDefined();
    const mainIndexContent = fs.readFileSync(path.join(assetsDir, mainIndexFile!), 'utf8');
    expect(mainIndexContent).not.toContain('jsQR');
  });
});
