import React from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line,
  LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ScorecardChartRow } from '../engine/scoringEngine';
import { DerivedInningsState, Player } from '../engine/types';
import { TranslationDictionary } from '../i18n/translations';
import { formatBallChipDisplay } from './LiveScoreboardCard';

export type { ScorecardChartRow };

interface ScorecardChartsAndOversProps {
  chartData: ScorecardChartRow[];
  inn1?: DerivedInningsState;
  inn2?: DerivedInningsState;
  activeInnNum: number;
  inn: DerivedInningsState;
  teamsNameMap: Record<string, string>;
  playersMap: Record<string, Player>;
  t: TranslationDictionary;
}

export const ScorecardChartsAndOvers: React.FC<ScorecardChartsAndOversProps> = ({
  chartData,
  inn1,
  inn2,
  activeInnNum,
  inn,
  teamsNameMap,
  playersMap,
  t,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="rounded-2xl bg-card border border-line p-5">
          <h3 className="text-sm font-bold text-text mb-3">
            {t.scorecards.manhattanHeading}
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="over" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="inn1Runs"
                  name={inn1 ? teamsNameMap[inn1.battingTeamId] : t.scorecards.firstInningsDefault}
                  fill="var(--color-brand-600)"
                  radius={[4, 4, 0, 0]}
                />
                {inn2 && (
                  <Bar
                    dataKey="inn2Runs"
                    name={teamsNameMap[inn2.battingTeamId]}
                    fill="var(--color-accent)"
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-line p-5">
          <h3 className="text-sm font-bold text-text mb-3">
            {t.scorecards.wormHeading}
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="over" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="inn1Cumulative"
                  name={inn1 ? teamsNameMap[inn1.battingTeamId] : t.scorecards.firstInningsDefault}
                  stroke="var(--color-brand-600)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  connectNulls={false}
                />
                {inn2 && (
                  <Line
                    type="monotone"
                    dataKey="inn2Cumulative"
                    name={teamsNameMap[inn2.battingTeamId]}
                    stroke="var(--color-accent)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="rounded-2xl bg-card border border-line p-5 space-y-3">
        <h3 className="text-sm font-bold text-text">
          {t.scorecards.overByOverHeading} ({t.scorecards.inningsLabel} {activeInnNum})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {inn.overSummaries.map((os) => (
            <div
              key={os.overNumber}
              className="p-3 rounded-xl bg-page border border-line flex items-center justify-between gap-2"
            >
              <div>
                <span className="text-xs font-bold text-text">
                  {t.scorecards.overWord} {os.overNumber}
                </span>
                <span className="text-xs text-muted block">
                  {playersMap[os.bowlerId]?.name || os.bowlerId}
                </span>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {os.balls.map((b) => {
                    const formatted = formatBallChipDisplay(b);
                    return (
                      <span
                        key={b.eventId}
                        className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${formatted.className}`}
                      >
                        {formatted.text}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="text-right font-mono tabular-nums shrink-0">
                <span className="text-sm font-bold text-text block">
                  {os.runsInOver} {t.scorecards.runsWord}
                </span>
                <span className="text-xs text-muted">
                  {os.cumulativeRuns}/{os.cumulativeWickets}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};
