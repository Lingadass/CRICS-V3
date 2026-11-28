import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Activity, Award, Download, FileSpreadsheet, Home,
  MoreHorizontal, Settings, Shield, Trophy, TrendingUp, Users,
} from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { DashboardView } from './components/DashboardView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IntroSplash } from './components/IntroSplash';
import { LiveScorerView } from './components/LiveScorerView';
import { useModalEscape } from './hooks/useModalEscape';
import { usePWAInstall } from './hooks/usePWAInstall';
import { applyThemeToDocument, getTranslations } from './i18n/translations';
import { NavTab, useCricsStore } from './store/useCricsStore';
import { shouldShowSwUpdateBanner } from './utils/pwaUtils';
import { buildHashRoute, parseHashRoute } from './utils/routeAndSecurityUtils';

const MatchWizardView = lazy(() =>
  import('./components/MatchWizardView').then((m) => ({ default: m.MatchWizardView }))
);
const ScorecardView = lazy(() =>
  import('./components/ScorecardView').then((m) => ({ default: m.ScorecardView }))
);
const PlayersView = lazy(() =>
  import('./components/PlayersView').then((m) => ({ default: m.PlayersView }))
);
const TeamsView = lazy(() =>
  import('./components/TeamsView').then((m) => ({ default: m.TeamsView }))
);
const CareersView = lazy(() =>
  import('./components/CareersView').then((m) => ({ default: m.CareersView }))
);
const TournamentsView = lazy(() =>
  import('./components/TournamentsView').then((m) => ({ default: m.TournamentsView }))
);
const LeaderboardsView = lazy(() =>
  import('./components/LeaderboardsView').then((m) => ({ default: m.LeaderboardsView }))
);
const BackupAndSettingsView = lazy(() =>
  import('./components/BackupAndSettingsView').then((m) => ({ default: m.BackupAndSettingsView }))
);
const ScanPassView = lazy(() =>
  import('./components/ScanPassView').then((m) => ({ default: m.ScanPassView }))
);
const PrivacyPolicyView = lazy(() =>
  import('./components/PrivacyPolicyView').then((m) => ({ default: m.PrivacyPolicyView }))
);

export default function App() {
  const {
    isInitialized, activeTab, activeMatchId, selectedScorecardMatchId,
    selectedCareerPlayerId, selectedTournamentId, setActiveTab, syncFromHash,
    settings, matches, lastScoringActionTimestamp, swUpdateAvailable,
    triggerSwUpdate, initApp, setSwUpdateState,
  } = useCricsStore();

  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [pendingLeaveTarget, setPendingLeaveTarget] = useState<{
    tab?: NavTab;
    hash?: string;
  } | null>(null);

  useModalEscape(showMobileMore, () => setShowMobileMore(false));
  useModalEscape(Boolean(pendingLeaveTarget), () => setPendingLeaveTarget(null));

  useEffect(() => {
    if (activeTab !== 'live' || pendingLeaveTarget) {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
  }, [activeTab, pendingLeaveTarget]);

  const activeLiveMatch = matches.find((m) => m.id === activeMatchId && m.status === 'live');
  const isInActiveLiveView = activeTab === 'live' && Boolean(activeLiveMatch);

  useEffect(() => {
    initApp();

    try {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          setSwUpdateState(true, () => {
            updateSW(true);
          });
        },
      });
    } catch {
      // Service worker registration skipped if unsupported
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initApp, setSwUpdateState]);

  useEffect(() => {
    if (settings.theme !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (ev: MediaQueryListEvent) => applyThemeToDocument('system', undefined, ev.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [settings.theme]);

  useEffect(() => {
    const handleHashChange = () => {
      const targetHash = window.location.hash;
      const parsed = parseHashRoute(targetHash);
      const state = useCricsStore.getState();
      const currentlyLive =
        state.activeTab === 'live' &&
        state.matches.some((m) => m.id === state.activeMatchId && m.status === 'live');

      if (currentlyLive && parsed.tab !== 'live') {
        const liveHash = buildHashRoute({ tab: 'live', matchId: state.activeMatchId || undefined });
        if (window.location.hash !== liveHash) window.history.pushState(null, '', liveHash);
        setPendingLeaveTarget({ hash: targetHash });
        return;
      }

      syncFromHash(targetHash);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [syncFromHash]);

  const handleNavigateTab = (targetTab: NavTab) => {
    setShowMobileMore(false);
    if (targetTab === activeTab) return;
    if (isInActiveLiveView && targetTab !== 'live') {
      setPendingLeaveTarget({ tab: targetTab });
      return;
    }
    setActiveTab(targetTab);
  };

  const handleConfirmLeaveLiveMatch = () => {
    if (!pendingLeaveTarget) return;
    const target = pendingLeaveTarget;
    setPendingLeaveTarget(null);
    if (target.tab) {
      setActiveTab(target.tab);
    } else if (target.hash !== undefined) {
      const nextHash = target.hash || '#/home';
      syncFromHash(nextHash);
      window.history.replaceState(null, '', nextHash);
    }
  };

  const t = getTranslations(settings.language);
  const hasLiveMatch = matches.some((m) => m.status === 'live');
  const canShowUpdateBanner = shouldShowSwUpdateBanner({
    swUpdateAvailable, activeTab, hasLiveMatch, lastScoringActionTimestamp,
  });

  const desktopTabs: { id: NavTab; label: string }[] = [
    { id: 'home', label: t.nav.home },
    { id: 'live', label: t.nav.live },
    { id: 'scorecards', label: t.nav.matches },
    { id: 'players', label: t.nav.players },
    { id: 'careers', label: t.nav.stats },
    { id: 'teams', label: t.nav.teams },
    { id: 'tournaments', label: t.nav.tournaments },
    { id: 'leaderboards', label: t.nav.leaderboards },
    { id: 'settings', label: t.nav.settings },
  ];

  const isMoreTabActive = [
    'live', 'teams', 'tournaments', 'leaderboards', 'settings', 'wizard', 'scan', 'privacy',
  ].includes(activeTab);

  return (
    <ErrorBoundary scopeName="CRICS App Shell">
      <IntroSplash />
      {!isInitialized ? (
        <div className="min-h-screen flex items-center justify-center bg-page text-muted">
          <div className="text-center space-y-2">
            <div className="text-xl font-extrabold tracking-tight text-text">
              {t.appName.split(' ')[0]}
            </div>
            <p className="text-xs text-muted">{t.nav.loadingApp}</p>
          </div>
        </div>
      ) : (
        <div className="min-h-dvh flex flex-col bg-page text-text">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-brand-600 focus:text-white focus:font-bold focus:text-xs"
          >
            {t.nav.skipToContent}
          </a>

          <header
            className={`${
              activeTab === 'live' ? 'hidden md:flex' : 'flex'
            } sticky top-0 z-30 min-h-[56px] px-4 sm:px-6 py-1.5 bg-card/95 backdrop-blur-md border-b border-line items-center justify-between gap-4 no-print`}
          >
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNavigateTab('home')}
              className="min-h-[48px] px-2 flex items-center gap-2 text-lg font-extrabold tracking-tight text-brand-700 dark:text-brand-400 whitespace-nowrap shrink-0"
            >
              <img
                src="/logo-128.png"
                alt="CRICS by eSportZignal"
                width={32}
                height={32}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover shadow-xs border border-brand-600/30"
              />
              <span>{t.appName.split(' ')[0]}</span>
            </button>
            {!isOnline && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-extra/15 text-extra">
                {t.nav.offlineBadge}
              </span>
            )}
          </div>

          <nav
            aria-label={t.nav.desktopNavAria}
            className="hidden md:flex items-center gap-1 overflow-x-auto"
          >
            {desktopTabs.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigateTab(item.id)}
                className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === item.id
                    ? 'bg-brand-600 text-white font-bold'
                    : 'text-muted hover:bg-page'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={install}
                aria-label={t.common.installApp}
                className="min-h-[48px] px-3.5 py-2 text-xs font-bold rounded-xl border border-brand-600 text-brand-700 dark:text-brand-400 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{t.common.installApp}</span>
              </button>
            )}
            {activeTab !== 'home' && activeTab !== 'wizard' && (
              <button
                onClick={() => handleNavigateTab('wizard')}
                className="min-h-[48px] px-4 py-2 text-xs font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-500 transition-colors whitespace-nowrap"
              >
                {t.nav.newMatch}
              </button>
            )}
          </div>
        </header>

        {canShowUpdateBanner && triggerSwUpdate && (
          <div className="bg-accent text-brand-950 px-4 py-2 text-xs font-bold flex items-center justify-between no-print">
            <span>{t.settings.updateReadyStatus}</span>
            <button
              onClick={() => triggerSwUpdate()}
              className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-brand-950 text-white text-xs"
            >
              {t.common.updateNow}
            </button>
          </div>
        )}

        <main
          id="main-content"
          className={`flex-1 w-full max-w-7xl mx-auto ${
            activeTab === 'live'
              ? 'px-1.5 sm:px-6 py-0.5 [@media(min-height:700px)]:py-2 flex flex-col'
              : 'px-4 sm:px-6 py-5 pb-20 md:pb-6'
          }`}
        >
          <ErrorBoundary
            key={`${activeTab}-${activeMatchId}-${selectedScorecardMatchId}-${selectedCareerPlayerId}-${selectedTournamentId}`}
            scopeName={`${activeTab.toUpperCase()} View`}
          >
            <Suspense
              fallback={
                <div className="p-8 text-center text-xs text-muted font-semibold">
                  {t.common.loadingModule}
                </div>
              }
            >
              {activeTab === 'home' && <DashboardView />}
              {activeTab === 'live' && (
                <LiveScorerView onNavigateBack={() => handleNavigateTab('home')} />
              )}
              {activeTab === 'wizard' && <MatchWizardView />}
              {activeTab === 'scorecards' && <ScorecardView />}
              {activeTab === 'players' && <PlayersView />}
              {activeTab === 'teams' && <TeamsView />}
              {activeTab === 'careers' && <CareersView />}
              {activeTab === 'tournaments' && <TournamentsView />}
              {activeTab === 'leaderboards' && <LeaderboardsView />}
              {activeTab === 'settings' && <BackupAndSettingsView />}
              {activeTab === 'scan' && <ScanPassView />}
              {activeTab === 'privacy' && <PrivacyPolicyView />}
            </Suspense>
          </ErrorBoundary>
        </main>

        {showMobileMore && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-dialog-title"
            className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-3"
            onClick={() => setShowMobileMore(false)}
          >
            <div
              className="w-full max-w-md rounded-3xl bg-card border border-line p-4 space-y-2 shadow-2xl mb-16"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-1 pb-1 border-b border-line">
                <h3 id="mobile-more-dialog-title" className="text-sm font-bold text-text">
                  {t.nav.more}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMobileMore(false)}
                  className="min-h-[48px] px-3 text-xs font-semibold text-muted"
                >
                  {t.common.close}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'live' as NavTab, label: t.nav.live, icon: Activity },
                  { id: 'teams' as NavTab, label: t.nav.teams, icon: Shield },
                  { id: 'tournaments' as NavTab, label: t.nav.tournaments, icon: Trophy },
                  { id: 'leaderboards' as NavTab, label: t.nav.leaderboards, icon: Award },
                  { id: 'settings' as NavTab, label: t.nav.settings, icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigateTab(item.id)}
                      className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                        activeTab === item.id
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-page border-line text-text'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {pendingLeaveTarget && (
          <div
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            aria-labelledby="leave-live-match-title"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm rounded-3xl bg-card border border-line p-5 space-y-4 shadow-xl">
              <h3
                id="leave-live-match-title"
                className="text-base font-bold text-text"
              >
                {t.nav.leaveLiveTitle}
              </h3>
              <p className="text-xs text-muted">{t.nav.leaveLiveDesc}</p>
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingLeaveTarget(null)}
                  className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-xs font-bold"
                >
                  {t.nav.stayOnLiveBtn}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLeaveLiveMatch}
                  className="min-h-[48px] flex-1 rounded-xl bg-brand-600 text-white text-xs font-bold"
                >
                  {t.nav.leaveLiveBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        <nav
          data-testid="mobile-bottom-nav"
          aria-label={t.nav.mobileNavAria}
          className={`${
            activeTab === 'live' ? 'hidden' : 'md:hidden'
          } fixed bottom-0 left-0 right-0 z-40 min-h-[60px] px-2 py-1.5 gap-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] bg-card/95 backdrop-blur-md border-t border-line grid grid-cols-5 items-center no-print`}
        >
          {(
            [
              { id: 'home', label: t.nav.homeShort, icon: Home },
              { id: 'scorecards', label: t.nav.matches, icon: FileSpreadsheet },
              { id: 'players', label: t.nav.players, icon: Users },
              { id: 'careers', label: t.nav.stats, icon: TrendingUp },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleNavigateTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
                  active
                    ? 'bg-brand-600 text-white font-bold'
                    : 'text-muted hover:text-text'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs mt-0.5 truncate max-w-[68px]">
                  {tab.label}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowMobileMore((v) => !v)}
            aria-expanded={showMobileMore}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
              isMoreTabActive || showMobileMore
                ? 'bg-brand-600 text-white font-bold'
                : 'text-muted hover:text-text'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
            <span className="text-xs mt-0.5">{t.nav.more}</span>
          </button>
        </nav>
      </div>
      )}
    </ErrorBoundary>
  );
}
