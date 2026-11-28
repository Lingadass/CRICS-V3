import React, { useState } from 'react';
import { QrCode } from 'lucide-react';
import { TranslationDictionary } from '../i18n/translations';

interface ClubSecurityCodeSectionProps {
  currentCode: string;
  onSaveCode: (code: string) => Promise<void>;
  onStatus: (msg: string) => void;
  t: TranslationDictionary;
}

export const ClubSecurityCodeSection: React.FC<ClubSecurityCodeSectionProps> = ({
  currentCode,
  onSaveCode,
  onStatus,
  t,
}) => {
  const [draftCode, setDraftCode] = useState<string | null>(null);
  const inputCode = draftCode ?? currentCode;
  const hasCode = Boolean(currentCode.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputCode.trim();
    await onSaveCode(trimmed);
    setDraftCode(null);
    onStatus(trimmed ? t.settings.clubCodeSavedStatus : t.settings.clubCodeClearedStatus);
  };

  const handleClear = async () => {
    setDraftCode(null);
    await onSaveCode('');
    onStatus(t.settings.clubCodeClearedStatus);
  };

  return (
    <div className="pt-3 border-t border-line space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <QrCode className="w-4 h-4 text-brand-600 dark:text-brand-300" />
          <h3 className="text-xs font-bold text-text">{t.settings.clubSecurityCodeTitle}</h3>
        </div>
        <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-300">
          {hasCode ? t.settings.clubCodeActiveBadge : t.settings.clubCodeCrcBadge}
        </span>
      </div>
      <p className="text-xs text-muted">{t.settings.clubSecurityCodeDesc}</p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          data-testid="settings-club-code-input"
          aria-label={t.settings.clubSecurityCodeInputAria}
          value={inputCode}
          onChange={(e) => setDraftCode(e.target.value)}
          placeholder={t.settings.clubSecurityCodePlaceholder}
          className="min-h-[48px] flex-1 min-w-[160px] rounded-xl bg-page border border-line px-3 py-2 text-xs font-mono text-text"
        />
        <button
          type="submit"
          data-testid="save-club-code-btn"
          className="min-h-[48px] px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
        >
          {t.settings.saveClubCodeBtn}
        </button>
        {hasCode && (
          <button
            type="button"
            data-testid="clear-club-code-btn"
            onClick={() => void handleClear()}
            className="min-h-[48px] px-3 py-2 rounded-xl border border-line text-xs font-semibold text-text"
          >
            {t.settings.clearClubCodeBtn}
          </button>
        )}
      </form>
    </div>
  );
};
