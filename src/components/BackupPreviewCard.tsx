import React from 'react';
import { Download } from 'lucide-react';
import {
  BackupDiffReport,
  CricsBackupPayload,
  MergeConflictPolicy,
} from '../db/database';
import { TranslationDictionary } from '../i18n/translations';

interface BackupPreviewCardProps {
  previewPayload: CricsBackupPayload;
  previewDiff: BackupDiffReport;
  importMode: 'merge' | 'replace';
  setImportMode: (m: 'merge' | 'replace') => void;
  conflictResolution: MergeConflictPolicy;
  setConflictResolution: (p: MergeConflictPolicy) => void;
  confirmReplaceCheck: boolean;
  setConfirmReplaceCheck: (c: boolean) => void;
  localCounts: { players: number; matches: number; balls: number };
  onDownloadSafetyBackup: () => void;
  onCancel: () => void;
  onConfirmImport: () => void;
  t: TranslationDictionary;
}

export const BackupPreviewCard: React.FC<BackupPreviewCardProps> = ({
  previewPayload,
  previewDiff,
  importMode,
  setImportMode,
  conflictResolution,
  setConflictResolution,
  confirmReplaceCheck,
  setConfirmReplaceCheck,
  localCounts,
  onDownloadSafetyBackup,
  onCancel,
  onConfirmImport,
  t,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-page border border-line space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text">
          {t.settings.previewTitle} ({previewPayload.exportedAt.slice(0, 10)})
        </h3>
        <span className="text-xs font-mono text-brand-600 dark:text-brand-300">
          {t.settings.schemaPrefix}{previewPayload.schemaVersion}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-card border border-line text-xs font-mono">
        <div>
          <span className="text-muted font-sans block">{t.settings.newRecordsLabel}</span>
          <span className="text-base font-extrabold text-brand-600 dark:text-brand-300">
            +{previewDiff.totalNew}
          </span>
        </div>
        <div>
          <span className="text-muted font-sans block">
            {t.settings.changedConflictsLabel}
          </span>
          <span className="text-base font-extrabold text-extra">
            {previewDiff.totalChanged}
          </span>
        </div>
        <div>
          <span className="text-muted font-sans block">{t.settings.unchangedLabel}</span>
          <span className="text-base font-extrabold text-text">
            {previewDiff.totalUnchanged}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono text-muted">
        <div>{t.nav.players}: {previewPayload.players.length}</div>
        <div>{t.nav.teams}: {previewPayload.teams.length}</div>
        <div>{t.nav.matches}: {previewPayload.matches.length}</div>
        <div>{t.settings.ballsLabel}: {previewPayload.ballEvents.length}</div>
        <div>{t.settings.toursLabel}: {previewPayload.tournaments.length}</div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-text pt-1">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="importMode"
            checked={importMode === 'merge'}
            onChange={() => setImportMode('merge')}
          />
          <span>{t.settings.mergeWithCurrent}</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="importMode"
            checked={importMode === 'replace'}
            onChange={() => setImportMode('replace')}
          />
          <span>{t.settings.replaceAllExisting}</span>
        </label>
      </div>

      {importMode === 'merge' && previewDiff.totalChanged > 0 && (
        <div className="p-3 rounded-xl bg-card border border-extra/40 space-y-2 text-xs">
          <p className="font-bold text-text">
            {previewDiff.totalChanged} {t.settings.conflictPromptSuffix}
          </p>
          <div className="flex flex-wrap gap-3 text-text">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="conflictResolution"
                checked={conflictResolution === 'keep-mine'}
                onChange={() => setConflictResolution('keep-mine')}
              />
              <span>{t.settings.keepMine}</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="conflictResolution"
                checked={conflictResolution === 'keep-imported'}
                onChange={() => setConflictResolution('keep-imported')}
              />
              <span>{t.settings.keepImported}</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="conflictResolution"
                checked={conflictResolution === 'keep-both'}
                onChange={() => setConflictResolution('keep-both')}
              />
              <span>{t.settings.keepBoth}</span>
            </label>
          </div>
        </div>
      )}

      {importMode === 'replace' && (
        <div className="p-3 rounded-xl bg-wicket/10 border border-wicket/40 space-y-2.5 text-xs">
          <p className="font-bold text-wicket">
            {t.settings.replaceWarningPrefix} ({localCounts.players} {t.nav.players},{' '}
            {localCounts.matches} {t.nav.matches}, {localCounts.balls} {t.settings.ballsLabel}){' '}
            {t.settings.replaceWarningSuffix}
          </p>
          <button
            type="button"
            onClick={onDownloadSafetyBackup}
            className="min-h-[48px] px-3 py-1.5 rounded-lg bg-card border border-wicket/40 text-wicket font-bold inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {t.settings.downloadSafetyBackupBtn}
          </button>
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-wicket pt-1">
            <input
              type="checkbox"
              checked={confirmReplaceCheck}
              onChange={(e) => setConfirmReplaceCheck(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span>{t.settings.confirmReplaceCheckbox}</span>
          </label>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onCancel}
          className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-card border border-line text-xs font-semibold text-text"
        >
          {t.common.cancel}
        </button>
        <button
          onClick={onConfirmImport}
          className="min-h-[48px] px-4 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-bold"
        >
          {t.settings.confirmImportBtn} ({importMode.toUpperCase()})
        </button>
      </div>
    </div>
  );
};
