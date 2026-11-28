import React from 'react';
import { AlertTriangle, Camera } from 'lucide-react';
import { BattingStyle, BowlingStyle, Player, PlayerRole } from '../engine/types';
import { formatBowlingStyle, TranslationDictionary } from '../i18n/translations';

export const BATTING_STYLES: BattingStyle[] = ['Right-hand bat', 'Left-hand bat'];
export const BOWLING_STYLES: BowlingStyle[] = [
  'Right-arm fast', 'Right-arm medium', 'Right-arm offbreak', 'Right-arm legbreak',
  'Left-arm fast', 'Left-arm medium', 'Left-arm orthodox', 'Left-arm wrist-spin', 'None',
];
export const ROLES: PlayerRole[] = ['Batter', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];

interface PlayerFormModalProps {
  showForm: boolean;
  editingId: string | null;
  autoPlayerId: string;
  name: string;
  setName: (v: string) => void;
  dob: string;
  setDob: (v: string) => void;
  role: PlayerRole;
  setRole: (v: PlayerRole) => void;
  battingStyle: BattingStyle;
  setBattingStyle: (v: BattingStyle) => void;
  bowlingStyle: BowlingStyle;
  setBowlingStyle: (v: BowlingStyle) => void;
  jerseyNumberInput: string;
  setJerseyNumberInput: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  photoPreviewUrl?: string;
  formError: string;
  potentialDuplicates: Player[];
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSavePlayer: (e: React.FormEvent) => void;
  onClose: () => void;
  t: TranslationDictionary;
}

export const PlayerFormModal: React.FC<PlayerFormModalProps> = ({
  showForm, editingId, autoPlayerId, name, setName, dob, setDob, role, setRole,
  battingStyle, setBattingStyle, bowlingStyle, setBowlingStyle,
  jerseyNumberInput, setJerseyNumberInput, phone, setPhone, notes, setNotes,
  photoPreviewUrl, formError, potentialDuplicates, onPhotoUpload, onSavePlayer, onClose, t,
}) => {
  if (!showForm) return null;

  return (
    <div
      role="dialog" aria-modal="true" tabIndex={-1} aria-labelledby="player-form-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 no-print"
    >
      <form
        onSubmit={onSavePlayer}
        className="w-full max-w-xl rounded-3xl bg-card border border-line p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-brand-600 dark:text-brand-400">
              {t.players.autoPlayerIdLabel}: {editingId || autoPlayerId}
            </span>
            <h2 id="player-form-modal-title" className="text-lg font-bold text-text">
              {editingId ? t.players.editModalTitle : t.players.registerModalTitle}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="min-h-[48px] px-3 text-xs font-semibold text-muted">
            {t.common.close}
          </button>
        </div>

        {formError && (
          <div className="p-3 rounded-xl bg-wicket/10 text-wicket text-xs font-semibold">
            {formError}
          </div>
        )}

        {potentialDuplicates.length > 0 && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl bg-accent/10 border border-accent/40 flex items-start gap-2.5 text-xs text-text"
          >
            <AlertTriangle className="w-4 h-4 text-extra shrink-0 mt-0.5" />
            <div>
              <strong>{t.players.duplicateWarningTitle}</strong> {t.players.duplicateWarningBody}{' '}
              {potentialDuplicates
                .map((d) => `${d.name} (${d.id}${d.dob ? `, ${t.players.dobLabel}: ${d.dob}` : ''})`)
                .join(', ')}
              . {t.players.duplicateWarningNote}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="player-form-name" className="block text-xs font-semibold text-muted mb-1">
              {t.players.fullNameLabel}
            </label>
            <input
              id="player-form-name" type="text" required value={name}
              onChange={(e) => setName(e.target.value)} placeholder={t.players.fullNamePlaceholder}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="player-form-dob" className="block text-xs font-semibold text-muted mb-1">
              {t.players.dobOptionalLabel}
            </label>
            <input
              id="player-form-dob" type="date" value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="player-form-role" className="block text-xs font-semibold text-muted mb-1">
              {t.players.primaryRoleLabel}
            </label>
            <select
              id="player-form-role" value={role}
              onChange={(e) => setRole(e.target.value as PlayerRole)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="player-form-jersey" className="block text-xs font-semibold text-muted mb-1">
              {t.players.jerseyOptionalLabel}
            </label>
            <input
              id="player-form-jersey" type="number" min={0} max={999} value={jerseyNumberInput}
              onChange={(e) => setJerseyNumberInput(e.target.value)} placeholder={t.players.jerseyPlaceholder}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label htmlFor="player-form-batting" className="block text-xs font-semibold text-muted mb-1">
              {t.players.battingStyleLabel}
            </label>
            <select
              id="player-form-batting" value={battingStyle}
              onChange={(e) => setBattingStyle(e.target.value as BattingStyle)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
            >
              {BATTING_STYLES.map((bs) => (
                <option key={bs} value={bs}>{bs}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="player-form-bowling" className="block text-xs font-semibold text-muted mb-1">
              {t.players.bowlingStyleLabel}
            </label>
            <select
              id="player-form-bowling" value={bowlingStyle}
              onChange={(e) => setBowlingStyle(e.target.value as BowlingStyle)}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
            >
              {BOWLING_STYLES.map((bw) => (
                <option key={bw} value={bw}>{formatBowlingStyle(bw, t)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="player-form-phone" className="block text-xs font-semibold text-muted mb-1">
              {t.players.phoneLabel}
            </label>
            <input
              id="player-form-phone" type="tel" value={phone}
              onChange={(e) => setPhone(e.target.value)} placeholder={t.players.phonePlaceholder}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-muted mb-1">{t.players.photoLabel}</span>
            <label className="min-h-[48px] px-3 py-2 rounded-xl bg-page border border-line flex items-center gap-2 text-xs font-semibold cursor-pointer hover:opacity-90">
              <Camera className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>{photoPreviewUrl ? t.players.changePhotoBtn : t.players.uploadPhotoBtn}</span>
              <input type="file" accept="image/*" onChange={onPhotoUpload} className="hidden" />
            </label>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="player-form-notes" className="block text-xs font-semibold text-muted mb-1">
              {t.players.notesLabel}
            </label>
            <input
              id="player-form-notes" type="text" value={notes}
              onChange={(e) => setNotes(e.target.value)} placeholder={t.players.notesPlaceholder}
              className="w-full min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button" onClick={onClose}
            className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            className="min-h-[48px] flex-1 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-500"
          >
            {t.players.savePlayerBtn}
          </button>
        </div>
      </form>
    </div>
  );
};
