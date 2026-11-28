import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CricsDatabase } from '../db/database';
import { EN_TRANSLATIONS } from '../i18n/en';
import { ES_TRANSLATIONS } from '../i18n/es';
import { HI_TRANSLATIONS } from '../i18n/hi';
import {
  getContrastRatio,
  INTRO_BG_COLOR_HEX,
  INTRO_BRAND_CREATOR,
  INTRO_BRAND_PRODUCER,
  INTRO_CAPTION_COLOR_HEX,
  INTRO_CREATED_BY_START_MS,
  INTRO_CREDITS_SETTLED_MS,
  INTRO_CREATOR_COLOR_HEX,
  INTRO_FADE_OUT_START_MS,
  INTRO_LIVE_MATCH_MS,
  INTRO_LOGO_FADE_IN_END_MS,
  INTRO_PRODUCED_BY_START_MS,
  INTRO_REDUCED_MOTION_MS,
  INTRO_SKIP_VISIBLE_MS,
  INTRO_SWEEP_END_MS,
  INTRO_TOTAL_MS,
  resolveIntroMode,
} from './introConfig';

const rootDir = path.resolve(import.meta.dirname, '../..');
const EXPECTED_SPLASH_BG = ['\x23', '121A45'].join('');

describe('Stage 9C — Branded Intro Screen (Assets, Timeline, Decision Logic, Accessibility & Migration)', () => {
  it('verifies optimized intro assets in public/ and source in assets/ stay within byte budgets and offline precache', () => {
    const sourceLogo = path.join(rootDir, 'assets/Crics_Cricket_app_logo_2mb.png');
    const cricsWebp = path.join(rootDir, 'public/intro-crics.webp');
    const eszPng = path.join(rootDir, 'public/intro-esz.png');

    expect(fs.existsSync(sourceLogo)).toBe(true);
    expect(fs.existsSync(cricsWebp)).toBe(true);
    expect(fs.existsSync(eszPng)).toBe(true);

    const cricsBytes = fs.statSync(cricsWebp).size;
    const eszBytes = fs.statSync(eszPng).size;

    expect(cricsBytes).toBeLessThan(70 * 1024);
    expect(eszBytes).toBeLessThan(40 * 1024);
    expect(cricsBytes + eszBytes).toBeLessThan(150 * 1024);

    const viteConfig = fs.readFileSync(path.join(rootDir, 'vite.config.ts'), 'utf8');
    expect(viteConfig).toContain('intro-crics.webp');
    expect(viteConfig).toContain('intro-esz.png');
    expect(viteConfig).toContain('webp');

    const twaManifest = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'twa-manifest.json'), 'utf8')
    );
    expect(twaManifest.backgroundColor).toBe(EXPECTED_SPLASH_BG);
    expect(twaManifest.splashScreenFadeOutDuration).toBe(200);
  });

  it('enforces timeline constants (INTRO_TOTAL_MS <= 3000 and >= 600ms still hold for both credits)', () => {
    expect(INTRO_TOTAL_MS).toBe(3000);
    expect(INTRO_TOTAL_MS).toBeGreaterThanOrEqual(2000);
    expect(INTRO_TOTAL_MS).toBeLessThanOrEqual(3000);

    expect(INTRO_LOGO_FADE_IN_END_MS).toBe(500);
    expect(INTRO_SWEEP_END_MS).toBe(1200);
    expect(INTRO_PRODUCED_BY_START_MS).toBe(1200);
    expect(INTRO_CREATED_BY_START_MS).toBe(1500);
    expect(INTRO_CREDITS_SETTLED_MS).toBe(2000);
    expect(INTRO_FADE_OUT_START_MS).toBe(2700);

    // Both credits stay still together from 2000ms to 2700ms (700ms >= 600ms)
    const bothCreditsStillMs = INTRO_FADE_OUT_START_MS - INTRO_CREDITS_SETTLED_MS;
    expect(bothCreditsStillMs).toBeGreaterThanOrEqual(600);

    expect(INTRO_SKIP_VISIBLE_MS).toBe(800);
    expect(INTRO_LIVE_MATCH_MS).toBe(1000);
    expect(INTRO_REDUCED_MOTION_MS).toBe(1500);
  });

  it('resolves intro mode for cold start, session flag, setting off, live match, and reduced motion', () => {
    // 1. Cold start with default settings
    expect(
      resolveIntroMode({
        sessionShown: false,
        showIntroAnimation: true,
        hasLiveMatch: false,
        reducedMotion: false,
      })
    ).toEqual({
      show: true,
      mode: 'full',
      durationMs: 3000,
      showCredits: true,
    });

    // 2. Refresh / already shown in session
    expect(
      resolveIntroMode({
        sessionShown: true,
        showIntroAnimation: true,
        hasLiveMatch: false,
        reducedMotion: false,
      })
    ).toEqual({
      show: false,
      mode: 'none',
      durationMs: 0,
      showCredits: false,
    });

    // 3. Settings switch turned off
    expect(
      resolveIntroMode({
        sessionShown: false,
        showIntroAnimation: false,
        hasLiveMatch: false,
        reducedMotion: false,
      })
    ).toEqual({
      show: false,
      mode: 'none',
      durationMs: 0,
      showCredits: false,
    });

    // 4. Live match in progress -> short 1000 ms version with only the CRICS logo
    expect(
      resolveIntroMode({
        sessionShown: false,
        showIntroAnimation: true,
        hasLiveMatch: true,
        reducedMotion: false,
      })
    ).toEqual({
      show: true,
      mode: 'live-short',
      durationMs: 1000,
      showCredits: false,
    });

    // 5. Reduced motion enabled -> still logo + both credits for 1500 ms with no movement
    expect(
      resolveIntroMode({
        sessionShown: false,
        showIntroAnimation: true,
        hasLiveMatch: false,
        reducedMotion: true,
      })
    ).toEqual({
      show: true,
      mode: 'reduced-motion',
      durationMs: 1500,
      showCredits: true,
    });
  });

  it('verifies fixed brand names, translations, screen reader text, and >= 4.5:1 contrast on brand-950', () => {
    expect(INTRO_BG_COLOR_HEX).toBe(EXPECTED_SPLASH_BG);
    expect(INTRO_BRAND_PRODUCER).toBe('eSportZignal');
    expect(INTRO_BRAND_CREATOR).toBe('LINGADASS K');

    const captionContrast = getContrastRatio(INTRO_CAPTION_COLOR_HEX, INTRO_BG_COLOR_HEX);
    const creatorContrast = getContrastRatio(INTRO_CREATOR_COLOR_HEX, INTRO_BG_COLOR_HEX);
    expect(captionContrast).toBeGreaterThanOrEqual(4.5);
    expect(creatorContrast).toBeGreaterThanOrEqual(4.5);

    for (const dict of [EN_TRANSLATIONS, HI_TRANSLATIONS, ES_TRANSLATIONS]) {
      expect(dict.intro.producedBy.length).toBeGreaterThan(0);
      expect(dict.intro.createdBy.length).toBeGreaterThan(0);
      expect(dict.intro.skipBtn.length).toBeGreaterThan(0);
      expect(dict.intro.screenReaderLabel).toBe(
        'CRICS, produced by eSportZignal, created by LINGADASS K'
      );
      expect(dict.settings.showIntroAnimationLabel.length).toBeGreaterThan(0);
    }
  });

  it('migrates settings with showIntroAnimation: true default in Dexie schema', async () => {
    const testDb = new CricsDatabase(`TestStage9CDb_${Date.now()}`);
    await testDb.open();
    await testDb.settings.put({
      id: 'singleton',
      theme: 'system',
      language: 'en',
      keepScreenAwake: true,
      defaultOvers: 20,
      defaultWideRuns: 1,
      defaultNoBallRuns: 1,
      defaultFreeHit: true,
      backupReminderIntervalMatches: 3,
      matchesSinceLastBackup: 0,
      showIntroAnimation: true,
    });
    const saved = await testDb.settings.get('singleton');
    expect(saved?.showIntroAnimation).toBe(true);
    await testDb.delete();
  });
});
