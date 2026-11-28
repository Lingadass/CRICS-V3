import React from 'react';
import {
  ArrowLeftRight,
  Contrast,
  Edit3,
  RotateCw,
  Sliders,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import { useModalEscape } from '../hooks/useModalEscape';
import { TranslationDictionary } from '../i18n/translations';

interface LiveKeypadMoreActionsProps {
  showMoreRunsChooser: boolean;
  setShowMoreRunsChooser: (show: boolean) => void;
  showMoreActionsSheet: boolean;
  setShowMoreActionsSheet: (show: boolean) => void;
  isScoringWriteInFlight: boolean;
  canRedo: boolean;
  onRunTap: (runsClicked: number) => void;
  onSwapStrike: () => void;
  onRedo: () => void;
  onOpenBowlerModal: () => void;
  onOpenRetireModal: () => void;
  onOpenEditBallModal: () => void;
  onOpenDlsModal?: () => void;
  highContrastScoring?: boolean;
  onToggleHighContrast?: () => void;
  t: TranslationDictionary;
}

export const LiveKeypadMoreActions: React.FC<LiveKeypadMoreActionsProps> = ({
  showMoreRunsChooser,
  setShowMoreRunsChooser,
  showMoreActionsSheet,
  setShowMoreActionsSheet,
  isScoringWriteInFlight,
  canRedo,
  onRunTap,
  onSwapStrike,
  onRedo,
  onOpenBowlerModal,
  onOpenRetireModal,
  onOpenEditBallModal,
  onOpenDlsModal,
  highContrastScoring,
  onToggleHighContrast,
  t,
}) => {
  useModalEscape(showMoreActionsSheet, () => setShowMoreActionsSheet(false));

  return (
    <>
      {/* Overthrows / More Runs Chooser */}
      {showMoreRunsChooser && (
        <div
          role="region"
          aria-label={t.scoring.overthrowsChooserAria}
          className="rounded-xl bg-brand-50 dark:bg-brand-950 border border-brand-500 p-2 space-y-1.5 shrink-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-text">{t.scoring.overthrowsTitle}</span>
            <button
              type="button"
              onClick={() => setShowMoreRunsChooser(false)}
              className="min-h-[48px] px-3 rounded-xl bg-card border border-line text-sm font-bold text-text"
            >
              {t.common.close}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[5, 6, 7, 8].map((overthrowVal) => (
              <button
                key={overthrowVal}
                type="button"
                disabled={isScoringWriteInFlight}
                onClick={() => {
                  setShowMoreRunsChooser(false);
                  onRunTap(overthrowVal);
                }}
                className="min-h-[48px] rounded-xl bg-brand-600 text-white font-mono text-base font-extrabold"
              >
                {overthrowVal} {t.scoring.runsUpper}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* More Actions Bottom Sheet */}
      {showMoreActionsSheet && (
        <div
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby="more-scoring-actions-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-3"
          onClick={() => setShowMoreActionsSheet(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-card border border-line p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 border-b border-line">
              <h3 id="more-scoring-actions-title" className="text-base font-bold text-text">
                {t.scoring.moreActions}
              </h3>
              <button
                type="button"
                onClick={() => setShowMoreActionsSheet(false)}
                className="min-h-[48px] px-3 text-sm font-semibold text-muted"
              >
                {t.common.close}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isScoringWriteInFlight}
                onClick={() => {
                  setShowMoreActionsSheet(false);
                  onSwapStrike();
                }}
                className="min-h-[48px] px-3 rounded-xl bg-page border border-line text-sm font-bold text-text flex items-center gap-2"
              >
                <ArrowLeftRight className="w-4 h-4 shrink-0" />
                <span>{t.scoring.swapStrike}</span>
              </button>
              <button
                type="button"
                disabled={isScoringWriteInFlight || !canRedo}
                onClick={() => {
                  setShowMoreActionsSheet(false);
                  onRedo();
                }}
                className="min-h-[48px] px-3 rounded-xl bg-page border border-line disabled:opacity-40 text-sm font-bold text-text flex items-center gap-2"
              >
                <RotateCw className="w-4 h-4 shrink-0" />
                <span>{t.scoring.redo}</span>
              </button>
              <button
                type="button"
                disabled={isScoringWriteInFlight}
                onClick={() => {
                  setShowMoreActionsSheet(false);
                  onOpenBowlerModal();
                }}
                className="min-h-[48px] px-3 rounded-xl bg-page border border-line text-sm font-bold text-text flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>{t.scoring.changeBowler}</span>
              </button>
              <button
                type="button"
                disabled={isScoringWriteInFlight}
                onClick={() => {
                  setShowMoreActionsSheet(false);
                  onOpenRetireModal();
                }}
                className="min-h-[48px] px-3 rounded-xl bg-page border border-line text-sm font-bold text-text flex items-center gap-2"
              >
                <UserMinus className="w-4 h-4 shrink-0" />
                <span>{t.scoring.retireReplace}</span>
              </button>
              <button
                type="button"
                disabled={isScoringWriteInFlight}
                onClick={() => {
                  setShowMoreActionsSheet(false);
                  onOpenEditBallModal();
                }}
                className="min-h-[48px] px-3 rounded-xl bg-page border border-line text-sm font-bold text-text flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4 shrink-0" />
                <span>{t.scoring.editBall}</span>
              </button>
              {onOpenDlsModal && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreActionsSheet(false);
                    onOpenDlsModal();
                  }}
                  className="min-h-[48px] px-3 rounded-xl bg-page border border-line text-sm font-bold text-text flex items-center gap-2"
                >
                  <Sliders className="w-4 h-4 shrink-0" />
                  <span>
                    {t.scoring.revisedTarget} ({t.scoring.dlsShort})
                  </span>
                </button>
              )}
              {onToggleHighContrast && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreActionsSheet(false);
                    onToggleHighContrast();
                  }}
                  aria-pressed={Boolean(highContrastScoring)}
                  className="min-h-[48px] px-3 rounded-xl bg-page border border-line text-sm font-bold text-text flex items-center gap-2"
                >
                  <Contrast className="w-4 h-4 shrink-0" />
                  <span>{t.scoring.highContrastBtn}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
