import React from 'react';
import { Award, Swords, TrendingUp } from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { HeadToHeadStats, MatchRecord, Player, PlayerCareerStats } from '../engine/types';
import { TranslationDictionary } from '../i18n/translations';

interface CareersAnalyticsSectionsProps {
  activePlayer: Player;
  players: Player[];
  stats: PlayerCareerStats;
  h2hOpponentId: string;
  setH2hOpponentId: (id: string) => void;
  h2hRole: 'batter' | 'bowler';
  setH2hRole: (role: 'batter' | 'bowler') => void;
  h2hStats: HeadToHeadStats | null;
  potmHistoryMatches: MatchRecord[];
  setActiveMatchId: (id: string, tab: 'scorecards') => void;
  t: TranslationDictionary;
}

export const CareersAnalyticsSections: React.FC<CareersAnalyticsSectionsProps> = ({
  activePlayer,
  players,
  stats,
  h2hOpponentId,
  setH2hOpponentId,
  h2hRole,
  setH2hRole,
  h2hStats,
  potmHistoryMatches,
  setActiveMatchId,
  t,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <section className="rounded-2xl bg-card border border-line p-5 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-600 dark:text-brand-300" />
          <h3 className="text-sm font-bold text-text">{t.careers.recentFormHeading}</h3>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={
                stats.recentForm.length > 0
                  ? stats.recentForm
                  : [
                      {
                        matchId: 'none',
                        date: '—',
                        opponentTeamId: 'none',
                        runs: 0,
                        balls: 0,
                        wickets: 0,
                        runsConceded: 0,
                      },
                    ]
              }
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="runs"
                name={t.careers.runsScoredLabel}
                stroke="var(--color-brand-600)"
                strokeWidth={3}
              />
              <Line
                type="monotone"
                dataKey="wickets"
                name={t.careers.wicketsLabel}
                stroke="var(--color-wicket)"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl bg-card border border-line p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-brand-600 dark:text-brand-300" />
            <h3 className="text-sm font-bold text-text">
              {t.careers.headToHeadTitle}: {activePlayer.name}
            </h3>
          </div>
          <select
            aria-label={t.careers.headToHeadTitle}
            value={h2hOpponentId}
            onChange={(e) => setH2hOpponentId(e.target.value)}
            className="min-h-[48px] rounded-xl bg-page border border-line px-3 py-1.5 text-xs font-semibold text-text"
          >
            {players
              .filter((p) => p.id !== activePlayer.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {t.scoring.vsShort} {p.name}
                </option>
              ))}
          </select>
        </div>

        <div
          role="group"
          aria-label={`${t.careers.h2hAsBatter} / ${t.careers.h2hAsBowler}`}
          className="grid grid-cols-2 gap-2"
        >
          <button
            type="button"
            data-testid="h2h-role-batter"
            aria-pressed={h2hRole === 'batter'}
            onClick={() => setH2hRole('batter')}
            className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              h2hRole === 'batter'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-page text-text border-line hover:bg-brand-50 dark:hover:bg-brand-950'
            }`}
          >
            {t.careers.h2hAsBatter}
          </button>
          <button
            type="button"
            data-testid="h2h-role-bowler"
            aria-pressed={h2hRole === 'bowler'}
            onClick={() => setH2hRole('bowler')}
            className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              h2hRole === 'bowler'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-page text-text border-line hover:bg-brand-50 dark:hover:bg-brand-950'
            }`}
          >
            {t.careers.h2hAsBowler}
          </button>
        </div>

        {h2hStats && (
          <div
            data-testid="h2h-stats-grid"
            className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-page border border-line font-mono tabular-nums"
          >
            <div>
              <span className="text-xs text-muted font-sans block">
                {h2hRole === 'bowler' ? t.careers.h2hRunsConcededLabel : t.careers.runsScoredLabel}
              </span>
              <span data-testid="h2h-runs-value" className="text-2xl font-extrabold text-text">
                {h2hStats.runs}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted font-sans block">
                {h2hRole === 'bowler' ? t.careers.h2hBallsBowledLabel : t.careers.ballsFacedLabel}
              </span>
              <span data-testid="h2h-balls-value" className="text-2xl font-extrabold text-text">
                {h2hStats.balls}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted font-sans block">
                {h2hRole === 'bowler' ? t.careers.h2hWicketsTakenLabel : t.careers.dismissalsLabel}
              </span>
              <span data-testid="h2h-dismissals-value" className="text-2xl font-extrabold text-wicket">
                {h2hStats.dismissals}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted font-sans block">{t.careers.strikeRateLabel}</span>
              <span className="text-sm font-bold text-brand-600 dark:text-brand-300">
                {h2hStats.strikeRate.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted font-sans block">{t.careers.dotBallsLabel}</span>
              <span className="text-sm font-bold text-text">{h2hStats.dotBalls}</span>
            </div>
            <div>
              <span className="text-xs text-muted font-sans block">{t.careers.foursSixesLabel}</span>
              <span className="text-sm font-bold text-text">
                {h2hStats.fours} / {h2hStats.sixes}
              </span>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-line space-y-2">
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-accent" />
            <h4 className="text-xs font-bold text-text uppercase">
              {t.careers.potmHistoryTitle} ({potmHistoryMatches.length})
            </h4>
          </div>
          {potmHistoryMatches.length === 0 ? (
            <p className="text-xs text-muted">{t.careers.noPotmAwards}</p>
          ) : (
            <div className="space-y-1.5">
              {potmHistoryMatches.map((m) => (
                <div
                  key={m.id}
                  className="px-3 py-2 rounded-xl bg-page border border-line flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-text">{m.title}</span>
                    <span className="text-muted block">
                      {m.date} · {m.venue} · {m.format}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveMatchId(m.id, 'scorecards')}
                    className="min-h-[48px] px-3 py-1.5 rounded-lg bg-accent text-brand-950 font-bold"
                  >
                    {t.dashboard.scorecardBtn}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
