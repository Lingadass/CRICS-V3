import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Database, Download, HardDrive,
  Lock, Monitor, Moon, RefreshCw, Sun, Upload,
} from 'lucide-react';
import {
  analyzeBackupDiff, BackupDiffReport, CricsBackupPayload,
  MergeConflictPolicy, validateBackupFileSize, validateBackupPayload,
} from '../db/database';
import { useModalEscape } from '../hooks/useModalEscape';
import { getTranslations, LanguageCode } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';
import { getLocalDateString } from '../utils/dateUtils';
import { BackupPreviewCard } from './BackupPreviewCard';
import { ClubSecurityCodeSection } from './ClubSecurityCodeSection';

export const BackupAndSettingsView: React.FC = () => {
  const {
    players, teams, matches, totalBallEventsCount, tournaments, settings, storageInfo,
    swUpdateAvailable, triggerSwUpdate, updateSettings, setTheme, setLanguage, setActiveTab,
    setScorerPin, clearScorerPin, exportAllData, confirmBackupSaved,
    importAllData, loadSampleData, removeSampleData, rebuildCareerStats, refreshStorageEstimate,
  } = useCricsStore();
  const t = getTranslations(settings.language);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewPayload, setPreviewPayload] = useState<CricsBackupPayload | null>(null);
  const [previewDiff, setPreviewDiff] = useState<BackupDiffReport | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [conflictResolution, setConflictResolution] = useState<MergeConflictPolicy>('keep-imported');
  const [confirmReplaceCheck, setConfirmReplaceCheck] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showRemoveSampleModal, setShowRemoveSampleModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [includePinInBackup, setIncludePinInBackup] = useState(false);

  useModalEscape(showRemoveSampleModal, () => setShowRemoveSampleModal(false));

  const sampleRecordCount = useMemo(() => {
    return (
      players.filter((p) => p.isSample).length +
      teams.filter((tm) => tm.isSample).length +
      matches.filter((m) => m.isSample).length +
      tournaments.filter((tr) => tr.isSample).length
    );
  }, [players, teams, matches, tournaments]);

  const handleOneTapBackupExport = async () => {
    setErrorMessage('');
    const payload = await exportAllData({ includePin: includePinInBackup });
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crics-backup-${getLocalDateString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    await confirmBackupSaved();
    setStatusMessage('Full JSON backup saved. Backup reminder counter reset to 0.');
    await refreshStorageEstimate();
  };

  const handleSelectBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage('');
    setStatusMessage('');
    setConfirmReplaceCheck(false);

    const sizeCheck = validateBackupFileSize(file.size);
    if (!sizeCheck.valid) {
      setPreviewPayload(null);
      setPreviewDiff(null);
      setErrorMessage(sizeCheck.error || t.settings.backupSizeExceededError);
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const validation = validateBackupPayload(text);
      if (!validation.valid || !validation.payload) {
        setPreviewPayload(null);
        setPreviewDiff(null);
        setErrorMessage(validation.error || t.settings.invalidBackupError);
      } else {
        const diff = await analyzeBackupDiff(validation.payload);
        setPreviewPayload(validation.payload);
        setPreviewDiff(diff);
      }
    } catch {
      setErrorMessage('Could not read backup JSON file.');
    }
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!previewPayload) return;
    if (importMode === 'replace' && !confirmReplaceCheck) {
      setErrorMessage(
        'Please confirm that you understand Replace mode will overwrite all existing local records.'
      );
      return;
    }

    setErrorMessage('');
    await importAllData(previewPayload, importMode, conflictResolution);
    setPreviewPayload(null);
    setPreviewDiff(null);
    setConfirmReplaceCheck(false);
    setStatusMessage(
      `Backup imported (${importMode.toUpperCase()} mode) in a single atomic transaction.`
    );
  };

  const handleLoadSampleData = async () => {
    setErrorMessage('');
    await loadSampleData();
    setStatusMessage(
      'Sample club data loaded (tagged with isSample: true). You can remove it anytime below.'
    );
  };

  const handleConfirmRemoveSampleData = async () => {
    setErrorMessage('');
    await removeSampleData();
    setShowRemoveSampleModal(false);
    setStatusMessage('All sample records removed. Your own records remain untouched.');
  };

  const handleRebuildCareerStats = async () => {
    setErrorMessage('');
    await rebuildCareerStats();
    setStatusMessage(t.settings.careerStatsRebuiltStatus);
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinInput.trim())) {
      setErrorMessage('Scorer Lock PIN must be exactly 4 digits (e.g. 2468).');
      return;
    }
    setErrorMessage('');
    await setScorerPin(pinInput.trim());
    setPinInput('');
    setStatusMessage('Scorer Lock PIN hashed (SHA-256 + salt) and saved.');
  };

  const handleClearPin = async () => {
    await clearScorerPin();
    setStatusMessage('Scorer Lock PIN removed.');
  };

  const handleCheckForUpdate = async () => {
    setErrorMessage('');
    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
      }
    } catch {
      // Offline or unsupported service worker update check
    }
    setStatusMessage(
      useCricsStore.getState().swUpdateAvailable
        ? t.settings.updateReadyStatus
        : t.settings.upToDateStatus
    );
  };

  const usageMB = (storageInfo.usageBytes / (1024 * 1024)).toFixed(2);
  const quotaMB = storageInfo.quotaBytes > 0 ? (storageInfo.quotaBytes / (1024 * 1024)).toFixed(0) : 'Unlimited';
  const hasConfiguredPin = Boolean(settings.scorerPinSalt && settings.scorerPinHash);

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div>
        <h1 className="text-2xl font-bold text-text">{t.settings.title}</h1>
        <p className="text-sm text-muted">{t.settings.subtitle}</p>
      </div>

      {statusMessage && (
        <div role="status" className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-300 dark:border-brand-800 text-sm font-semibold text-brand-800 dark:text-brand-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="p-4 rounded-2xl bg-wicket/10 border border-wicket/40 text-sm font-semibold text-wicket flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl bg-card border border-line p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-brand-600 dark:text-brand-300" />
            <h2 className="text-base font-bold text-text">{t.settings.backupHeader}</h2>
          </div>

          <p className="text-xs text-muted">{t.settings.backupExportDesc}</p>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleOneTapBackupExport} className="min-h-[48px] px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm">
              <Download className="w-4 h-4" />
              {t.settings.exportJsonBtn}
            </button>

            <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleSelectBackupFile} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="min-h-[48px] px-4 py-2.5 rounded-xl border border-line text-xs font-semibold text-text flex items-center gap-2 hover:bg-page">
              <Upload className="w-4 h-4" />
              {t.settings.importJsonBtn}
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
            <input type="checkbox" checked={includePinInBackup} onChange={(e) => setIncludePinInBackup(e.target.checked)} className="w-4 h-4 rounded" />
            <span>{t.settings.includePinInBackup}</span>
          </label>

          {previewPayload && previewDiff && (
            <BackupPreviewCard
              previewPayload={previewPayload}
              previewDiff={previewDiff}
              importMode={importMode}
              setImportMode={setImportMode}
              conflictResolution={conflictResolution}
              setConflictResolution={setConflictResolution}
              confirmReplaceCheck={confirmReplaceCheck}
              setConfirmReplaceCheck={setConfirmReplaceCheck}
              localCounts={{ players: players.length, matches: matches.length, balls: totalBallEventsCount }}
              onDownloadSafetyBackup={handleOneTapBackupExport}
              onCancel={() => { setPreviewPayload(null); setPreviewDiff(null); }}
              onConfirmImport={handleConfirmImport}
              t={t}
            />
          )}

          <div className="pt-3 border-t border-line space-y-2.5">
            <div>
              <h3 className="text-xs font-bold text-text">{t.settings.sampleDataTitle}</h3>
              <p className="text-xs text-muted">{t.settings.sampleDataDesc}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={handleLoadSampleData} className="min-h-[48px] px-3.5 py-2 rounded-xl bg-page border border-line text-xs font-bold text-text">
                {t.dashboard.loadSampleDataBtn}
              </button>
              <button type="button" onClick={handleRebuildCareerStats} className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line hover:bg-page text-xs font-semibold text-text flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                {t.settings.rebuildCareerStatsBtn}
              </button>
              {sampleRecordCount > 0 && (
                <button type="button" onClick={() => setShowRemoveSampleModal(true)} className="min-h-[48px] px-3.5 py-2 rounded-xl border border-wicket/40 text-wicket text-xs font-bold">
                  {t.settings.removeSampleDataBtn} ({sampleRecordCount})
                </button>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-line space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted flex items-center gap-1.5">
                <HardDrive className="w-4 h-4" />
                {t.settings.offlineStorageProtection}
              </span>
              <span className="font-mono font-bold text-brand-600 dark:text-brand-300">
                {storageInfo.persisted ? t.settings.storageProtected : t.settings.storageActive}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">{t.settings.storageUsedLabel}</span>
              <span className="font-mono text-text">{`${usageMB} MB / ${quotaMB} MB`}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">{t.settings.matchesSinceBackupLabel}</span>
              <span className="font-mono font-bold text-text">{settings.matchesSinceLastBackup || 0} / {settings.backupReminderIntervalMatches}</span>
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="backup-reminder-interval-input" className="text-muted">
                {t.settings.remindAfterEveryMatches}
              </label>
              <input
                id="backup-reminder-interval-input"
                type="number" min={1} max={50} value={settings.backupReminderIntervalMatches}
                onChange={(e) => updateSettings({ backupReminderIntervalMatches: Number(e.target.value) })}
                className="w-16 min-h-[48px] rounded-lg bg-page border border-line px-2 py-1 text-right font-mono text-text"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-line p-5 space-y-4">
          <h2 className="text-base font-bold text-text">{t.settings.themeHeader}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold text-muted mb-1">{t.settings.displayThemeLabel}</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button" data-testid="theme-btn-system" onClick={() => setTheme('system')}
                  className={`min-h-[48px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border ${settings.theme === 'system' ? 'bg-brand-600 text-white border-brand-600' : 'border-line text-text'}`}
                >
                  <Monitor className="w-4 h-4" /> {t.settings.systemTheme}
                </button>
                <button
                  type="button" data-testid="theme-btn-light" onClick={() => setTheme('light')}
                  className={`min-h-[48px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border ${settings.theme === 'light' ? 'bg-brand-600 text-white border-brand-600' : 'border-line text-text'}`}
                >
                  <Sun className="w-4 h-4" /> {t.settings.lightTheme}
                </button>
                <button
                  type="button" data-testid="theme-btn-dark" onClick={() => setTheme('dark')}
                  className={`min-h-[48px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border ${settings.theme === 'dark' ? 'bg-brand-600 text-white border-brand-600' : 'border-line text-text'}`}
                >
                  <Moon className="w-4 h-4" /> {t.settings.darkTheme}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="settings-language-select" className="block text-xs font-semibold text-muted mb-1">{t.settings.languageLabel}</label>
              <select
                id="settings-language-select" value={settings.language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm font-semibold text-text"
              >
                <option value="en">{t.settings.englishDefaultOption}</option>
                <option value="hi">{t.settings.hindiOption}</option>
                <option value="es">{t.settings.spanishOption}</option>
              </select>
            </div>

            <div>
              <label htmlFor="default-match-overs-input" className="block text-xs font-semibold text-muted mb-1">
                {t.settings.defaultMatchOversLabel}
              </label>
              <input
                id="default-match-overs-input"
                type="number" min={1} max={90} value={settings.defaultOvers}
                onChange={(e) => updateSettings({ defaultOvers: Number(e.target.value) })}
                className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm font-mono text-text"
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-text cursor-pointer">
                <input
                  type="checkbox" checked={settings.keepScreenAwake}
                  onChange={(e) => updateSettings({ keepScreenAwake: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span>{t.settings.keepScreenAwakeLabel}</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-text cursor-pointer">
                <input
                  type="checkbox" checked={Boolean(settings.vibrationEnabled)}
                  onChange={(e) => updateSettings({ vibrationEnabled: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span>{t.settings.vibrationLabel}</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-text cursor-pointer">
                <input
                  type="checkbox" checked={Boolean(settings.highContrastScoring)}
                  onChange={(e) => updateSettings({ highContrastScoring: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span>{t.settings.highContrastLabel}</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-text cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="settings-show-intro-checkbox"
                  checked={settings.showIntroAnimation ?? true}
                  onChange={(e) => updateSettings({ showIntroAnimation: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span>{t.settings.showIntroAnimationLabel}</span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-line space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-brand-600 dark:text-brand-300" />
                <h3 className="text-xs font-bold text-text">{t.settings.scorerLockPinTitle}</h3>
              </div>
              <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-300">
                {hasConfiguredPin ? t.settings.pinActiveBadge : t.settings.holdOnlyBadge}
              </span>
            </div>
            <p className="text-xs text-muted">{t.settings.pinConvenienceNotice}</p>
            <form onSubmit={handleSavePin} className="flex flex-wrap items-center gap-2">
              <input
                type="password" data-testid="settings-pin-input" inputMode="numeric" maxLength={4} value={pinInput}
                aria-label={t.settings.pinInputAria}
                onChange={(e) => setPinInput(e.target.value)} placeholder={t.settings.pinInputPlaceholder}
                className="min-h-[48px] w-32 rounded-xl bg-page border border-line px-3 py-2 text-xs font-mono tracking-widest text-text"
              />
              <button type="submit" data-testid="save-pin-btn" className="min-h-[48px] px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold">
                {hasConfiguredPin ? t.settings.updatePinBtn : t.settings.setPinBtn}
              </button>
              {hasConfiguredPin && (
                <button type="button" onClick={handleClearPin} className="min-h-[48px] px-3 py-2 rounded-xl border border-line text-xs font-semibold text-text">
                  {t.settings.clearPinBtn}
                </button>
              )}
            </form>
          </div>

          <ClubSecurityCodeSection
            currentCode={settings.clubSecurityCode || ''}
            onSaveCode={(clubSecurityCode) => updateSettings({ clubSecurityCode })}
            onStatus={(msg) => {
              setErrorMessage('');
              setStatusMessage(msg);
            }}
            t={t}
          />

          <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted">
              <strong>{t.settings.appUpdatesLabel}</strong> {t.settings.appUpdatesDesc}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button" data-testid="check-for-update-btn" onClick={handleCheckForUpdate}
                className="min-h-[48px] px-3 py-1.5 rounded-xl border border-line text-xs font-semibold text-text flex items-center gap-1.5 hover:bg-page"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t.settings.checkForUpdateBtn}
              </button>
              {swUpdateAvailable && triggerSwUpdate && (
                <button
                  type="button" onClick={() => triggerSwUpdate()}
                  className="min-h-[48px] px-3 py-1.5 rounded-xl bg-accent text-brand-950 text-xs font-bold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t.common.updateNow}
                </button>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-line flex items-center gap-3.5">
            <img
              src="/logo-128.png" alt="CRICS by eSportZignal" loading="lazy" width={64} height={64}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shadow-sm border border-brand-500/40 shrink-0"
            />
            <div className="text-xs text-muted space-y-1 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-text">{t.settings.aboutAppTitle}</p>
                <div className="flex items-center gap-3">
                  <nav aria-label={t.settings.guideLinksLabel}><a href="/about/" className="px-2 font-semibold text-brand-600">{t.settings.aboutGuideLink}</a><a href="/features/" className="px-2 font-semibold text-brand-600">{t.settings.featuresGuideLink}</a><a href="/how-to-score-a-cricket-match/" className="px-2 font-semibold text-brand-600">{t.settings.scoringGuideLink}</a><a href="/faq/" className="px-2 font-semibold text-brand-600">{t.settings.faqGuideLink}</a></nav>
                  <button type="button" onClick={() => setActiveTab('privacy')} className="min-h-[48px] px-2 text-brand-600 dark:text-brand-300 font-semibold hover:underline">
                    {t.settings.privacyPolicyLink}
                  </button>
                  <a href="/privacy-policy.html" className="min-h-[48px] px-2 inline-flex items-center text-brand-600 dark:text-brand-300 font-semibold hover:underline">
                    {t.settings.htmlCopyLink}
                  </a>
                </div>
              </div>
              <p>
                <strong>{t.settings.privacySectionTitle}:</strong> {t.settings.privacySummaryParagraph}
              </p>
            </div>
          </div>
        </section>
      </div>

      {showRemoveSampleModal && (
        <div role="dialog" aria-modal="true" tabIndex={-1} aria-labelledby="remove-sample-modal-title" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-card border border-line p-6 space-y-4 shadow-xl">
            <h3 id="remove-sample-modal-title" className="text-lg font-bold text-text">
              {t.settings.removeSampleModalTitle}
            </h3>
            <p className="text-sm text-muted">
              {t.settings.removeSampleModalPrefix} <strong>{sampleRecordCount}</strong>{' '}
              {t.settings.removeSampleModalSuffix}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button type="button" onClick={() => setShowRemoveSampleModal(false)} className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold text-text">
                {t.common.cancel}
              </button>
              <button type="button" onClick={handleConfirmRemoveSampleData} className="min-h-[48px] flex-1 rounded-xl bg-wicket text-white text-sm font-bold">
                {t.settings.removeSampleDataBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
