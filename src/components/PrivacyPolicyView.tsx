import React from 'react';
import { ArrowLeft, CheckCircle2, HardDrive, Lock, ShieldCheck } from 'lucide-react';
import { getTranslations } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';

export const PrivacyPolicyView: React.FC = () => {
  const { settings, setActiveTab } = useCricsStore();
  const t = getTranslations(settings.language);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 lg:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t.common.offlineReady}
          </span>
          <h1 className="text-2xl font-bold text-text">
            {t.privacy.title}
          </h1>
          <p className="text-sm text-muted">
            {t.privacy.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className="min-h-[48px] px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-text flex items-center gap-2 hover:bg-page"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.privacy.backBtn}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <section className="rounded-2xl bg-card border border-line p-5 space-y-2">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-300">
            <HardDrive className="w-5 h-5 shrink-0" />
            <h2 className="text-base font-bold text-text">
              {t.privacy.summaryHeading}
            </h2>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            {t.privacy.summaryBody}
          </p>
        </section>

        <section className="rounded-2xl bg-card border border-line p-5 space-y-2">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-300">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <h2 className="text-base font-bold text-text">
              {t.privacy.zeroNetworkHeading}
            </h2>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            {t.privacy.zeroNetworkBody}
          </p>
        </section>

        <section className="rounded-2xl bg-card border border-line p-5 space-y-2">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-300">
            <Lock className="w-5 h-5 shrink-0" />
            <h2 className="text-base font-bold text-text">
              {t.privacy.pinHeading}
            </h2>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            {t.privacy.pinBody}
          </p>
        </section>

        <section className="rounded-2xl bg-card border border-line p-5 space-y-2">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-300">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <h2 className="text-base font-bold text-text">
              {t.privacy.controlHeading}
            </h2>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            {t.privacy.controlBody}
          </p>
        </section>
      </div>
    </div>
  );
};
