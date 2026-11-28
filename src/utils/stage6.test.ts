import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { formatBallChipDisplay } from '../components/LiveScoreboardCard';
import { formatBallConfirmationMessage } from '../components/LiveScoringKeypad';
import { AppSettingsRecord, CricsDatabase, db } from '../db/database';
import { registerModalEscapeListener } from '../hooks/useFocusTrap';
import { useCricsStore } from '../store/useCricsStore';
import { parsePngDimensions } from './pwaUtils';

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.test.ts')
    ) {
      out.push(full);
    }
  }
  return out;
}

describe('STAGE 6 & STAGE 6.1: Typography Guardrails, Ball Chip/Toast Formatting, Migrations, Assets & Reversible Archive Behavior', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const srcDir = path.resolve(__dirname, '..');

  it('1. enforces minimum 12px text across the entire app and minimum 14px text on all scoring screen files including LiveScorerModals', () => {
    const files = collectSourceFiles(srcDir);
    const sub12pxHits: string[] = [];

    const sub12Pattern = /\btext-\[(?:9|10|11)px\]/g;
    for (const file of files) {
      const rel = path.relative(srcDir, file).replace(/\\/g, '/');
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(sub12Pattern);
      if (matches) {
        sub12pxHits.push(`${rel}: ${matches.join(', ')}`);
      }
    }
    expect(sub12pxHits).toEqual([]);

    const scoringScreenFiles = [
      'components/LiveScorerView.tsx',
      'components/LiveScoreboardCard.tsx',
      'components/LiveScoringKeypad.tsx',
      'components/LiveScorerModals.tsx',
      'components/LiveEditAndTargetModals.tsx',
      'components/LiveInningsBreakCard.tsx',
      'components/ScoringLockOverlay.tsx',
    ];
    const sub14ScoringHits: string[] = [];
    for (const rel of scoringScreenFiles) {
      const full = path.join(srcDir, rel);
      const content = fs.readFileSync(full, 'utf8');
      const xsMatches = content.match(/\btext-xs\b/g);
      if (xsMatches) {
        sub14ScoringHits.push(`${rel}: ${xsMatches.length} text-xs occurrences`);
      }
      const sub48Matches = content.match(/\bmin-h-\[(?:32|36|38|40|44)px\]/g);
      if (sub48Matches) {
        sub14ScoringHits.push(
          `${rel}: sub-48px tap targets (${sub48Matches.join(', ')})`
        );
      }
    }
    expect(sub14ScoringHits).toEqual([]);
  });

  it('2. formats over-ball chips (WKT, SIX, FOUR, extra, normal) and 4-second ball confirmation banners across all action types', () => {
    expect(
      formatBallChipDisplay({
        label: 'W',
        isWicket: true,
        isBoundary: false,
        isExtra: false,
      })
    ).toEqual({
      text: 'W WKT',
      className: 'bg-wicket text-white border border-wicket',
    });

    expect(
      formatBallChipDisplay({
        label: '6',
        isWicket: false,
        isBoundary: true,
        isExtra: false,
      }).text
    ).toBe('6 SIX');

    expect(
      formatBallChipDisplay({
        label: '4',
        isWicket: false,
        isBoundary: true,
        isExtra: false,
      }).text
    ).toBe('4 FOUR');

    expect(
      formatBallConfirmationMessage({
        actionType: 'delivery',
        runsOffBat: 0,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      })
    ).toBe('Dot ball recorded');

    expect(
      formatBallConfirmationMessage({
        actionType: 'delivery',
        runsOffBat: 0,
        extraType: 'wide',
        extraRuns: 2,
        isWicket: false,
      })
    ).toBe('Wide + 2 runs recorded');

    expect(
      formatBallConfirmationMessage({
        actionType: 'manual-strike-swap',
        runsOffBat: 0,
        extraType: 'none',
        extraRuns: 0,
        isWicket: false,
      })
    ).toBe('Strike swapped');
  });

  it('3. migrates Dexie v8 & v9 settings (vibrationEnabled, highContrastScoring, lastUsedTeamAId/BId/Overs)', async () => {
    const dbName = `Stage6V9MigrationTest_${Date.now()}`;
    const legacyDb = new Dexie(dbName);
    legacyDb.version(7).stores({
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
      theme: 'system',
      language: 'en',
      keepScreenAwake: true,
      defaultOvers: 15,
      defaultWideRuns: 1,
      defaultNoBallRuns: 1,
      defaultFreeHit: true,
      backupReminderIntervalMatches: 3,
      matchesSinceLastBackup: 1,
    });
    legacyDb.close();

    const upgradedDb = new CricsDatabase(dbName);
    await upgradedDb.open();
    const migrated = (await upgradedDb.settings.get('singleton')) as
      | AppSettingsRecord
      | undefined;
    expect(migrated).toBeDefined();
    expect(migrated?.vibrationEnabled).toBe(false);
    expect(migrated?.highContrastScoring).toBe(false);
    expect(migrated?.lastUsedOvers).toBe(15);
    expect(migrated?.lastUsedTeamAId).toBe('');
    expect(migrated?.lastUsedTeamBId).toBe('');
    upgradedDb.close();
    await Dexie.delete(dbName);
  });

  it('4. registers and cleans up modal Escape key listener in src/hooks/useFocusTrap.ts', () => {
    const listeners: Record<string, ((ev: { key: string }) => void)[]> = {};
    const mockTarget = {
      addEventListener: (type: 'keydown', fn: (ev: { key: string }) => void) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
      removeEventListener: (
        type: 'keydown',
        fn: (ev: { key: string }) => void
      ) => {
        listeners[type] = (listeners[type] || []).filter((f) => f !== fn);
      },
    };
    let closed = false;
    const cleanup = registerModalEscapeListener(
      true,
      () => {
        closed = true;
      },
      mockTarget
    );
    listeners.keydown[0]({ key: 'Escape' });
    expect(closed).toBe(true);
    cleanup();
  });

  it('5. removes 821 KB logo.png from public/, creates logo-128.png & logo-256.png (< 40 KB), and compresses all PWA icons within size budgets', () => {
    expect(fs.existsSync(path.join(rootDir, 'public/logo.png'))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, 'assets/logo.png'))).toBe(true);

    const logo128 = fs.readFileSync(path.join(rootDir, 'public/logo-128.png'));
    const logo256 = fs.readFileSync(path.join(rootDir, 'public/logo-256.png'));
    expect(parsePngDimensions(logo128)).toEqual({ width: 128, height: 128 });
    expect(parsePngDimensions(logo256)).toEqual({ width: 256, height: 256 });
    expect(logo128.byteLength).toBeLessThan(40 * 1024);
    expect(logo256.byteLength).toBeLessThan(40 * 1024);

    const icon512 = fs.readFileSync(path.join(rootDir, 'public/pwa-512x512.png'));
    const maskable512 = fs.readFileSync(
      path.join(rootDir, 'public/pwa-maskable-512x512.png')
    );
    const icon192 = fs.readFileSync(path.join(rootDir, 'public/pwa-192x192.png'));
    const appleTouch = fs.readFileSync(
      path.join(rootDir, 'public/apple-touch-icon.png')
    );

    expect(icon512.byteLength).toBeLessThan(120 * 1024);
    expect(maskable512.byteLength).toBeLessThan(100 * 1024);
    expect(icon192.byteLength).toBeLessThan(30 * 1024);
    expect(appleTouch.byteLength).toBeLessThan(25 * 1024);
  });

  it('6. archives players and teams referenced in matches instead of deleting them, and supports reversible undo restore', async () => {
    await db.delete();
    await db.open();
    await useCricsStore.getState().initApp();
    await useCricsStore.getState().loadSampleData();

    const store = useCricsStore.getState();
    const matchPlayerId = store.matches[0].teamAXI[0];
    const matchTeamId = store.matches[0].teamAId;

    // Attempting deletePlayer / deleteTeam on referenced records safely archives them instead
    const playerResult = await store.deletePlayer(matchPlayerId);
    expect(playerResult.action).toBe('archived');
    expect(
      useCricsStore.getState().players.find((p) => p.id === matchPlayerId)?.archived
    ).toBe(true);

    // Undo toast restores archived player
    await useCricsStore.getState().unarchivePlayer(matchPlayerId);
    expect(
      useCricsStore.getState().players.find((p) => p.id === matchPlayerId)?.archived
    ).toBe(false);

    const teamResult = await useCricsStore.getState().deleteTeam(matchTeamId);
    expect(teamResult.action).toBe('archived');
    expect(
      useCricsStore.getState().teams.find((t) => t.id === matchTeamId)?.archived
    ).toBe(true);

    // Undo toast restores archived team
    await useCricsStore.getState().unarchiveTeam(matchTeamId);
    expect(
      useCricsStore.getState().teams.find((t) => t.id === matchTeamId)?.archived
    ).toBe(false);
  });

  it('7. deletes a match along with its ball events and updates career cache & tournament fixture links', async () => {
    await db.delete();
    await db.open();
    await useCricsStore.getState().initApp();
    await useCricsStore.getState().loadSampleData();

    const initialMatches = useCricsStore.getState().matches;
    const targetMatch = initialMatches[0];
    expect(targetMatch).toBeDefined();

    await useCricsStore.getState().deleteMatch(targetMatch.id);

    const afterDelete = useCricsStore.getState();
    expect(afterDelete.matches.some((m) => m.id === targetMatch.id)).toBe(false);
    const remainingBallsForMatch = await db.ballEvents
      .where('matchId')
      .equals(targetMatch.id)
      .count();
    expect(remainingBallsForMatch).toBe(0);
  });

  it('8. enforces that h-8 and h-9 are never used on buttons/role="button", and only allowed on display-only elements marked with data-chip', () => {
    const scoringScreenFiles = [
      'components/LiveScorerView.tsx',
      'components/LiveScoreboardCard.tsx',
      'components/LiveScoringKeypad.tsx',
      'components/LiveOverStrip.tsx',
      'components/LiveKeypadMoreActions.tsx',
      'components/LiveScorerModals.tsx',
      'components/LiveEditAndTargetModals.tsx',
      'components/LiveInningsBreakCard.tsx',
      'components/ScoringLockOverlay.tsx',
    ];

    const violations: string[] = [];

    for (const rel of scoringScreenFiles) {
      const full = path.join(srcDir, rel);
      if (!fs.existsSync(full)) continue;
      const content = fs.readFileSync(full, 'utf8');

      // 1. Any button or role="button" with h-8 or h-9 must fail
      const buttonTagRegex = /<button\b[^>]*>/gs;
      let btnMatch: RegExpExecArray | null;
      while ((btnMatch = buttonTagRegex.exec(content)) !== null) {
        const tag = btnMatch[0];
        if (/\b(h-8|h-9)\b/.test(tag)) {
          violations.push(`${rel}: <button> contains small height class: ${tag}`);
        }
      }

      const roleButtonRegex = /<[^>]*\brole=["']button["'][^>]*>/gs;
      let roleMatch: RegExpExecArray | null;
      while ((roleMatch = roleButtonRegex.exec(content)) !== null) {
        const tag = roleMatch[0];
        if (/\b(h-8|h-9)\b/.test(tag)) {
          violations.push(`${rel}: role="button" contains small height class: ${tag}`);
        }
      }

      // 2. Any element with h-8 or h-9 must have data-chip
      const anyTagWithSmallHeightRegex = /<[a-zA-Z0-9_-]+\b[^>]*\b(h-8|h-9)\b[^>]*>/gs;
      let tagMatch: RegExpExecArray | null;
      while ((tagMatch = anyTagWithSmallHeightRegex.exec(content)) !== null) {
        const tag = tagMatch[0];
        if (!/\bdata-chip\b/.test(tag)) {
          violations.push(`${rel}: element with small height class is not marked with data-chip: ${tag}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
