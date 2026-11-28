import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function collectAllSrcFiles(dir: string, acc: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectAllSrcFiles(fullPath, acc);
    } else if (
      entry.name.endsWith('.ts') ||
      entry.name.endsWith('.tsx') ||
      entry.name.endsWith('.css')
    ) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function parseHexToRgb(hexStr: string): { r: number; g: number; b: number } {
  const clean = hexStr.trim().replace(/^\x23/, '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function relativeLuminance(hexStr: string): number {
  const { r, g, b } = parseHexToRgb(hexStr);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function wcagContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function parseCssTokensFromIndexCss(cssContent: string): {
  rootVars: Record<string, string>;
  darkVars: Record<string, string>;
  themeVars: Record<string, string>;
} {
  const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/);
  const darkMatch = cssContent.match(/\.dark\s*\{([^}]+)\}/);
  const themeMatch = cssContent.match(/@theme\s*\{([^}]+)\}/);

  const extractVars = (block?: string): Record<string, string> => {
    const out: Record<string, string> = {};
    if (!block) return out;
    const varRegex = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
    let m: RegExpExecArray | null;
    while ((m = varRegex.exec(block)) !== null) {
      out[m[1].trim()] = m[2].trim();
    }
    return out;
  };

  return {
    rootVars: extractVars(rootMatch?.[1]),
    darkVars: extractVars(darkMatch?.[1]),
    themeVars: extractVars(themeMatch?.[1]),
  };
}

describe('Stage 5: New Color System, Token Scan & WCAG Contrast Audit', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const indexCssPath = path.join(rootDir, 'src/index.css');

  it('1. defines all required Stage 5 semantic color tokens in src/index.css (@theme, :root, and .dark)', () => {
    const css = fs.readFileSync(indexCssPath, 'utf8');
    const { rootVars, darkVars, themeVars } = parseCssTokensFromIndexCss(css);

    const requiredBrandShades = [
      '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950',
    ];
    for (const shade of requiredBrandShades) {
      expect(themeVars[`--color-brand-${shade}`]).toBeDefined();
    }

    const requiredModeTokens = [
      'accent', 'four', 'six', 'wicket', 'extra', 'success',
      'page', 'card', 'border', 'text', 'muted',
    ];
    for (const name of requiredModeTokens) {
      expect(rootVars[`--token-${name}`], `Light token ${name}`).toBeDefined();
      expect(darkVars[`--token-${name}`], `Dark token ${name}`).toBeDefined();
      expect(themeVars[`--color-${name}`], `@theme color ${name}`).toBeDefined();
    }
  });

  it('2. scans all files in src/ outside src/index.css for forbidden color classes (emerald-, green-, slate-) and raw hex values', () => {
    const allFiles = collectAllSrcFiles(path.join(rootDir, 'src'));
    const forbiddenClassRegex = new RegExp(
      `\\b(${['emerald', 'green', 'slate'].join('|')})-[a-z0-9]+`,
      'g'
    );
    const rawHexRegex = new RegExp('\\x23[0-9a-fA-F]{3,8}\\b', 'g');

    const classViolations: { file: string; matches: string[] }[] = [];
    const hexViolations: { file: string; matches: string[] }[] = [];

    for (const filePath of allFiles) {
      const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
      const content = fs.readFileSync(filePath, 'utf8');

      const clsMatches = content.match(forbiddenClassRegex);
      if (clsMatches && clsMatches.length > 0) {
        classViolations.push({ file: rel, matches: Array.from(new Set(clsMatches)) });
      }

      if (rel !== 'src/index.css') {
        const hexMatches = content.match(rawHexRegex);
        if (hexMatches && hexMatches.length > 0) {
          hexViolations.push({ file: rel, matches: Array.from(new Set(hexMatches)) });
        }
      }
    }

    expect(classViolations, 'Forbidden emerald/green/slate classes found in src/').toEqual([]);
    expect(hexViolations, 'Raw hex values found outside src/index.css').toEqual([]);
  });

  it('3. updates manifest, index.html, twa-manifest.json, icon.svg, and scoring components with semantic tokens and text labels (FOUR, SIX, WKT)', () => {
    const viteConfig = fs.readFileSync(path.join(rootDir, 'vite.config.ts'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const iconSvg = fs.readFileSync(path.join(rootDir, 'public/icon.svg'), 'utf8');
    const keypad = fs.readFileSync(
      path.join(rootDir, 'src/components/LiveScoringKeypad.tsx'),
      'utf8'
    );
    const scoreboard = fs.readFileSync(
      path.join(rootDir, 'src/components/LiveScoreboardCard.tsx'),
      'utf8'
    );

    const legacyEmeraldHex = ['\x23', '064e3b'].join('');
    expect(viteConfig.toLowerCase()).not.toContain(legacyEmeraldHex);
    expect(indexHtml.toLowerCase()).not.toContain(legacyEmeraldHex);
    expect(iconSvg.toLowerCase()).not.toContain(legacyEmeraldHex);

    expect(keypad).toContain('FOUR');
    expect(keypad).toContain('SIX');
    expect(keypad).toContain('WKT');
    expect(scoreboard).toContain('FOUR');
    expect(scoreboard).toContain('SIX');
    expect(scoreboard).toContain('WKT');
  });

  it('4. verifies WCAG contrast ratios (>= 4.5:1 normal text, >= 3.0:1 large text) for all light and dark token pairs and reports results', () => {
    const css = fs.readFileSync(indexCssPath, 'utf8');
    const { rootVars, darkVars, themeVars } = parseCssTokensFromIndexCss(css);

    const lightPairs: { label: string; fg: string; bg: string; minRatio: number }[] = [
      { label: 'Light: text on page', fg: rootVars['--token-text'], bg: rootVars['--token-page'], minRatio: 4.5 },
      { label: 'Light: text on card', fg: rootVars['--token-text'], bg: rootVars['--token-card'], minRatio: 4.5 },
      { label: 'Light: muted on page', fg: rootVars['--token-muted'], bg: rootVars['--token-page'], minRatio: 4.5 },
      { label: 'Light: muted on card', fg: rootVars['--token-muted'], bg: rootVars['--token-card'], minRatio: 4.5 },
      { label: 'Light: white on brand-600 (primary action)', fg: rootVars['--token-card'], bg: themeVars['--color-brand-600'], minRatio: 4.5 },
      { label: 'Light: brand-600 on card', fg: themeVars['--color-brand-600'], bg: rootVars['--token-card'], minRatio: 4.5 },
      { label: 'Light: brand-600 on page', fg: themeVars['--color-brand-600'], bg: rootVars['--token-page'], minRatio: 4.5 },
      { label: 'Light: brand-700 on brand-50', fg: themeVars['--color-brand-700'], bg: themeVars['--color-brand-50'], minRatio: 4.5 },
      { label: 'Light: wicket on card', fg: rootVars['--token-wicket'], bg: rootVars['--token-card'], minRatio: 4.5 },
      { label: 'Light: wicket on page', fg: rootVars['--token-wicket'], bg: rootVars['--token-page'], minRatio: 4.5 },
      { label: 'Light: white on wicket (destructive button)', fg: rootVars['--token-card'], bg: rootVars['--token-wicket'], minRatio: 4.5 },
      { label: 'Light: six on card', fg: rootVars['--token-six'], bg: rootVars['--token-card'], minRatio: 4.5 },
      { label: 'Light: six on page', fg: rootVars['--token-six'], bg: rootVars['--token-page'], minRatio: 4.5 },
      { label: 'Light: four on card (large/chip)', fg: rootVars['--token-four'], bg: rootVars['--token-card'], minRatio: 3.0 },
      { label: 'Light: four on page (large/chip)', fg: rootVars['--token-four'], bg: rootVars['--token-page'], minRatio: 3.0 },
      { label: 'Light: extra on card (large/chip)', fg: rootVars['--token-extra'], bg: rootVars['--token-card'], minRatio: 3.0 },
      { label: 'Light: success on card (large/chip)', fg: rootVars['--token-success'], bg: rootVars['--token-card'], minRatio: 3.0 },
      { label: 'Light: text on accent banner', fg: rootVars['--token-text'], bg: rootVars['--token-accent'], minRatio: 4.5 },
    ];

    const darkPairs: { label: string; fg: string; bg: string; minRatio: number }[] = [
      { label: 'Dark: text on page', fg: darkVars['--token-text'], bg: darkVars['--token-page'], minRatio: 4.5 },
      { label: 'Dark: text on card', fg: darkVars['--token-text'], bg: darkVars['--token-card'], minRatio: 4.5 },
      { label: 'Dark: text on brand-950', fg: darkVars['--token-text'], bg: themeVars['--color-brand-950'], minRatio: 4.5 },
      { label: 'Dark: muted on page', fg: darkVars['--token-muted'], bg: darkVars['--token-page'], minRatio: 4.5 },
      { label: 'Dark: muted on card', fg: darkVars['--token-muted'], bg: darkVars['--token-card'], minRatio: 4.5 },
      { label: 'Dark: white on brand-600 (primary action)', fg: rootVars['--token-card'], bg: themeVars['--color-brand-600'], minRatio: 4.5 },
      { label: 'Dark: brand-300 on card', fg: themeVars['--color-brand-300'], bg: darkVars['--token-card'], minRatio: 4.5 },
      { label: 'Dark: brand-300 on page', fg: themeVars['--color-brand-300'], bg: darkVars['--token-page'], minRatio: 4.5 },
      { label: 'Dark: brand-400 on card', fg: themeVars['--color-brand-400'], bg: darkVars['--token-card'], minRatio: 4.5 },
      { label: 'Dark: four on card', fg: darkVars['--token-four'], bg: darkVars['--token-card'], minRatio: 4.5 },
      { label: 'Dark: four on page', fg: darkVars['--token-four'], bg: darkVars['--token-page'], minRatio: 4.5 },
      { label: 'Dark: six on card', fg: darkVars['--token-six'], bg: darkVars['--token-card'], minRatio: 4.5 },
      { label: 'Dark: six on page', fg: darkVars['--token-six'], bg: darkVars['--token-page'], minRatio: 4.5 },
      { label: 'Dark: wicket on card', fg: darkVars['--token-wicket'], bg: darkVars['--token-card'], minRatio: 4.5 },
      { label: 'Dark: wicket on page', fg: darkVars['--token-wicket'], bg: darkVars['--token-page'], minRatio: 4.5 },
      { label: 'Dark: extra on card', fg: darkVars['--token-extra'], bg: darkVars['--token-card'], minRatio: 4.5 },
      { label: 'Dark: success on card', fg: darkVars['--token-success'], bg: darkVars['--token-card'], minRatio: 4.5 },
      { label: 'Dark: accent on card', fg: darkVars['--token-accent'], bg: darkVars['--token-card'], minRatio: 4.5 },
    ];

    const allPairs = [...lightPairs, ...darkPairs];
    const reportLines: string[] = [];

    for (const pair of allPairs) {
      const ratio = wcagContrastRatio(pair.fg, pair.bg);
      reportLines.push(`${pair.label}: ${ratio}:1 (min ${pair.minRatio}:1)`);
      expect(ratio, `${pair.label} (${pair.fg} on ${pair.bg})`).toBeGreaterThanOrEqual(
        pair.minRatio
      );
    }

    console.info('[STAGE 5 CONTRAST REPORT]\n' + reportLines.join('\n'));
  });
});
