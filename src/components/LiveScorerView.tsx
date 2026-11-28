import React, { useEffect, useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import {
  deriveMatchState, validateBowlerChange, validateNextBallEvent,
} from '../engine/scoringEngine';
import {
  BallEvent, BowlerChangeReason, ExtraType, InningsSetup, Player, WicketType,
} from '../engine/types';
import { TRANSLATIONS } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';
import { setupLiveWakeLock } from '../utils/routeAndSecurityUtils';
import { LiveInningsBreakCard } from './LiveInningsBreakCard';
import { LiveScoreboardCard } from './LiveScoreboardCard';
import { LiveScorerModals } from './LiveScorerModals';
import { formatBallConfirmationMessage, LiveScoringKeypad } from './LiveScoringKeypad';
import { ScoringLockOverlay } from './ScoringLockOverlay';

export const LiveScorerView: React.FC<{ onNavigateBack?: () => void }> = ({
  onNavigateBack,
}) => {
  const {
    matches, activeMatchId, setActiveMatchId, setActiveTab, players, teams,
    ballEvents, redoStacks, settings, isScoringWriteInFlight, isScoringLocked,
    setScoringLocked, updateSettings, recordBall, undoLastBall, redoBall, editBallEvent,
    startNextInnings, updateRevisedTarget, completeMatch, loadMatchBallEvents,
  } = useCricsStore();

  const t = TRANSLATIONS[settings.language || 'en'];
  const match = useMemo(
    () => matches.find((m) => m.id === activeMatchId) || matches[0],
    [matches, activeMatchId]
  );

  useEffect(() => {
    if (match?.id) void loadMatchBallEvents(match.id);
  }, [match?.id, loadMatchBallEvents]);

  const playersMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => { map[p.id] = p; });
    return map;
  }, [players]);

  const teamsNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    teams.forEach((tm) => { map[tm.id] = tm.name; });
    return map;
  }, [teams]);

  const matchEvents = useMemo(
    () => ballEvents.filter((e) => e.matchId === match?.id).sort((a, b) => a.sequence - b.sequence),
    [ballEvents, match?.id]
  );

  const derived = useMemo(
    () => (match ? deriveMatchState(match, matchEvents, playersMap, teamsNameMap, t) : null),
    [match, matchEvents, playersMap, teamsNameMap, t]
  );

  useEffect(() => {
    return setupLiveWakeLock(Boolean(settings.keepScreenAwake && match && match.status === 'live'));
  }, [settings.keepScreenAwake, match]);

  const [selectedExtra, setSelectedExtra] = useState<ExtraType>('none');
  const [selectedSecondaryExtra, setSelectedSecondaryExtra] = useState<'none' | 'bye' | 'leg-bye'>('none');
  const [scoringValidationError, setScoringValidationError] = useState<string | null>(null);
  const [lastBallSrMessage, setLastBallSrMessage] = useState<string | null>(null);

  const announceBallForScreenReader = (
    event: Pick<BallEvent, 'actionType' | 'runsOffBat' | 'extraType' | 'extraRuns' | 'isWicket'>
  ) => {
    setLastBallSrMessage(formatBallConfirmationMessage(event, t));
    if (settings.vibrationEnabled && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(35); } catch { /* ignore */ }
    }
  };

  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<WicketType>('bowled');
  const [dismissedPlayerId, setDismissedPlayerId] = useState<string>('');
  const [fielderId, setFielderId] = useState<string>('');
  const [incomingBatterId, setIncomingBatterId] = useState<string>('');
  const [wicketRunsCrossed, setWicketRunsCrossed] = useState<number>(0);
  const [runOutEnd, setRunOutEnd] = useState<'striker' | 'non-striker'>('striker');
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [nextBowlerId, setNextBowlerId] = useState<string>('');
  const [bowlerChangeReason, setBowlerChangeReason] = useState<BowlerChangeReason>('end-of-over');
  const [showRetireModal, setShowRetireModal] = useState(false);
  const [retireTargetId, setRetireTargetId] = useState<string>('');
  const [retireReplacementId, setRetireReplacementId] = useState<string>('');
  const [isRetiredHurtFlag, setIsRetiredHurtFlag] = useState<boolean>(true);
  const [showEditBallModal, setShowEditBallModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BallEvent | null>(null);
  const [showRevisedTargetModal, setShowRevisedTargetModal] = useState(false);
  const [revisedTargetInput, setRevisedTargetInput] = useState<string>('');
  const [revisedOversInput, setRevisedOversInput] = useState<string>('');
  const [nextInnStrikerId, setNextInnStrikerId] = useState<string>('');
  const [nextInnNonStrikerId, setNextInnNonStrikerId] = useState<string>('');
  const [nextInnBowlerId, setNextInnBowlerId] = useState<string>('');

  // Lock scrolling on document/body while LiveScorerView is mounted and no dialog is open
  useEffect(() => {
    if (showWicketModal || showBowlerModal || showRetireModal || showEditBallModal || showRevisedTargetModal) {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      return;
    }
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [showWicketModal, showBowlerModal, showRetireModal, showEditBallModal, showRevisedTargetModal]);

  if (!match || !derived) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted text-sm mb-4">{t.scoring.noActiveMatch}</p>
        <button
          onClick={() => setActiveTab('wizard')}
          className="min-h-[48px] px-5 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
        >
          {t.scoring.startNewMatchBtn}
        </button>
      </div>
    );
  }

  const inn = derived.currentInnings;
  const battingTeam = teams.find((tm) => tm.id === inn.battingTeamId);
  const bowlingTeam = teams.find((tm) => tm.id === inn.bowlingTeamId);
  const bowlingXI = inn.bowlingTeamId === match.teamAId ? match.teamAXI : match.teamBXI;
  const redoStack = redoStacks[match.id] || [];

  const promptEndOverBowlerChange = () => {
    const defaultEligible =
      inn.eligibleBowlerIds[0] || bowlingXI.find((id) => id !== inn.currentBowlerId) || inn.currentBowlerId;
    setNextBowlerId(defaultEligible);
    setBowlerChangeReason('end-of-over');
    setShowBowlerModal(true);
  };

  const recordDeliveryWithExtra = async (
    extraToUse: ExtraType,
    runsClicked: number,
    secondaryToUse: 'none' | 'bye' | 'leg-bye'
  ) => {
    if (isScoringLocked || isScoringWriteInFlight || inn.isInningsCompleted || derived.isMatchCompleted) return;
    if (inn.needsBowlerChange) {
      promptEndOverBowlerChange();
      return;
    }

    let runsOffBat = runsClicked;
    let extraRuns = 0;
    let secondaryExtraType: 'bye' | 'leg-bye' | undefined;

    if (extraToUse === 'wide' || extraToUse === 'bye' || extraToUse === 'leg-bye') {
      runsOffBat = 0;
      extraRuns = extraToUse === 'wide' ? runsClicked : Math.max(1, runsClicked === 0 ? 1 : runsClicked);
    } else if (extraToUse === 'no-ball') {
      if (secondaryToUse === 'bye' || secondaryToUse === 'leg-bye') {
        runsOffBat = 0;
        secondaryExtraType = secondaryToUse;
        extraRuns = Math.max(1, runsClicked === 0 ? 1 : runsClicked);
      } else {
        runsOffBat = runsClicked;
        extraRuns = 0;
      }
    } else if (extraToUse === 'penalty') {
      runsOffBat = 0;
      extraRuns = runsClicked === 0 ? 5 : runsClicked;
    }

    const candidateEvent: Omit<BallEvent, 'id' | 'matchId' | 'sequence' | 'timestamp'> = {
      inningsNumber: inn.inningsNumber,
      actionType: 'delivery',
      strikerId: inn.strikerId,
      nonStrikerId: inn.nonStrikerId,
      bowlerId: inn.currentBowlerId,
      runsOffBat,
      extraType: extraToUse,
      secondaryExtraType,
      extraRuns,
      isBoundaryFour: runsOffBat === 4,
      isBoundarySix: runsOffBat === 6,
      isWicket: false,
    };

    const validation = validateNextBallEvent(match, inn, candidateEvent);
    if (!validation.valid) {
      setScoringValidationError(validation.errors[0] || t.scoring.invalidDeliveryError);
      return;
    }

    setScoringValidationError(null);
    await recordBall(match.id, candidateEvent);
    announceBallForScreenReader(candidateEvent);
    setSelectedExtra('none');
    setSelectedSecondaryExtra('none');
  };

  const handleRunTap = async (runsClicked: number) => {
    await recordDeliveryWithExtra(selectedExtra, runsClicked, selectedSecondaryExtra);
  };

  const openWicketDialog = () => {
    if (isScoringLocked) return;
    if (inn.needsBowlerChange) {
      promptEndOverBowlerChange();
      return;
    }
    setWicketType(inn.isFreeHit ? 'run-out' : 'bowled');
    setDismissedPlayerId(inn.strikerId);
    setFielderId(bowlingXI[0] || '');
    setIncomingBatterId(inn.availableBatters[0] || '');
    setWicketRunsCrossed(0);
    setRunOutEnd('striker');
    setShowWicketModal(true);
  };

  const handleConfirmWicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const isSecondaryByeOnNoBall =
      selectedExtra === 'no-ball' && (selectedSecondaryExtra === 'bye' || selectedSecondaryExtra === 'leg-bye');

    const candidateEvent: Omit<BallEvent, 'id' | 'matchId' | 'sequence' | 'timestamp'> = {
      inningsNumber: inn.inningsNumber,
      actionType: 'delivery',
      strikerId: inn.strikerId,
      nonStrikerId: inn.nonStrikerId,
      bowlerId: inn.currentBowlerId,
      runsOffBat:
        (selectedExtra === 'none' || selectedExtra === 'no-ball') && !isSecondaryByeOnNoBall
          ? wicketRunsCrossed
          : 0,
      extraType: selectedExtra,
      secondaryExtraType: isSecondaryByeOnNoBall ? selectedSecondaryExtra : undefined,
      extraRuns:
        selectedExtra === 'wide' || selectedExtra === 'bye' || selectedExtra === 'leg-bye' || isSecondaryByeOnNoBall
          ? wicketRunsCrossed
          : 0,
      isWicket: true,
      wicketType,
      dismissedPlayerId: dismissedPlayerId || inn.strikerId,
      fielderId: ['caught', 'run-out', 'stumped'].includes(wicketType) ? fielderId : undefined,
      incomingBatterId,
      runOutEnd: wicketType === 'run-out' ? runOutEnd : undefined,
    };

    const validation = validateNextBallEvent(match, inn, candidateEvent);
    if (!validation.valid) {
      setScoringValidationError(validation.errors[0] || t.scoring.invalidWicketError);
      setShowWicketModal(false);
      return;
    }

    setScoringValidationError(null);
    await recordBall(match.id, candidateEvent);
    announceBallForScreenReader(candidateEvent);
    setShowWicketModal(false);
    setSelectedExtra('none');
    setSelectedSecondaryExtra('none');
  };

  const handleConfirmBowlerChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextBowlerId) return;
    const check = validateBowlerChange(inn, match, nextBowlerId, bowlerChangeReason);
    if (!check.valid) {
      setScoringValidationError(check.errors[0] || t.scoring.ineligibleBowlerError);
      return;
    }
    setScoringValidationError(null);
    await recordBall(match.id, {
      inningsNumber: inn.inningsNumber,
      actionType: 'bowler-change',
      strikerId: inn.strikerId,
      nonStrikerId: inn.nonStrikerId,
      bowlerId: inn.currentBowlerId,
      newBowlerId: nextBowlerId,
      bowlerChangeReason,
      runsOffBat: 0,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    });
    setShowBowlerModal(false);
  };

  const handleConfirmRetire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retireTargetId || !retireReplacementId) return;
    await recordBall(match.id, {
      inningsNumber: inn.inningsNumber,
      actionType: 'batter-retire',
      strikerId: inn.strikerId,
      nonStrikerId: inn.nonStrikerId,
      bowlerId: inn.currentBowlerId,
      retiredPlayerId: retireTargetId,
      replacementPlayerId: retireReplacementId,
      isRetiredHurt: isRetiredHurtFlag,
      runsOffBat: 0,
      extraType: 'none',
      extraRuns: 0,
      isWicket: !isRetiredHurtFlag,
      wicketType: isRetiredHurtFlag ? 'retired-hurt' : 'retired-out',
    });
    setShowRetireModal(false);
  };

  const handleInitiateNextInnings = async (
    inningsNumber: 2 | 3 | 4,
    battingTeamId: string,
    bowlingTeamId: string,
    isSuperOver = false
  ) => {
    const batXI = battingTeamId === match.teamAId ? match.teamAXI : match.teamBXI;
    const bowlXI = bowlingTeamId === match.teamAId ? match.teamAXI : match.teamBXI;
    const sId = nextInnStrikerId || batXI[0] || '';
    const nsId = nextInnNonStrikerId && nextInnNonStrikerId !== sId ? nextInnNonStrikerId : batXI[1] || '';
    const bId = nextInnBowlerId || bowlXI[0] || '';

    const setup: InningsSetup = {
      inningsNumber, battingTeamId, bowlingTeamId,
      openingStrikerId: sId, openingNonStrikerId: nsId, openingBowlerId: bId, isSuperOver,
    };
    await startNextInnings(match.id, setup);
    setNextInnStrikerId('');
    setNextInnNonStrikerId('');
    setNextInnBowlerId('');
  };

  return (
    <div
      data-testid="live-scorer-root"
      className={`fixed inset-0 z-20 live-scorer-viewport flex flex-col overflow-hidden bg-page select-none ${settings.highContrastScoring ? 'high-contrast-scoring' : ''}`}
    >
      {scoringValidationError && (
        <div role="alert" className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-wicket text-white font-semibold text-sm shrink-0">
          <span>{scoringValidationError}</span>
          <button type="button" onClick={() => setScoringValidationError(null)} className="min-h-[48px] ml-2 px-3 py-1 rounded-xl bg-white/20 text-sm font-bold">
            {t.scoring.dismissBtn}
          </button>
        </div>
      )}

      {inn.isFreeHit && !inn.isInningsCompleted && (
        <div role="status" className="flex items-center justify-between px-3 py-1 rounded-xl bg-accent text-brand-950 font-bold text-sm shrink-0">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 shrink-0" />
            <span>{t.scoring.freeHitActive} — {t.scoring.runOutOnly}</span>
          </div>
          <span className="text-sm font-mono">{t.scoring.freeHitBadge}</span>
        </div>
      )}

      {/* Main Scoring Column: Zones 1-4 (LiveScoreboardCard) + Zone 5 (Keypad / Break / Lock) */}
      <div className="flex-1 min-h-0 flex flex-col justify-between gap-0.5 w-full max-w-lg mx-auto">
        <LiveScoreboardCard
          match={match} matches={matches} derived={derived} inn={inn}
          battingTeam={battingTeam} bowlingTeam={bowlingTeam} bowlingXI={bowlingXI}
          playersMap={playersMap} matchEvents={matchEvents}
          isScoringLocked={isScoringLocked} setScoringLocked={setScoringLocked}
          highContrastScoring={Boolean(settings.highContrastScoring)}
          onToggleHighContrast={() =>
            void updateSettings({ highContrastScoring: !settings.highContrastScoring })
          }
          setActiveMatchId={setActiveMatchId}
          onBackFromLive={onNavigateBack || (() => setActiveTab('home'))}
          onOpenDlsModal={() => {
            setRevisedTargetInput(String(inn.targetRuns || inn.totalRuns + 1));
            setRevisedOversInput(String(inn.maxOvers));
            setShowRevisedTargetModal(true);
          }}
          onOpenEndOverBowlerModal={promptEndOverBowlerChange}
          onSelectBallToEdit={(ev) => {
            setEditingEvent(ev);
            setShowEditBallModal(true);
          }}
          t={t}
        />

        <div className="mt-auto shrink-0 flex flex-col w-full">
          {inn.isInningsCompleted ? (
            <LiveInningsBreakCard
              match={match} derived={derived} inn={inn} battingTeam={battingTeam}
              bowlingTeam={bowlingTeam} bowlingXI={bowlingXI} playersMap={playersMap}
              nextInnStrikerId={nextInnStrikerId} setNextInnStrikerId={setNextInnStrikerId}
              nextInnNonStrikerId={nextInnNonStrikerId} setNextInnNonStrikerId={setNextInnNonStrikerId}
              nextInnBowlerId={nextInnBowlerId} setNextInnBowlerId={setNextInnBowlerId}
              onInitiateNextInnings={handleInitiateNextInnings}
              onUndoLastBall={() => undoLastBall(match.id)}
              onCompleteMatch={() => completeMatch(match.id, derived.calculatedPotmPlayerId)}
              t={t}
            />
          ) : isScoringLocked ? (
            <ScoringLockOverlay
              scorerPinSalt={settings.scorerPinSalt}
              scorerPinHash={settings.scorerPinHash}
              onUnlock={() => setScoringLocked(false)}
              t={t}
            />
          ) : (
            <LiveScoringKeypad
              selectedExtra={selectedExtra} setSelectedExtra={setSelectedExtra}
              selectedSecondaryExtra={selectedSecondaryExtra} setSelectedSecondaryExtra={setSelectedSecondaryExtra}
              isScoringWriteInFlight={isScoringWriteInFlight}
              canUndo={matchEvents.length > 0} canRedo={redoStack.length > 0}
              lastBallSrMessage={lastBallSrMessage}
              onRunTap={handleRunTap}
              onRecordExtraDelivery={(ex, runsClicked, sec) =>
                void recordDeliveryWithExtra(ex, runsClicked, sec)
              }
              onOpenWicketDialog={openWicketDialog}
              onUndo={() => void undoLastBall(match.id)}
              onRedo={() => void redoBall(match.id)}
              onSwapStrike={() =>
                void recordBall(match.id, {
                  inningsNumber: inn.inningsNumber, actionType: 'manual-strike-swap',
                  strikerId: inn.strikerId, nonStrikerId: inn.nonStrikerId, bowlerId: inn.currentBowlerId,
                  runsOffBat: 0, extraType: 'none', extraRuns: 0, isWicket: false,
                })
              }
              onOpenBowlerModal={() => {
                setNextBowlerId(inn.eligibleBowlerIds[0] || bowlingXI.find((id) => id !== inn.currentBowlerId) || inn.currentBowlerId);
                setBowlerChangeReason(inn.isEndOfOver ? 'end-of-over' : 'injury');
                setShowBowlerModal(true);
              }}
              onOpenRetireModal={() => {
                setRetireTargetId(inn.strikerId);
                setRetireReplacementId(inn.availableBatters[0] || '');
                setIsRetiredHurtFlag(true);
                setShowRetireModal(true);
              }}
              onOpenEditBallModal={() => setShowEditBallModal(true)}
              onOpenDlsModal={() => {
                setRevisedTargetInput(String(inn.targetRuns || inn.totalRuns + 1));
                setRevisedOversInput(String(inn.maxOvers));
                setShowRevisedTargetModal(true);
              }}
              highContrastScoring={Boolean(settings.highContrastScoring)}
              onToggleHighContrast={() => void updateSettings({ highContrastScoring: !settings.highContrastScoring })}
              t={t}
            />
          )}
        </div>
      </div>

      <LiveScorerModals
        match={match} inn={inn} bowlingXI={bowlingXI} playersMap={playersMap}
        matchEvents={matchEvents} t={t}
        showWicketModal={showWicketModal} setShowWicketModal={setShowWicketModal}
        wicketType={wicketType} setWicketType={setWicketType}
        dismissedPlayerId={dismissedPlayerId} setDismissedPlayerId={setDismissedPlayerId}
        fielderId={fielderId} setFielderId={setFielderId}
        incomingBatterId={incomingBatterId} setIncomingBatterId={setIncomingBatterId}
        wicketRunsCrossed={wicketRunsCrossed} setWicketRunsCrossed={setWicketRunsCrossed}
        runOutEnd={runOutEnd} setRunOutEnd={setRunOutEnd}
        onConfirmWicket={handleConfirmWicket}
        showBowlerModal={showBowlerModal} setShowBowlerModal={setShowBowlerModal}
        nextBowlerId={nextBowlerId} setNextBowlerId={setNextBowlerId}
        bowlerChangeReason={bowlerChangeReason} setBowlerChangeReason={setBowlerChangeReason}
        onConfirmBowlerChange={handleConfirmBowlerChange}
        showRetireModal={showRetireModal} setShowRetireModal={setShowRetireModal}
        retireTargetId={retireTargetId} setRetireTargetId={setRetireTargetId}
        retireReplacementId={retireReplacementId} setRetireReplacementId={setRetireReplacementId}
        isRetiredHurtFlag={isRetiredHurtFlag} setIsRetiredHurtFlag={setIsRetiredHurtFlag}
        onConfirmRetire={handleConfirmRetire}
        showEditBallModal={showEditBallModal} setShowEditBallModal={setShowEditBallModal}
        editingEvent={editingEvent} setEditingEvent={setEditingEvent}
        onSaveEditedBall={async (e) => {
          e.preventDefault();
          if (!editingEvent) return;
          await editBallEvent(editingEvent);
          setEditingEvent(null);
          setShowEditBallModal(false);
        }}
        showRevisedTargetModal={showRevisedTargetModal} setShowRevisedTargetModal={setShowRevisedTargetModal}
        revisedTargetInput={revisedTargetInput} setRevisedTargetInput={setRevisedTargetInput}
        revisedOversInput={revisedOversInput} setRevisedOversInput={setRevisedOversInput}
        onSaveRevisedTarget={async (e) => {
          e.preventDefault();
          const targetNum = parseInt(revisedTargetInput, 10);
          if (isNaN(targetNum) || targetNum <= 0) return;
          await updateRevisedTarget(match.id, inn.inningsNumber, targetNum, revisedOversInput ? parseInt(revisedOversInput, 10) : undefined);
          setShowRevisedTargetModal(false);
        }}
      />
    </div>
  );
};
