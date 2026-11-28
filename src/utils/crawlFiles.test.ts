import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(import.meta.dirname, '../..');

describe('Step 3 crawl and sitemap files', () => {
  it('robots references the sitemap', () => {
    const robots = fs.readFileSync(path.join(rootDir, 'public/robots.txt'), 'utf8');
    expect(robots).toContain('Sitemap: https://crics.lingadass.dev/sitemap.xml');
  });

  it('sitemap contains only existing public paths', () => {
    const xml = fs.readFileSync(path.join(rootDir, 'public/sitemap.xml'), 'utf8');
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(urls).not.toContain('https://crics.lingadass.dev/#/');
    for (const url of urls) {
      const route = new URL(url).pathname;
      if (route === '/') {
        expect(fs.existsSync(path.join(rootDir, 'public/../index.html'))).toBe(true);
      } else if (route.endsWith('.html')) {
        expect(fs.existsSync(path.join(rootDir, 'public', route.slice(1)))).toBe(true);
      } else {
        expect(fs.existsSync(path.join(rootDir, 'public', route.slice(1), 'index.html'))).toBe(true);
      }
    }
  });

  it('has the security contact file', () => {
    const security = fs.readFileSync(path.join(rootDir, 'public/.well-known/security.txt'), 'utf8');
    expect(security).toContain('Contact: mailto:esportzignal@gmail.com');
  });

  it('build has static pages and does not let navigation fallback claim them', () => {
    const distDir = path.join(rootDir, 'dist');
    for (const relative of [
      'robots.txt',
      'sitemap.xml',
      'about/index.html',
      'features/index.html',
      'how-to-score-a-cricket-match/index.html',
      'faq/index.html',
      '404.html',
      '.well-known/security.txt',
    ]) {
      expect(fs.existsSync(path.join(distDir, relative)), relative).toBe(true);
    }
  });
});
