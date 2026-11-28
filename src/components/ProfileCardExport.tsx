import React from 'react';
import { TranslationDictionary } from '../i18n/translations';
import {
  buildDeterministicAvatarDataUrl,
  ProfileCardExportModel,
} from '../utils/imageExportUtils';

interface ProfileCardExportProps {
  model: ProfileCardExportModel;
  photoDataUrl?: string;
  jerseyNumber: number | null;
  t: TranslationDictionary;
}

/**
 * Off-screen designed ProfileCardExport component.
 * Base CSS layout is 540x675 so exporting with pixelRatio: 2 produces a crisp 1080x1350 PNG.
 */
export const ProfileCardExport = React.forwardRef<HTMLDivElement, ProfileCardExportProps>(
  ({ model, photoDataUrl, jerseyNumber, t }, ref) => {
    const resolvedPhotoSrc =
      photoDataUrl || buildDeterministicAvatarDataUrl(model.playerName, jerseyNumber);

    return (
      <div
        aria-hidden="true"
        className="fixed -left-[9999px] top-0 w-0 h-0 overflow-hidden pointer-events-none select-none"
      >
        <div
          ref={ref}
          data-testid="profile-card-export-offscreen"
          className="w-[540px] h-[675px] bg-brand-950 text-white p-7 flex flex-col justify-between font-sans border-4 border-brand-700"
        >
          {/* Top Header & Filter Summary Pill */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-brand-800 pb-3">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-accent block font-bold">
                  {t.appName}
                </span>
                <span
                  data-testid="profile-card-filter-summary"
                  className="text-xs font-semibold text-brand-200 block mt-0.5"
                >
                  {model.filterSummaryText}
                </span>
              </div>
              <span className="px-3 py-1 rounded-lg bg-brand-900 border border-brand-700 font-mono text-lg font-extrabold text-accent">
                {model.jerseyText}
              </span>
            </div>

            {/* Player Photo, Name, Role, Team */}
            <div className="flex items-center gap-5 pt-1">
              <img
                data-testid="profile-card-export-photo"
                src={resolvedPhotoSrc}
                alt={model.playerName}
                referrerPolicy="no-referrer"
                className="w-28 h-28 rounded-2xl object-cover border-2 border-accent bg-brand-900 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <span className="text-xs font-mono text-brand-300 block">
                  {model.playerId}
                </span>
                <h2 className="text-2xl font-extrabold text-white leading-tight">
                  {model.playerName}
                </h2>
                <p className="text-sm font-bold text-accent">
                  {model.role} · {model.teamText}
                </p>
                <p className="text-xs text-brand-200">
                  {model.battingStyle} · {model.bowlingStyle}
                </p>
              </div>
            </div>
          </div>

          {/* Key Career Numbers Grid (10 Key Metrics) */}
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-2.5">
              <div className="p-3 rounded-xl bg-brand-900 border border-brand-800 text-center">
                <span className="text-xs text-brand-300 block">{t.careers.matchesLabel}</span>
                <span className="text-xl font-extrabold font-mono text-white mt-0.5 block">
                  {model.matches}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-brand-900 border border-brand-800 text-center">
                <span className="text-xs text-brand-300 block">{t.careers.runsLabel}</span>
                <span className="text-xl font-extrabold font-mono text-white mt-0.5 block">
                  {model.runs}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-brand-900 border border-brand-800 text-center">
                <span className="text-xs text-brand-300 block">{t.careers.avgLabel}</span>
                <span className="text-xl font-extrabold font-mono text-white mt-0.5 block">
                  {model.averageText}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-brand-900 border border-brand-800 text-center">
                <span className="text-xs text-brand-300 block">{t.careers.srLabel}</span>
                <span className="text-xl font-extrabold font-mono text-accent mt-0.5 block">
                  {model.strikeRateText}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-brand-900 border border-brand-800 text-center">
                <span className="text-xs text-brand-300 block">{t.careers.hsLabel}</span>
                <span className="text-xl font-extrabold font-mono text-white mt-0.5 block">
                  {model.highestScoreText}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              <div className="p-3 rounded-xl bg-brand-900 border border-brand-800 text-center">
                <span className="text-xs text-brand-300 block">{t.careers.wicketsLabel}</span>
                <span className="text-xl font-extrabold font-mono text-white mt-0.5 block">
                  {model.wickets}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-brand-900 border border-brand-800 text-center">
                <span className="text-xs text-brand-300 block">{t.careers.bestLabel}</span>
                <span className="text-xl font-extrabold font-mono text-white mt-0.5 block">
                  {model.bestBowlingText}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-brand-900 border border-brand-800 text-center">
                <span className="text-xs text-brand-300 block">{t.careers.econLabel}</span>
                <span className="text-xl font-extrabold font-mono text-accent mt-0.5 block">
                  {model.economyText}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-brand-900 border border-brand-800 text-center">
                <span className="text-xs text-brand-300 block">{t.careers.catchesLabel}</span>
                <span className="text-xl font-extrabold font-mono text-white mt-0.5 block">
                  {model.catches}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-brand-900 border border-brand-800 text-center">
                <span className="text-xs text-brand-300 block">{t.careers.potmShortLabel}</span>
                <span className="text-xl font-extrabold font-mono text-accent mt-0.5 block">
                  {model.potmCount}
                </span>
              </div>
            </div>

            {/* Earned Badges */}
            <div className="p-3.5 rounded-xl bg-brand-900/90 border border-brand-800">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-300 block mb-2">
                {t.careers.earnedBadgesLabel}
              </span>
              <div className="flex flex-wrap gap-2">
                {model.badges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-lg bg-brand-800 border border-accent/40 text-xs font-bold text-accent"
                  >
                    ★ {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer: CRICS Logo & "by eSportZignal" */}
          <div className="pt-3 border-t border-brand-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo-128.png"
                alt={t.appName}
                className="w-10 h-10 rounded-xl object-contain bg-brand-900 p-0.5 border border-brand-700"
              />
              <div>
                <span className="text-sm font-extrabold tracking-wide text-white block">
                  {t.appName}
                </span>
                <span className="text-xs font-semibold text-brand-300 block">
                  {t.careers.byEsportZignal}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-brand-300">
              {t.common.offlineReady}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

ProfileCardExport.displayName = 'ProfileCardExport';
