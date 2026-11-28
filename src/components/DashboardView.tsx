import React, { useMemo, useState } from 'react';
import {
  AlertCircle, ArrowRight, Download, HardDrive, Play, QrCode, Shield, Trash2, Trophy, Users,
} from 'lucide-react';
import { MatchRecord, Player } from '../engine/types';
import { useModalEscape } from '../hooks/useModalEscape';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { getTranslations } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';
import { computeBackupAgeDays } from '../utils/dateUtils';
import { buildMatchSummary, formatMatchResultText } from '../utils/matchSummaryUtils';
import { DashboardModals, DashboardWelcomeBanner } from './DashboardModalsAndWelcome';

export const DashboardView: React.FC = () => {
  const {
    matches, players, teams, totalBallEventsCount, tournaments, settings,
    setActiveTab, setActiveMatchId, setSelectedScorecardMatchId,
    setSelectedTournamentId, deleteMatch, loadSampleData,
  } = useCricsStore();

  const t = getTranslations(settings.language);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [confirmDeleteMatch, setConfirmDeleteMatch] = useState<MatchRecord | null>(null);

  useModalEscape(Boolean(confirmDeleteMatch || showIOSGuide), () => {
    setConfirmDeleteMatch(null);
    setShowIOSGuide(false);
  });

  const activePlayers = useMemo(() => players.filter((p) => !p.archived), [players]);
  const activeTeams = useMemo(() => teams.filter((tm) => !tm.archived), [teams]);
  const playersMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])) as Record<string, Player>,
    [players]
  );
  const teamsNameMap = useMemo(
    () => Object.fromEntries(teams.map((tm) => [tm.id, tm.name])) as Record<string, string>,
    [teams]
  );
  const liveMatches = useMemo(() => matches.filter((m) => m.status === 'live'), [matches]);

  const backupAgeDays = computeBackupAgeDays(settings.lastBackupTimestamp);
  const backupStatusText =
    backupAgeDays === null
      ? t.dashboard.backupNever
      : backupAgeDays === 0
      ? t.dashboard.backupToday
      : `${backupAgeDays} ${t.dashboard.backupDaysAgo}`;

  const shouldShowBackupReminder =
    (settings.matchesSinceLastBackup || 0) >=
      (settings.backupReminderIntervalMatches || 3) ||
    (backupAgeDays !== null && backupAgeDays >= 14);

  const isFreshEmptyApp =
    players.length === 0 && teams.length === 0 && matches.length === 0;

  const handleConfirmDeleteMatch = async () => {
    if (!confirmDeleteMatch) return;
    await deleteMatch(confirmDeleteMatch.id);
    setConfirmDeleteMatch(null);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {shouldShowBackupReminder && (
        <div
          role="region"
          aria-label={t.dashboard.backupReminderAria}
          className="p-4 rounded-2xl bg-wicket/10 border border-wicket/40 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold text-text">
            <AlertCircle className="w-5 h-5 text-wicket shrink-0" />
            <span>{t.common.backupReminder}</span>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-wicket text-white text-xs font-bold"
          >
            {t.dashboard.backupNowBtn}
          </button>
        </div>
      )}

      <DashboardWelcomeBanner
        isFreshEmptyApp={isFreshEmptyApp}
        hasPlayers={activePlayers.length > 0}
        hasTeams={activeTeams.length > 0}
        hasMatches={matches.length > 0}
        setActiveTab={setActiveTab}
        loadSampleData={loadSampleData}
        t={t}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <section className="lg:col-span-7 rounded-3xl bg-brand-950 text-white p-6 border border-brand-800/60 flex flex-col justify-between gap-5">
          {liveMatches.length > 0 ? (
            (() => {
              const liveMatch = liveMatches[0];
              const summary =
                liveMatch.summary ??
                buildMatchSummary(liveMatch, [], playersMap, teamsNameMap);
              const inn =
                summary.innings.find((i) => i.inningsNumber === liveMatch.currentInningsNumber) ||
                summary.innings[summary.innings.length - 1];
              const runs = inn?.runs ?? 0;
              const wickets = inn?.wickets ?? 0;
              const oversText = inn?.oversText ?? '0.0';
              const maxOvers = inn?.maxOvers ?? liveMatch.rules.oversPerInnings;
              const crr = inn?.currentRunRate ?? 0;
              return (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-brand-300">
                      {t.dashboard.liveInProgress} · {liveMatch.venue} · {liveMatch.format}
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      {liveMatch.title}
                    </h1>
                    <div className="pt-2 flex flex-wrap items-baseline gap-4">
                      <span className="text-4xl sm:text-5xl font-extrabold font-mono tabular-nums">
                        {runs}/{wickets}
                      </span>
                      <span className="text-sm text-brand-200 font-mono tabular-nums">
                        ({oversText} / {maxOvers} {t.scoring.oversShort}) · {t.scoring.crr}{' '}
                        {crr.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-brand-200 pt-1">
                      {t.scoring.striker}: <strong>{playersMap[inn?.strikerId || '']?.name}</strong> · {t.scoring.bowler}:{' '}
                      <strong>{playersMap[inn?.currentBowlerId || '']?.name}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      data-testid="hero-resume-live-btn"
                      onClick={() => setActiveMatchId(liveMatch.id, 'live')}
                      className="min-h-[56px] px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-base flex items-center gap-2 shadow-sm"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>{t.dashboard.continueMatch}</span>
                    </button>
                    <button
                      type="button"
                      data-testid="home-main-new-match-btn"
                      onClick={() => setActiveTab('wizard')}
                      className="min-h-[56px] px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/20 text-white font-bold text-sm flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>{t.nav.newMatch}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedScorecardMatchId(liveMatch.id); setActiveTab('scorecards'); }}
                      className="min-h-[48px] px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs"
                    >
                      {t.dashboard.viewLiveScorecard}
                    </button>
                  </div>
                </>
              );
            })()
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-medium text-brand-300">
                {t.tagline.toUpperCase()}
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold">
                {t.dashboard.readyHeading}
              </h1>
              <p className="text-sm text-brand-100/90 max-w-xl">
                {t.dashboard.readySubtitle}
              </p>
              <button
                type="button"
                data-testid="home-main-new-match-btn"
                onClick={() => setActiveTab('wizard')}
                className="min-h-[56px] px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-base inline-flex items-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                {t.nav.newMatch}
              </button>
            </div>
          )}
        </section>

        <section className="lg:col-span-5 rounded-3xl bg-card border border-line p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-text">
                {t.dashboard.quickCommandCenter}
              </h2>
              <p data-testid="home-backup-status" className="text-xs text-muted">
                {t.dashboard.lastBackupStatus}: <strong className="text-text">{backupStatusText}</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5">
            <button
              onClick={() => setActiveTab('players')}
              className="min-h-[56px] p-3 rounded-2xl bg-page border border-line hover:opacity-90 text-left flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-text block">
                  {t.nav.players} ({activePlayers.length})
                </span>
                <span className="text-xs text-muted">{t.dashboard.idCardsAndCsv}</span>
              </div>
              <Users className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </button>

            <button
              onClick={() => setActiveTab('teams')}
              className="min-h-[56px] p-3 rounded-2xl bg-page border border-line hover:opacity-90 text-left flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-text block">
                  {t.nav.teams} ({activeTeams.length})
                </span>
                <span className="text-xs text-muted">{t.teams.captain}</span>
              </div>
              <Shield className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className="min-h-[56px] p-3 rounded-2xl bg-page border border-line hover:opacity-90 text-left flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-text block">
                  {t.dashboard.backupAndRestore}
                </span>
                <span className="text-xs text-muted">{t.settings.exportJsonBtn}</span>
              </div>
              <HardDrive className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </button>

            <button
              type="button"
              data-testid="home-scan-pass-btn"
              onClick={() => setActiveTab('scan')}
              className="min-h-[56px] p-3 rounded-2xl bg-page border border-line hover:opacity-90 text-left flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-text block">
                  {t.scanner.scanPassBtn}
                </span>
                <span className="text-xs text-muted">{t.scanner.quickSubtitle}</span>
              </div>
              <QrCode className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </button>
          </div>

          {!isInstalled && (
            <div className="pt-2 border-t border-line flex items-center justify-between gap-2">
              <span className="text-xs text-muted">{t.dashboard.installBannerText}</span>
              {isInstallable ? (
                <button
                  onClick={install}
                  className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t.common.installApp}
                </button>
              ) : isIOS ? (
                <button
                  onClick={() => setShowIOSGuide(true)}
                  className="min-h-[48px] px-3 py-1.5 rounded-xl border border-line text-xs font-semibold shrink-0"
                >
                  {t.dashboard.installOnIosBtn}
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('settings')}
                  className="min-h-[48px] px-3 py-1.5 rounded-xl bg-page border border-line text-xs font-semibold shrink-0"
                >
                  {t.nav.settings}
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-card border border-line p-4">
          <span className="text-xs text-muted block">{t.dashboard.registeredPlayers}</span>
          <span className="text-2xl font-extrabold font-mono tabular-nums text-text mt-1 block">
            {activePlayers.length}
          </span>
        </div>
        <div className="rounded-2xl bg-card border border-line p-4">
          <span className="text-xs text-muted block">{t.dashboard.activeSquads}</span>
          <span className="text-2xl font-extrabold font-mono tabular-nums text-text mt-1 block">
            {activeTeams.length}
          </span>
        </div>
        <div className="rounded-2xl bg-card border border-line p-4">
          <span className="text-xs text-muted block">{t.dashboard.matchesRecorded}</span>
          <span className="text-2xl font-extrabold font-mono tabular-nums text-text mt-1 block">
            {matches.length}
          </span>
        </div>
        <div className="rounded-2xl bg-card border border-line p-4">
          <span className="text-xs text-muted block">{t.dashboard.ballEventsCount}</span>
          <span className="text-2xl font-extrabold font-mono tabular-nums text-brand-600 dark:text-brand-400 mt-1 block">
            {totalBallEventsCount}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 rounded-2xl bg-card border border-line p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text">{t.dashboard.recentMatches}</h2>
            <button
              type="button"
              data-testid="quick-link-scorecards"
              onClick={() => setActiveTab('scorecards')}
              className="min-h-[48px] px-2 text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1"
            >
              {t.dashboard.allScorecards} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {matches.length === 0 ? (
            <div className="p-5 rounded-2xl bg-page border border-line text-center">
              <p className="text-xs text-muted">{t.dashboard.noMatchesYet}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {matches.map((m) => {
                const summary =
                  m.summary ?? buildMatchSummary(m, [], playersMap, teamsNameMap);
                const inn1 = summary.innings.find((i) => i.inningsNumber === 1);
                const inn2 = summary.innings.find((i) => i.inningsNumber === 2);
                const resultText = formatMatchResultText(summary, teamsNameMap, t);

                return (
                  <div
                    key={m.id}
                    data-testid={`recent-match-card-${m.id}`}
                    className="p-4 rounded-2xl bg-page border border-line flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <span className="text-xs text-muted">
                        {m.date} · {m.venue} · {m.format} · {m.status.toUpperCase()}
                      </span>
                      <h3 className="text-sm font-bold text-text">
                        {m.title}
                      </h3>
                      <div
                        data-testid={`recent-match-totals-${m.id}`}
                        className="text-xs font-mono tabular-nums text-muted"
                      >
                        {inn1 && (
                          <span>
                            {teamsNameMap[inn1.battingTeamId]}: {inn1.runs}/
                            {inn1.wickets} ({inn1.oversText})
                          </span>
                        )}
                        {inn2 && (
                          <span>
                            {' '}
                            · {teamsNameMap[inn2.battingTeamId]}: {inn2.runs}/
                            {inn2.wickets} ({inn2.oversText})
                          </span>
                        )}
                      </div>
                      <p
                        data-testid={`recent-match-result-${m.id}`}
                        className="text-xs font-semibold text-success"
                      >
                        {resultText}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {m.status === 'live' && (
                        <button
                          onClick={() => setActiveMatchId(m.id, 'live')}
                          className="min-h-[48px] px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
                        >
                          {t.dashboard.scoreLiveBtn}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedScorecardMatchId(m.id);
                          setActiveTab('scorecards');
                        }}
                        className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line text-xs font-semibold"
                      >
                        {t.dashboard.scorecardBtn}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteMatch(m)}
                        aria-label={`${t.dashboard.deleteMatchAria} ${m.title}`}
                        className="min-h-[48px] min-w-[48px] rounded-xl border border-wicket/40 text-wicket hover:bg-wicket/10 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="lg:col-span-5 rounded-2xl bg-card border border-line p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text">{t.dashboard.tournamentsAndCareerHub}</h2>
            <button
              type="button"
              data-testid="quick-link-tournaments"
              onClick={() => setActiveTab('tournaments')}
              className="min-h-[48px] px-2 text-xs font-semibold text-brand-600 dark:text-brand-400"
            >
              {t.dashboard.manageBtn}
            </button>
          </div>

          <div className="space-y-2.5">
            {tournaments.map((tr) => (
              <div
                key={tr.id}
                onClick={() => { setSelectedTournamentId(tr.id); setActiveTab('tournaments'); }}
                className="p-4 rounded-2xl bg-page border border-line cursor-pointer hover:border-brand-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">{tr.season} · {tr.type} · {tr.format}</span>
                  <Trophy className="w-4 h-4 text-accent" />
                </div>
                <h3 className="text-sm font-bold text-text mt-1">{tr.name}</h3>
                <p className="text-xs text-muted mt-1">
                  {tr.teamIds.length} {t.nav.teams} · {tr.fixtures.length} {t.dashboard.scheduledFixtures} · {t.dashboard.officialNrrTable}
                </p>
              </div>
            ))}

            <button
              onClick={() => setActiveTab('careers')}
              className="w-full min-h-[48px] p-4 rounded-2xl border border-line text-left flex items-center justify-between hover:bg-page"
            >
              <div>
                <span className="text-sm font-bold text-text block">
                  {t.dashboard.careerProfilesHeading}
                </span>
                <span className="text-xs text-muted">
                  {t.dashboard.careerProfilesSub}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted" />
            </button>
          </div>
        </section>
      </div>

      <DashboardModals
        confirmDeleteMatch={confirmDeleteMatch}
        ballCountForDelete={
          confirmDeleteMatch
            ? confirmDeleteMatch.summary?.recordedBallsCount ??
              confirmDeleteMatch.summary?.innings.reduce((acc, i) => acc + i.legalBalls, 0) ??
              0
            : 0
        }
        onCancelDelete={() => setConfirmDeleteMatch(null)}
        onConfirmDelete={handleConfirmDeleteMatch}
        showIOSGuide={showIOSGuide}
        onCloseIOSGuide={() => setShowIOSGuide(false)}
        t={t}
      />
    </div>
  );
};
