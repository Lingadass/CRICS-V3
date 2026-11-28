import { formatOvers, oversToDecimal } from './scoringRules';
import {
  BatterCardRow,
  BowlerCardRow,
  OverSummary,
} from './types';

export type InternalBowlerRow = BowlerCardRow & {
  overBowlerRunsMap: Map<number, { legalBalls: number; bowlerRuns: number }>;
};

export function buildInningsCardsAndOverSummaries(params: {
  batterStatsMap: Map<string, BatterCardRow>;
  bowlerStatsMap: Map<string, InternalBowlerRow>;
  overSummariesMap: Map<number, OverSummary>;
  battingXI: string[];
  nextBattingOrderStart: number;
  ballsPerOver: number;
}): {
  battingCard: BatterCardRow[];
  bowlingCard: BowlerCardRow[];
  overSummaries: OverSummary[];
} {
  const {
    batterStatsMap,
    bowlerStatsMap,
    overSummariesMap,
    battingXI,
    ballsPerOver,
  } = params;
  let nextBattingOrder = params.nextBattingOrderStart;

  const bowlingCard: BowlerCardRow[] = [];
  for (const bRow of bowlerStatsMap.values()) {
    let maidens = 0;
    for (const oTrack of bRow.overBowlerRunsMap.values()) {
      if (oTrack.legalBalls === ballsPerOver && oTrack.bowlerRuns === 0) {
        maidens += 1;
      }
    }
    const decOvers = oversToDecimal(bRow.legalBalls, ballsPerOver);
    bowlingCard.push({
      playerId: bRow.playerId,
      legalBalls: bRow.legalBalls,
      oversFormatted: formatOvers(bRow.legalBalls, ballsPerOver),
      maidens,
      runsConceded: bRow.runsConceded,
      wickets: bRow.wickets,
      wides: bRow.wides,
      noBalls: bRow.noBalls,
      dotBalls: bRow.dotBalls,
      economy:
        decOvers > 0 ? Number((bRow.runsConceded / decOvers).toFixed(2)) : 0,
    });
  }

  const overSummaries = Array.from(overSummariesMap.values()).sort(
    (a, b) => a.overNumber - b.overNumber
  );
  for (const os of overSummaries) {
    const legalCount = os.balls.filter((b) => b.isLegal).length;
    const bRow = bowlerStatsMap.get(os.bowlerId);
    const overTrack = bRow?.overBowlerRunsMap.get(os.overNumber - 1);
    os.isMaiden =
      legalCount === ballsPerOver &&
      Boolean(
        overTrack &&
          overTrack.legalBalls === ballsPerOver &&
          overTrack.bowlerRuns === 0
      );
  }

  const battingCard: BatterCardRow[] = Array.from(batterStatsMap.values()).sort(
    (a, b) => a.battingOrder - b.battingOrder
  );
  for (const pId of battingXI) {
    if (!batterStatsMap.has(pId)) {
      battingCard.push({
        playerId: pId,
        battingOrder: nextBattingOrder++,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        status: 'did-not-bat',
        dismissalText: 'did not bat',
      });
    }
  }

  return { battingCard, bowlingCard, overSummaries };
}
