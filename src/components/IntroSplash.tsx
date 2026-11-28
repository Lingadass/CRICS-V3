import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getTranslations } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';
import {
  buildIntroTimelineStyles,
  INTRO_BRAND_CREATOR,
  INTRO_BRAND_PRODUCER,
  INTRO_CRICS_LOGO_SRC,
  INTRO_DB_WAIT_MAX_MS,
  INTRO_ESZ_LOGO_SRC,
  INTRO_SESSION_STORAGE_KEY,
  INTRO_SETTING_STORAGE_KEY,
  INTRO_SKIP_VISIBLE_MS,
  IntroDecisionResult,
  resolveIntroMode,
} from '../utils/introConfig';

function removeInlineInitialSplash() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('initial-intro-splash');
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

async function preloadAndDecodeImage(src: string): Promise<void> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;
  try {
    const img = new Image();
    img.src = src;
    if (typeof img.decode === 'function') {
      await Promise.race([
        img.decode(),
        new Promise<void>((resolve) => setTimeout(resolve, 180)),
      ]);
    }
  } catch {
    // Proceed cleanly if image decode rejects in headless/test environments
  }
}

export const IntroSplash: React.FC = () => {
  const { isInitialized, settings, matches } = useCricsStore();
  const t = getTranslations(settings.language);
  const timelineStyles = useMemo(() => buildIntroTimelineStyles(), []);

  const [sessionAlreadyShown] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (window.sessionStorage.getItem(INTRO_SESSION_STORAGE_KEY) === '1') return true;
      if (window.localStorage.getItem(INTRO_SETTING_STORAGE_KEY) === '0') return true;
    } catch {
      // Ignore storage access errors
    }
    return false;
  });

  const [reducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Frozen decision ref: once chosen (after isInitialized or 400ms fallback), it can never change
  const initialSkippedDecision: IntroDecisionResult | null = sessionAlreadyShown
    ? { show: false, mode: 'none', durationMs: 0, showCredits: false }
    : null;
  const frozenDecisionRef = useRef<IntroDecisionResult | null>(initialSkippedDecision);
  const [frozenDecision, setFrozenDecision] = useState<IntroDecisionResult | null>(
    initialSkippedDecision
  );

  const [isDismissed, setIsDismissed] = useState<boolean>(sessionAlreadyShown);
  const [imagesDecoded, setImagesDecoded] = useState<boolean>(false);
  const [showSkipBtn, setShowSkipBtn] = useState<boolean>(false);
  const dismissedRef = useRef<boolean>(sessionAlreadyShown);
  const mountTimestampRef = useRef<number>(0);

  useEffect(() => {
    mountTimestampRef.current = performance.now();
  }, []);

  const finishIntro = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(INTRO_SESSION_STORAGE_KEY, '1');
      } catch {
        // Ignore storage errors
      }
    }
    removeInlineInitialSplash();
    setIsDismissed(true);
  }, []);

  // Wait for isInitialized before choosing and freezing the mode; give up after 400ms and use full mode
  useEffect(() => {
    if (frozenDecisionRef.current) return;

    if (isInitialized) {
      const hasLiveMatch = matches.some((m) => m.status === 'live');
      const showIntroSetting = settings.showIntroAnimation ?? true;
      const resolved = resolveIntroMode({
        sessionShown: sessionAlreadyShown,
        showIntroAnimation: showIntroSetting,
        hasLiveMatch,
        reducedMotion,
      });
      frozenDecisionRef.current = resolved;
      queueMicrotask(() => {
        setFrozenDecision(resolved);
        if (!resolved.show) {
          finishIntro();
        }
      });
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      if (frozenDecisionRef.current) return;
      const fallbackDecision = resolveIntroMode({
        sessionShown: sessionAlreadyShown,
        showIntroAnimation: true,
        hasLiveMatch: false,
        reducedMotion,
      });
      frozenDecisionRef.current = fallbackDecision;
      setFrozenDecision(fallbackDecision);
    }, INTRO_DB_WAIT_MAX_MS);

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [isInitialized, matches, settings.showIntroAnimation, sessionAlreadyShown, reducedMotion, finishIntro]);

  // Preload and decode both intro images in parallel with DB initialization
  useEffect(() => {
    if (sessionAlreadyShown || isDismissed) {
      removeInlineInitialSplash();
      return;
    }

    let cancelled = false;
    void Promise.all([
      preloadAndDecodeImage(INTRO_CRICS_LOGO_SRC),
      preloadAndDecodeImage(INTRO_ESZ_LOGO_SRC),
    ]).then(() => {
      if (!cancelled) {
        setImagesDecoded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionAlreadyShown, isDismissed]);

  // Synchronously remove #initial-intro-splash in the exact commit when React overlay renders or dismisses
  const isOverlayReady = Boolean(frozenDecision && frozenDecision.show && imagesDecoded && !isDismissed);
  useLayoutEffect(() => {
    if (isDismissed || (frozenDecision && !frozenDecision.show) || isOverlayReady) {
      removeInlineInitialSplash();
    }
  }, [isDismissed, frozenDecision, isOverlayReady]);

  // Mark session flag once shown & schedule Skip button (800ms) + auto-dismiss
  useEffect(() => {
    if (!isOverlayReady || !frozenDecision) return;

    try {
      window.sessionStorage.setItem(INTRO_SESSION_STORAGE_KEY, '1');
    } catch {
      // Ignore storage errors
    }

    const elapsedSinceMount =
      mountTimestampRef.current > 0
        ? Math.min(INTRO_DB_WAIT_MAX_MS, Math.max(0, performance.now() - mountTimestampRef.current))
        : 0;
    const remainingSkipMs = Math.max(0, INTRO_SKIP_VISIBLE_MS - elapsedSinceMount);
    const remainingTotalMs = Math.max(200, frozenDecision.durationMs - elapsedSinceMount);

    const skipTimer = window.setTimeout(() => {
      setShowSkipBtn(true);
    }, remainingSkipMs);

    const endTimer = window.setTimeout(() => {
      finishIntro();
    }, remainingTotalMs);

    return () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(endTimer);
    };
  }, [isOverlayReady, frozenDecision, finishIntro]);

  // Escape or Enter skips immediately (no focus trap)
  useEffect(() => {
    if (isDismissed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        finishIntro();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDismissed, finishIntro]);

  // Keep inline splash visible while waiting for frozenDecision and imagesDecoded
  if (!isOverlayReady || !frozenDecision) {
    return null;
  }

  const isFullAnimated = frozenDecision.mode === 'full';
  const isLiveShort = frozenDecision.mode === 'live-short';
  const isReducedMotion = frozenDecision.mode === 'reduced-motion';

  return (
    <div
      data-testid="intro-splash"
      data-intro-mode={frozenDecision.mode}
      role="region"
      aria-label={t.intro.screenReaderLabel}
      onClick={finishIntro}
      className={`crics-intro-vars fixed inset-0 z-50 bg-brand-950 text-white select-none overflow-hidden flex flex-col items-center justify-center px-4 cursor-pointer ${
        isFullAnimated ? 'crics-intro-overlay-anim' : isLiveShort ? 'crics-intro-live-anim' : ''
      }`}
    >
      <style>{timelineStyles.keyframesCss}</style>

      {/* Main centered stage (uses transform and opacity only, zero layout shift) */}
      <div
        aria-hidden="true"
        className="relative w-full max-w-[328px] h-[460px] flex flex-col items-center justify-center"
      >
        {/* CRICS Logo Container (exact 160x160 matching #initial-intro-splash) */}
        <div
          data-testid="intro-crics-logo-wrap"
          className={`relative w-40 h-40 rounded-[28px] overflow-hidden shadow-2xl border border-white/15 ${
            isFullAnimated
              ? 'crics-intro-logo-anim'
              : isReducedMotion
                ? '-translate-y-[128px] scale-[0.76]'
                : ''
          }`}
        >
          <img
            data-testid="intro-crics-logo"
            src={INTRO_CRICS_LOGO_SRC}
            alt=""
            width={160}
            height={160}
            className="w-full h-full object-cover block"
          />
          {isFullAnimated && (
            <div
              className="pointer-events-none absolute inset-y-[-30%] w-16 bg-gradient-to-r from-transparent via-white/45 to-transparent crics-intro-sweep-anim"
            />
          )}
        </div>

        {/* Credits Block (Produced by eSportZignal + Created by LINGADASS K) */}
        {frozenDecision.showCredits && (
          <div className="absolute inset-x-0 top-[192px] flex flex-col items-center text-center">
            {/* Produced by + eSportZignal logo */}
            <div
              data-testid="intro-produced-block"
              data-producer-brand={INTRO_BRAND_PRODUCER}
              className={`w-full flex flex-col items-center ${
                isFullAnimated ? 'crics-intro-produced-anim' : 'opacity-100'
              }`}
            >
              <p
                data-testid="intro-produced-caption"
                className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-200 mb-2"
              >
                {t.intro.producedBy}
              </p>
              <img
                data-testid="intro-esz-logo"
                src={INTRO_ESZ_LOGO_SRC}
                alt=""
                width={210}
                height={127}
                className="w-[196px] max-w-[230px] h-auto max-h-[122px] object-contain mx-auto block"
              />
            </div>

            {/* Gold divider + Created by LINGADASS K */}
            <div
              data-testid="intro-created-block"
              className={`w-full flex flex-col items-center mt-4 ${
                isFullAnimated ? 'crics-intro-created-anim' : 'opacity-100'
              }`}
            >
              <div className="w-12 h-[2px] rounded-full bg-accent mb-3.5" />
              <p
                data-testid="intro-created-caption"
                className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-200 mb-1.5"
              >
                {t.intro.createdBy}
              </p>
              <p
                data-testid="intro-creator-name"
                className="text-[22px] sm:text-2xl font-semibold tracking-[0.14em] text-white leading-tight"
              >
                {INTRO_BRAND_CREATOR}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Visible Skip button (>= 48px target) shown after 800 ms */}
      {showSkipBtn && (
        <button
          type="button"
          data-testid="intro-skip-btn"
          onClick={(e) => {
            e.stopPropagation();
            finishIntro();
          }}
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-50 min-h-[48px] min-w-[72px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold tracking-wider uppercase text-white transition-colors"
        >
          {t.intro.skipBtn}
        </button>
      )}
    </div>
  );
};
