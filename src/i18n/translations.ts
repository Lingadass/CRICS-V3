import { EN_TRANSLATIONS } from './en';
import { ES_TRANSLATIONS } from './es';
import { HI_TRANSLATIONS } from './hi';

export type LanguageCode = 'en' | 'hi' | 'es';
export type ThemeMode = 'system' | 'light' | 'dark';
export type TranslationDictionary = typeof EN_TRANSLATIONS;

export const TRANSLATIONS: Record<LanguageCode, TranslationDictionary> = {
  en: EN_TRANSLATIONS,
  hi: HI_TRANSLATIONS,
  es: ES_TRANSLATIONS,
};

export function getTranslations(lang?: LanguageCode): TranslationDictionary {
  if (lang && TRANSLATIONS[lang]) return TRANSLATIONS[lang];
  return TRANSLATIONS.en;
}

export function formatBowlingStyle(style: string, t: TranslationDictionary): string {
  return style === 'None' ? t.players.doesNotBowl : style;
}

export function applyLanguageToDocument(lang: LanguageCode, rootEl?: HTMLElement): void {
  const el = rootEl || (typeof document !== 'undefined' ? document.documentElement : undefined);
  if (el) el.lang = TRANSLATIONS[lang] ? lang : 'en';
}

export function resolveEffectiveTheme(theme: ThemeMode, systemPrefersDark?: boolean): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme;
  if (typeof systemPrefersDark === 'boolean') return systemPrefersDark ? 'dark' : 'light';
  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function applyThemeToDocument(theme: ThemeMode, rootEl?: HTMLElement, systemPrefersDark?: boolean): void {
  const el = rootEl || (typeof document !== 'undefined' ? document.documentElement : undefined);
  if (!el) return;
  const effective = resolveEffectiveTheme(theme, systemPrefersDark);
  el.classList.toggle('dark', effective === 'dark');
  if (el.style) el.style.colorScheme = effective;
  if (!rootEl) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('crics-theme', theme);
    } catch { /* ignore storage errors */ }
    if (typeof document !== 'undefined') {
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      const tokenColor =
        typeof getComputedStyle === 'function'
          ? getComputedStyle(el).getPropertyValue('--token-theme-meta').trim()
          : '';
      if (metaTheme) {
        metaTheme.setAttribute(
          'content',
          tokenColor || (effective === 'dark' ? 'rgb(18, 26, 69)' : 'rgb(44, 71, 214)')
        );
      }
    }
  }
}
