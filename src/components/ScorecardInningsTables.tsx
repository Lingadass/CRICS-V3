import React from 'react';
import { DerivedInningsState, Player } from '../engine/types';
import { TranslationDictionary } from '../i18n/translations';

interface ScorecardInningsTablesProps {
  inn: DerivedInningsState;
  teamsNameMap: Record<string, string>;
  playersMap: Record<string, Player>;
  t: TranslationDictionary;
}

export const ScorecardInningsTables: React.FC<ScorecardInningsTablesProps> = ({
  inn,
  teamsNameMap,
  playersMap,
  t,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <section className="lg:col-span-7 rounded-2xl bg-card border border-line overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">
            {teamsNameMap[inn.battingTeamId]} {t.scorecards.battingSuffix}
          </h2>
          <span className="text-xs font-mono tabular-nums text-muted">
            {t.scoring.crr}: {inn.currentRunRate.toFixed(2)}
          </span>
        </div>

        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t.scorecards.battingCard}>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-2.5 px-4 font-semibold">{t.scorecards.batterCol}</th>
                <th className="py-2.5 px-2 font-semibold">{t.scorecards.statusCol}</th>
                <th className="py-2.5 px-2 text-right font-semibold">{t.scorecards.runsCol}</th>
                <th className="py-2.5 px-2 text-right font-semibold">{t.scorecards.ballsCol}</th>
                <th className="py-2.5 px-2 text-right font-semibold">{t.scorecards.foursCol}</th>
                <th className="py-2.5 px-2 text-right font-semibold">{t.scorecards.sixesCol}</th>
                <th className="py-2.5 px-4 text-right font-semibold">{t.scorecards.srCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-mono tabular-nums">
              {inn.battingCard
                .filter((b) => b.status !== 'did-not-bat')
                .map((b) => (
                  <tr key={b.playerId}>
                    <td className="py-2.5 px-4 font-sans font-semibold text-text">
                      {playersMap[b.playerId]?.name || b.playerId}
                    </td>
                    <td className="py-2.5 px-2 font-sans text-xs text-muted">{b.dismissalText}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-text">{b.runs}</td>
                    <td className="py-2.5 px-2 text-right text-muted">{b.balls}</td>
                    <td className="py-2.5 px-2 text-right text-four font-semibold">{b.fours}</td>
                    <td className="py-2.5 px-2 text-right text-six font-semibold">{b.sixes}</td>
                    <td className="py-2.5 px-4 text-right text-xs text-muted">{b.strikeRate.toFixed(1)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-page border-t border-line space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-muted">{t.scorecards.extrasLabel}</span>
            <span className="font-mono tabular-nums">
              <strong>{inn.extras.total}</strong>{' '}
              {`(${t.scoring.wide}: ${inn.extras.wides}, ${t.scoring.noBall}: ${inn.extras.noBalls}, ${t.scoring.bye}: ${inn.extras.byes}, ${t.scoring.legBye}: ${inn.extras.legByes}, ${t.scoring.penalty}: ${inn.extras.penalty})`}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold text-text">
            <span>{t.scorecards.totalLabel}</span>
            <span className="font-mono tabular-nums">
              {inn.totalRuns}/{inn.wickets} ({inn.oversFormatted} {t.scorecards.oversLabel})
            </span>
          </div>
          {inn.battingCard.some((b) => b.status === 'did-not-bat') && (
            <div className="pt-1 text-muted">
              <strong>{t.scorecards.didNotBatLabel} </strong>
              {inn.battingCard
                .filter((b) => b.status === 'did-not-bat')
                .map((b) => playersMap[b.playerId]?.name || b.playerId)
                .join(' · ')}
            </div>
          )}
        </div>
      </section>

      <div className="lg:col-span-5 space-y-5">
        <section className="rounded-2xl bg-card border border-line overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <h2 className="text-sm font-bold text-text">
              {teamsNameMap[inn.bowlingTeamId]} {t.scorecards.bowlingSuffix}
            </h2>
          </div>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t.scorecards.bowlingCard}>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="py-2.5 px-4 font-semibold">{t.scorecards.bowlerCol}</th>
                  <th className="py-2.5 px-2 text-right font-semibold">{t.scorecards.oversCol}</th>
                  <th className="py-2.5 px-2 text-right font-semibold">{t.scorecards.maidensCol}</th>
                  <th className="py-2.5 px-2 text-right font-semibold">{t.scorecards.runsCol}</th>
                  <th className="py-2.5 px-2 text-right font-semibold">{t.scorecards.wicketsCol}</th>
                  <th className="py-2.5 px-4 text-right font-semibold">{t.scorecards.econCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-mono tabular-nums">
                {inn.bowlingCard.map((bw) => (
                  <tr key={bw.playerId}>
                    <td className="py-2.5 px-4 font-sans font-semibold text-text">
                      {playersMap[bw.playerId]?.name || bw.playerId}
                    </td>
                    <td className="py-2.5 px-2 text-right">{bw.oversFormatted}</td>
                    <td className="py-2.5 px-2 text-right text-muted">{bw.maidens}</td>
                    <td className="py-2.5 px-2 text-right">{bw.runsConceded}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-wicket">{bw.wickets}</td>
                    <td className="py-2.5 px-4 text-right text-xs text-muted">{bw.economy.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-line p-4 space-y-2">
          <h3 className="text-xs font-bold text-muted uppercase">{t.scorecards.fallOfWickets}</h3>
          {inn.fallOfWickets.length === 0 ? (
            <p className="text-xs text-muted">{t.scorecards.noWicketsFell}</p>
          ) : (
            <div className="text-xs text-text leading-relaxed">
              {inn.fallOfWickets.map((fow, i) => (
                <span key={fow.wicketNumber}>
                  {i > 0 && ' · '}
                  <strong className="font-mono text-wicket">
                    {fow.scoreAtDismissal}-{fow.wicketNumber}
                  </strong>{' '}
                  ({playersMap[fow.dismissedPlayerId]?.name}, {fow.oversFormatted} {t.scoring.oversShort})
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-card border border-line p-4 space-y-2.5">
          <h3 className="text-xs font-bold text-muted uppercase">{t.scorecards.partnerships}</h3>
          <div className="space-y-2">
            {inn.partnerships.map((pt, idx) => (
              <div
                key={idx}
                className="text-xs flex items-center justify-between border-b border-line pb-1.5 last:border-none"
              >
                <span className="text-text">
                  {playersMap[pt.batter1Id]?.name} & {playersMap[pt.batter2Id]?.name}
                </span>
                <span className="font-mono tabular-nums font-bold">
                  {pt.runs}
                  {pt.isUnbroken ? '*' : ''} ({pt.balls}{t.scoring.ballsSuffix})
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
