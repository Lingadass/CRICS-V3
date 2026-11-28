import React from 'react';
import { CheckCircle2, Circle, Database, Play, Shield, UserPlus } from 'lucide-react';
import { MatchRecord } from '../engine/types';
import { TranslationDictionary } from '../i18n/translations';
import { NavTab } from '../store/useCricsStore';

interface DashboardWelcomeBannerProps {
  isFreshEmptyApp: boolean;
  hasPlayers?: boolean;
  hasTeams?: boolean;
  hasMatches?: boolean;
  setActiveTab: (tab: NavTab) => void;
  loadSampleData: () => Promise<void>;
  t: TranslationDictionary;
}

export const DashboardWelcomeBanner: React.FC<DashboardWelcomeBannerProps> = ({
  isFreshEmptyApp,
  hasPlayers = false,
  hasTeams = false,
  hasMatches = false,
  setActiveTab,
  loadSampleData,
  t,
}) => {
  const completedSteps = [hasPlayers, hasTeams, hasMatches].filter(Boolean).length;
  if (!isFreshEmptyApp && completedSteps === 3) return null;

  const steps = [
    {
      label: t.dashboard.stepAddPlayers,
      done: hasPlayers,
      tab: 'players' as NavTab,
      icon: UserPlus,
    },
    {
      label: t.dashboard.stepCreateTeam,
      done: hasTeams,
      tab: 'teams' as NavTab,
      icon: Shield,
    },
    {
      label: t.dashboard.stepStartMatch,
      done: hasMatches,
      tab: 'wizard' as NavTab,
      icon: Play,
    },
  ];

  return (
    <section
      aria-label={t.dashboard.welcomeAria}
      data-testid="first-run-checklist-card"
      className="rounded-3xl bg-card border-2 border-brand-500/40 p-5 sm:p-6 flex flex-col md:flex-row items-center gap-5 shadow-sm"
    >
      <img
        src="/logo-256.png"
        alt="CRICS by eSportZignal"
        width={128}
        height={128}
        className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover shadow-md border border-brand-500/30 shrink-0"
      />
      <div className="space-y-4 flex-1 w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              {t.dashboard.firstRunTitle} ({completedSteps}/3)
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-text">
              {t.dashboard.welcomeHeading}
            </h2>
          </div>
          <button
            type="button"
            data-testid="welcome-sample-data-btn"
            onClick={() => loadSampleData()}
            className="min-h-[48px] px-4 py-2 rounded-2xl bg-page border border-line hover:opacity-90 text-text text-xs font-bold flex items-center gap-2"
          >
            <Database className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>{t.dashboard.loadSampleDataBtn}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <button
                key={step.label}
                type="button"
                onClick={() => setActiveTab(step.tab)}
                className={`min-h-[48px] p-3 rounded-2xl border text-left flex items-center justify-between gap-2 transition-colors ${
                  step.done
                    ? 'bg-brand-50/70 dark:bg-brand-950/40 border-brand-500/50 text-text'
                    : 'bg-page border-line text-text hover:border-brand-500/50'
                }`}
              >
                <span className="flex items-center gap-2 text-xs font-bold">
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted shrink-0" />
                  )}
                  <span>{step.label}</span>
                </span>
                <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

interface DashboardModalsProps {
  confirmDeleteMatch: MatchRecord | null;
  ballCountForDelete: number;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  showIOSGuide: boolean;
  onCloseIOSGuide: () => void;
  t: TranslationDictionary;
}

export const DashboardModals: React.FC<DashboardModalsProps> = ({
  confirmDeleteMatch,
  ballCountForDelete,
  onCancelDelete,
  onConfirmDelete,
  showIOSGuide,
  onCloseIOSGuide,
  t,
}) => {
  return (
    <>
      {confirmDeleteMatch && (
        <div
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby="delete-match-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-line p-6 space-y-4 shadow-xl">
            <h3 id="delete-match-title" className="text-lg font-bold text-wicket">
              {t.dashboard.deleteMatchTitle}
            </h3>
            <p className="text-sm text-text">
              {t.dashboard.deleteMatchPrefix}{' '}
              <strong>{confirmDeleteMatch.title}</strong> ({confirmDeleteMatch.date}{' '}
              {t.dashboard.atWord} {confirmDeleteMatch.venue}){' '}
              {t.dashboard.alongWithWord}{' '}
              <strong>
                {ballCountForDelete} {t.dashboard.recordedBallsSuffix}
              </strong>
              . {t.dashboard.deleteMatchNotice}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onCancelDelete}
                className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                className="min-h-[48px] flex-1 rounded-xl bg-wicket hover:opacity-90 text-white text-sm font-bold"
              >
                {t.dashboard.deleteMatchConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby="ios-guide-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-card border border-line p-6 shadow-xl">
            <h3 id="ios-guide-title" className="text-lg font-semibold text-text">
              {t.dashboard.iosGuideTitle}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {t.dashboard.iosGuideStep1}
              <br />
              {t.dashboard.iosGuideStep2}
            </p>
            <button
              type="button"
              onClick={onCloseIOSGuide}
              className="mt-4 w-full min-h-[48px] rounded-xl bg-page border border-line py-2 text-sm font-semibold text-text"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
