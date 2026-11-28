import {
  BallEvent,
  DerivedInningsState,
  ExtraType,
  MatchRecord,
  MatchRulesConfig,
  WicketType,
} from './types';

export function formatOvers(legalBalls: number, ballsPerOver = 6): string {
  const completedOvers = Math.floor(legalBalls / ballsPerOver);
  const balls = legalBalls % ballsPerOver;
  return `${completedOvers}.${balls}`;
}

export function oversToDecimal(legalBalls: number, ballsPerOver = 6): number {
  return legalBalls / ballsPerOver;
}

export function isLegalDelivery(extraType: ExtraType): boolean {
  return extraType === 'none' || extraType === 'bye' || extraType === 'leg-bye';
}

export function doesBatterFaceBall(extraType: ExtraType): boolean {
  return extraType !== 'wide' && extraType !== 'penalty';
}

export function isBowlerCreditedWicket(wicketType?: WicketType): boolean {
  if (!wicketType) return false;
  return (
    wicketType === 'bowled' ||
    wicketType === 'caught' ||
    wicketType === 'lbw' ||
    wicketType === 'stumped' ||
    wicketType === 'hit-wicket'
  );
}

export function isTeamWicket(wicketType?: WicketType): boolean {
  if (!wicketType) return false;
  return wicketType !== 'retired-hurt';
}

export function isValidFreeHitWicket(wicketType?: WicketType): boolean {
  if (!wicketType) return false;
  return (
    wicketType === 'run-out' ||
    wicketType === 'obstructing-field' ||
    wicketType === 'hit-ball-twice'
  );
}

export function calculateBallRuns(
  event: BallEvent,
  rules: MatchRulesConfig
): {
  totalRuns: number;
  batterRuns: number;
  bowlerRuns: number;
  wideExtras: number;
  noBallExtras: number;
  byeExtras: number;
  legByeExtras: number;
  penaltyExtras: number;
  physicalRunsCrossed: number;
} {
  if (event.actionType !== 'delivery') {
    return {
      totalRuns: 0,
      batterRuns: 0,
      bowlerRuns: 0,
      wideExtras: 0,
      noBallExtras: 0,
      byeExtras: 0,
      legByeExtras: 0,
      penaltyExtras: 0,
      physicalRunsCrossed: 0,
    };
  }

  const bat = Math.max(0, event.runsOffBat || 0);
  const extra = Math.max(0, event.extraRuns || 0);

  switch (event.extraType) {
    case 'wide': {
      const wideTotal = rules.wideRuns + extra;
      return {
        totalRuns: wideTotal,
        batterRuns: 0,
        bowlerRuns: wideTotal,
        wideExtras: wideTotal,
        noBallExtras: 0,
        byeExtras: 0,
        legByeExtras: 0,
        penaltyExtras: 0,
        physicalRunsCrossed: extra,
      };
    }
    case 'no-ball': {
      const nbPenalty = rules.noBallRuns;
      if (event.secondaryExtraType === 'bye') {
        const total = nbPenalty + bat + extra;
        return {
          totalRuns: total,
          batterRuns: bat,
          bowlerRuns: nbPenalty + bat,
          wideExtras: 0,
          noBallExtras: nbPenalty,
          byeExtras: extra,
          legByeExtras: 0,
          penaltyExtras: 0,
          physicalRunsCrossed: bat + extra,
        };
      }
      if (event.secondaryExtraType === 'leg-bye') {
        const total = nbPenalty + bat + extra;
        return {
          totalRuns: total,
          batterRuns: bat,
          bowlerRuns: nbPenalty + bat,
          wideExtras: 0,
          noBallExtras: nbPenalty,
          byeExtras: 0,
          legByeExtras: extra,
          penaltyExtras: 0,
          physicalRunsCrossed: bat + extra,
        };
      }

      const nbExtras = nbPenalty + extra;
      const total = nbExtras + bat;
      return {
        totalRuns: total,
        batterRuns: bat,
        bowlerRuns: total,
        wideExtras: 0,
        noBallExtras: nbExtras,
        byeExtras: 0,
        legByeExtras: 0,
        penaltyExtras: 0,
        physicalRunsCrossed: bat + extra,
      };
    }
    case 'bye': {
      return {
        totalRuns: extra,
        batterRuns: 0,
        bowlerRuns: 0,
        wideExtras: 0,
        noBallExtras: 0,
        byeExtras: extra,
        legByeExtras: 0,
        penaltyExtras: 0,
        physicalRunsCrossed: extra,
      };
    }
    case 'leg-bye': {
      return {
        totalRuns: extra,
        batterRuns: 0,
        bowlerRuns: 0,
        wideExtras: 0,
        noBallExtras: 0,
        byeExtras: 0,
        legByeExtras: extra,
        penaltyExtras: 0,
        physicalRunsCrossed: extra,
      };
    }
    case 'penalty': {
      return {
        totalRuns: extra,
        batterRuns: 0,
        bowlerRuns: 0,
        wideExtras: 0,
        noBallExtras: 0,
        byeExtras: 0,
        legByeExtras: 0,
        penaltyExtras: extra,
        physicalRunsCrossed: 0,
      };
    }
    case 'none':
    default: {
      return {
        totalRuns: bat,
        batterRuns: bat,
        bowlerRuns: bat,
        wideExtras: 0,
        noBallExtras: 0,
        byeExtras: 0,
        legByeExtras: 0,
        penaltyExtras: 0,
        physicalRunsCrossed: bat,
      };
    }
  }
}

export function formatBallLabel(event: BallEvent, rules: MatchRulesConfig): string {
  const { totalRuns } = calculateBallRuns(event, rules);
  if (event.isWicket && event.wicketType !== 'retired-hurt') {
    if (totalRuns > 0) return `W+${totalRuns}`;
    return 'W';
  }
  switch (event.extraType) {
    case 'wide':
      return event.extraRuns > 0 ? `Wd+${event.extraRuns}` : 'Wd';
    case 'no-ball': {
      if (event.secondaryExtraType === 'bye' && (event.extraRuns || 0) > 0) {
        return `Nb+B${event.extraRuns}`;
      }
      if (event.secondaryExtraType === 'leg-bye' && (event.extraRuns || 0) > 0) {
        return `Nb+Lb${event.extraRuns}`;
      }
      const sub = (event.runsOffBat || 0) + (event.extraRuns || 0);
      return sub > 0 ? `Nb+${sub}` : 'Nb';
    }
    case 'bye':
      return `B${event.extraRuns || 1}`;
    case 'leg-bye':
      return `Lb${event.extraRuns || 1}`;
    case 'penalty':
      return `P${event.extraRuns || 5}`;
    case 'none':
    default:
      return `${event.runsOffBat || 0}`;
  }
}

export function buildDismissalText(
  wicketType: WicketType | undefined,
  bowlerName: string,
  fielderName?: string
): string {
  if (!wicketType) return 'not out';
  switch (wicketType) {
    case 'bowled':
      return `b ${bowlerName}`;
    case 'caught':
      if (fielderName && fielderName === bowlerName) {
        return `c & b ${bowlerName}`;
      }
      return fielderName ? `c ${fielderName} b ${bowlerName}` : `c sub b ${bowlerName}`;
    case 'lbw':
      return `lbw b ${bowlerName}`;
    case 'stumped':
      return fielderName ? `st ${fielderName} b ${bowlerName}` : `st wk b ${bowlerName}`;
    case 'run-out':
      return fielderName ? `run out (${fielderName})` : 'run out';
    case 'hit-wicket':
      return `hit wicket b ${bowlerName}`;
    case 'retired-hurt':
      return 'retired hurt';
    case 'retired-out':
      return 'retired out';
    case 'obstructing-field':
      return 'obstructing the field';
    case 'hit-ball-twice':
      return 'hit the ball twice';
    case 'timed-out':
      return 'timed out';
    default:
      return 'out';
  }
}

export interface EngineValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateBowlerChange(
  state: DerivedInningsState,
  match: MatchRecord,
  newBowlerId: string,
  reason: 'end-of-over' | 'injury' | 'suspension' = 'end-of-over'
): EngineValidationResult {
  const errors: string[] = [];
  if (!newBowlerId) {
    errors.push('New bowler ID is required.');
    return { valid: false, errors };
  }

  const bowlingXI =
    state.bowlingTeamId === match.teamAId ? match.teamAXI : match.teamBXI;
  if (bowlingXI.length > 0 && !bowlingXI.includes(newBowlerId)) {
    errors.push(`Bowler ${newBowlerId} is not in the bowling team Playing XI.`);
  }

  const ballsPerOver = match.rules.ballsPerOver || 6;
  const maxLegalBalls = state.isSuperOver
    ? ballsPerOver
    : match.rules.maxOversPerBowler * ballsPerOver;

  const bCard = state.bowlingCard.find((b) => b.playerId === newBowlerId);
  const bowledBalls = bCard?.legalBalls ?? 0;

  if (bowledBalls >= maxLegalBalls) {
    errors.push(
      `Bowler ${newBowlerId} has already bowled the maximum quota of ${match.rules.maxOversPerBowler} overs.`
    );
  }

  if (reason === 'end-of-over') {
    if (state.lastOverBowlerIds.includes(newBowlerId)) {
      errors.push(
        `Bowler ${newBowlerId} bowled in the previous over and cannot bowl consecutive overs.`
      );
    }
  } else {
    if (newBowlerId === state.currentBowlerId) {
      errors.push('Replacement bowler must be different from the injured/suspended bowler.');
    }
    if (state.lastOverBowlerIds.includes(newBowlerId)) {
      errors.push(
        `Bowler ${newBowlerId} bowled in the previous over and cannot replace mid-over.`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateNextBallEvent(
  match: MatchRecord,
  state: DerivedInningsState,
  candidate: Partial<BallEvent>
): EngineValidationResult {
  const errors: string[] = [];

  if (state.isInningsCompleted) {
    errors.push('Cannot record a ball event because the innings is already completed.');
    return { valid: false, errors };
  }

  const actionType = candidate.actionType || 'delivery';

  if (actionType === 'bowler-change') {
    const reason =
      candidate.bowlerChangeReason ||
      (state.isEndOfOver ? 'end-of-over' : 'injury');
    return validateBowlerChange(state, match, candidate.newBowlerId || '', reason);
  }

  if (actionType !== 'delivery') {
    return { valid: true, errors };
  }

  if (state.needsBowlerChange) {
    errors.push(
      'End of over reached: a new bowler must be selected before bowling the next over.'
    );
  }

  const ballsPerOver = match.rules.ballsPerOver || 6;
  const maxLegalBalls = state.isSuperOver
    ? ballsPerOver
    : match.rules.maxOversPerBowler * ballsPerOver;
  const currentBowlerRow = state.bowlingCard.find(
    (b) => b.playerId === state.currentBowlerId
  );
  if (currentBowlerRow && currentBowlerRow.legalBalls >= maxLegalBalls) {
    errors.push(
      `Current bowler ${state.currentBowlerId} has already reached the maximum quota of ${match.rules.maxOversPerBowler} overs.`
    );
  }

  const runsOffBat = candidate.runsOffBat ?? 0;
  const extraRuns = candidate.extraRuns ?? 0;
  const extraType = candidate.extraType || 'none';

  if (runsOffBat < 0 || runsOffBat > 6) {
    errors.push(`Invalid runsOffBat (${runsOffBat}): must be between 0 and 6.`);
  }
  if (extraRuns < 0) {
    errors.push(`Invalid extraRuns (${extraRuns}): cannot be negative.`);
  }

  if (
    (extraType === 'wide' ||
      extraType === 'bye' ||
      extraType === 'leg-bye' ||
      extraType === 'penalty') &&
    runsOffBat > 0
  ) {
    errors.push(
      `Cannot score runs off the bat (${runsOffBat}) on a ${extraType} delivery.`
    );
  }

  if (candidate.secondaryExtraType && extraType !== 'no-ball') {
    errors.push('secondaryExtraType (bye/leg-bye) is only valid on a no-ball delivery.');
  }

  if (
    extraType === 'no-ball' &&
    candidate.secondaryExtraType &&
    runsOffBat > 0
  ) {
    errors.push(
      'Cannot combine runsOffBat with byes/leg-byes on the same no-ball delivery.'
    );
  }

  if (candidate.isWicket) {
    if (!candidate.wicketType) {
      errors.push('Wicket delivery must specify a wicketType.');
    } else {
      if (state.isFreeHit && !isValidFreeHitWicket(candidate.wicketType)) {
        errors.push(
          `Dismissal type "${candidate.wicketType}" is not allowed on a Free Hit delivery.`
        );
      }
      if (
        extraType === 'wide' &&
        ['bowled', 'lbw', 'caught', 'hit-ball-twice'].includes(candidate.wicketType)
      ) {
        errors.push(
          `Dismissal type "${candidate.wicketType}" cannot occur on a Wide delivery.`
        );
      }

      const battingXI =
        state.battingTeamId === match.teamAId ? match.teamAXI : match.teamBXI;
      const maxWickets = state.isSuperOver ? 2 : Math.max(1, battingXI.length - 1);
      const isAllOutOnThisBall =
        isTeamWicket(candidate.wicketType) && state.wickets + 1 >= maxWickets;

      if (
        !isAllOutOnThisBall &&
        state.availableBatters.length > 0 &&
        !candidate.incomingBatterId
      ) {
        errors.push('An incoming batter must be selected when wickets remain.');
      }

      if (
        candidate.incomingBatterId &&
        !state.availableBatters.includes(candidate.incomingBatterId)
      ) {
        errors.push(
          `Incoming batter ${candidate.incomingBatterId} is not available to bat.`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
