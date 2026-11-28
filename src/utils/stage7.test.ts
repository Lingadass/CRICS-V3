import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { registerModalEscapeListener } from '../hooks/useFocusTrap';
import { TRANSLATIONS } from '../i18n/translations';

const rootDir = path.resolve(__dirname, '../..');
const srcDir = path.join(rootDir, 'src');

function getComponentFiles(): string[] {
  const compDir = path.join(srcDir, 'components');
  const files = fs
    .readdirSync(compDir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => path.join(compDir, f));
  return [path.join(srcDir, 'App.tsx'), ...files];
}

function stripCommentsAndStringsInBraces(source: string): string {
  // Remove block and line comments
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

/**
 * Finds hard-coded JSX text nodes (text between > and < that contains letters
 * outside of { ... } expressions) and literal title/placeholder/aria-label/alt attributes.
 */
function scanFileForHardcodedStrings(filePath: string): {
  jsxTextViolations: string[];
  attrViolations: string[];
} {
  const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
  // PrivacyPolicyView is a static legal document view; still check attributes or skip if needed,
  // but Stage 7 asks to scan component files for JSX text and title/placeholder/aria-label/alt.
  const raw = fs.readFileSync(filePath, 'utf8');
  const cleaned = stripCommentsAndStringsInBraces(raw);

  const attrViolations: string[] = [];
  // Match literal string attributes: title="...", placeholder="...", aria-label="...", alt="..."
  const attrRegex = /\b(title|placeholder|aria-label|alt)\s*=\s*(["'])([^"']*)\2/g;
  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrRegex.exec(cleaned)) !== null) {
    const attrName = attrMatch[1];
    const attrVal = attrMatch[3].trim();
    // Brand logo alt text required by Stage 0/Phase 6 test
    if (attrName === 'alt' && attrVal === 'CRICS by eSportZignal') continue;
    if (attrVal.length > 0) {
      attrViolations.push(`${rel}: ${attrName}="${attrVal}"`);
    }
  }

  // Scan JSX text nodes between > and < (excluding TypeScript generic type parameters like useState<string>(...))
  const jsxTextViolations: string[] = [];
  const jsxTextRegex = /([a-zA-Z0-9_"'\])}])>([^<{}]+)<(\/?[a-zA-Z])/g;
  let textMatch: RegExpExecArray | null;
  while ((textMatch = jsxTextRegex.exec(cleaned)) !== null) {
    const beforeChar = textMatch[1];
    const rawBetween = textMatch[2];
    const afterLt = textMatch[3];
    // Skip TypeScript arrow functions `=>`
    if (beforeChar === '=') continue;
    // If rawBetween starts with `(` or `;` or `,` (e.g. `useState<string>('')` or `React.Dispatch<...>;`),
    // the leading `>` was closing a TypeScript generic, not a JSX tag.
    if (/^\s*[();,=]/.test(rawBetween)) continue;
    // If the `<` at the end is preceded immediately by an identifier char (e.g. `useState<` or `Record<`)
    // and is not a closing JSX tag `</`, it is opening a TypeScript generic, not a JSX tag.
    if (!afterLt.startsWith('/') && /[a-zA-Z0-9_]$/.test(rawBetween)) continue;

    const text = rawBetween
      .replace(/&[a-zA-Z0-9#]+;/g, ' ')
      .trim();
    if (!text) continue;
    // Check if there are any alphabetic words (2+ letters)
    // Allow pure punctuation, numbers, symbols like "+", "-", "/", "*", "·", "()", "%", "x"
    const words = text.match(/[A-Za-z]{2,}/g);
    if (!words || words.length === 0) continue;

    jsxTextViolations.push(`${rel}: "${text.replace(/\s+/g, ' ')}"`);
  }

  return { jsxTextViolations, attrViolations };
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, next));
    } else {
      keys.push(next);
    }
  }
  return keys.sort();
}

describe('STAGE 7: 100% Translation Coverage, Modal Focus Return & Accessibility Audit', () => {
  it('1. scans all component .tsx files for hard-coded JSX text and literal title/placeholder/aria-label/alt attributes outside the translation dictionary', () => {
    const files = getComponentFiles();
    const allJsxViolations: string[] = [];
    const allAttrViolations: string[] = [];

    for (const file of files) {
      const { jsxTextViolations, attrViolations } = scanFileForHardcodedStrings(file);
      allJsxViolations.push(...jsxTextViolations);
      allAttrViolations.push(...attrViolations);
    }

    expect(allAttrViolations, 'Hard-coded title/placeholder/aria-label/alt attributes found').toEqual([]);
    expect(allJsxViolations, 'Hard-coded JSX text nodes found outside translation files').toEqual([]);
  });

  it('2. ensures English, Hindi, and Spanish dictionaries have identical keys and TODO markers for machine-translated entries', () => {
    const enKeys = flattenKeys(TRANSLATIONS.en as unknown as Record<string, unknown>);
    const hiKeys = flattenKeys(TRANSLATIONS.hi as unknown as Record<string, unknown>);
    const esKeys = flattenKeys(TRANSLATIONS.es as unknown as Record<string, unknown>);

    expect(hiKeys).toEqual(enKeys);
    expect(esKeys).toEqual(enKeys);
    expect(enKeys.length).toBeGreaterThan(200);

    const i18nFiles = fs
      .readdirSync(path.join(srcDir, 'i18n'))
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .map((f) => fs.readFileSync(path.join(srcDir, 'i18n', f), 'utf8'))
      .join('\n');

    expect(i18nFiles).toContain('TODO: human review');
  });

  it('3. verifies every role="dialog" modal has aria-modal="true" and aria-labelledby pointing to a visible title element', () => {
    const files = getComponentFiles();
    let dialogCount = 0;

    for (const file of files) {
      const rel = path.relative(rootDir, file).replace(/\\/g, '/');
      const content = fs.readFileSync(file, 'utf8');
      const dialogRegex = /role="dialog"[\s\S]{0,350}?>/g;
      let match: RegExpExecArray | null;
      while ((match = dialogRegex.exec(content)) !== null) {
        dialogCount += 1;
        const tag = match[0];
        expect(tag, `${rel} dialog missing aria-modal="true"`).toContain('aria-modal="true"');
        const labelMatch = tag.match(/aria-labelledby="([^"]+)"/);
        expect(labelMatch, `${rel} dialog missing aria-labelledby`).not.toBeNull();
        if (labelMatch) {
          const titleId = labelMatch[1];
          expect(
            content,
            `${rel} dialog aria-labelledby="${titleId}" has no matching id="${titleId}"`
          ).toContain(`id="${titleId}"`);
        }
      }
    }

    expect(dialogCount).toBeGreaterThanOrEqual(12);
  });

  it('4. traps Tab / Shift+Tab focus inside the active dialog, moves initial focus into the dialog, and restores focus to the trigger element on close', () => {
    const listeners: Record<
      string,
      ((ev: { key: string; shiftKey?: boolean; preventDefault?: () => void }) => void)[]
    > = {};
    const mockTarget = {
      addEventListener: (
        type: 'keydown',
        fn: (ev: { key: string; shiftKey?: boolean; preventDefault?: () => void }) => void
      ) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
      removeEventListener: (
        type: 'keydown',
        fn: (ev: { key: string; shiftKey?: boolean; preventDefault?: () => void }) => void
      ) => {
        listeners[type] = (listeners[type] || []).filter((f) => f !== fn);
      },
    };

    let triggerFocused = false;
    let firstBtnFocused = false;
    let lastBtnFocused = false;

    const triggerEl = {
      focus: () => {
        triggerFocused = true;
      },
    };
    const firstBtn = {
      focus: () => {
        firstBtnFocused = true;
        mockDoc.activeElement = firstBtn;
      },
    };
    const lastBtn = {
      focus: () => {
        lastBtnFocused = true;
        mockDoc.activeElement = lastBtn;
      },
    };

    const mockDialog = {
      querySelectorAll: () => [firstBtn, lastBtn],
    };

    const mockDoc = {
      activeElement: triggerEl as unknown,
      querySelectorAll: (sel: string) =>
        sel.includes('role="dialog"') ? [mockDialog] : [],
    };

    const origDocument = globalThis.document;
    Object.defineProperty(globalThis, 'document', {
      value: mockDoc,
      configurable: true,
    });

    try {
      let closed = false;
      const cleanup = registerModalEscapeListener(
        true,
        () => {
          closed = true;
        },
        mockTarget
      );

      // Initial focus should move into the dialog's first focusable control
      expect(firstBtnFocused).toBe(true);

      // Shift+Tab on first element wraps to last element
      let prevented = false;
      listeners.keydown[0]({
        key: 'Tab',
        shiftKey: true,
        preventDefault: () => {
          prevented = true;
        },
      });
      expect(prevented).toBe(true);
      expect(lastBtnFocused).toBe(true);

      // Tab on last element wraps to first element
      firstBtnFocused = false;
      prevented = false;
      listeners.keydown[0]({
        key: 'Tab',
        shiftKey: false,
        preventDefault: () => {
          prevented = true;
        },
      });
      expect(prevented).toBe(true);
      expect(firstBtnFocused).toBe(true);

      // Escape triggers onClose
      listeners.keydown[0]({ key: 'Escape' });
      expect(closed).toBe(true);

      // Cleanup (modal close) restores focus to triggerEl
      cleanup();
      expect(triggerFocused).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'document', {
        value: origDocument,
        configurable: true,
      });
    }
  });

  it('5. Stage 9B: removes truncate from scoring screen controls, uses Partnership and labeled bowler figures, and moves remaining default strings into translation files', () => {
    const scoringFiles = [
      'LiveScorerView.tsx',
      'LiveScoreboardCard.tsx',
      'LiveScoringKeypad.tsx',
    ];
    for (const file of scoringFiles) {
      const src = fs.readFileSync(path.join(srcDir, 'components', file), 'utf8');
      expect(src, `${file} must not use truncate class`).not.toMatch(/\btruncate\b/);
    }

    expect(TRANSLATIONS.en.scoring.pshipShort).toBe('Partnership');
    expect(TRANSLATIONS.en.scoring.swapShort).toBe('Swap strike');
    expect(
      (TRANSLATIONS.en.scoring as Record<string, string>).maidensWord
    ).toBe('Maidens');
    expect((TRANSLATIONS.en.scoring as Record<string, string>).runsWord).toBe(
      'Runs'
    );
    expect(
      (TRANSLATIONS.en.scoring as Record<string, string>).wicketsWord
    ).toBe('Wickets');

    const tournamentsSrc = fs.readFileSync(
      path.join(srcDir, 'components', 'TournamentsView.tsx'),
      'utf8'
    );
    expect(tournamentsSrc).not.toContain("useState('Main Oval')");
    expect(tournamentsSrc).not.toContain("useState('Fixture')");
    expect(tournamentsSrc).not.toContain("|| 'Main Oval'");
    expect(tournamentsSrc).not.toContain("|| 'Fixture'");
    expect(tournamentsSrc).not.toContain("|| 'TBD'");
    expect(tournamentsSrc).not.toContain(
      "g === 'ALL' ? t.tournaments.allGroupsFilter : g}"
    );

    const wizardSrc = fs.readFileSync(
      path.join(srcDir, 'components', 'MatchWizardView.tsx'),
      'utf8'
    );
    expect(wizardSrc).not.toContain("'Club Championship Clash'");
    expect(wizardSrc).not.toContain("'Main Oval Ground'");
    expect(wizardSrc).not.toContain("useState('Official Scorer')");
  });
});

