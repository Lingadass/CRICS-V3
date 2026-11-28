import React from 'react';
import { Check } from 'lucide-react';
import { formatBallLabel } from '../engine/scoringEngine';
import { BallEvent, ExtraType, MatchRecord } from '../engine/types';
import { TRANSLATIONS } from '../i18n/translations';

interface LiveEditAndTargetModalsProps {
  match: MatchRecord;
  matchEvents: BallEvent[];
  t: (typeof TRANSLATIONS)['en'];
  showEditBallModal: boolean;
  setShowEditBallModal: (open: boolean) => void;
  editingEvent: BallEvent | null;
  setEditingEvent: (ev: BallEvent | null) => void;
  onSaveEditedBall: (e: React.FormEvent) => void;
  showRevisedTargetModal: boolean;
  setShowRevisedTargetModal: (open: boolean) => void;
  revisedTargetInput: string;
  setRevisedTargetInput: (val: string) => void;
  revisedOversInput: string;
  setRevisedOversInput: (val: string) => void;
  onSaveRevisedTarget: (e: React.FormEvent) => void;
}

export const LiveEditAndTargetModals: React.FC<LiveEditAndTargetModalsProps> = ({
  match,
  matchEvents,
  t,
  showEditBallModal,
  setShowEditBallModal,
  editingEvent,
  setEditingEvent,
  onSaveEditedBall,
  showRevisedTargetModal,
  setShowRevisedTargetModal,
  revisedTargetInput,
  setRevisedTargetInput,
  revisedOversInput,
  setRevisedOversInput,
  onSaveRevisedTarget,
}) => {
  return (
    <>
      {showEditBallModal && (
        <div
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby="edit-ball-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-3xl bg-card border border-line p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 id="edit-ball-modal-title" className="text-base font-bold text-text">
                {t.scoring.editBallModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null);
                  setShowEditBallModal(false);
                }}
                className="min-h-[48px] px-3 text-sm font-semibold text-muted hover:text-text"
              >
                {t.common.close}
              </button>
            </div>

            {!editingEvent ? (
              <div className="space-y-2">
                <p className="text-sm text-muted">
                  {t.scoring.selectDeliveryPrompt}
                </p>
                <div className="divide-y divide-line max-h-60 overflow-y-auto">
                  {matchEvents
                    .filter((e) => e.actionType === 'delivery')
                    .slice()
                    .reverse()
                    .map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => setEditingEvent({ ...ev })}
                        className="w-full min-h-[48px] py-2 px-3 text-left hover:bg-page flex items-center justify-between text-sm rounded-lg"
                      >
                        <span>
                          <strong>{t.scoring.seqPrefix}{ev.sequence}</strong> ({t.scoring.innShort} {ev.inningsNumber})
                        </span>
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-page border border-line">
                          {formatBallLabel(ev, match.rules)}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <form onSubmit={onSaveEditedBall} className="space-y-3">
                <p className="text-sm font-mono text-brand-600 dark:text-brand-400">
                  {t.scoring.editingSeqPrefix}{editingEvent.sequence} ({t.scoring.inningsWord} {editingEvent.inningsNumber})
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="edit-runs-off-bat" className="block text-sm font-semibold text-muted mb-1">
                      {t.scoring.runsOffBatLabel}
                    </label>
                    <input
                      id="edit-runs-off-bat"
                      type="number"
                      min={0}
                      max={6}
                      value={editingEvent.runsOffBat}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          runsOffBat: Number(e.target.value),
                          isBoundaryFour: Number(e.target.value) === 4,
                          isBoundarySix: Number(e.target.value) === 6,
                        })
                      }
                      className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-extra-type" className="block text-sm font-semibold text-muted mb-1">
                      {t.scoring.extraTypeLabel}
                    </label>
                    <select
                      id="edit-extra-type"
                      value={editingEvent.extraType}
                      onChange={(e) => {
                        const nextExtra = e.target.value as ExtraType;
                        setEditingEvent({
                          ...editingEvent,
                          extraType: nextExtra,
                          secondaryExtraType:
                            nextExtra === 'no-ball'
                              ? editingEvent.secondaryExtraType
                              : undefined,
                        });
                      }}
                      className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
                    >
                      <option value="none">{t.scoring.extraNone}</option>
                      <option value="wide">{t.scoring.wide}</option>
                      <option value="no-ball">{t.scoring.noBall}</option>
                      <option value="bye">{t.scoring.bye}</option>
                      <option value="leg-bye">{t.scoring.legBye}</option>
                      <option value="penalty">{t.scoring.penalty}</option>
                    </select>
                  </div>
                </div>
                {editingEvent.extraType === 'no-ball' && (
                  <div>
                    <label htmlFor="edit-nb-secondary" className="block text-sm font-semibold text-muted mb-1">
                      {t.scoring.nbSecondaryLabel}
                    </label>
                    <select
                      id="edit-nb-secondary"
                      value={editingEvent.secondaryExtraType || 'none'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingEvent({
                          ...editingEvent,
                          secondaryExtraType:
                            val === 'bye' || val === 'leg-bye' ? val : undefined,
                          runsOffBat:
                            val === 'bye' || val === 'leg-bye'
                              ? 0
                              : editingEvent.runsOffBat,
                        });
                      }}
                      className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
                    >
                      <option value="none">{t.scoring.nbOffBatOption}</option>
                      <option value="bye">{t.scoring.nbByesOption}</option>
                      <option value="leg-bye">{t.scoring.nbLegByesOption}</option>
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="edit-extra-runs" className="block text-sm font-semibold text-muted mb-1">
                      {t.scoring.extraRunsLabel}
                    </label>
                    <input
                      id="edit-extra-runs"
                      type="number"
                      min={0}
                      max={10}
                      value={editingEvent.extraRuns}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          extraRuns: Number(e.target.value),
                        })
                      }
                      className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label htmlFor="edit-wicket-checkbox" className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        id="edit-wicket-checkbox"
                        type="checkbox"
                        checked={editingEvent.isWicket}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            isWicket: e.target.checked,
                            wicketType: e.target.checked
                              ? editingEvent.wicketType || 'bowled'
                              : undefined,
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span>{t.scoring.wicketOnBallCheckbox}</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingEvent(null)}
                    className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold"
                  >
                    {t.scoring.backToBallListBtn}
                  </button>
                  <button
                    type="submit"
                    className="min-h-[48px] flex-1 rounded-xl bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {t.scoring.recalculateMatchBtn}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showRevisedTargetModal && (
        <div
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby="revised-target-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <form
            onSubmit={onSaveRevisedTarget}
            className="w-full max-w-sm rounded-3xl bg-card border border-line p-5 space-y-3"
          >
            <h3 id="revised-target-modal-title" className="text-base font-bold text-text">
              {t.scoring.revisedTargetModalTitle}
            </h3>
            <div>
              <label htmlFor="revised-target-runs-input" className="block text-sm font-semibold text-muted mb-1">
                {t.scoring.revisedTargetRunsLabel}
              </label>
              <input
                id="revised-target-runs-input"
                type="number"
                min={1}
                value={revisedTargetInput}
                onChange={(e) => setRevisedTargetInput(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="revised-max-overs-input" className="block text-sm font-semibold text-muted mb-1">
                {t.scoring.revisedMaxOversLabel}
              </label>
              <input
                id="revised-max-overs-input"
                type="number"
                min={1}
                value={revisedOversInput}
                onChange={(e) => setRevisedOversInput(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowRevisedTargetModal(false)}
                className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="min-h-[48px] flex-1 rounded-xl bg-brand-600 text-white text-sm font-bold"
              >
                {t.scoring.applyTargetBtn}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
