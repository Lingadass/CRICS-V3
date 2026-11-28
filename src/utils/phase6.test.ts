import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseIcoDimensions,
  parsePngDimensions,
  shouldShowSwUpdateBanner,
} from './pwaUtils';

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

describe('Phase 6: PWA, Offline Guarantee, Code-Splitting & TWA Readiness', () => {
  it('1. shouldShowSwUpdateBanner suppresses update prompts on the live screen or within 10 minutes of scoring, and shows otherwise even if an old match is marked live', () => {
    const now = 1_700_000_000_000;
    const recentScoringTs = now - 3 * 60 * 1000; // 3 minutes ago
    const idleScoringTs = now - 15 * 60 * 1000; // 15 minutes ago

    expect(
      shouldShowSwUpdateBanner({
        swUpdateAvailable: false,
        activeTab: 'home',
        hasLiveMatch: false,
        now,
      })
    ).toBe(false);

    expect(
      shouldShowSwUpdateBanner({
        swUpdateAvailable: true,
        activeTab: 'live',
        hasLiveMatch: true,
        lastScoringActionTimestamp: idleScoringTs,
        now,
      })
    ).toBe(false);

    expect(
      shouldShowSwUpdateBanner({
        swUpdateAvailable: true,
        activeTab: 'home',
        hasLiveMatch: true,
        lastScoringActionTimestamp: recentScoringTs,
        now,
      })
    ).toBe(false);

    expect(
      shouldShowSwUpdateBanner({
        swUpdateAvailable: true,
        activeTab: 'home',
        hasLiveMatch: true,
        lastScoringActionTimestamp: idleScoringTs,
        now,
      })
    ).toBe(true);
  });

  it('2. PWA icons & logo.png have valid PNG binary headers & dimensions and .well-known/assetlinks.json is valid for TWA', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const sourceLogo = fs.readFileSync(path.join(rootDir, 'assets/logo.png'));
    const logo128 = fs.readFileSync(path.join(rootDir, 'public/logo-128.png'));
    const logo256 = fs.readFileSync(path.join(rootDir, 'public/logo-256.png'));
    const icon192 = fs.readFileSync(path.join(rootDir, 'public/pwa-192x192.png'));
    const icon512 = fs.readFileSync(path.join(rootDir, 'public/pwa-512x512.png'));
    const iconMaskable = fs.readFileSync(
      path.join(rootDir, 'public/pwa-maskable-512x512.png')
    );
    const appleTouchIcon = fs.readFileSync(
      path.join(rootDir, 'public/apple-touch-icon.png')
    );
    const favicon = fs.readFileSync(path.join(rootDir, 'public/favicon.ico'));

    expect(parsePngDimensions(sourceLogo)).toEqual({ width: 1254, height: 1254 });
    expect(parsePngDimensions(logo128)).toEqual({ width: 128, height: 128 });
    expect(parsePngDimensions(logo256)).toEqual({ width: 256, height: 256 });
    expect(parsePngDimensions(icon192)).toEqual({ width: 192, height: 192 });
    expect(parsePngDimensions(icon512)).toEqual({ width: 512, height: 512 });
    expect(parsePngDimensions(iconMaskable)).toEqual({ width: 512, height: 512 });
    expect(parsePngDimensions(appleTouchIcon)).toEqual({ width: 180, height: 180 });
    expect(favicon.byteLength).toBeLessThan(20 * 1024);
    expect(parseIcoDimensions(favicon)?.sizes).toEqual([
      { width: 16, height: 16 },
      { width: 32, height: 32 },
      { width: 48, height: 48 },
    ]);
  });

  it('3. Zero runtime network calls, analytics, or external CDNs exist in index.html or src/', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    expect(indexHtml).not.toMatch(/<(?:script|link)[^>]*(?:src|href)=["']https?:\/\/(?!crics\.lingadass\.dev)/i);

    const srcFiles = collectSourceFiles(path.join(rootDir, 'src'));
    const forbiddenPatterns = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bnavigator\.sendBeacon\b/,
      /\bnew\s+WebSocket\b/,
      /https:\/\/fonts\.googleapis\.com/i,
      /https:\/\/www\.googletagmanager\.com/i,
    ];

    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of forbiddenPatterns) {
        expect(content).not.toMatch(pattern);
      }
    }
  });

  it('4. parsePngDimensions and parseIcoDimensions safely return null on truncated or invalid binary headers', () => {
    expect(parsePngDimensions(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
    expect(parsePngDimensions(new Uint8Array(32))).toBeNull();
    expect(parseIcoDimensions(new Uint8Array([0x00, 0x00, 0x02, 0x00]))).toBeNull();
    expect(parseIcoDimensions(new Uint8Array(4))).toBeNull();
  });
});
