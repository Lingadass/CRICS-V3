import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import {
  buildHashRoute,
  hashScorerPin,
  parseHashRoute,
  setupLiveWakeLock,
  verifyScorerPin,
} from './routeAndSecurityUtils';

function getAllSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllSourceFiles(fullPath));
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx')
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Phase 3: Navigation, Security, Wake Lock & Code Structure', () => {
  test('1. Hash routing parses and builds deep-linkable routes accurately', () => {
    expect(parseHashRoute('#/live/MATCH-102')).toEqual({
      tab: 'live',
      matchId: 'MATCH-102',
    });
    expect(parseHashRoute('#/scorecard/MATCH-101')).toEqual({
      tab: 'scorecards',
      scorecardMatchId: 'MATCH-101',
    });
    expect(parseHashRoute('#/career/CRICS-PLR-1001')).toEqual({
      tab: 'careers',
      playerId: 'CRICS-PLR-1001',
    });
    expect(parseHashRoute('#/tournaments/TOUR-2026')).toEqual({
      tab: 'tournaments',
      tournamentId: 'TOUR-2026',
    });
    expect(parseHashRoute('#/invalid-unknown-route')).toEqual({
      tab: 'home',
    });

    expect(
      buildHashRoute({
        tab: 'live',
        matchId: 'MATCH-102',
      })
    ).toBe('#/live/MATCH-102');
    expect(
      buildHashRoute({
        tab: 'scorecards',
        scorecardMatchId: 'MATCH-101',
      })
    ).toBe('#/scorecard/MATCH-101');
    expect(
      buildHashRoute({
        tab: 'careers',
        playerId: 'CRICS-PLR-1001',
      })
    ).toBe('#/career/CRICS-PLR-1001');
  });

  test('2. Scorer PIN is salted and SHA-256 hashed, never storing plain text', async () => {
    const { salt, hash } = await hashScorerPin('2580');
    expect(salt.length).toBeGreaterThanOrEqual(16);
    expect(hash).not.toContain('2580');
    expect(hash.length).toBe(64); // 256-bit hex

    expect(await verifyScorerPin('2580', salt, hash)).toBe(true);
    expect(await verifyScorerPin('1234', salt, hash)).toBe(false);
  });

  test('3. Wake Lock manager re-acquires screen lock when document visibility becomes visible', async () => {
    const releaseMock = vi.fn().mockResolvedValue(undefined);
    const requestMock = vi.fn().mockResolvedValue({ release: releaseMock });

    const listeners: Record<string, Array<() => void>> = {};
    const mockDoc = {
      visibilityState: 'visible',
      addEventListener: (evt: string, cb: () => void) => {
        listeners[evt] = listeners[evt] || [];
        listeners[evt].push(cb);
      },
      removeEventListener: (evt: string, cb: () => void) => {
        listeners[evt] = (listeners[evt] || []).filter((fn) => fn !== cb);
      },
    };

    const cleanup = setupLiveWakeLock(
      true,
      { wakeLock: { request: requestMock } },
      mockDoc
    );

    // Initial request on mount
    await Promise.resolve();
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith('screen');

    // Simulate screen lock / tab switch (hidden) -> then return to app (visible)
    mockDoc.visibilityState = 'hidden';
    for (const cb of listeners['visibilitychange'] || []) cb();
    expect(requestMock).toHaveBeenCalledTimes(1);

    mockDoc.visibilityState = 'visible';
    for (const cb of listeners['visibilitychange'] || []) cb();
    await Promise.resolve();
    expect(requestMock).toHaveBeenCalledTimes(2);

    cleanup();
    expect(releaseMock).toHaveBeenCalled();
  });

  test('4. Every non-test source file in src/ is at most 500 lines', () => {
    const srcDir = path.resolve(process.cwd(), 'src');
    const files = getAllSourceFiles(srcDir);
    const oversized = files
      .map((f) => ({
        file: path.relative(process.cwd(), f),
        lines: fs.readFileSync(f, 'utf8').split('\n').length,
      }))
      .filter((item) => item.lines > 500);

    expect(oversized).toEqual([]);
  });
});
