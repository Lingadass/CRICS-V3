import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(import.meta.dirname, '../..');
const publicDir = path.join(rootDir, 'public');

function countTag(html: string, tag: 'h1' | 'title' | 'description'): number {
  if (tag === 'description') {
    return (html.match(/<meta\s+name=["']description["']/gi) ?? []).length;
  }
  return (html.match(new RegExp(`<${tag}(?:\\s[^>]*)?>`, 'gi')) ?? []).length;
}

describe('Step 2 static guide pages', () => {
  const pages = [
    'privacy-policy.html',
    'about/index.html',
    'features/index.html',
    'how-to-score-a-cricket-match/index.html',
    'faq/index.html',
  ];

  it('has unique one-h1 metadata pages', () => {
    for (const relative of pages) {
      const file = path.join(publicDir, relative);
      expect(fs.existsSync(file), relative).toBe(true);
      const html = fs.readFileSync(file, 'utf8');
      expect(countTag(html, 'h1'), `${relative} h1`).toBe(1);
      expect(countTag(html, 'title'), `${relative} title`).toBe(1);
      expect(countTag(html, 'description'), `${relative} description`).toBe(1);
      expect(html).toMatch(/<link[^>]+rel=["']canonical["']/i);
    }
  });

  it('includes fallback root content and noscript content', () => {
    const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    expect(html).toMatch(/<div id=["']root["'][^>]*>[\s\S]*<h1/i);
    expect(html).toMatch(/<noscript>/i);
  });

  it('has resolving internal links and FAQ questions in visible text', () => {
    for (const relative of pages) {
      const file = path.join(rootDir, 'dist', relative);
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, 'utf8');
      const hrefs = [...html.matchAll(/href=["'](\/[^#"']*)["']/gi)].map((match) => match[1]);
      for (const href of hrefs) {
        const resolved = href.endsWith('/') ? path.join(rootDir, 'dist', href.slice(1), 'index.html') : path.join(rootDir, 'dist', href.slice(1));
        expect(fs.existsSync(resolved), `${relative} -> ${href}`).toBe(true);
      }
    }
    const faqPath = path.join(rootDir, 'dist/faq/index.html');
    if (fs.existsSync(faqPath)) {
      const html = fs.readFileSync(faqPath, 'utf8');
      const ldJson = [...html.matchAll(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
      const faq = ldJson.map((match) => JSON.parse(match[1])).find((data) => data['@type'] === 'FAQPage');
      if (faq) {
        for (const question of faq.mainEntity) {
          expect(html).toContain(question.name);
        }
      }
    }
  });
});
