import { buildInningsCardsAndOverSummaries, InternalBowlerRow } from './inningsCardBuilder';
import {
  buildDismissalText, calculateBallRuns, doesBatterFaceBall, formatBallLabel,
  formatOvers, isBowlerCreditedWicket, isLegalDelivery, oversToDecimal,
} from './scoringRules';
import {
  BallEvent, BatterCardRow, DerivedInningsState, ExtrasBreakdown,
  FallOfWicket, InningsSetup, MatchRecord, OverSummary, PartnershipRow, Player,
} from './types';

export function deriveInningsState(
  match: MatchRecord,
  setup: InningsSetup,
  events: BallEvent[],
  playersMap: Record<string, Player>,
  targetRunsFromPrevious?: number
): DerivedInningsState {
  const rules = match.rules;
  const ballsPerOver = rules.ballsPerOver || 6;
  const maxOvers = setup.isSuperOver
    ? 1
    : setup.revisedOvers !== undefined
    ? setup.revisedOvers
    : rules.oversPerInnings;
  const maxLegalBalls = maxOvers * ballsPerOver;

  const battingXI = setup.battingTeamId === match.teamAId ? match.teamAXI : match.teamBXI;
  const bowlingXI = setup.bowlingTeamId === match.teamAId ? match.teamAXI : match.teamBXI;
  const maxWickets = setup.isSuperOver ? 2 : Math.max(1, battingXI.length - 1);

  let strikerId = setup.openingStrikerId;
  let nonStrikerId = setup.openingNonStrikerId;
  let currentBowlerId = setup.openingBowlerId;

  let totalRuns = 0;
  let wickets = 0;
  let legalBalls = 0;
  let isFreeHit = false;
  let isDeclared = false;
  let hasBowlerChangedSinceOverEnd = true;
  let lastCompletedOverIndex = -1;
  const validationErrors: string[] = [];

  const overBowlersMap = new Map<number, string[]>();
  const recordBowlerInOver = (overIdx: number, bId: string) => {
    if (!bId) return;
    const list = overBowlersMap.get(overIdx) || [];
    if (!list.includes(bId)) {
      list.push(bId);
      overBowlersMap.set(overIdx, list);
    }
  };

  const extras: ExtrasBreakdown = {
    total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0,
  };

  const batterStatsMap = new Map<string, BatterCardRow>();
  let nextBattingOrder = 1;

  const ensureBatter = (playerId: string, status: BatterCardRow['status'] = 'batting') => {
    if (!playerId) return;
    const existing = batterStatsMap.get(playerId);
    if (!existing) {
      batterStatsMap.set(playerId, {
        playerId, battingOrder: nextBattingOrder++, runs: 0, balls: 0, fours: 0,
        sixes: 0, strikeRate: 0, status,
        dismissalText: status === 'batting' ? 'not out' : 'did not bat',
      });
    } else if (status === 'batting' && existing.status === 'retired-hurt') {
      existing.status = 'batting';
      existing.dismissalText = 'not out';
    }
  };

  ensureBatter(strikerId, 'batting');
  ensureBatter(nonStrikerId, 'batting');

  const bowlerStatsMap = new Map<string, InternalBowlerRow>();
  const ensureBowler = (playerId: string) => {
    if (!playerId || bowlerStatsMap.has(playerId)) return;
    bowlerStatsMap.set(playerId, {
      playerId, legalBalls: 0, oversFormatted: '0.0', maidens: 0, runsConceded: 0,
      wickets: 0, wides: 0, noBalls: 0, dotBalls: 0, economy: 0,
      overBowlerRunsMap: new Map(),
    });
  };
  ensureBowler(currentBowlerId);

  const fallOfWickets: FallOfWicket[] = [];
  const partnerships: PartnershipRow[] = [];
  const resetPartnership = (wNum: number, b1: string, b2: string): PartnershipRow => ({
    wicketNumber: wNum, batter1Id: b1, batter2Id: b2, runs: 0, balls: 0,
    batter1Contribution: 0, batter2Contribution: 0, extrasContribution: 0, isUnbroken: true,
  });

  let currentPartnership = resetPartnership(1, strikerId, nonStrikerId);
  const overSummariesMap = new Map<number, OverSummary>();
  const retiredHurtSet = new Set<string>();
  const dismissedSet = new Set<string>();

  const sortedEvents = [...events]
    .filter((e) => e.inningsNumber === setup.inningsNumber)
    .sort((a, b) => a.sequence - b.sequence);

  for (const event of sortedEvents) {
    if (event.actionType === 'manual-strike-swap') {
      [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
      continue;
    }

    if (event.actionType === 'bowler-change' && event.newBowlerId) {
      currentBowlerId = event.newBowlerId;
      ensureBowler(currentBowlerId);
      if (legalBalls > 0 && legalBalls % ballsPerOver === 0) {
        hasBowlerChangedSinceOverEnd = true;
      } else {
        recordBowlerInOver(Math.floor(legalBalls / ballsPerOver), currentBowlerId);
      }
      continue;
    }

    if (event.actionType === 'declare-innings') {
      isDeclared = true;
      break;
    }

    if (event.actionType === 'batter-retire' && event.retiredPlayerId && event.replacementPlayerId) {
      const retId = event.retiredPlayerId === nonStrikerId ? nonStrikerId : strikerId;
      const repId = event.replacementPlayerId;
      const retRow = batterStatsMap.get(retId);
      if (event.isRetiredHurt) {
        if (retRow) {
          retRow.status = 'retired-hurt';
          retRow.dismissalText = 'retired hurt';
        }
        retiredHurtSet.add(retId);
      } else {
        wickets += 1;
        dismissedSet.add(retId);
        if (retRow) {
          retRow.status = 'out';
          retRow.wicketType = 'retired-out';
          retRow.dismissalText = 'retired out';
        }
        fallOfWickets.push({
          wicketNumber: wickets, scoreAtDismissal: totalRuns,
          oversFormatted: formatOvers(legalBalls, ballsPerOver),
          dismissedPlayerId: retId, wicketType: 'retired-out', bowlerId: currentBowlerId,
        });
      }
      if (strikerId === retId) strikerId = repId;
      else if (nonStrikerId === retId) nonStrikerId = repId;
      retiredHurtSet.delete(repId);
      ensureBatter(repId, 'batting');
      partnerships.push({ ...currentPartnership, isUnbroken: Boolean(event.isRetiredHurt) });
      currentPartnership = resetPartnership(wickets + 1, strikerId, nonStrikerId);
      continue;
    }

    if (event.actionType === 'batter-replace' && event.retiredPlayerId && event.replacementPlayerId) {
      if (strikerId === event.retiredPlayerId) strikerId = event.replacementPlayerId;
      if (nonStrikerId === event.retiredPlayerId) nonStrikerId = event.replacementPlayerId;
      ensureBatter(event.replacementPlayerId, 'batting');
      continue;
    }

    if (!strikerId && event.strikerId) strikerId = event.strikerId;
    if (!nonStrikerId && event.nonStrikerId) nonStrikerId = event.nonStrikerId;
    if (!currentBowlerId && event.bowlerId) currentBowlerId = event.bowlerId;

    const activeStriker = strikerId;
    const activeNonStriker = nonStrikerId;
    const activeBowler = currentBowlerId;

    ensureBatter(strikerId, 'batting');
    ensureBatter(nonStrikerId, 'batting');
    ensureBowler(currentBowlerId);

    const overIndex = Math.floor(legalBalls / ballsPerOver);
    recordBowlerInOver(overIndex, currentBowlerId);

    const calc = calculateBallRuns(event, rules);
    totalRuns += calc.totalRuns;

    extras.wides += calc.wideExtras;
    extras.noBalls += calc.noBallExtras;
    extras.byes += calc.byeExtras;
    extras.legByes += calc.legByeExtras;
    extras.penalty += calc.penaltyExtras;
    extras.total = extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penalty;

    const legal = isLegalDelivery(event.extraType);
    const faced = doesBatterFaceBall(event.extraType);

    const strikerRow = batterStatsMap.get(strikerId);
    if (strikerRow) {
      strikerRow.runs += calc.batterRuns;
      if (faced) strikerRow.balls += 1;
      if (calc.batterRuns === 4 || (event.isBoundaryFour && calc.batterRuns > 0)) strikerRow.fours += 1;
      if (calc.batterRuns === 6 || (event.isBoundarySix && calc.batterRuns > 0)) strikerRow.sixes += 1;
      strikerRow.strikeRate =
        strikerRow.balls > 0 ? Number(((strikerRow.runs / strikerRow.balls) * 100).toFixed(2)) : 0;
    }

    currentPartnership.runs += calc.totalRuns;
    if (faced) currentPartnership.balls += 1;
    if (strikerId === currentPartnership.batter1Id) currentPartnership.batter1Contribution += calc.batterRuns;
    else if (strikerId === currentPartnership.batter2Id) currentPartnership.batter2Contribution += calc.batterRuns;
    currentPartnership.extrasContribution += calc.totalRuns - calc.batterRuns;

    const bowlerRow = bowlerStatsMap.get(currentBowlerId);
    if (bowlerRow) {
      bowlerRow.runsConceded += calc.bowlerRuns;
      if (event.extraType === 'wide') bowlerRow.wides += 1;
      if (event.extraType === 'no-ball') bowlerRow.noBalls += 1;
      if (legal) {
        bowlerRow.legalBalls += 1;
        if (calc.bowlerRuns === 0) bowlerRow.dotBalls += 1;
      }
      const overTrack = bowlerRow.overBowlerRunsMap.get(overIndex) || { legalBalls: 0, bowlerRuns: 0 };
      if (legal) overTrack.legalBalls += 1;
      overTrack.bowlerRuns += calc.bowlerRuns;
      bowlerRow.overBowlerRunsMap.set(overIndex, overTrack);
    }

    if (legal) legalBalls += 1;
    const ballInOver = legal ? ((legalBalls - 1) % ballsPerOver) + 1 : (legalBalls % ballsPerOver) + 1;

    if (rules.freeHitEnabled) {
      if (event.extraType === 'no-ball') isFreeHit = true;
      else if (legal) isFreeHit = false;
    } else {
      isFreeHit = false;
    }

    let wicketOccurredOnBall = false;
    if (event.isWicket && event.wicketType) {
      const wType = event.wicketType;
      const isNonStrikerDismissed =
        (wType === 'run-out' || wType === 'obstructing-field' || wType === 'retired-hurt' || wType === 'retired-out') &&
        event.dismissedPlayerId === activeNonStriker;
      const dismissedId = isNonStrikerDismissed ? activeNonStriker : activeStriker;
      const survivorId = isNonStrikerDismissed ? activeStriker : activeNonStriker;

      if (wType === 'retired-hurt') {
        const dRow = batterStatsMap.get(dismissedId);
        if (dRow) {
          dRow.status = 'retired-hurt';
          dRow.dismissalText = 'retired hurt';
        }
        retiredHurtSet.add(dismissedId);
      } else {
        wicketOccurredOnBall = true;
        wickets += 1;
        dismissedSet.add(dismissedId);
        retiredHurtSet.delete(dismissedId);
        if (isBowlerCreditedWicket(wType) && bowlerRow) bowlerRow.wickets += 1;

        const dRow = batterStatsMap.get(dismissedId);
        const bowlerName = playersMap[currentBowlerId]?.name || currentBowlerId;
        const fielderName = event.fielderId ? playersMap[event.fielderId]?.name || event.fielderId : undefined;
        if (dRow) {
          dRow.status = 'out';
          dRow.wicketType = wType;
          dRow.bowlerId = currentBowlerId;
          dRow.fielderId = event.fielderId;
          dRow.dismissalText = buildDismissalText(wType, bowlerName, fielderName);
        }
        fallOfWickets.push({
          wicketNumber: wickets, scoreAtDismissal: totalRuns,
          oversFormatted: formatOvers(legalBalls, ballsPerOver),
          dismissedPlayerId: dismissedId, wicketType: wType, bowlerId: currentBowlerId, fielderId: event.fielderId,
        });
      }

      partnerships.push({ ...currentPartnership, isUnbroken: wType === 'retired-hurt' });

      let incoming = event.incomingBatterId || '';
      if (incoming && (incoming === survivorId || dismissedSet.has(incoming))) {
        incoming = battingXI.find((id) => id !== survivorId && id !== dismissedId && !dismissedSet.has(id)) || '';
      }
      if (!incoming && wickets < maxWickets) {
        incoming = battingXI.find((id) => id !== survivorId && id !== dismissedId && !dismissedSet.has(id)) || '';
      }
      if (incoming) {
        retiredHurtSet.delete(incoming);
        ensureBatter(incoming, 'batting');
      }

      if (wType === 'run-out' && event.runOutEnd) {
        if (event.runOutEnd === 'striker') {
          strikerId = incoming;
          nonStrikerId = survivorId;
        } else {
          strikerId = survivorId;
          nonStrikerId = incoming;
        }
      } else {
        if (calc.physicalRunsCrossed % 2 === 1) [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
        if (strikerId === dismissedId) strikerId = incoming;
        else if (nonStrikerId === dismissedId) nonStrikerId = incoming;
      }

      currentPartnership = resetPartnership(wickets + 1, strikerId, nonStrikerId);
    } else if (calc.physicalRunsCrossed % 2 === 1) {
      [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
    }

    const displayOverNumber = overIndex + 1;
    let overSummary = overSummariesMap.get(displayOverNumber);
    if (!overSummary) {
      overSummary = {
        overNumber: displayOverNumber, bowlerId: currentBowlerId, runsInOver: 0, wicketsInOver: 0,
        cumulativeRuns: totalRuns, cumulativeWickets: wickets, isMaiden: false, balls: [],
      };
      overSummariesMap.set(displayOverNumber, overSummary);
    }
    overSummary.bowlerId = currentBowlerId;
    overSummary.runsInOver += calc.totalRuns;
    if (wicketOccurredOnBall) overSummary.wicketsInOver += 1;
    overSummary.cumulativeRuns = totalRuns;
    overSummary.cumulativeWickets = wickets;
    overSummary.balls.push({
      eventId: event.id, sequence: event.sequence, overNumber: overIndex, ballInOver,
      label: formatBallLabel(event, rules), totalRunsOnBall: calc.totalRuns, isWicket: wicketOccurredOnBall,
      isBoundary:
        calc.batterRuns === 4 || calc.batterRuns === 6 ||
        Boolean((event.isBoundaryFour || event.isBoundarySix) && calc.batterRuns > 0),
      isExtra: event.extraType !== 'none', isLegal: legal,
      strikerId: activeStriker, nonStrikerId: activeNonStriker, bowlerId: activeBowler,
    });

    if (legal && legalBalls > 0 && legalBalls % ballsPerOver === 0) {
      [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
      lastCompletedOverIndex = overIndex;
      hasBowlerChangedSinceOverEnd = false;
    }
  }

  if (strikerId && nonStrikerId && (currentPartnership.runs > 0 || currentPartnership.balls > 0 || partnerships.length === 0)) {
    partnerships.push(currentPartnership);
  }

  const { battingCard, bowlingCard, overSummaries } = buildInningsCardsAndOverSummaries({
    batterStatsMap, bowlerStatsMap, overSummariesMap, battingXI,
    nextBattingOrderStart: nextBattingOrder, ballsPerOver,
  });

  const effectiveTarget = setup.revisedTargetRuns !== undefined ? setup.revisedTargetRuns : targetRunsFromPrevious;

  let completionReason: DerivedInningsState['completionReason'];
  if (isDeclared) completionReason = 'declared';
  else if (effectiveTarget !== undefined && totalRuns >= effectiveTarget) completionReason = 'target-chased';
  else if (wickets >= maxWickets) completionReason = 'all-out';
  else if (legalBalls >= maxLegalBalls) completionReason = 'overs-completed';

  const isInningsCompleted = Boolean(completionReason);
  const isEndOfOver = !isInningsCompleted && legalBalls > 0 && legalBalls % ballsPerOver === 0;
  const needsBowlerChange = isEndOfOver && !hasBowlerChangedSinceOverEnd;

  const lastOverBowlerIds = lastCompletedOverIndex >= 0 ? overBowlersMap.get(lastCompletedOverIndex) || [] : [];
  const maxBowlerLegalBalls = setup.isSuperOver ? ballsPerOver : rules.maxOversPerBowler * ballsPerOver;

  const eligibleBowlerIds = bowlingXI.filter((id) => {
    if (isEndOfOver && lastOverBowlerIds.includes(id)) return false;
    if (!isEndOfOver && (id === currentBowlerId || lastOverBowlerIds.includes(id))) return false;
    const bowled = bowlerStatsMap.get(id)?.legalBalls ?? 0;
    return bowled < maxBowlerLegalBalls;
  });

  const decOversFaced = oversToDecimal(legalBalls, ballsPerOver);
  const currentRunRate = decOversFaced > 0 ? Number((totalRuns / decOversFaced).toFixed(2)) : 0;

  let requiredRuns: number | undefined;
  let remainingBalls: number | undefined;
  let requiredRunRate: number | undefined;
  if (effectiveTarget !== undefined) {
    requiredRuns = Math.max(0, effectiveTarget - totalRuns);
    remainingBalls = Math.max(0, maxLegalBalls - legalBalls);
    const remOvers = remainingBalls / ballsPerOver;
    requiredRunRate = requiredRuns === 0 ? 0 : remOvers > 0 ? Number((requiredRuns / remOvers).toFixed(2)) : 99.99;
  }

  const currentOverNumber =
    legalBalls > 0 && legalBalls % ballsPerOver === 0
      ? Math.floor(legalBalls / ballsPerOver)
      : Math.floor(legalBalls / ballsPerOver) + 1;
  const currentOverSummary = overSummariesMap.get(currentOverNumber);
  const currentOverBalls = currentOverSummary ? currentOverSummary.balls : [];
  const availableBatters = battingXI.filter((id) => id !== strikerId && id !== nonStrikerId && !dismissedSet.has(id));

  return {
    inningsNumber: setup.inningsNumber, battingTeamId: setup.battingTeamId,
    bowlingTeamId: setup.bowlingTeamId, isSuperOver: Boolean(setup.isSuperOver),
    totalRuns, wickets, legalBalls, maxOvers,
    oversFormatted: formatOvers(legalBalls, ballsPerOver), currentRunRate,
    targetRuns: effectiveTarget, requiredRuns, remainingBalls, requiredRunRate,
    strikerId, nonStrikerId, currentBowlerId, isFreeHit, isEndOfOver,
    needsBowlerChange, eligibleBowlerIds, lastOverBowlerIds, validationErrors,
    isInningsCompleted, completionReason, extras, battingCard, bowlingCard,
    fallOfWickets, partnerships, overSummaries, currentOverBalls, availableBatters,
    retiredHurtBatters: Array.from(retiredHurtSet),
  };
}
