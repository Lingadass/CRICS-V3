import React from 'react';
import { AlertTriangle, Download, RotateCcw } from 'lucide-react';
import { exportDatabaseToJson } from '../db/database';
import { getTranslations } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';
import { getLocalDateString } from '../utils/dateUtils';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  scopeName?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const msg =
      error instanceof Error ? error.message : 'An unexpected rendering error occurred.';
    return { hasError: true, errorMessage: msg };
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleEmergencyBackup = async () => {
    try {
      const payload = await exportDatabaseToJson();
      const dateStr = getLocalDateString();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `crics-emergency-backup-${dateStr}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // Ignore export fallback error
    }
  };

  override render() {
    if (this.state.hasError) {
      const lang = useCricsStore.getState().settings.language;
      const t = getTranslations(lang);
      return (
        <div
          role="alert"
          className="my-6 mx-auto max-w-lg rounded-3xl bg-card border border-wicket/50 p-6 shadow-lg space-y-4"
        >
          <div className="flex items-center gap-3 text-wicket">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h2 className="text-base font-bold">
              {this.props.scopeName || t.nav.errorDefaultScope} {t.nav.errorEncountered}
            </h2>
          </div>

          <p className="text-xs text-text font-mono bg-page border border-line p-3 rounded-xl break-words">
            {this.state.errorMessage}
          </p>

          <p className="text-xs text-muted">{t.nav.errorSafeNotice}</p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="min-h-[48px] px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-brand-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.nav.retryViewBtn}</span>
            </button>

            <button
              type="button"
              onClick={this.handleEmergencyBackup}
              className="min-h-[48px] px-4 py-2 rounded-xl border border-line text-xs font-semibold text-text flex items-center gap-2 hover:bg-page"
            >
              <Download className="w-4 h-4" />
              <span>{t.nav.emergencyBackupBtn}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
