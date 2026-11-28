/**
 * Branded Intro Screen constants, timeline milestones, single-source-of-truth
 * keyframe/CSS-variable builder, contrast helper, and pure decision logic.
 */

export const INTRO_TOTAL_MS = 3000;
export const INTRO_LOGO_FADE_IN_END_MS = 500;
export const INTRO_SWEEP_END_MS = 1200;
export const INTRO_PRODUCED_BY_START_MS = 1200;
export const INTRO_CREATED_BY_START_MS = 1500;
export const INTRO_CREDITS_SETTLED_MS = 2000;
export const INTRO_FADE_OUT_START_MS = 2700;

export const INTRO_SKIP_VISIBLE_MS = 800;
export const INTRO_LIVE_MATCH_MS = 1000;
export const INTRO_REDUCED_MOTION_MS = 1500;
export const INTRO_DB_WAIT_MAX_MS = 400;

export const INTRO_SESSION_STORAGE_KEY = 'crics_intro_shown_session';
export const INTRO_SETTING_STORAGE_KEY = 'crics_show_intro';

export const INTRO_CRICS_LOGO_SRC = '/intro-crics.webp';
export const INTRO_ESZ_LOGO_SRC = '/intro-esz.png';

const HEX_PREFIX = '\x23';
export const INTRO_BG_COLOR_HEX = `${HEX_PREFIX}121A45`;
export const INTRO_CAPTION_COLOR_HEX = `${HEX_PREFIX}C7D3FE`;
export const INTRO_CREATOR_COLOR_HEX = `${HEX_PREFIX}FFFFFF`;
export const INTRO_DIVIDER_COLOR_HEX = `${HEX_PREFIX}F59E0B`;

export const INTRO_BRAND_PRODUCER = 'eSportZignal';
export const INTRO_BRAND_CREATOR = 'LINGADASS K';
export const INTRO_SCREEN_READER_TEXT =
  'CRICS, produced by eSportZignal, created by LINGADASS K';

export type IntroMode = 'none' | 'full' | 'live-short' | 'reduced-motion';

export interface IntroDecisionInput {
  sessionShown: boolean;
  showIntroAnimation: boolean;
  hasLiveMatch: boolean;
  reducedMotion: boolean;
}

export interface IntroDecisionResult {
  show: boolean;
  mode: IntroMode;
  durationMs: number;
  showCredits: boolean;
}

export interface IntroTimelineConfig {
  totalMs?: number;
  logoFadeInEndMs?: number;
  sweepEndMs?: number;
  producedByStartMs?: number;
  createdByStartMs?: number;
  creditsSettledMs?: number;
  fadeOutStartMs?: number;
  liveMatchMs?: number;
}

export interface IntroTimelineDerived {
  totalMs: number;
  liveMatchMs: number;
  logoScaleEndPct: number;
  sweepMidPct: number;
  sweepEndPct: number;
  producedByStartPct: number;
  producedByEndPct: number;
  createdByStartPct: number;
  creditsSettledPct: number;
  fadeOutStartPct: number;
  cssVariables: Record<string, string>;
  keyframesCss: string;
}

function toKeyframePct(milestoneMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  return Number(((milestoneMs / totalMs) * 100).toFixed(2));
}

export function buildIntroTimelineStyles(
  config: IntroTimelineConfig = {}
): IntroTimelineDerived {
  const totalMs = config.totalMs ?? INTRO_TOTAL_MS;
  const logoFadeInEndMs = config.logoFadeInEndMs ?? INTRO_LOGO_FADE_IN_END_MS;
  const sweepEndMs = config.sweepEndMs ?? INTRO_SWEEP_END_MS;
  const producedByStartMs = config.producedByStartMs ?? INTRO_PRODUCED_BY_START_MS;
  const createdByStartMs = config.createdByStartMs ?? INTRO_CREATED_BY_START_MS;
  const creditsSettledMs = config.creditsSettledMs ?? INTRO_CREDITS_SETTLED_MS;
  const fadeOutStartMs = config.fadeOutStartMs ?? INTRO_FADE_OUT_START_MS;
  const liveMatchMs = config.liveMatchMs ?? INTRO_LIVE_MATCH_MS;

  const logoScaleEndPct = toKeyframePct(logoFadeInEndMs, totalMs);
  const sweepMidPct = toKeyframePct((logoFadeInEndMs + sweepEndMs) / 2, totalMs);
  const sweepEndPct = toKeyframePct(sweepEndMs, totalMs);
  const producedByStartPct = toKeyframePct(producedByStartMs, totalMs);
  const producedByEndPct = toKeyframePct(createdByStartMs, totalMs);
  const createdByStartPct = toKeyframePct(createdByStartMs, totalMs);
  const creditsSettledPct = toKeyframePct(creditsSettledMs, totalMs);
  const fadeOutStartPct = toKeyframePct(fadeOutStartMs, totalMs);

  const cssVariables: Record<string, string> = {
    '--intro-total-ms': `${totalMs}ms`,
    '--intro-live-ms': `${liveMatchMs}ms`,
    '--intro-logo-fade-end-ms': `${logoFadeInEndMs}ms`,
    '--intro-sweep-end-ms': `${sweepEndMs}ms`,
    '--intro-produced-start-ms': `${producedByStartMs}ms`,
    '--intro-created-start-ms': `${createdByStartMs}ms`,
    '--intro-credits-settled-ms': `${creditsSettledMs}ms`,
    '--intro-fade-out-start-ms': `${fadeOutStartMs}ms`,
  };

  const cssVarDeclarations = Object.entries(cssVariables)
    .map(([key, val]) => `${key}: ${val};`)
    .join('\n          ');

  const keyframesCss = `
        .crics-intro-vars {
          ${cssVarDeclarations}
        }
        @keyframes cricsIntroOverlayFadeOut {
          0%, ${fadeOutStartPct}% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes cricsIntroLiveShortFade {
          0% { opacity: 1; transform: translate3d(0, 0px, 0) scale(0.92); }
          ${logoScaleEndPct}%, ${fadeOutStartPct}% { opacity: 1; transform: translate3d(0, 0px, 0) scale(1); }
          100% { opacity: 0; transform: translate3d(0, 0px, 0) scale(1); }
        }
        @keyframes cricsIntroLogoTimeline {
          0% { opacity: 1; transform: translate3d(0, 0px, 0) scale(0.92); }
          ${logoScaleEndPct}% { opacity: 1; transform: translate3d(0, 0px, 0) scale(1); }
          ${sweepEndPct}% { opacity: 1; transform: translate3d(0, 0px, 0) scale(1); }
          ${creditsSettledPct}%, 100% { opacity: 1; transform: translate3d(0, -128px, 0) scale(0.76); }
        }
        @keyframes cricsIntroSweepTimeline {
          0%, ${logoScaleEndPct}% { opacity: 0; transform: translate3d(-140%, 0, 0) rotate(22deg); }
          ${sweepMidPct}% { opacity: 0.85; }
          ${sweepEndPct}%, 100% { opacity: 0; transform: translate3d(160%, 0, 0) rotate(22deg); }
        }
        @keyframes cricsIntroProducedTimeline {
          0%, ${producedByStartPct}% { opacity: 0; transform: translate3d(0, 10px, 0); }
          ${producedByEndPct}%, 100% { opacity: 1; transform: translate3d(0, 0px, 0); }
        }
        @keyframes cricsIntroCreatedTimeline {
          0%, ${createdByStartPct}% { opacity: 0; transform: translate3d(0, 10px, 0); }
          ${creditsSettledPct}%, 100% { opacity: 1; transform: translate3d(0, 0px, 0); }
        }
        .crics-intro-overlay-anim {
          animation: cricsIntroOverlayFadeOut var(--intro-total-ms) cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: opacity;
        }
        .crics-intro-live-anim {
          animation: cricsIntroLiveShortFade var(--intro-live-ms) ease-out forwards;
          will-change: opacity, transform;
        }
        .crics-intro-logo-anim {
          animation: cricsIntroLogoTimeline var(--intro-total-ms) cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: transform, opacity;
        }
        .crics-intro-sweep-anim {
          animation: cricsIntroSweepTimeline var(--intro-total-ms) ease-in-out forwards;
          will-change: transform, opacity;
        }
        .crics-intro-produced-anim {
          opacity: 0;
          animation: cricsIntroProducedTimeline var(--intro-total-ms) cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: transform, opacity;
        }
        .crics-intro-created-anim {
          opacity: 0;
          animation: cricsIntroCreatedTimeline var(--intro-total-ms) cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: transform, opacity;
        }
  `;

  return {
    totalMs,
    liveMatchMs,
    logoScaleEndPct,
    sweepMidPct,
    sweepEndPct,
    producedByStartPct,
    producedByEndPct,
    createdByStartPct,
    creditsSettledPct,
    fadeOutStartPct,
    cssVariables,
    keyframesCss,
  };
}

export function resolveIntroMode(input: IntroDecisionInput): IntroDecisionResult {
  if (input.sessionShown || !input.showIntroAnimation) {
    return {
      show: false,
      mode: 'none',
      durationMs: 0,
      showCredits: false,
    };
  }

  if (input.hasLiveMatch) {
    return {
      show: true,
      mode: 'live-short',
      durationMs: INTRO_LIVE_MATCH_MS,
      showCredits: false,
    };
  }

  if (input.reducedMotion) {
    return {
      show: true,
      mode: 'reduced-motion',
      durationMs: INTRO_REDUCED_MOTION_MS,
      showCredits: true,
    };
  }

  return {
    show: true,
    mode: 'full',
    durationMs: INTRO_TOTAL_MS,
    showCredits: true,
  };
}

function parseHexChannel(hex: string, start: number): number {
  const val = parseInt(hex.slice(start, start + 2), 16) / 255;
  return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(hexColor: string): number {
  const clean = hexColor.replace('#', '');
  const r = parseHexChannel(clean, 0);
  const g = parseHexChannel(clean, 2);
  const b = parseHexChannel(clean, 4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const lum1 = getRelativeLuminance(foregroundHex);
  const lum2 = getRelativeLuminance(backgroundHex);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}
