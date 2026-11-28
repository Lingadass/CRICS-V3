import React from 'react';
import { ArrowLeft, Contrast, Lock, Sliders } from 'lucide-react';
import {
  BallEvent,
  DerivedInningsState,
  DerivedMatchState,
  MatchRecord,
  Player,
  Team,
} from '../engine/types';
import { TranslationDictionary } from '../i18n/translations';
import { formatChaseStripEquationText } from '../utils/matchSummaryUtils';
import { LiveOverStrip } from './LiveOverStrip';
import { TRANSLATIONS } from '../i18n/translations';

/** Formats an over-ball chip with semantic FOUR, SIX, WKT, extra, or dot styling. */
export function formatBallChipDisplay(
  chip: {
    label: string;
    isWicket: boolean;
    isBoundary: boolean;
    isExtra: boolean;
  },
  t: TranslationDictionary = TRANSLATIONS.en
): { text: string; className: string } {
  if (chip.isWicket) {
    return {
      text: chip.label.includes(t.scoring.wktShort)
        ? chip.label
        : `${chip.label} ${t.scoring.wktShort || 'WKT'}`,
      className: 'bg-wicket text-white border border-wicket',
    };
  }
  if (chip.isBoundary && chip.label.includes('6')) {
    return {
      text: `${chip.label} ${t.scoring.sixUpper || 'SIX'}`,
      className: 'bg-six/10 text-six border border-six/40',
    };
  }
  if (chip.isBoundary) {
    return {
      text: `${chip.label} ${t.scoring.fourUpper || 'FOUR'}`,
      className: 'bg-four/10 text-four border border-four/40',
    };
  }
  if (chip.isExtra) {
    return {
      text: chip.label,
      className: 'bg-extra/10 text-extra border border-extra/40',
    };
  }
  return {
    text: chip.label,
    className: 'bg-page text-text border border-line',
  };
}

interface LiveScoreboardCardProps {
  match: MatchRecord;
  matches: MatchRecord[];
  derived: DerivedMatchState;
  inn: DerivedInningsState;
  battingTeam?: Team;
  bowlingTeam?: Team;
  bowlingXI: string[];
  playersMap: Record<string, Player>;
  matchEvents: BallEvent[];
  isScoringLocked: boolean;
  setScoringLocked: (locked: boolean) => void;
  highContrastScoring?: boolean;
  onToggleHighContrast?: () => void;
  setActiveMatchId: (id: string) => void;
  onBackFromLive: () => void;
  onOpenDlsModal: () => void;
  onOpenEndOverBowlerModal: () => void;
  onSelectBallToEdit?: (ev: BallEvent) => void;
  t: TranslationDictionary;
}

export const LiveScoreboardCard: React.FC<LiveScoreboardCardProps> = ({
  match,
  matches,
  derived,
  inn,
  battingTeam,
  bowlingTeam,
  playersMap,
  isScoringLocked,
  setScoringLocked,
  highContrastScoring,
  onToggleHighContrast,
  setActiveMatchId,
  onBackFromLive,
  onOpenDlsModal,
  onOpenEndOverBowlerModal,
  t,
}) => {
  const strikerRow = inn.battingCard.find((b) => b.playerId === inn.strikerId);
  const nonStrikerRow = inn.battingCard.find((b) => b.playerId === inn.nonStrikerId);
  const bowlerRow = inn.bowlingCard.find((b) => b.playerId === inn.currentBowlerId);
  const activePartnership = inn.partnerships[inn.partnerships.length - 1];

  const lastWicketFow = inn.fallOfWickets[inn.fallOfWickets.length - 1];
  const lastWicketPlayerName = lastWicketFow
    ? playersMap[lastWicketFow.dismissedPlayerId]?.name || lastWicketFow.dismissedPlayerId
    : '';
  const lastWicketBatterStats = lastWicketFow
    ? inn.battingCard.find((b) => b.playerId === lastWicketFow.dismissedPlayerId)
    : undefined;

  const battingCode = battingTeam?.shortName || battingTeam?.name || inn.battingTeamId;

  const runsNeeded =
    inn.targetRuns !== undefined
      ? inn.requiredRuns ?? Math.max(0, inn.targetRuns - inn.totalRuns)
      : undefined;
  const ballsRemaining =
    inn.targetRuns !== undefined
      ? inn.remainingBalls ?? Math.max(0, inn.maxOvers * 6 - inn.legalBalls)
      : undefined;

  return (
    <section
      data-testid="live-scoreboard-card"
      aria-label={t.scoring.liveScoreboardAria}
      className="rounded-2xl bg-card border border-line overflow-hidden shadow-xs flex flex-col flex-1 min-h-0 select-none"
    >
      {/* 1. Top Bar: 48px fixed height */}
      <div
        data-testid="live-top-bar"
        className="h-12 min-h-[48px] max-h-[48px] bg-brand-950 text-white px-2.5 border-b border-brand-800 flex items-center justify-between gap-2 shrink-0"
      >
        <button
          type="button"
          data-testid="live-back-btn"
          onClick={onBackFromLive}
          aria-label={t.scoring.backBtn}
          className="min-h-[48px] min-w-[48px] px-2.5 rounded-xl bg-brand-900 text-brand-100 border border-brand-700 text-sm font-bold flex items-center justify-center gap-1 shrink-0"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">{t.scoring.backBtn}</span>
        </button>

        <h1
          data-testid="live-match-title"
          className="min-w-0 flex-1 text-center text-sm font-bold text-brand-100 leading-tight break-words [overflow-wrap:anywhere] line-clamp-2 overflow-hidden px-1"
        >
          {match.title}
        </h1>

        <div className="flex items-center gap-1 shrink-0">
          {matches.length > 1 && (
            <select
              aria-label={t.scoring.switchMatchAria}
              value={match.id}
              onChange={(e) => setActiveMatchId(e.target.value)}
              className="hidden md:block min-h-[48px] rounded-xl bg-brand-900 text-brand-100 text-sm px-2 py-1 border border-brand-700 max-w-[130px]"
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            data-testid="live-lock-btn"
            onClick={() => setScoringLocked(!isScoringLocked)}
            title={t.scoring.lockKeypadTitle}
            className={`min-h-[48px] min-w-[48px] px-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1 ${isScoringLocked
              ? 'bg-accent text-brand-950'
              : 'bg-brand-900 text-brand-100 border border-brand-700'
              }`}
          >
            <Lock className="w-4 h-4 shrink-0" />
            <span>{isScoringLocked ? t.scoring.lockedBtn : t.scoring.lockBtn}</span>
          </button>

          <button
            type="button"
            onClick={onOpenDlsModal}
            className="hidden sm:flex min-h-[48px] px-2.5 rounded-xl bg-brand-900 text-brand-100 border border-brand-700 text-sm font-semibold items-center gap-1"
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>{t.scoring.dlsShort}</span>
          </button>

          {onToggleHighContrast && (
            <button
              type="button"
              onClick={onToggleHighContrast}
              aria-pressed={Boolean(highContrastScoring)}
              aria-label={t.scoring.highContrastAria}
              className={`hidden sm:flex min-h-[48px] px-2.5 rounded-xl text-sm font-bold items-center gap-1 border ${highContrastScoring
                ? 'bg-accent text-brand-950 border-accent'
                : 'bg-brand-900 text-brand-100 border-brand-700'
                }`}
            >
              <Contrast className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">{t.scoring.highContrastBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Container for Zones 2-4: If content overflows (e.g. at 130%-200% font scale), it scrolls INSIDE here while keypad stays pinned */}
      <div
        data-testid="live-bands-container"
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col justify-between"
      >
        {/* 2. Score Band: ~84 to 96px */}
        <div
          data-testid="live-score-strip"
          className="bg-brand-900 text-white px-2.5 py-1 border-b border-brand-800 flex flex-col gap-1 shrink-0"
        >
          {/* Line 1: Batting Code, Score (>=40px), Overs & Run Rate */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="flex items-baseline justify-between gap-2 leading-none"
          >
            <div className="flex items-baseline gap-2 min-w-0">
              <span
                data-testid="live-team-code"
                className="text-base font-extrabold font-mono tracking-wide text-accent shrink-0"
              >
                {battingCode}
              </span>
              <span
                data-testid="live-total-score"
                className="text-[40px] font-extrabold font-mono tabular-nums tracking-tight leading-none text-white"
              >
                {inn.totalRuns}/{inn.wickets}
              </span>
            </div>

            <span
              data-testid="live-overs-display"
              className="text-sm font-mono tabular-nums font-semibold text-brand-100 leading-tight shrink-0"
            >
              ({inn.oversFormatted}/{inn.maxOvers}) · {t.scoring.crr} {inn.currentRunRate.toFixed(2)}
            </span>
          </div>

          {/* Line 2: Chase equation or Match status */}
          <div
            data-testid="chase-equation-bar"
            className="px-2 py-0.5 rounded-lg bg-brand-950/80 border border-brand-700/70 text-sm font-mono text-accent font-bold leading-tight"
          >
            {inn.targetRuns !== undefined && !derived.isMatchCompleted ? (
              <span>
                {formatChaseStripEquationText(runsNeeded ?? 0, ballsRemaining ?? 0, t)} · {t.scoring.target} {inn.targetRuns} · {t.scoring.rrr} {(inn.requiredRunRate ?? 0).toFixed(2)}
              </span>
            ) : (
              <span className="text-brand-100 font-semibold">
                {battingCode} {t.scoring.vsShort} {bowlingTeam?.shortName || bowlingTeam?.name || inn.bowlingTeamId} · {derived.resultSummaryText}
              </span>
            )}
          </div>

          {/* Line 3 (Only after a wicket has fallen): Last wicket */}
          {inn.wickets > 0 && lastWicketFow && (
            <div
              data-testid="live-last-wicket-line"
              className="text-sm font-semibold text-brand-200 leading-tight px-0.5"
            >
              <span className="text-muted font-bold">{t.scoring.lastWicket}: </span>
              <span>
                {lastWicketPlayerName} {lastWicketBatterStats?.runs ?? 0}({lastWicketBatterStats?.balls ?? 0}) · {lastWicketFow.scoreAtDismissal}/{lastWicketFow.wicketNumber}
              </span>
            </div>
          )}
        </div>

        {/* 3. Players Band: Batters ~36-40px each (names >= 16px) + Bowler row with O, M, R, W and Partnership */}
        <div
          data-testid="live-players-band"
          className="px-2.5 py-1 bg-card border-b border-line flex flex-col gap-0.5 shrink-0"
        >
          {/* Striker Row: 36 to 40px */}
          <div
            data-testid="live-striker-row"
            className="flex items-center justify-between gap-2 py-1 max-h-10"
          >
            <span className="text-[16px] font-bold text-brand-600 dark:text-brand-300 min-w-0 leading-tight">
              {playersMap[inn.strikerId]?.name || inn.strikerId || t.scoring.striker} *
            </span>
            <div className="flex items-baseline gap-2 shrink-0 font-mono tabular-nums leading-none">
              <span
                data-testid="live-striker-runs"
                className="text-[20px] font-extrabold text-text leading-none"
              >
                {strikerRow?.runs ?? 0}
              </span>
              <span className="text-sm text-muted font-semibold leading-none">
                ({strikerRow?.balls ?? 0})
              </span>
              <span className="text-sm text-four font-bold leading-none">
                {t.scorecards.foursCol}:{strikerRow?.fours ?? 0}
              </span>
              <span className="text-sm text-six font-bold leading-none">
                {t.scorecards.sixesCol}:{strikerRow?.sixes ?? 0}
              </span>
            </div>
          </div>

          {/* Non-Striker Row: 36 to 40px with partnership beside batter */}
          <div
            data-testid="live-nonstriker-row"
            className="flex items-center justify-between gap-2 py-1 max-h-10 border-t border-line/40 pt-0.5"
          >
            <span className="text-[16px] font-semibold text-text min-w-0 leading-tight">
              {playersMap[inn.nonStrikerId]?.name || inn.nonStrikerId || t.scoring.nonStriker}
            </span>
            <div className="flex items-baseline gap-2 shrink-0 font-mono tabular-nums leading-none">
              <span
                data-testid="live-nonstriker-runs"
                className="text-[20px] font-bold text-text leading-none"
              >
                {nonStrikerRow?.runs ?? 0}
              </span>
              <span className="text-sm text-muted font-semibold leading-none">
                ({nonStrikerRow?.balls ?? 0})
              </span>
              <span className="text-sm text-brand-600 dark:text-brand-300 font-semibold leading-none">
                · <span className="hidden min-[380px]:inline">{t.scoring.partnership}</span>
                <span className="min-[380px]:hidden">{t.scoring.pshipShort}</span> {activePartnership?.runs ?? 0}({activePartnership?.balls ?? 0})
              </span>
            </div>
          </div>

          {/* Bowler Row: Single line with labelled O, M, R, W or bowler selection prompt */}
          <div
            data-testid="live-bowler-row"
            className="flex items-center justify-between gap-1 py-1 border-t border-line/50 pt-0.5 text-sm leading-tight"
          >
            {inn.needsBowlerChange ? (
              <div className="flex items-center justify-between w-full gap-2">
                <span className="font-bold text-extra text-sm leading-tight">
                  {t.scoring.endOfOver} {inn.oversFormatted.split('.')[0]} — {t.scoring.nextBowlerPrompt}
                </span>
                <button
                  type="button"
                  onClick={onOpenEndOverBowlerModal}
                  className="min-h-[48px] px-3 rounded-xl bg-brand-600 text-white text-sm font-bold shrink-0"
                >
                  {t.scoring.selectBowlerBtn}
                </button>
              </div>
            ) : (
              <>
                <span className="font-bold text-text shrink-0">
                  {playersMap[inn.currentBowlerId]?.name || inn.currentBowlerId}
                </span>
                <div
                  className="flex items-center gap-1 shrink-0 font-mono tabular-nums text-brand-600 dark:text-brand-300 font-semibold text-sm"
                  aria-label={`${t.scoring.oversWord}: ${bowlerRow?.oversFormatted ?? '0.0'}, ${t.scoring.maidensWord}: ${bowlerRow?.maidens ?? 0}, ${t.scoring.runsWord}: ${bowlerRow?.runsConceded ?? 0}, ${t.scoring.wicketsWord}: ${bowlerRow?.wickets ?? 0}`}
                >
                  <span className="hidden min-[393px]:inline whitespace-nowrap">
                    {t.scoring.oversWord}: {bowlerRow?.oversFormatted ?? '0.0'} {t.scoring.maidensWord}: {bowlerRow?.maidens ?? 0} {t.scoring.runsWord}: {bowlerRow?.runsConceded ?? 0} {t.scoring.wicketsWord}: {bowlerRow?.wickets ?? 0}
                  </span>
                  <span className="min-[393px]:hidden whitespace-nowrap">
                    O:{bowlerRow?.oversFormatted ?? '0.0'} M:{bowlerRow?.maidens ?? 0} R:{bowlerRow?.runsConceded ?? 0} W:{bowlerRow?.wickets ?? 0}
                  </span>
                  <span className="sr-only">
                    {t.scoring.partnership} {activePartnership?.runs ?? 0}({activePartnership?.balls ?? 0})
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 4. Over Strip: Fixed 44px swipeable strip */}
        <LiveOverStrip inn={inn} t={t} />
      </div>
    </section>
  );
};
