import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { analyzeBackupDiff, CricsBackupPayload, db } from '../db/database';
import { useCricsStore } from '../store/useCricsStore';
import { verifyScorerPin } from './routeAndSecurityUtils';

describe('Phase 8 & Stage 9A: Backup PIN Privacy, Sample Data Isolation, Conflict Resolution & Lockfile Determinism', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await useCricsStore.getState().initApp();
  });

  it('1. strips Scorer PIN salt & hash from exported backup files by default and includes them only when explicitly enabled', async () => {
    await useCricsStore.getState().setScorerPin('4321');

    const excludedPayload = await useCricsStore
      .getState()
      .exportAllData({ includePin: false });
    expect(excludedPayload.settings[0].scorerPinSalt).toBeUndefined();
    expect(excludedPayload.settings[0].scorerPinHash).toBeUndefined();

    const includedPayload = await useCricsStore
      .getState()
      .exportAllData({ includePin: true });
    expect(includedPayload.settings[0].scorerPinSalt).toBeDefined();
    expect(includedPayload.settings[0].scorerPinHash).toBeDefined();
    expect(
      await verifyScorerPin(
        '4321',
        includedPayload.settings[0].scorerPinSalt!,
        includedPayload.settings[0].scorerPinHash!
      )
    ).toBe(true);
  });

  it('2. loads tagged sample club data and removes only sample records while keeping user-created records intact', async () => {
    const store = useCricsStore.getState();

    // Load sample club data
    await store.loadSampleData();
    const afterLoad = useCricsStore.getState();
    expect(afterLoad.players.some((p) => p.isSample)).toBe(true);
    expect(afterLoad.teams.some((t) => t.isSample)).toBe(true);
    expect(afterLoad.matches.some((m) => m.isSample)).toBe(true);

    // Add a user-created player and team (isSample: undefined)
    await useCricsStore.getState().savePlayer({
      id: 'USER-PLR-1',
      name: 'User Custom Batter',
      dob: '',
      jerseyNumber: null,
      role: 'Batter',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'None',
      createdAt: Date.now(),
    });
    await useCricsStore.getState().saveTeam({
      id: 'USER-TEAM-1',
      name: 'User Custom XI',
      shortName: 'UCX',
      primaryColor: 'var(--color-brand-600)',
      playerIds: ['USER-PLR-1'],
      createdAt: Date.now(),
    });

    // Remove sample data only
    await useCricsStore.getState().removeSampleData();
    const afterRemove = useCricsStore.getState();

    expect(afterRemove.players.some((p) => p.isSample)).toBe(false);
    expect(afterRemove.teams.some((t) => t.isSample)).toBe(false);
    expect(afterRemove.matches.some((m) => m.isSample)).toBe(false);

    // User-created player and team remain untouched
    expect(afterRemove.players.find((p) => p.id === 'USER-PLR-1')?.name).toBe(
      'User Custom Batter'
    );
    expect(afterRemove.teams.find((t) => t.id === 'USER-TEAM-1')?.name).toBe(
      'User Custom XI'
    );
  });

  it('3. analyzes backup diffs accurately and resolves ID conflicts using keep-both policy', async () => {
    const store = useCricsStore.getState();
    await store.savePlayer({
      id: 'CONFLICT-PLR',
      name: 'Local Name',
      dob: '',
      jerseyNumber: null,
      role: 'Batter',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'None',
      createdAt: 1000,
    });

    const backupPayload: CricsBackupPayload = {
      schemaVersion: 3,
      exportedAt: '2026-11-16T00:00:00.000Z',
      app: 'CRICS',
      players: [
        {
          id: 'CONFLICT-PLR',
          name: 'Imported Updated Name',
          dob: '',
          jerseyNumber: null,
          role: 'All-Rounder',
          battingStyle: 'Left-hand bat',
          bowlingStyle: 'Right-arm fast',
          createdAt: 2000,
        },
        {
          id: 'NEW-PLR',
          name: 'Brand New Player',
          dob: '',
          jerseyNumber: null,
          role: 'Bowler',
          battingStyle: 'Right-hand bat',
          bowlingStyle: 'Left-arm orthodox',
          createdAt: 3000,
        },
      ],
      teams: [],
      matches: [],
      ballEvents: [],
      tournaments: [],
      settings: [],
    };

    const diff = await analyzeBackupDiff(backupPayload);
    expect(diff.players.newCount).toBe(1);
    expect(diff.players.changedCount).toBe(1);

    // Import with 'keep-both' conflict resolution so neither record is lost
    await useCricsStore
      .getState()
      .importAllData(backupPayload, 'merge', 'keep-both');

    const updatedPlayers = useCricsStore.getState().players;
    expect(updatedPlayers.find((p) => p.id === 'CONFLICT-PLR')?.name).toBe(
      'Local Name'
    );
    expect(updatedPlayers.find((p) => p.id === 'NEW-PLR')?.name).toBe(
      'Brand New Player'
    );
    expect(
      updatedPlayers.some(
        (p) => p.id !== 'CONFLICT-PLR' && p.name.includes('Imported Updated Name')
      )
    ).toBe(true);
  });

  it('4. keeps package-lock.json synchronized with package.json, defines check and check:all scripts, and ignores Playwright report artifacts', () => {
    const rootDir = process.cwd();
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
    ) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const lockJson = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'package-lock.json'), 'utf8')
    ) as {
      packages: Record<
        string,
        {
          version?: string;
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        }
      >;
    };

    const rootLockEntry = lockJson.packages[''];
    expect(rootLockEntry).toBeDefined();

    for (const [dep, ver] of Object.entries(pkgJson.dependencies)) {
      expect(rootLockEntry.dependencies?.[dep]).toBe(ver);
      expect(lockJson.packages[`node_modules/${dep}`]?.version).toBe(ver);
    }
    for (const [devDep, ver] of Object.entries(pkgJson.devDependencies)) {
      expect(rootLockEntry.devDependencies?.[devDep]).toBe(ver);
      expect(lockJson.packages[`node_modules/${devDep}`]?.version).toBe(ver);
    }

    expect(pkgJson.scripts.check).toBe(
      'npm run lint && npm run test && npm run build'
    );
    expect(pkgJson.scripts['check:all']).toBe(
      'npm run lint && npm run test && npm run build && npm run test:e2e'
    );

    const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
    expect(gitignore).toContain('test-results/');
    expect(gitignore).toContain('playwright-report/');
    expect(gitignore).toContain('blob-report/');
    expect(fs.existsSync(path.join(rootDir, 'test-results'))).toBe(false);
  });
});

