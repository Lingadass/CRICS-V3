import React from 'react';
import { ScorecardChartRow } from '../engine/scoringEngine';
import { TranslationDictionary } from '../i18n/translations';
import { ExportScorecardData } from '../utils/scorecardExportUtils';

interface ExportScorecardProps {
  data: ExportScorecardData;
  chartData?: ScorecardChartRow[];
  t: TranslationDictionary;
}

/**
 * Off-screen full match scorecard component for deterministic PNG image export.
 * Positioned off-screen (not display:none) at fixed 794px width with forced light print style.
 */
export const ExportScorecard = React.forwardRef<HTMLDivElement, ExportScorecardProps>(
  ({ data, chartData = [], t }, ref) => {
    const maxRunsInOver = Math.max(
      1,
      ...chartData.map((r) => Math.max(r.inn1Runs ?? 0, r.inn2Runs ?? 0))
    );
    const maxCumRuns = Math.max(
      1,
      ...chartData.map((r) => Math.max(r.inn1Cumulative ?? 0, r.inn2Cumulative ?? 0))
    );
    const inn1TeamName = data.innings[0]?.battingTeamName || t.scorecards.firstInningsDefault;
    const inn2TeamName = data.innings[1]?.battingTeamName || '';

    return (
      <div
        aria-hidden="true"
        className="fixed -left-[9999px] top-0 w-0 h-0 overflow-hidden pointer-events-none select-none"
      >
        <div
          ref={ref}
          data-testid="export-scorecard-offscreen"
          className="w-[794px] bg-white text-neutral-900 p-8 font-sans"
        >
        {/* Match Header */}
        <header className="border-b-2 border-neutral-800 pb-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-950">{data.matchTitle}</h1>
              <p className="text-xs text-neutral-700 mt-1">
                {t.scorecards.datePrefix}: {data.date} · {t.scorecards.venuePrefix}: {data.venue} ·{' '}
                {data.format} · {t.scorecards.scorerLabel}: {data.scorerName}
              </p>
              <p className="text-xs text-neutral-700 mt-0.5">
                {t.scorecards.tossPrefix}: {data.tossText}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded bg-neutral-100 border border-neutral-300 text-xs font-bold text-neutral-900">
                {t.scorecards.potmLabel}: {data.potmText}
              </span>
            </div>
          </div>
          <p className="text-sm font-bold text-neutral-950 mt-2">
            {t.scorecards.resultPrefix}: {data.resultText}
          </p>
        </header>

        {/* Every Innings */}
        <div className="space-y-8">
          {data.innings.map((inn) => (
            <section
              key={inn.inningsNumber}
              data-testid={`export-innings-${inn.inningsNumber}`}
              className="border border-neutral-300 rounded-lg overflow-hidden bg-white"
            >
              <div className="bg-neutral-900 text-white px-4 py-2.5 flex items-center justify-between">
                <h2 className="text-base font-bold">{inn.headingText}</h2>
                <span className="text-xs font-mono">
                  {t.scoring.crr}: {inn.runRateFormatted}
                </span>
              </div>

              {/* Batting Table */}
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase text-neutral-700 mb-1.5">
                    {inn.battingTeamName} {t.scorecards.battingSuffix}
                  </h3>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-300 bg-neutral-100 text-neutral-800">
                        <th className="py-1.5 px-2 font-bold">{t.scorecards.batterCol}</th>
                        <th className="py-1.5 px-2 font-bold">{t.scorecards.statusCol}</th>
                        <th className="py-1.5 px-2 text-right font-bold">{t.scorecards.runsCol}</th>
                        <th className="py-1.5 px-2 text-right font-bold">{t.scorecards.ballsCol}</th>
                        <th className="py-1.5 px-2 text-right font-bold">{t.scorecards.foursCol}</th>
                        <th className="py-1.5 px-2 text-right font-bold">{t.scorecards.sixesCol}</th>
                        <th className="py-1.5 px-2 text-right font-bold">{t.scorecards.srCol}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 font-mono">
                      {inn.battingRows.map((row) => (
                        <tr key={row.playerId}>
                          <td className="py-1.5 px-2 font-sans font-semibold text-neutral-950">
                            {row.batterName}
                          </td>
                          <td className="py-1.5 px-2 font-sans text-neutral-700">
                            {row.statusText}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-neutral-950">
                            {row.runs}
                          </td>
                          <td className="py-1.5 px-2 text-right text-neutral-800">{row.balls}</td>
                          <td className="py-1.5 px-2 text-right text-neutral-800">{row.fours}</td>
                          <td className="py-1.5 px-2 text-right text-neutral-800">{row.sixes}</td>
                          <td className="py-1.5 px-2 text-right text-neutral-800">
                            {row.strikeRate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Extras, Total & Did Not Bat */}
                  <div className="mt-2 pt-2 border-t border-neutral-300 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-700">
                        {t.scorecards.extrasLabel}
                      </span>
                      <span className="font-mono text-neutral-900">{inn.extrasText}</span>
                    </div>
                    <div className="flex items-center justify-between font-bold text-neutral-950">
                      <span>{t.scorecards.totalLabel}</span>
                      <span className="font-mono">{inn.totalText}</span>
                    </div>
                    {inn.didNotBatNames.length > 0 && (
                      <div className="text-neutral-700 pt-0.5">
                        <strong>{t.scorecards.didNotBatLabel} </strong>
                        {inn.didNotBatText}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bowling Table */}
                <div>
                  <h3 className="text-xs font-bold uppercase text-neutral-700 mb-1.5">
                    {inn.bowlingTeamName} {t.scorecards.bowlingSuffix}
                  </h3>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-300 bg-neutral-100 text-neutral-800">
                        <th className="py-1.5 px-2 font-bold">{t.scorecards.bowlerCol}</th>
                        <th className="py-1.5 px-2 text-right font-bold">{t.scorecards.oversCol}</th>
                        <th className="py-1.5 px-2 text-right font-bold">
                          {t.scorecards.maidensCol}
                        </th>
                        <th className="py-1.5 px-2 text-right font-bold">{t.scorecards.runsCol}</th>
                        <th className="py-1.5 px-2 text-right font-bold">
                          {t.scorecards.wicketsCol}
                        </th>
                        <th className="py-1.5 px-2 text-right font-bold">{t.scorecards.econCol}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 font-mono">
                      {inn.bowlingRows.map((bw) => (
                        <tr key={bw.playerId}>
                          <td className="py-1.5 px-2 font-sans font-semibold text-neutral-950">
                            {bw.bowlerName}
                          </td>
                          <td className="py-1.5 px-2 text-right text-neutral-800">{bw.overs}</td>
                          <td className="py-1.5 px-2 text-right text-neutral-800">{bw.maidens}</td>
                          <td className="py-1.5 px-2 text-right text-neutral-800">{bw.runs}</td>
                          <td className="py-1.5 px-2 text-right font-bold text-neutral-950">
                            {bw.wickets}
                          </td>
                          <td className="py-1.5 px-2 text-right text-neutral-800">{bw.economy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Fall of Wickets & Partnerships */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-200 text-xs">
                  <div>
                    <h4 className="font-bold uppercase text-neutral-700 mb-1">
                      {t.scorecards.fallOfWickets}
                    </h4>
                    {inn.fallOfWickets.length === 0 ? (
                      <p className="text-neutral-600">{t.scorecards.noWicketsFell}</p>
                    ) : (
                      <p className="text-neutral-800 leading-relaxed">
                        {inn.fallOfWickets.map((f) => f.formattedText).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold uppercase text-neutral-700 mb-1">
                      {t.scorecards.partnerships}
                    </h4>
                    <div className="space-y-0.5 text-neutral-800">
                      {inn.partnerships.map((pt, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span>
                            {pt.batter1Name} & {pt.batter2Name}
                          </span>
                          <span className="font-mono font-bold">
                            {pt.runs}
                            {pt.isUnbroken ? '*' : ''} ({pt.balls}
                            {t.scoring.ballsSuffix})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))}

          {/* Deterministic SVG Manhattan & Worm Charts for Print / Export */}
          {chartData.length > 0 && (
            <section
              data-testid="export-scorecard-charts"
              className="border border-neutral-300 rounded-lg p-4 bg-white space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-bold text-neutral-900 mb-2">
                    {t.scorecards.manhattanHeading}
                  </h3>
                  <svg
                    viewBox="0 0 340 140"
                    className="w-full h-36 border border-neutral-200 rounded bg-neutral-50"
                  >
                    {chartData.map((row, idx) => {
                      const slotW = 300 / Math.max(1, chartData.length);
                      const xBase = 24 + idx * slotW;
                      const h1 = ((row.inn1Runs ?? 0) / maxRunsInOver) * 100;
                      const h2 = ((row.inn2Runs ?? 0) / maxRunsInOver) * 100;
                      return (
                        <g key={row.over}>
                          <rect
                            x={xBase + 2}
                            y={115 - h1}
                            width={Math.max(3, slotW * 0.38)}
                            height={h1}
                            fill="rgb(15, 23, 42)"
                          />
                          {row.inn2Runs !== undefined && (
                            <rect
                              x={xBase + 2 + Math.max(3, slotW * 0.4)}
                              y={115 - h2}
                              width={Math.max(3, slotW * 0.38)}
                              height={h2}
                              fill="rgb(180, 83, 9)"
                            />
                          )}
                          <text
                            x={xBase + slotW * 0.4}
                            y={130}
                            fontSize="8"
                            textAnchor="middle"
                            fill="rgb(64, 64, 64)"
                          >
                            {row.over}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-neutral-900 mb-2">
                    {t.scorecards.wormHeading}
                  </h3>
                  <svg
                    viewBox="0 0 340 140"
                    className="w-full h-36 border border-neutral-200 rounded bg-neutral-50"
                  >
                    {(() => {
                      const pts1 = chartData
                        .filter((r) => r.inn1Cumulative !== undefined)
                        .map((r, i) => {
                          const x =
                            24 + (i / Math.max(1, chartData.length - 1)) * 290;
                          const y = 115 - ((r.inn1Cumulative ?? 0) / maxCumRuns) * 100;
                          return `${x},${y}`;
                        })
                        .join(' ');
                      const pts2 = chartData
                        .filter((r) => r.inn2Cumulative !== undefined)
                        .map((r, i) => {
                          const x =
                            24 + (i / Math.max(1, chartData.length - 1)) * 290;
                          const y = 115 - ((r.inn2Cumulative ?? 0) / maxCumRuns) * 100;
                          return `${x},${y}`;
                        })
                        .join(' ');
                      return (
                        <>
                          {pts1 && (
                            <polyline
                              fill="none"
                              stroke="rgb(15, 23, 42)"
                              strokeWidth="2.5"
                              points={pts1}
                            />
                          )}
                          {pts2 && (
                            <polyline
                              fill="none"
                              stroke="rgb(180, 83, 9)"
                              strokeWidth="2.5"
                              points={pts2}
                            />
                          )}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
              <div className="flex items-center gap-6 text-xs text-neutral-700">
                <span>■ {inn1TeamName}</span>
                {inn2TeamName && <span>■ {inn2TeamName}</span>}
              </div>
            </section>
          )}
        </div>

        <footer className="mt-6 pt-3 border-t border-neutral-300 flex items-center justify-between text-xs text-neutral-600">
          <span>{t.scorecards.cricsFooter}</span>
          <span>{data.matchTitle}</span>
        </footer>
        </div>
      </div>
    );
  }
);

ExportScorecard.displayName = 'ExportScorecard';
