import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CricsDatabase } from '../db/database';
import {
  formatTournamentGroupLabel,
  normalizeTournamentGroupKey,
  normalizeTournamentRecordGroups,
} from '../engine/phase4Helpers';
import { Tournament } from '../engine/types';
import { EN_TRANSLATIONS } from '../i18n/en';
import { ES_TRANSLATIONS } from '../i18n/es';
import { HI_TRANSLATIONS } from '../i18n/hi';
import {
  buildIntroTimelineStyles,
  INTRO_DB_WAIT_MAX_MS,
  INTRO_TOTAL_MS,
} from './introConfig';

const rootDir = path.resolve(import.meta.dirname, '../..');

describe('Stage 10 — Intro Fixes, Single Source of Truth Timing, Asset Cleanup & Neutral Tournament Groups', () => {
  it('1. derives CSS custom properties and keyframe percentages from introConfig.ts constants and updates when constants change', () => {
    expect(INTRO_DB_WAIT_MAX_MS).toBe(400);

    const defaultTimeline = buildIntroTimelineStyles();
    expect(defaultTimeline.totalMs).toBe(INTRO_TOTAL_MS);
    expect(defaultTimeline.logoScaleEndPct).toBe(16.67);
    expect(defaultTimeline.sweepEndPct).toBe(40);
    expect(defaultTimeline.producedByStartPct).toBe(40);
    expect(defaultTimeline.createdByStartPct).toBe(50);
    expect(defaultTimeline.creditsSettledPct).toBe(66.67);
    expect(defaultTimeline.fadeOutStartPct).toBe(90);
    expect(defaultTimeline.cssVariables['--intro-total-ms']).toBe('3000ms');
    expect(defaultTimeline.keyframesCss).toContain('var(--intro-total-ms)');
    expect(defaultTimeline.keyframesCss).toContain('16.67%');
    expect(defaultTimeline.keyframesCss).toContain('66.67%');
    expect(defaultTimeline.keyframesCss).toContain('90%');

    // Change the constant (e.g. totalMs = 2400, logoFadeInEndMs = 600, sweepEndMs = 1200, createdByStartMs = 1500, creditsSettledMs = 1800, fadeOutStartMs = 2160)
    const customTimeline = buildIntroTimelineStyles({
      totalMs: 2400,
      logoFadeInEndMs: 600,
      sweepEndMs: 1200,
      producedByStartMs: 1200,
      createdByStartMs: 1500,
      creditsSettledMs: 1800,
      fadeOutStartMs: 2160,
    });
    expect(customTimeline.logoScaleEndPct).toBe(25);
    expect(customTimeline.sweepEndPct).toBe(50);
    expect(customTimeline.producedByStartPct).toBe(50);
    expect(customTimeline.createdByStartPct).toBe(62.5);
    expect(customTimeline.creditsSettledPct).toBe(75);
    expect(customTimeline.fadeOutStartPct).toBe(90);
    expect(customTimeline.cssVariables['--intro-total-ms']).toBe('2400ms');
    expect(customTimeline.keyframesCss).toContain('--intro-total-ms: 2400ms');
    expect(customTimeline.keyframesCss).toContain('25%');
    expect(customTimeline.keyframesCss).toContain('62.5%');
    expect(customTimeline.keyframesCss).toContain('75%');

    // IntroSplash.tsx must not contain hard-coded 3000ms or keyframe percentages
    const introSplashSrc = fs.readFileSync(
      path.join(rootDir, 'src/components/IntroSplash.tsx'),
      'utf8'
    );
    expect(introSplashSrc).toContain('buildIntroTimelineStyles');
    expect(introSplashSrc).not.toContain('3000ms');
    expect(introSplashSrc).not.toContain('16.67%');
    expect(introSplashSrc).not.toContain('66.67%');
  });

  it('2. ensures handoff continuity (opacity: 1, 160px size, scale(0.92) at 0% matching #initial-intro-splash) and removes unused public/intro-esz.webp', () => {
    const defaultTimeline = buildIntroTimelineStyles();
    // First frame (0%) of React overlay must start at opacity: 1 so the logo never blinks out
    expect(defaultTimeline.keyframesCss).toMatch(
      /@keyframes cricsIntroLogoTimeline\s*\{\s*0%\s*\{\s*opacity:\s*1;/
    );

    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    expect(indexHtml).toContain('width: 160px');
    expect(indexHtml).toContain('height: 160px');
    expect(indexHtml).toContain('scale(0.92)');

    // public/intro-esz.webp must be removed
    expect(fs.existsSync(path.join(rootDir, 'public/intro-esz.webp'))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, 'public/intro-crics.webp'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'public/intro-esz.png'))).toBe(true);
  });

  it('3. stores tournament group keys as neutral "A" and "B", migrates legacy "Group A"/"Group B" in Dexie, and translates group labels in EN, HI, and ES without English leakage', async () => {
    expect(normalizeTournamentGroupKey('Group A')).toBe('A');
    expect(normalizeTournamentGroupKey('Group B')).toBe('B');
    expect(normalizeTournamentGroupKey('A')).toBe('A');
    expect(normalizeTournamentGroupKey('B')).toBe('B');

    const legacyTour: Tournament = {
      id: 'TOUR-LEG-1',
      name: 'Legacy Cup',
      season: '2026',
      format: 'T20',
      type: 'Groups',
      teamIds: ['T1', 'T2', 'T3', 'T4'],
      teamGroups: {
        T1: 'Group A',
        T2: 'Group A',
        T3: 'Group B',
        T4: 'Group B',
      },
      pointsForWin: 2,
      pointsForTie: 1,
      createdAt: 1000,
      fixtures: [
        {
          id: 'F1',
          tournamentId: 'TOUR-LEG-1',
          roundName: 'Group A',
          stage: 'league',
          teamAId: 'T1',
          teamBId: 'T2',
          date: '2026-11-17',
          venue: 'Main Oval',
        },
        {
          id: 'F2',
          tournamentId: 'TOUR-LEG-1',
          roundName: 'Group B',
          stage: 'league',
          teamAId: 'T3',
          teamBId: 'T4',
          date: '2026-11-17',
          venue: 'Main Oval',
        },
      ],
    };

    const migratedPure = normalizeTournamentRecordGroups(legacyTour);
    expect(migratedPure.teamGroups).toEqual({
      T1: 'A',
      T2: 'A',
      T3: 'B',
      T4: 'B',
    });
    expect(migratedPure.fixtures[0].roundName).toBe('A');
    expect(migratedPure.fixtures[1].roundName).toBe('B');

    // Verify Dexie database migration upgrades legacy "Group A" / "Group B" records
    const dbName = `TestStage10Groups_${Date.now()}`;
    const testDb = new CricsDatabase(dbName);
    await testDb.open();
    await testDb.tournaments.put(normalizeTournamentRecordGroups(legacyTour));
    const saved = await testDb.tournaments.get('TOUR-LEG-1');
    expect(saved?.teamGroups).toEqual({
      T1: 'A',
      T2: 'A',
      T3: 'B',
      T4: 'B',
    });
    expect(saved?.fixtures[0].roundName).toBe('A');
    expect(saved?.fixtures[1].roundName).toBe('B');
    await testDb.delete();

    // Display helper translates 'A' and 'B' into English, Hindi, and Spanish with zero English group labels in HI/ES
    expect(formatTournamentGroupLabel('A', EN_TRANSLATIONS)).toBe('Group A');
    expect(formatTournamentGroupLabel('B', EN_TRANSLATIONS)).toBe('Group B');

    const hiA = formatTournamentGroupLabel('A', HI_TRANSLATIONS);
    const hiB = formatTournamentGroupLabel('B', HI_TRANSLATIONS);
    expect(hiA).toBe('ग्रुप A');
    expect(hiB).toBe('ग्रुप B');
    expect(hiA).not.toContain('Group');
    expect(hiB).not.toContain('Group');

    const esA = formatTournamentGroupLabel('A', ES_TRANSLATIONS);
    const esB = formatTournamentGroupLabel('B', ES_TRANSLATIONS);
    expect(esA).toBe('Grupo A');
    expect(esB).toBe('Grupo B');
    expect(esA).not.toContain('Group ');
    expect(esB).not.toContain('Group ');

    // Component files must not hard-code 'Group A' or 'Group B'
    const tourViewSrc = fs.readFileSync(
      path.join(rootDir, 'src/components/TournamentsView.tsx'),
      'utf8'
    );
    const tourModalsSrc = fs.readFileSync(
      path.join(rootDir, 'src/components/TournamentModals.tsx'),
      'utf8'
    );
    expect(tourViewSrc).not.toContain("'Group A'");
    expect(tourViewSrc).not.toContain("'Group B'");
    expect(tourModalsSrc).not.toContain("'Group A'");
    expect(tourModalsSrc).not.toContain("'Group B'");
  });
});
