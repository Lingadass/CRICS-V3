import React from 'react';
import { AlertTriangle, CheckCircle2, QrCode, ShieldAlert, Upload, XCircle } from 'lucide-react';
import { TranslationDictionary } from '../i18n/translations';
import { QrVerificationResult } from '../utils/playerQrUtils';

interface ScanResultCardProps {
  verificationResult: QrVerificationResult | null;
  onTriggerImportRoster: () => void;
  t: TranslationDictionary;
}

export const ScanResultCard: React.FC<ScanResultCardProps> = ({
  verificationResult,
  onTriggerImportRoster,
  t,
}) => {
  const renderResultBody = () => {
    if (!verificationResult) {
      return (
        <div className="p-6 rounded-2xl bg-page border border-line text-center text-xs text-muted space-y-2">
          <QrCode className="w-8 h-8 mx-auto text-brand-500 opacity-70" />
          <p>{t.scanner.subtitle}</p>
        </div>
      );
    }

    const res = verificationResult;
    const matchedPerson = res.player || res.rosterEntry;
    const storedJersey = matchedPerson
      ? matchedPerson.jerseyNumber !== null && matchedPerson.jerseyNumber !== undefined
        ? `#${matchedPerson.jerseyNumber}`
        : '—'
      : '—';

    if (res.status === 'genuine') {
      const desc =
        res.source === 'roster'
          ? t.scanner.genuineRosterDesc
          : res.mode === 'hmac'
          ? t.scanner.genuineHmacDesc
          : t.scanner.genuineCrcDesc;
      return (
        <div
          data-testid="scanner-result-genuine"
          className="p-4 rounded-2xl bg-success/10 border border-success/40 space-y-3"
        >
          <div className="flex items-center gap-2 text-success font-extrabold text-base">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{t.scanner.statusGenuine}</span>
          </div>
          <p className="text-xs text-text">{desc}</p>
          {matchedPerson && (
            <div className="p-3 rounded-xl bg-card border border-line space-y-1 text-xs">
              <p className="text-sm font-bold text-text">{matchedPerson.name}</p>
              <p className="text-muted font-mono">
                {t.scanner.playerIdLabel}: {matchedPerson.id} · {t.scanner.jerseyLabel}: {storedJersey}
              </p>
              <p className="text-muted">
                {res.source === 'roster' ? t.scanner.sourceRoster : t.scanner.sourceLocal}
              </p>
            </div>
          )}
        </div>
      );
    }

    if (res.status === 'details-differ') {
      return (
        <div
          data-testid="scanner-result-details-differ"
          className="p-4 rounded-2xl bg-extra/10 border border-extra/40 space-y-3"
        >
          <div className="flex items-center gap-2 text-extra font-extrabold text-base">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{t.scanner.statusDetailsDiffer}</span>
          </div>
          <p className="text-xs text-text">{t.scanner.detailsDifferDesc}</p>
          {matchedPerson && res.parsed && (
            <div className="p-3 rounded-xl bg-card border border-line space-y-1 text-xs">
              <p className="text-sm font-bold text-text">{matchedPerson.name}</p>
              <p className="text-muted font-mono">
                {t.scanner.playerIdLabel}: {matchedPerson.id}
              </p>
              <p className="text-muted font-mono">
                {t.scanner.scannedJerseyLabel}: #{res.parsed.jersey} · {t.scanner.storedJerseyLabel}:{' '}
                {storedJersey}
              </p>
            </div>
          )}
        </div>
      );
    }

    if (res.status === 'not-crics') {
      return (
        <div
          data-testid="scanner-result-not-crics"
          className="p-4 rounded-2xl bg-wicket/10 border border-wicket/40 space-y-2"
        >
          <div className="flex items-center gap-2 text-wicket font-extrabold text-base">
            <XCircle className="w-5 h-5 shrink-0" />
            <span>{t.scanner.statusNotCrics}</span>
          </div>
          <p className="text-xs text-text">{t.scanner.notCricsDesc}</p>
          <p className="text-xs font-mono text-muted break-all">
            {t.scanner.scannedCodeLabel}: {res.rawText}
          </p>
        </div>
      );
    }

    return (
      <div
        data-testid="scanner-result-not-found"
        className="p-4 rounded-2xl bg-extra/10 border border-extra/40 space-y-3"
      >
        <div className="flex items-center gap-2 text-extra font-extrabold text-base">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{t.scanner.statusNotFound}</span>
        </div>
        <p className="text-xs text-text">{t.scanner.notFoundDesc}</p>
        {res.parsed && (
          <p className="text-xs font-mono text-muted">
            {t.scanner.playerIdLabel}: {res.parsed.compactId} · {t.scanner.jerseyLabel}: #{res.parsed.jersey}
          </p>
        )}
        <button
          type="button"
          data-testid="result-import-roster-btn"
          onClick={onTriggerImportRoster}
          className="min-h-[48px] px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          <Upload className="w-4 h-4" />
          <span>{t.scanner.importRosterActionBtn}</span>
        </button>
      </div>
    );
  };

  return (
    <section
      aria-live="polite"
      data-testid="scanner-result-card"
      className="rounded-2xl bg-card border border-line p-5 space-y-4"
    >
      <h2 className="text-base font-bold text-text">{t.scanner.resultHeading}</h2>
      {renderResultBody()}
    </section>
  );
};
