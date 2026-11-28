import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(import.meta.dirname, '../..');

describe('Step 4 Cloudflare headers and redirects', () => {
  it('defines security headers, caching and redirects', () => {
    const headers = fs.readFileSync(path.join(rootDir, 'public/_headers'), 'utf8');
    expect(headers).toContain('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    expect(headers).toContain("Content-Security-Policy-Report-Only:");
    expect(headers).toContain("script-src 'self'");
    expect(headers).toContain("sha256-2oacFmhcy+pUyzVka+Avz80K/lBTA3QupGtfajZifIo=");
    expect(headers).toContain('Permissions-Policy: camera=(self)');
    expect(headers).toContain('/assets/*');
    expect(headers).toContain('max-age=31536000');

    const redirects = fs.readFileSync(path.join(rootDir, 'public/_redirects'), 'utf8');
    expect(redirects).toContain('http://crics.lingadass.dev/');
    expect(redirects).toContain('https://www.crics.lingadass.dev/');
  });
});
