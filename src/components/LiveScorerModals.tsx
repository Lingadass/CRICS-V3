import React from 'react';
import { isValidFreeHitWicket } from '../engine/scoringEngine';
import {
  BallEvent,
  BowlerChangeReason,
  DerivedInningsState,
  MatchRecord,
  Player,
  WicketType,
} from '../engine/types';
import { useModalEscape } from '../hooks/useModalEscape';
import { TRANSLATIONS } from '../i18n/translations';
import { LiveEditAndTargetModals } from './LiveEditAndTargetModals';

interface LiveScorerModalsProps {
  match: MatchRecord;
  inn: DerivedInningsState;
  bowlingXI: string[];
  playersMap: Record<string, Player>;
  matchEvents: BallEvent[];
  t: (typeof TRANSLATIONS)['en'];

  showWicketModal: boolean;
  setShowWicketModal: (open: boolean) => void;
  wicketType: WicketType;
  setWicketType: (wt: WicketType) => void;
  dismissedPlayerId: string;
  setDismissedPlayerId: (id: string) => void;
  fielderId: string;
  setFielderId: (id: string) => void;
  incomingBatterId: string;
  setIncomingBatterId: (id: string) => void;
  wicketRunsCrossed: number;
  setWicketRunsCrossed: (runs: number) => void;
  runOutEnd: 'striker' | 'non-striker';
  setRunOutEnd: (end: 'striker' | 'non-striker') => void;
  onConfirmWicket: (e: React.FormEvent) => void;

  showBowlerModal: boolean;
  setShowBowlerModal: (open: boolean) => void;
  nextBowlerId: string;
  setNextBowlerId: (id: string) => void;
  bowlerChangeReason: BowlerChangeReason;
  setBowlerChangeReason: (reason: BowlerChangeReason) => void;
  onConfirmBowlerChange: (e: React.FormEvent) => void;

  showRetireModal: boolean;
  setShowRetireModal: (open: boolean) => void;
  retireTargetId: string;
  setRetireTargetId: (id: string) => void;
  retireReplacementId: string;
  setRetireReplacementId: (id: string) => void;
  isRetiredHurtFlag: boolean;
  setIsRetiredHurtFlag: (flag: boolean) => void;
  onConfirmRetire: (e: React.FormEvent) => void;

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

export const LiveScorerModals: React.FC<LiveScorerModalsProps> = ({
  match,
  inn,
  bowlingXI,
  playersMap,
  matchEvents,
  t,
  showWicketModal,
  setShowWicketModal,
  wicketType,
  setWicketType,
  dismissedPlayerId,
  setDismissedPlayerId,
  fielderId,
  setFielderId,
  incomingBatterId,
  setIncomingBatterId,
  wicketRunsCrossed,
  setWicketRunsCrossed,
  runOutEnd,
  setRunOutEnd,
  onConfirmWicket,
  showBowlerModal,
  setShowBowlerModal,
  nextBowlerId,
  setNextBowlerId,
  bowlerChangeReason,
  setBowlerChangeReason,
  onConfirmBowlerChange,
  showRetireModal,
  setShowRetireModal,
  retireTargetId,
  setRetireTargetId,
  retireReplacementId,
  setRetireReplacementId,
  isRetiredHurtFlag,
  setIsRetiredHurtFlag,
  onConfirmRetire,
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
  const anyModalOpen =
    showWicketModal ||
    showBowlerModal ||
    showRetireModal ||
    showEditBallModal ||
    showRevisedTargetModal;

  useModalEscape(anyModalOpen, () => {
    setShowWicketModal(false);
    setShowBowlerModal(false);
    setShowRetireModal(false);
    setShowEditBallModal(false);
    setShowRevisedTargetModal(false);
  });

  const allWicketTypes: {
    value: WicketType;
    label: string;
    needsFielder?: boolean;
  }[] = [
    { value: 'bowled', label: t.scoring.wktBowled },
    { value: 'caught', label: t.scoring.wktCaught, needsFielder: true },
    { value: 'lbw', label: t.scoring.wktLbw },
    { value: 'run-out', label: t.scoring.wktRunOut, needsFielder: true },
    { value: 'stumped', label: t.scoring.wktStumped, needsFielder: true },
    { value: 'hit-wicket', label: t.scoring.wktHitWicket },
    { value: 'retired-hurt', label: t.scoring.wktRetiredHurt },
    { value: 'retired-out', label: t.scoring.wktRetiredOut },
    { value: 'obstructing-field', label: t.scoring.wktObstructing },
    { value: 'hit-ball-twice', label: t.scoring.wktHitTwice },
    { value: 'timed-out', label: t.scoring.wktTimedOut },
  ];

  return (
    <>
      {showWicketModal && (
        <div
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby="wicket-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <form
            onSubmit={onConfirmWicket}
            className="w-full max-w-md rounded-3xl bg-card border border-line p-5 space-y-3 shadow-xl"
          >
            <h3 id="wicket-modal-title" className="text-base font-bold text-text">
              {t.scoring.recordWicketTitle} {inn.isFreeHit ? t.scoring.freeHitDeliverySuffix : ''}
            </h3>

            <div>
              <label htmlFor="wicket-type-select" className="block text-sm font-semibold text-muted mb-1">
                {t.scoring.dismissalTypeLabel}
              </label>
              <select
                id="wicket-type-select"
                value={wicketType}
                onChange={(e) => setWicketType(e.target.value as WicketType)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm font-medium"
              >
                {allWicketTypes.filter((w) =>
                  inn.isFreeHit ? isValidFreeHitWicket(w.value) : true
                ).map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="dismissed-batter-select" className="block text-sm font-semibold text-muted mb-1">
                  {t.scoring.dismissedBatterLabel}
                </label>
                <select
                  id="dismissed-batter-select"
                  value={dismissedPlayerId}
                  onChange={(e) => setDismissedPlayerId(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
                >
                  <option value={inn.strikerId}>
                    {playersMap[inn.strikerId]?.name} ({t.scoring.striker})
                  </option>
                  <option value={inn.nonStrikerId}>
                    {playersMap[inn.nonStrikerId]?.name} ({t.scoring.nonStriker})
                  </option>
                </select>
              </div>

              <div>
                <label htmlFor="incoming-batter-select" className="block text-sm font-semibold text-muted mb-1">
                  {t.scoring.incomingBatterLabel}
                </label>
                <select
                  id="incoming-batter-select"
                  value={incomingBatterId}
                  onChange={(e) => setIncomingBatterId(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
                >
                  <option value="">{t.scoring.noneAllOut}</option>
                  {inn.availableBatters.map((id) => (
                    <option key={id} value={id}>
                      {playersMap[id]?.name || id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {['caught', 'run-out', 'stumped'].includes(wicketType) && (
              <div>
                <label htmlFor="fielder-select" className="block text-sm font-semibold text-muted mb-1">
                  {t.scoring.fielderKeeperLabel}
                </label>
                <select
                  id="fielder-select"
                  value={fielderId}
                  onChange={(e) => setFielderId(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
                >
                  {bowlingXI.map((id) => (
                    <option key={id} value={id}>
                      {playersMap[id]?.name || id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {wicketType === 'run-out' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wicket-runs-crossed-input" className="block text-sm font-semibold text-muted mb-1">
                    {t.scoring.completedRunsLabel}
                  </label>
                  <input
                    id="wicket-runs-crossed-input"
                    type="number"
                    min={0}
                    max={4}
                    value={wicketRunsCrossed}
                    onChange={(e) => setWicketRunsCrossed(Number(e.target.value))}
                    className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="run-out-end-select" className="block text-sm font-semibold text-muted mb-1">
                    {t.scoring.newBatterEndLabel}
                  </label>
                  <select
                    id="run-out-end-select"
                    value={runOutEnd}
                    onChange={(e) =>
                      setRunOutEnd(e.target.value as 'striker' | 'non-striker')
                    }
                    className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
                  >
                    <option value="striker">{t.scoring.strikerEnd}</option>
                    <option value="non-striker">{t.scoring.nonStrikerEnd}</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowWicketModal(false)}
                className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="min-h-[48px] flex-1 rounded-xl bg-wicket text-white text-sm font-bold hover:opacity-90"
              >
                {t.scoring.confirmWicketBtn}
              </button>
            </div>
          </form>
        </div>
      )}

      {showBowlerModal && (
        <div
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby="bowler-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <form
            onSubmit={onConfirmBowlerChange}
            className="w-full max-w-sm rounded-3xl bg-card border border-line p-5 space-y-3"
          >
            <h3 id="bowler-modal-title" className="text-base font-bold text-text">
              {t.scoring.changeBowler}
            </h3>

            <div>
              <label htmlFor="bowler-reason-select" className="block text-sm font-semibold text-muted mb-1">
                {t.scoring.changeReasonLabel}
              </label>
              <select
                id="bowler-reason-select"
                value={bowlerChangeReason}
                onChange={(e) =>
                  setBowlerChangeReason(e.target.value as BowlerChangeReason)
                }
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
              >
                <option value="end-of-over">{t.scoring.reasonEndOfOver}</option>
                <option value="injury">{t.scoring.reasonInjury}</option>
                <option value="suspension">{t.scoring.reasonSuspension}</option>
              </select>
            </div>

            <div>
              <label htmlFor="next-bowler-select" className="block text-sm font-semibold text-muted mb-1">
                {t.scoring.selectEligibleBowlerLabel} ({t.scoring.maxOversPrefix} {match.rules.maxOversPerBowler} {t.scoring.oversWord})
              </label>
              <select
                id="next-bowler-select"
                value={nextBowlerId}
                onChange={(e) => setNextBowlerId(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
              >
                {bowlingXI.map((id) => {
                  const isEligible = inn.eligibleBowlerIds.includes(id);
                  const bRow = inn.bowlingCard.find((b) => b.playerId === id);
                  const oversBowled = bRow?.oversFormatted || '0.0';
                  return (
                    <option key={id} value={id} disabled={!isEligible}>
                      {playersMap[id]?.name || id} ({oversBowled} {t.scoring.oversShort})
                      {!isEligible ? ` — ${t.scoring.ineligibleSuffix}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowBowlerModal(false)}
                className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="min-h-[48px] flex-1 rounded-xl bg-brand-600 text-white text-sm font-bold"
              >
                {t.scoring.setBowlerBtn}
              </button>
            </div>
          </form>
        </div>
      )}

      {showRetireModal && (
        <div
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby="retire-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <form
            onSubmit={onConfirmRetire}
            className="w-full max-w-md rounded-3xl bg-card border border-line p-5 space-y-3"
          >
            <h3 id="retire-modal-title" className="text-base font-bold text-text">
              {t.scoring.retireModalTitle}
            </h3>
            <div>
              <label htmlFor="retire-target-select" className="block text-sm font-semibold text-muted mb-1">
                {t.scoring.batterLeavingLabel}
              </label>
              <select
                id="retire-target-select"
                value={retireTargetId}
                onChange={(e) => setRetireTargetId(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
              >
                <option value={inn.strikerId}>
                  {playersMap[inn.strikerId]?.name} ({t.scoring.striker})
                </option>
                <option value={inn.nonStrikerId}>
                  {playersMap[inn.nonStrikerId]?.name} ({t.scoring.nonStriker})
                </option>
              </select>
            </div>
            <div>
              <label htmlFor="retire-replacement-select" className="block text-sm font-semibold text-muted mb-1">
                {t.scoring.replacementBatterLabel}
              </label>
              <select
                id="retire-replacement-select"
                value={retireReplacementId}
                onChange={(e) => setRetireReplacementId(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
              >
                {inn.availableBatters.map((id) => (
                  <option key={id} value={id}>
                    {playersMap[id]?.name || id}
                  </option>
                ))}
              </select>
            </div>
            <label htmlFor="retired-hurt-checkbox" className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                id="retired-hurt-checkbox"
                type="checkbox"
                checked={isRetiredHurtFlag}
                onChange={(e) => setIsRetiredHurtFlag(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>{t.scoring.retiredHurtCheckbox}</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowRetireModal(false)}
                className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="min-h-[48px] flex-1 rounded-xl bg-brand-600 text-white text-sm font-bold"
              >
                {t.scoring.confirmBtn}
              </button>
            </div>
          </form>
        </div>
      )}

      <LiveEditAndTargetModals
        match={match}
        matchEvents={matchEvents}
        t={t}
        showEditBallModal={showEditBallModal}
        setShowEditBallModal={setShowEditBallModal}
        editingEvent={editingEvent}
        setEditingEvent={setEditingEvent}
        onSaveEditedBall={onSaveEditedBall}
        showRevisedTargetModal={showRevisedTargetModal}
        setShowRevisedTargetModal={setShowRevisedTargetModal}
        revisedTargetInput={revisedTargetInput}
        setRevisedTargetInput={setRevisedTargetInput}
        revisedOversInput={revisedOversInput}
        setRevisedOversInput={setRevisedOversInput}
        onSaveRevisedTarget={onSaveRevisedTarget}
      />
    </>
  );
};
