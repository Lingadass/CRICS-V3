import React from 'react';
import { Award, RotateCcw } from 'lucide-react';
import {
  DerivedInningsState,
  DerivedMatchState,
  MatchRecord,
  Player,
  Team,
} from '../engine/types';
import { TRANSLATIONS } from '../i18n/translations';

interface LiveInningsBreakCardProps {
  match: MatchRecord;
  derived: DerivedMatchState;
  inn: DerivedInningsState;
  battingTeam?: Team;
  bowlingTeam?: Team;
  bowlingXI: string[];
  playersMap: Record<string, Player>;
  nextInnStrikerId: string;
  setNextInnStrikerId: (id: string) => void;
  nextInnNonStrikerId: string;
  setNextInnNonStrikerId: (id: string) => void;
  nextInnBowlerId: string;
  setNextInnBowlerId: (id: string) => void;
  onInitiateNextInnings: (
    inningsNumber: 2 | 3 | 4,
    battingTeamId: string,
    bowlingTeamId: string,
    isSuperOver?: boolean
  ) => void;
  onUndoLastBall: () => void;
  onCompleteMatch: () => void;
  t: (typeof TRANSLATIONS)['en'];
}

export const LiveInningsBreakCard: React.FC<LiveInningsBreakCardProps> = ({
  match,
  derived,
  inn,
  battingTeam,
  bowlingTeam,
  bowlingXI,
  playersMap,
  nextInnStrikerId,
  setNextInnStrikerId,
  nextInnNonStrikerId,
  setNextInnNonStrikerId,
  nextInnBowlerId,
  setNextInnBowlerId,
  onInitiateNextInnings,
  onUndoLastBall,
  onCompleteMatch,
  t,
}) => {
  return (
    <section className="rounded-2xl bg-card border border-line p-4 space-y-3">
      <div className="flex items-center gap-2 text-success font-bold text-base">
        <Award className="w-5 h-5" />
        <span>
          {derived.isMatchCompleted
            ? t.scoring.matchCompletedTitle
            : `${t.scoring.inningsBreak} (${inn.completionReason})`}
        </span>
      </div>
      <p className="text-sm text-muted">
        {derived.resultSummaryText}
      </p>

      {/* Start 2nd Innings Setup */}
      {inn.inningsNumber === 1 && !derived.inningsStates[2] && (
        <div className="space-y-2.5 pt-2.5 border-t border-line">
          <h4 className="text-sm font-bold text-text">
            {t.scoring.setupSecondInningsPrefix} ({bowlingTeam?.name} {t.scoring.chaseLabel} — {t.scoring.target} {inn.totalRuns + 1})
          </h4>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label htmlFor="next-inn-striker-select" className="block text-sm font-medium text-muted mb-0.5">
                {t.scoring.openingStrikerLabel}
              </label>
              <select
                id="next-inn-striker-select"
                value={nextInnStrikerId || bowlingXI[0] || ''}
                onChange={(e) => setNextInnStrikerId(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
              >
                {bowlingXI.map((id) => (
                  <option key={id} value={id}>
                    {playersMap[id]?.name || id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="next-inn-nonstriker-select" className="block text-sm font-medium text-muted mb-0.5">
                {t.scoring.openingNonStrikerLabel}
              </label>
              <select
                id="next-inn-nonstriker-select"
                value={nextInnNonStrikerId || bowlingXI[1] || ''}
                onChange={(e) => setNextInnNonStrikerId(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
              >
                {bowlingXI.map((id) => (
                  <option key={id} value={id}>
                    {playersMap[id]?.name || id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="next-inn-bowler-select" className="block text-sm font-medium text-muted mb-0.5">
                {t.scoring.openingBowlerLabel} ({battingTeam?.name})
              </label>
              <select
                id="next-inn-bowler-select"
                value={
                  nextInnBowlerId ||
                  (inn.battingTeamId === match.teamAId
                    ? match.teamAXI[0]
                    : match.teamBXI[0]) ||
                  ''
                }
                onChange={(e) => setNextInnBowlerId(e.target.value)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
              >
                {(inn.battingTeamId === match.teamAId
                  ? match.teamAXI
                  : match.teamBXI
                ).map((id) => (
                  <option key={id} value={id}>
                    {playersMap[id]?.name || id}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() =>
                onInitiateNextInnings(
                  2,
                  inn.bowlingTeamId,
                  inn.battingTeamId,
                  false
                )
              }
              className="min-h-[48px] w-full rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700"
            >
              {t.scoring.startSecondInnings}
            </button>
          </div>
        </div>
      )}

      {/* Super Over Launcher when Match Tied */}
      {derived.winnerTeamId === 'tied' && !derived.inningsStates[3] && (
        <button
          type="button"
          onClick={() =>
            onInitiateNextInnings(3, inn.battingTeamId, inn.bowlingTeamId, true)
          }
          className="min-h-[48px] w-full rounded-xl bg-accent text-brand-950 font-bold text-sm hover:opacity-90"
        >
          {t.scoring.startSuperOver} ({t.scoring.superOverTieBreaker})
        </button>
      )}

      {inn.inningsNumber === 3 && !derived.inningsStates[4] && (
        <button
          type="button"
          onClick={() =>
            onInitiateNextInnings(4, inn.bowlingTeamId, inn.battingTeamId, true)
          }
          className="min-h-[48px] w-full rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700"
        >
          {t.scoring.startSuperOverChasePrefix} ({t.scoring.target} {inn.totalRuns + 1})
        </button>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onUndoLastBall}
          className="min-h-[48px] flex-1 rounded-xl border border-line text-sm font-semibold flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          {t.scoring.undoLastBallBtn}
        </button>
        {derived.isMatchCompleted && match.status !== 'completed' && (
          <button
            type="button"
            onClick={onCompleteMatch}
            className="min-h-[48px] flex-1 rounded-xl bg-brand-600 text-white text-sm font-bold"
          >
            {t.scoring.finalizeMatchBtn}
          </button>
        )}
      </div>
    </section>
  );
};
