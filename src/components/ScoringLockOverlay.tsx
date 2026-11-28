import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { verifyScorerPin } from '../utils/routeAndSecurityUtils';

interface ScoringLockOverlayProps {
  scorerPinSalt?: string;
  scorerPinHash?: string;
  onUnlock: () => void;
  t?: (typeof TRANSLATIONS)['en'];
}

export const ScoringLockOverlay: React.FC<ScoringLockOverlayProps> = ({
  scorerPinSalt,
  scorerPinHash,
  onUnlock,
  t = TRANSLATIONS.en,
}) => {
  const hasPinConfigured = Boolean(scorerPinSalt && scorerPinHash);
  const [holdProgress, setHoldProgress] = useState(0);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopHold = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setHoldProgress(0);
  };

  const startHold = () => {
    stopHold();
    startTimeRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, Math.round((elapsed / 1600) * 100));
      setHoldProgress(pct);
      if (pct >= 100) {
        stopHold();
        onUnlock();
      }
    }, 40);
  };

  useEffect(() => {
    return () => stopHold();
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scorerPinSalt || !scorerPinHash) return;
    const valid = await verifyScorerPin(pinInput, scorerPinSalt, scorerPinHash);
    if (valid) {
      setPinError(null);
      setPinInput('');
      onUnlock();
    } else {
      setPinError(t.scoring.incorrectPinError);
    }
  };

  return (
    <div
      data-testid="scoring-lock-overlay"
      className="rounded-2xl bg-brand-950/95 text-white border border-accent/40 p-4 space-y-3 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-accent font-bold text-sm">
          <Lock className="w-4 h-4" />
          <span>{t.scoring.keypadLockedTitle}</span>
        </div>
        <span className="text-sm text-brand-200">{t.scoring.accidentalTapsBlocked}</span>
      </div>

      {/* Hold-to-Unlock Button */}
      <button
        type="button"
        data-testid="hold-unlock-btn"
        onMouseDown={startHold}
        onMouseUp={stopHold}
        onMouseLeave={stopHold}
        onTouchStart={startHold}
        onTouchEnd={stopHold}
        className="relative w-full min-h-[48px] rounded-xl bg-brand-900 border border-brand-800 overflow-hidden text-sm font-bold text-white flex items-center justify-center gap-2 select-none"
      >
        <div
          className="absolute inset-y-0 left-0 bg-brand-600/70 transition-all duration-75"
          style={{ width: `${holdProgress}%` }}
        />
        <span className="relative z-10 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-300" />
          {holdProgress > 0
            ? `${t.scoring.keepHoldingUnlock} (${holdProgress}%)`
            : t.scoring.pressHoldUnlock}
        </span>
      </button>

      {/* Optional 4-Digit Scorer PIN Unlock */}
      {hasPinConfigured && (
        <form onSubmit={handlePinSubmit} className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <KeyRound className="w-4 h-4 text-brand-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              data-testid="pin-unlock-input"
              inputMode="numeric"
              maxLength={8}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder={t.scoring.enterScorerPinPlaceholder}
              aria-label={t.scoring.scorerPinAria}
              className="w-full min-h-[48px] pl-9 pr-3 py-2 rounded-xl bg-brand-900 border border-brand-800 text-sm text-white font-mono"
            />
          </div>
          <button
            type="submit"
            data-testid="pin-unlock-submit"
            className="min-h-[48px] px-4 rounded-xl bg-accent text-brand-950 text-sm font-bold hover:opacity-90"
          >
            {t.scoring.unlockViaPinBtn}
          </button>
        </form>
      )}
      {pinError && <p className="text-sm text-wicket font-medium">{pinError}</p>}
    </div>
  );
};
