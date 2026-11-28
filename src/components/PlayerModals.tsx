import React, { useEffect, useRef, useState } from 'react';
import { Download, Printer, Share2 } from 'lucide-react';
import { Player } from '../engine/types';
import { formatBowlingStyle, TranslationDictionary } from '../i18n/translations';
import {
  buildDeterministicAvatarDataUrl,
  exportElementAsImage,
} from '../utils/imageExportUtils';
import { shareOrDownloadFile, triggerBlobDownload } from '../utils/scorecardExportUtils';
import {
  PlayerPassCardData,
  PlayerPassOffscreenExport,
  PlayerPassPrintPortal,
} from './PlayerPassExportAndPrint';

export { PlayerFormModal, ROLES } from './PlayerFormModal';

interface PlayerExtraModalsProps {
  confirmDeletePlayer: Player | null;
  isReferenced: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  idCardPlayer: Player | null;
  teamNamesText?: string;
  photoSrc?: string;
  qrDataUrl: string;
  hasClubSecurityCode?: boolean;
  sheetPasses?: PlayerPassCardData[];
  printMode: 'single' | 'sheet' | null;
  setPrintMode: (m: 'single' | 'sheet' | null) => void;
  onCloseIdCard: () => void;
  t: TranslationDictionary;
}

export const PlayerExtraModals: React.FC<PlayerExtraModalsProps> = ({
  confirmDeletePlayer, isReferenced, onCancelDelete, onConfirmDelete,
  idCardPlayer, teamNamesText = '', photoSrc, qrDataUrl, hasClubSecurityCode = false,
  sheetPasses = [], printMode, setPrintMode, onCloseIdCard, t,
}) => {
  const offscreenPassRef = useRef<HTMLDivElement>(null);
  const [passStatus, setPassStatus] = useState<string>('');
  const [passError, setPassError] = useState<string>('');
  const [lastPassAction, setLastPassAction] = useState<'save' | 'share' | null>(null);

  useEffect(() => {
    if (printMode) {
      document.body.classList.add('crics-printing-pass');
    } else {
      document.body.classList.remove('crics-printing-pass');
    }
    return () => {
      document.body.classList.remove('crics-printing-pass');
    };
  }, [printMode]);

  const runPassExport = async (mode: 'save' | 'share') => {
    if (!idCardPlayer) return;
    setPassError('');
    setLastPassAction(null);
    try {
      setPassStatus(t.scorecards.generatingImage);
      if (!offscreenPassRef.current) {
        throw new Error('Player pass export node missing');
      }
      // 505.5 x 319.5 at pixelRatio: 2 => exact 1011 x 639 px PNG (85.6 x 54 mm at 300 dpi)
      const blob = await exportElementAsImage(offscreenPassRef.current, {
        backgroundColor: 'rgb(18, 26, 69)',
        pixelRatio: 2,
        width: 505.5,
        height: 319.5,
      });
      const filename = `${idCardPlayer.id}-id-card.png`;
      if (mode === 'share') {
        const file = new File([blob], filename, { type: 'image/png' });
        const outcome = await shareOrDownloadFile(file, `${idCardPlayer.name} — ${t.appName.split(' ')[0]}`);
        setPassStatus(outcome === 'shared' ? t.scorecards.sharedSuccess : t.players.savedPassImage);
      } else {
        triggerBlobDownload(blob, filename);
        setPassStatus(t.players.savedPassImage);
      }
    } catch {
      setPassStatus('');
      setPassError(t.players.failedExportPass);
      setLastPassAction(mode);
    }
  };

  const singlePassData: PlayerPassCardData | null = idCardPlayer
    ? {
        player: idCardPlayer,
        teamNamesText,
        photoDataUrl: photoSrc,
        qrDataUrl,
        hasClubSecurityCode,
      }
    : null;

  const resolvedPreviewPhoto =
    photoSrc ||
    (idCardPlayer
      ? buildDeterministicAvatarDataUrl(idCardPlayer.name, idCardPlayer.jerseyNumber)
      : undefined);
  const qrTitleText = hasClubSecurityCode ? t.players.qrHeading : t.players.playerIdQrHeading;

  return (
    <>
      <PlayerPassPrintPortal
        mode={printMode} singlePass={singlePassData} sheetPasses={sheetPasses}
        onExitPrint={() => setPrintMode(null)} t={t}
      />

      {singlePassData && (
        <PlayerPassOffscreenExport ref={offscreenPassRef} item={singlePassData} t={t} />
      )}

      {confirmDeletePlayer && (
        <div
          role="dialog" aria-modal="true" tabIndex={-1} aria-labelledby="delete-player-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 no-print"
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-line p-6 space-y-4 shadow-xl">
            <h3 id="delete-player-modal-title" className="text-lg font-bold text-text">
              {isReferenced ? t.players.archivePlayerTitle : t.players.deletePlayerTitle}
            </h3>
            <p className="text-sm text-muted">
              {isReferenced ? (
                <>
                  <strong>{confirmDeletePlayer.name}</strong> ({confirmDeletePlayer.id}){' '}
                  {t.players.archivePlayerDesc}
                </>
              ) : (
                <>
                  {t.players.deletePlayerDescPrefix}{' '}
                  <strong>{confirmDeletePlayer.name}</strong> ({confirmDeletePlayer.id})?{' '}
                  {t.players.deletePlayerDescSuffix}
                </>
              )}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button" onClick={onCancelDelete}
                className="min-h-[48px] flex-1 rounded-xl bg-page border border-line text-sm font-semibold"
              >
                {t.common.cancel}
              </button>
              <button
                type="button" onClick={onConfirmDelete}
                className="min-h-[48px] flex-1 rounded-xl bg-wicket hover:opacity-90 text-white text-sm font-bold"
              >
                {isReferenced ? t.players.archivePlayerConfirmBtn : t.players.deletePlayerConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {idCardPlayer && (
        <div
          role="dialog" aria-modal="true" tabIndex={-1} aria-labelledby="id-card-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 no-print"
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-line p-5 space-y-4 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-900 to-brand-950 text-white space-y-3.5">
              <div className="flex items-center justify-between border-b border-brand-700/50 pb-2.5">
                <div>
                  <span className="text-xs font-mono tracking-widest text-brand-300 block">
                    {t.players.officialPlayerPass}
                  </span>
                  <span className="text-xs font-mono text-brand-100">{idCardPlayer.id}</span>
                </div>
                <span className="text-xl font-extrabold font-mono text-brand-300">
                  {idCardPlayer.jerseyNumber !== null ? `#${idCardPlayer.jerseyNumber}` : '—'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {resolvedPreviewPhoto && (
                  <img
                    src={resolvedPreviewPhoto} alt={idCardPlayer.name} referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-400 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h3 id="id-card-modal-title" className="text-lg font-bold">{idCardPlayer.name}</h3>
                  <p className="text-xs text-brand-200">
                    {idCardPlayer.role} · {t.players.dobLabel}: {idCardPlayer.dob || '—'}
                  </p>
                  <p className="text-xs text-brand-100 mt-0.5">
                    {idCardPlayer.battingStyle} · {formatBowlingStyle(idCardPlayer.bowlingStyle, t)}
                  </p>
                </div>
              </div>

              {qrDataUrl && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/10 rounded-xl p-3">
                  <div className="text-xs text-brand-100 space-y-0.5 min-w-0">
                    <p data-testid="player-modal-qr-heading" className="font-semibold">
                      {qrTitleText}
                    </p>
                    <p className="opacity-80">{t.players.qrSub}</p>
                  </div>
                  <div className="bg-white p-1.5 rounded-xl border border-brand-300 shrink-0">
                    <img
                      data-testid="player-modal-qr"
                      src={qrDataUrl}
                      alt={`${t.players.qrAltPrefix} ${idCardPlayer.name}`}
                      width={144}
                      height={144}
                      className="w-36 h-36 object-contain block"
                    />
                  </div>
                </div>
              )}
            </div>

            {passStatus && (
              <p data-testid="pass-export-status" className="text-xs font-semibold text-success">
                {passStatus}
              </p>
            )}

            {passError && (
              <div
                data-testid="pass-export-error" role="alert"
                className="flex items-center justify-between gap-2 p-3 rounded-xl bg-wicket/10 border border-wicket/40 text-xs font-semibold text-wicket"
              >
                <span>{passError}</span>
                {lastPassAction && (
                  <button
                    type="button" data-testid="pass-export-retry-btn"
                    onClick={() => void runPassExport(lastPassAction)}
                    className="min-h-[48px] px-3 py-1.5 rounded-lg bg-wicket text-white font-bold"
                  >
                    {t.scorecards.retryBtn}
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 no-print">
              <button
                type="button" data-testid="save-pass-png-btn" onClick={() => void runPassExport('save')}
                className="min-h-[48px] px-3 rounded-xl border border-brand-600 text-brand-600 dark:text-brand-300 text-xs font-bold flex items-center justify-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> {t.players.savePngBtn}
              </button>
              <button
                type="button" data-testid="share-pass-png-btn" onClick={() => void runPassExport('share')}
                className="min-h-[48px] px-3 rounded-xl bg-brand-600 text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                <Share2 className="w-3.5 h-3.5" /> {t.players.sharePassBtn}
              </button>
              <button
                type="button" data-testid="print-single-pass-btn" onClick={() => setPrintMode('single')}
                className="min-h-[48px] px-3 rounded-xl bg-brand-600 text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> {t.players.printCardBtn}
              </button>
              <button
                type="button" data-testid="print-sheet-pass-btn" onClick={() => setPrintMode('sheet')}
                className="min-h-[48px] px-3 rounded-xl border border-line bg-page text-text text-xs font-bold flex items-center justify-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> {t.players.printSheetBtn}
              </button>
              <button
                type="button"
                onClick={() => { setPrintMode(null); onCloseIdCard(); }}
                className="min-h-[48px] px-3 rounded-xl bg-page border border-line text-xs font-semibold col-span-2 sm:col-span-1"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
