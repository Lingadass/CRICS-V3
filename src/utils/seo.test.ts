import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(import.meta.dirname, '../..');

function matchMeta(html: string, attribute: 'name' | 'property', key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<meta[^>]*${attribute}=["']${escaped}["'][^>]*content=["']([^"']+)["']`, 'i'));
  return match?.[1] ?? null;
}

describe('Step 1 SEO metadata', () => {
  it('build output contains valid metadata, structured data, and no external trackers', () => {
    const htmlPath = path.join(rootDir, 'dist/index.html');
    expect(fs.existsSync(htmlPath)).toBe(true);
    const html = fs.readFileSync(htmlPath, 'utf8');

    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '';
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThanOrEqual(60);

    const description = matchMeta(html, 'name', 'description');
    expect(description).not.toBeNull();
    expect(description!.length).toBeGreaterThanOrEqual(120);
    expect(description!.length).toBeLessThanOrEqual(155);

    expect(html).toContain('rel="canonical" href="https://crics.lingadass.dev/"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('property="og:url"');
    expect(html).toContain('property="og:site_name"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('name="twitter:title"');
    expect(html).toContain('name="twitter:description"');
    expect(html).toContain('name="twitter:image"');
    expect(html).toContain('name="twitter:image:alt"');

    const ogImage = path.join(rootDir, 'dist/og-image.jpg');
    expect(fs.existsSync(ogImage)).toBe(true);
    expect(fs.statSync(ogImage).size).toBeLessThan(150 * 1024);

    const jpeg = fs.readFileSync(ogImage);
    let offset = 2;
    let dimensions: { width: number; height: number } | null = null;
    while (offset < jpeg.length) {
      if (jpeg[offset] !== 0xff) break;
      const marker = jpeg[offset + 1];
      if (marker >= 0xc0 && marker <= 0xc3) {
        dimensions = {
          height: jpeg.readUInt16BE(offset + 5),
          width: jpeg.readUInt16BE(offset + 7),
        };
        break;
      }
      const length = jpeg.readUInt16BE(offset + 2);
      offset += length + 2;
    }
    expect(dimensions).toEqual({ width: 1200, height: 630 });

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    expect(jsonLdMatch).not.toBeNull();
    const data = JSON.parse(jsonLdMatch![1]);
    expect(data['@type']).toBe('WebApplication');
    expect(data.name).toBe('CRICS');
    expect(data.url).toBe('https://crics.lingadass.dev/');
    expect(data.applicationCategory).toBe('SportsApplication');
    expect(data.operatingSystem).toBe('Any');
    expect(data.offers.price).toBe(0);
    expect(data.offers.priceCurrency).toBe('INR');
    expect(data.inLanguage).toEqual(['en', 'hi', 'es']);
    expect(data.publisher['@type']).toBe('Person');
    expect(data.creator['@type']).toBe('Person');
    expect(Array.isArray(data.featureList)).toBe(true);
    expect(data.aggregateRating).toBeUndefined();
    expect(data.review).toBeUndefined();

    expect(html).not.toMatch(/<(script|link)[^>]*(?:src|href)=["']https?:\/\/(?!crics\.lingadass\.dev)/i);
    expect(html).not.toMatch(/google-analytics|googletagmanager|facebook\.net|doubleclick|analytics\./i);
  });
});
