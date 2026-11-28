import React, { useState } from 'react';
import {
  ArrowLeftRight,
  MoreHorizontal,
  Plus,
  RotateCcw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { BallEvent, ExtraType } from '../engine/types';
import { TRANSLATIONS, TranslationDictionary } from '../i18n/translations';
import { LiveKeypadMoreActions } from './LiveKeypadMoreActions';

export function formatBallConfirmationMessage(
  ev: Pick<BallEvent, 'actionType' | 'runsOffBat' | 'extraType' | 'extraRuns' | 'isWicket'>,
  t: TranslationDictionary = TRANSLATIONS.en
): string {
  if (ev.actionType === 'bowler-change') return t.scoring.confirmBowlerChanged;
  if (ev.actionType === 'manual-strike-swap') return t.scoring.confirmStrikeSwapped;
  if (ev.actionType === 'batter-retire') return t.scoring.confirmBatterRetired;
  if (ev.isWicket) return t.scoring.confirmWicketRecorded;
  if (ev.extraType && ev.extraType !== 'none') {
    const labelMap: Record<ExtraType, string> = {
      none: '',
      wide: t.scoring.wide,
      'no-ball': t.scoring.noBall,
      bye: t.scoring.bye,
      'leg-bye': t.scoring.legBye,
      penalty: t.scoring.penalty,
    };
    const runs = ev.extraType === 'no-ball' && ev.runsOffBat > 0 ? ev.runsOffBat : ev.extraRuns;
    return runs > 0
      ? `${labelMap[ev.extraType]} + ${runs} ${runs === 1 ? t.scoring.confirmRunSingular : t.scoring.confirmRunsPlural
      } ${t.scoring.confirmRecordedSuffix}`
      : `${labelMap[ev.extraType]} ${t.scoring.confirmRecordedSuffix}`;
  }
  if (ev.runsOffBat === 0) return t.scoring.confirmDotRecorded;
  return `${ev.runsOffBat} ${ev.runsOffBat === 1 ? t.scoring.confirmRunSingular : t.scoring.confirmRunsPlural
    } ${t.scoring.confirmRecordedSuffix}`;
}

interface LiveScoringKeypadProps {
  selectedExtra: ExtraType;
  setSelectedExtra: (ex: ExtraType) => void;
  selectedSecondaryExtra: 'none' | 'bye' | 'leg-bye';
  setSelectedSecondaryExtra: (sec: 'none' | 'bye' | 'leg-bye') => void;
  isScoringWriteInFlight: boolean;
  canUndo: boolean;
  canRedo: boolean;
  lastBallSrMessage?: string | null;
  onRunTap: (runsClicked: number) => void;
  onRecordExtraDelivery: (
    extraType: ExtraType,
    runsClicked: number,
    secondaryExtra: 'none' | 'bye' | 'leg-bye'
  ) => void;
  onOpenWicketDialog: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSwapStrike: () => void;
  onOpenBowlerModal: () => void;
  onOpenRetireModal: () => void;
  onOpenEditBallModal: () => void;
  onOpenDlsModal?: () => void;
  highContrastScoring?: boolean;
  onToggleHighContrast?: () => void;
  t: (typeof TRANSLATIONS)['en'];
}

export const LiveScoringKeypad: React.FC<LiveScoringKeypadProps> = ({
  selectedExtra,
  setSelectedExtra,
  selectedSecondaryExtra,
  setSelectedSecondaryExtra,
  isScoringWriteInFlight,
  canUndo,
  canRedo,
  lastBallSrMessage,
  onRunTap,
  onRecordExtraDelivery,
  onOpenWicketDialog,
  onUndo,
  onRedo,
  onSwapStrike,
  onOpenBowlerModal,
  onOpenRetireModal,
  onOpenEditBallModal,
  onOpenDlsModal,
  highContrastScoring,
  onToggleHighContrast,
  t,
}) => {
  const [showMoreRunsChooser, setShowMoreRunsChooser] = useState(false);
  const [showMoreActionsSheet, setShowMoreActionsSheet] = useState(false);

  const extraDisplayLabel: Record<ExtraType, string> = {
    none: '',
    wide: t.scoring.wide,
    'no-ball': t.scoring.noBall,
    bye: t.scoring.bye,
    'leg-bye': t.scoring.legBye,
    penalty: t.scoring.penalty,
  };

  return (
    <section
      data-testid="live-scoring-keypad"
      aria-label={t.scoring.keypadAria}
      className="mt-auto shrink-0 flex flex-col justify-between p-1 bg-card border border-line rounded-2xl shadow-xs gap-1 select-none pb-[env(safe-area-inset-bottom)]"
    >
      {/* Visually hidden screen reader region replaces banner */}
      <div
        role="status"
        aria-live="polite"
        data-testid="live-sr-confirmation"
        className="sr-only"
      >
        {lastBallSrMessage}
      </div>

      {/* Row 1: Extras Row (48px fixed) */}
      <div
        data-testid="live-extras-row"
        className="grid grid-cols-5 gap-1 h-[48px] min-h-[48px] max-h-[48px] shrink-0"
      >
        {(
          [
            { type: 'wide', label: t.scoring.wide, testId: 'extra-wide-btn' },
            { type: 'no-ball', label: t.scoring.noBall, testId: 'extra-noball-btn' },
            { type: 'bye', label: t.scoring.bye, testId: 'extra-bye-btn' },
            { type: 'leg-bye', label: t.scoring.legBye, testId: 'extra-legbye-btn' },
            { type: 'penalty', label: t.scoring.penalty, testId: 'extra-penalty-btn' },
          ] as { type: ExtraType; label: string; testId: string }[]
        ).map((ex) => {
          const active = selectedExtra === ex.type;
          return (
            <button
              key={ex.type}
              type="button"
              data-testid={ex.testId}
              disabled={isScoringWriteInFlight}
              onClick={() => {
                setShowMoreRunsChooser(false);
                const nextEx = active ? 'none' : ex.type;
                setSelectedExtra(nextEx);
                if (nextEx !== 'no-ball') setSelectedSecondaryExtra('none');
              }}
              className={`h-[48px] min-h-[48px] max-h-[48px] px-1 rounded-xl text-sm font-bold leading-tight transition-colors border disabled:opacity-50 flex items-center justify-center ${active
                  ? 'bg-extra text-white border-extra shadow-xs'
                  : 'bg-page text-text border-line hover:bg-brand-50 dark:hover:bg-brand-950'
                }`}
            >
              {ex.label}
            </button>
          );
        })}
      </div>

      {/* One-Step Extra Run Chooser (collapsible when active) */}
      {selectedExtra !== 'none' && (
        <div
          role="region"
          aria-label={t.scoring.extraChooserAria}
          className="rounded-xl bg-extra/15 border border-extra p-1.5 space-y-1 shrink-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-extrabold text-extra">
              {extraDisplayLabel[selectedExtra]} + ... ({t.scoring.tapRunsToRecord})
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedExtra('none');
                setSelectedSecondaryExtra('none');
              }}
              aria-label={t.scoring.cancelExtraAria}
              className="min-h-[48px] min-w-[48px] rounded-xl bg-card border border-line text-sm font-bold text-text flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedExtra === 'no-ball' && (
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { value: 'none', label: t.scoring.nbBat },
                  { value: 'bye', label: t.scoring.nbByes },
                  { value: 'leg-bye', label: t.scoring.nbLegByes },
                ] as const
              ).map((sub) => (
                <button
                  key={sub.value}
                  type="button"
                  onClick={() => setSelectedSecondaryExtra(sub.value)}
                  className={`min-h-[48px] rounded-xl text-sm font-bold border ${selectedSecondaryExtra === sub.value
                      ? 'bg-extra text-white border-extra'
                      : 'bg-card text-text border-line'
                    }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-7 gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map((extraRunChoice) => (
              <button
                key={extraRunChoice}
                type="button"
                disabled={isScoringWriteInFlight}
                onClick={() => {
                  onRecordExtraDelivery(selectedExtra, extraRunChoice, selectedSecondaryExtra);
                  setSelectedExtra('none');
                  setSelectedSecondaryExtra('none');
                }}
                className="min-h-[48px] rounded-xl bg-card border border-extra font-mono text-sm font-extrabold text-text hover:bg-extra hover:text-white flex items-center justify-center"
              >
                +{extraRunChoice}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overthrows chooser modal and More actions modal */}
      <LiveKeypadMoreActions
        showMoreRunsChooser={showMoreRunsChooser}
        setShowMoreRunsChooser={setShowMoreRunsChooser}
        showMoreActionsSheet={showMoreActionsSheet}
        setShowMoreActionsSheet={setShowMoreActionsSheet}
        isScoringWriteInFlight={isScoringWriteInFlight}
        canRedo={canRedo}
        onRunTap={onRunTap}
        onSwapStrike={onSwapStrike}
        onRedo={onRedo}
        onOpenBowlerModal={onOpenBowlerModal}
        onOpenRetireModal={onOpenRetireModal}
        onOpenEditBallModal={onOpenEditBallModal}
        onOpenDlsModal={onOpenDlsModal}
        highContrastScoring={highContrastScoring}
        onToggleHighContrast={onToggleHighContrast}
        t={t}
      />

      {/* Row 2 & 3: Run Grid (Two rows sharing leftover height, min 48px, max 80px) */}
      <div
        data-testid="live-run-grid"
        className="grid grid-cols-4 grid-rows-2 gap-1 min-h-[100px] max-h-[168px] h-[clamp(100px,22vh,164px)]"
      >
        {[0, 1, 2, 3, 4, 5, 6].map((runVal) => {
          const isFour = runVal === 4;
          const isSix = runVal === 6;
          const colorClasses = isFour
            ? 'bg-four/15 text-four border border-four/40 hover:bg-four/25'
            : isSix
              ? 'bg-six/15 text-six border border-six/40 hover:bg-six/25'
              : 'bg-page text-text border border-line hover:bg-brand-50 dark:hover:bg-brand-950';

          const activeExtraLabel = extraDisplayLabel[selectedExtra];
          const runSubLabel =
            selectedExtra !== 'none'
              ? isFour
                ? `${activeExtraLabel}+4`
                : isSix
                  ? `${activeExtraLabel}+6`
                  : `${activeExtraLabel}+${runVal}`
              : runVal === 0
                ? t.scoring.dotUpper
                : isFour
                  ? t.scoring.fourUpper || 'FOUR'
                  : isSix
                    ? t.scoring.sixUpper || 'SIX'
                    : t.scoring.runsUpper;

          return (
            <button
              key={runVal}
              type="button"
              data-testid={`run-btn-${runVal}`}
              disabled={isScoringWriteInFlight}
              onClick={() => onRunTap(runVal)}
              className={`h-full min-h-[48px] max-h-[80px] rounded-xl font-mono text-xl font-extrabold active:scale-95 transition-transform disabled:opacity-50 flex flex-col items-center justify-center leading-none ${colorClasses}`}
            >
              <span className="leading-none">{runVal}</span>
              <span className="text-sm font-sans font-bold leading-tight mt-0.5">{runSubLabel}</span>
            </button>
          );
        })}

        <button
          type="button"
          data-testid="run-btn-more"
          disabled={isScoringWriteInFlight}
          onClick={() => setShowMoreRunsChooser((v) => !v)}
          className="h-full min-h-[48px] max-h-[80px] rounded-xl bg-page text-text border border-line hover:bg-brand-50 dark:hover:bg-brand-950 font-bold text-sm flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5 text-brand-600 dark:text-brand-300" />
          <span className="leading-tight">{t.scoring.moreRuns}</span>
        </button>
      </div>

      {/* Row 4 & 5: Bottom Actions (Wicket & Undo up to 56px; Swap & More actions up to 56px) */}
      <div data-testid="live-bottom-actions-row" className="flex flex-col gap-1 shrink-0">
        {/* Row 4: Wicket & Undo (up to 56px) */}
        <div className="grid grid-cols-2 gap-1 min-h-[52px] max-h-[56px] h-[clamp(52px,7.5vh,56px)]">
          <button
            type="button"
            data-testid="live-wicket-btn"
            disabled={isScoringWriteInFlight}
            onClick={onOpenWicketDialog}
            aria-label={`${t.scoring.wicket} (WKT)`}
            className="h-full min-h-[52px] max-h-[56px] px-2.5 rounded-xl bg-wicket hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{t.scoring.wicket}</span>
          </button>

          <button
            type="button"
            data-testid="live-undo-btn"
            disabled={isScoringWriteInFlight || !canUndo}
            onClick={onUndo}
            className="h-full min-h-[52px] max-h-[56px] px-2.5 rounded-xl bg-page border border-line disabled:opacity-40 text-sm font-bold text-text flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>{t.scoring.undo}</span>
          </button>
        </div>

        {/* Row 5: Swap strike & More actions (up to 56px) */}
        <div className="grid grid-cols-2 gap-1 min-h-[48px] max-h-[56px] h-[clamp(48px,7.5vh,56px)]">
          <button
            type="button"
            data-testid="live-swap-btn"
            disabled={isScoringWriteInFlight}
            onClick={onSwapStrike}
            className="h-full min-h-[48px] max-h-[56px] px-2.5 rounded-xl border border-line text-sm font-semibold text-text flex items-center justify-center gap-1.5 hover:bg-page"
          >
            <ArrowLeftRight className="w-4 h-4 shrink-0" />
            <span>{t.scoring.swapStrike}</span>
          </button>

          <button
            type="button"
            data-testid="live-more-actions-btn"
            disabled={isScoringWriteInFlight}
            onClick={() => setShowMoreActionsSheet(true)}
            aria-label={t.scoring.moreActions}
            className="h-full min-h-[48px] max-h-[56px] px-2.5 rounded-xl border border-line text-sm font-semibold text-text flex items-center justify-center gap-1.5 hover:bg-page"
          >
            <MoreHorizontal className="w-4 h-4 shrink-0" />
            <span>{t.scoring.moreActions}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
