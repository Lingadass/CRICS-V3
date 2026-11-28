import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(import.meta.dirname, '../..');

describe('Step 5 image optimization', () => {
  it('enforces icon and screenshot size targets', () => {
    const publicDir = path.join(rootDir, 'public');
    expect(fs.statSync(path.join(publicDir, 'pwa-512x512.png')).size).toBeLessThanOrEqual(80 * 1024);
    expect(fs.statSync(path.join(publicDir, 'pwa-maskable-512x512.png')).size).toBeLessThanOrEqual(60 * 1024);
    expect(fs.statSync(path.join(publicDir, 'apple-touch-icon.png')).size).toBeLessThanOrEqual(15 * 1024);
    for (const name of [
      'screenshot-home.png',
      'screenshot-live.png',
      'screenshot-scorecard.png',
      'screenshot-tournament.png',
    ]) {
      expect(fs.statSync(path.join(publicDir, name)).size).toBeLessThanOrEqual(150 * 1024);
      expect(fs.existsSync(path.join(publicDir, name.replace('.png', '.webp')))).toBe(true);
    }
  });

  it('requires dimensions and alt text on static page images', () => {
    const pages = [
      '404.html',
      'privacy-policy.html',
      'about/index.html',
      'features/index.html',
      'how-to-score-a-cricket-match/index.html',
      'faq/index.html',
    ];
    for (const relative of pages) {
      const html = fs.readFileSync(path.join(rootDir, 'public', relative), 'utf8');
      const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
      for (const image of images) {
        expect(image).toMatch(/\bwidth=["'][^"']+["']/i);
        expect(image).toMatch(/\bheight=["'][^"']+["']/i);
        expect(image).toMatch(/\balt=["'][^"']*["']/i);
      }
    }
  });
});
