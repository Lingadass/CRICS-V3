import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/database';
import { runEndToEndOfflineAudit } from '../../tests/e2eAudit';

describe('Phase 7: End-to-End Offline Lifecycle Audit & Production Readiness', () => {
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

  it('1. executes a complete cold-start -> 2-innings match -> scorecard -> career -> backup & restore cycle offline', async () => {
    const report = await runEndToEndOfflineAudit();

    expect(report.coldStartEmpty).toBe(true);
    expect(report.innings1Score).toEqual({ runs: 18, wickets: 1, legalBalls: 6 });
    expect(report.innings2Score).toEqual({ runs: 19, wickets: 0, legalBalls: 4 });
    expect(report.isMatchCompleted).toBe(true);
    expect(report.resultText).toContain('won by 10 wickets');
    expect(report.careerVerified).toBe(true);
    expect(report.backupRestoredIdentically).toBe(true);
  });

  it('2. includes favicon.ico in index.html and vite.config.ts PWA precache assets and configures class-based dark mode', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const viteConfig = fs.readFileSync(path.join(rootDir, 'vite.config.ts'), 'utf8');
    const indexCss = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf8');

    expect(indexHtml).toContain('favicon.ico');
    expect(viteConfig).toContain('favicon.ico');
    expect(indexCss).toContain('@custom-variant dark');
    expect(fs.existsSync(path.join(rootDir, 'public/favicon.ico'))).toBe(true);
  });

  it('3. PLAY_STORE.md and README.md document offline verification, npm run check, and Google Play Data Safety', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
    const playStore = fs.readFileSync(path.join(rootDir, 'PLAY_STORE.md'), 'utf8');

    expect(readme).toContain('npm run check');
    expect(playStore).toContain('Data Safety');
    expect(playStore).toContain('com.crics.offline.scorer');
  });
});
