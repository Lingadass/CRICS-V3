import { describe, expect, it } from 'vitest';
import { registerModalEscapeListener } from '../hooks/useFocusTrap';
import {
  applyLanguageToDocument,
  applyThemeToDocument,
  getTranslations,
  LanguageCode,
  TRANSLATIONS,
} from './translations';

describe('Phase 5: Internationalization (i18n), Accessibility & Theme Sync', () => {
  it('1. Translation dictionary covers all app modules and has 100% key parity across en, hi, and es', () => {
    const requiredSections = [
      'nav',
      'scoring',
      'common',
      'dashboard',
      'wizard',
      'scorecards',
      'players',
      'teams',
      'careers',
      'tournaments',
      'leaderboards',
      'settings',
    ] as const;

    const languages: LanguageCode[] = ['en', 'hi', 'es'];

    for (const section of requiredSections) {
      expect(TRANSLATIONS.en[section]).toBeDefined();
      const enSection = TRANSLATIONS.en[section] as Record<string, string>;
      const enKeys = Object.keys(enSection);
      expect(enKeys.length).toBeGreaterThan(0);

      for (const lang of languages) {
        const targetSection = TRANSLATIONS[lang][section] as Record<string, string>;
        expect(targetSection).toBeDefined();
        for (const key of enKeys) {
          expect(typeof targetSection[key]).toBe('string');
          expect(targetSection[key].trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('2. getTranslations returns the requested locale dictionary and safely falls back to English', () => {
    expect(getTranslations('hi').nav.home).toBe('डैशबोर्ड');
    expect(getTranslations('es').nav.home).toBe('Panel');
    expect(getTranslations('unknown' as LanguageCode).nav.home).toBe('Dashboard');
  });

  it('3. applyLanguageToDocument and applyThemeToDocument synchronize html[lang], dark class, and colorScheme', () => {
    const fakeRoot = {
      lang: 'en',
      style: { colorScheme: '' },
      classList: {
        isDark: false,
        toggle(cls: string, force?: boolean) {
          if (cls === 'dark') {
            this.isDark = Boolean(force);
          }
        },
      },
    };

    applyLanguageToDocument('hi', fakeRoot as unknown as HTMLElement);
    expect(fakeRoot.lang).toBe('hi');

    applyThemeToDocument('dark', fakeRoot as unknown as HTMLElement);
    expect(fakeRoot.classList.isDark).toBe(true);
    expect(fakeRoot.style.colorScheme).toBe('dark');

    applyThemeToDocument('light', fakeRoot as unknown as HTMLElement);
    expect(fakeRoot.classList.isDark).toBe(false);
    expect(fakeRoot.style.colorScheme).toBe('light');
  });

  it('4. registerModalEscapeListener triggers close callback on Escape key and cleans up properly', () => {
    let closedCount = 0;
    const listeners: Record<string, ((ev: { key: string }) => void)[]> = {};
    const fakeTarget = {
      addEventListener(type: string, fn: (ev: { key: string }) => void) {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
      removeEventListener(type: string, fn: (ev: { key: string }) => void) {
        listeners[type] = (listeners[type] || []).filter((f) => f !== fn);
      },
    };

    const cleanup = registerModalEscapeListener(
      true,
      () => {
        closedCount += 1;
      },
      fakeTarget
    );

    listeners.keydown.forEach((fn) => fn({ key: 'Enter' }));
    expect(closedCount).toBe(0);

    listeners.keydown.forEach((fn) => fn({ key: 'Escape' }));
    expect(closedCount).toBe(1);

    cleanup();
    listeners.keydown.forEach((fn) => fn({ key: 'Escape' }));
    expect(closedCount).toBe(1);
  });
});
