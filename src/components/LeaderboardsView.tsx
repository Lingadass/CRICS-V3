import React, { useMemo, useState } from 'react';
import { aggregateCareerStatsFromCache } from '../db/database';
import {
  LeaderboardCategory,
  rankLeaderboardEntries,
} from '../engine/scoringEngine';
import { MatchFormat } from '../engine/types';
import { getTranslations } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';
import { getLocalYearString } from '../utils/dateUtils';

export const LeaderboardsView: React.FC = () => {
  const { players, matches, careerCache, settings, setSelectedCareerPlayerId, setActiveTab } =
    useCricsStore();
  const t = getTranslations(settings.language);

  const [formatFilter, setFormatFilter] = useState<MatchFormat | 'ALL'>('ALL');
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL');
  const [category, setCategory] = useState<LeaderboardCategory>('runs');

  const seasons = useMemo(() => {
    const set = new Set<string>(matches.map((m) => m.season));
    if (set.size === 0) set.add(getLocalYearString());
    return Array.from(set);
  }, [matches]);

  const activePlayers = useMemo(() => players.filter((p) => !p.archived), [players]);

  const careerStatsMap = useMemo(
    () =>
      aggregateCareerStatsFromCache(activePlayers, careerCache, {
        format: formatFilter,
        season: seasonFilter,
      }),
    [activePlayers, careerCache, formatFilter, seasonFilter]
  );

  const rankedList = useMemo(
    () => rankLeaderboardEntries(Object.values(careerStatsMap), category),
    [careerStatsMap, category]
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">{t.leaderboards.title}</h1>
          <p className="text-sm text-muted">{t.leaderboards.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label={t.leaderboards.filterFormatAria}
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value as MatchFormat | 'ALL')}
            className="min-h-[48px] rounded-xl bg-card border border-line px-3 py-2 text-xs font-semibold text-text"
          >
            <option value="ALL">{t.careers.allFormatsOption}</option>
            <option value="T20">{'T20'}</option>
            <option value="T10">{'T10'}</option>
            <option value="ODI">{'ODI'}</option>
            <option value="Custom">{t.careers.customFormatOption}</option>
          </select>

          <select
            aria-label={t.leaderboards.filterSeasonAria}
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            className="min-h-[48px] rounded-xl bg-card border border-line px-3 py-2 text-xs font-semibold text-text"
          >
            <option value="ALL">{t.careers.allSeasonsOption}</option>
            {seasons.map((s) => (
              <option key={s} value={s}>
                {t.careers.seasonPrefix} {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'runs', label: t.leaderboards.mostRuns },
            { id: 'wickets', label: t.leaderboards.mostWickets },
            { id: 'strikeRate', label: t.leaderboards.bestStrikeRate },
            { id: 'economy', label: t.leaderboards.bestEconomy },
            { id: 'catches', label: t.leaderboards.mostCatches },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategory(tab.id)}
            className={`min-h-[48px] px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              category === tab.id
                ? 'bg-brand-600 text-white'
                : 'bg-card border border-line text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl bg-card border border-line overflow-hidden">
        {rankedList.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-muted">{t.leaderboards.emptyMessage}</p>
            <button
              type="button"
              onClick={() => setActiveTab('wizard')}
              className="min-h-[48px] px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold"
            >
              {t.nav.newMatch}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t.leaderboards.title}>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="py-3 px-4 font-semibold">{t.leaderboards.rankCol}</th>
                  <th className="py-3 px-4 font-semibold">{t.leaderboards.playerCol}</th>
                  <th className="py-3 px-3 text-right font-semibold">{t.careers.matchesLabel}</th>
                  <th className="py-3 px-3 text-right font-semibold">{t.careers.runsLabel}</th>
                  <th className="py-3 px-3 text-right font-semibold">{t.careers.srLabel}</th>
                  <th className="py-3 px-3 text-right font-semibold">{t.careers.wicketsLabel}</th>
                  <th className="py-3 px-3 text-right font-semibold">{t.careers.econLabel}</th>
                  <th className="py-3 px-4 text-right font-semibold">{t.leaderboards.catchesRoCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-mono tabular-nums">
                {rankedList.slice(0, 15).map((row, index) => {
                  const p = players.find((pl) => pl.id === row.playerId);
                  if (!p) return null;
                  return (
                    <tr
                      key={row.playerId}
                      onClick={() => {
                        setSelectedCareerPlayerId(row.playerId);
                        setActiveTab('careers');
                      }}
                      className="hover:bg-page cursor-pointer"
                    >
                      <td className="py-3 px-4 font-bold text-muted">#{index + 1}</td>
                      <td className="py-3 px-4 font-sans font-bold text-text">
                        {p.name}{' '}
                        <span className="text-xs font-normal text-muted">({p.role})</span>
                      </td>
                      <td className="py-3 px-3 text-right text-text">{row.matches}</td>
                      <td className="py-3 px-3 text-right font-bold text-brand-600 dark:text-brand-300">
                        {row.runs}
                      </td>
                      <td className="py-3 px-3 text-right text-text">{row.strikeRate.toFixed(1)}</td>
                      <td className="py-3 px-3 text-right font-bold text-wicket">
                        {row.wickets}
                      </td>
                      <td className="py-3 px-3 text-right text-text">{row.economy.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-text">
                        {row.catches + row.stumpings + row.runOuts}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
