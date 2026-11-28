import React from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { Player } from '../engine/types';
import { formatBowlingStyle, TranslationDictionary } from '../i18n/translations';
import {
  buildDeterministicAvatarDataUrl,
  chunkPassesIntoPages,
} from '../utils/imageExportUtils';

export interface PlayerPassCardData {
  player: Player;
  teamNamesText: string;
  photoDataUrl?: string;
  qrDataUrl: string;
  hasClubSecurityCode?: boolean;
}

interface PlayerPassCardUnitProps {
  item: PlayerPassCardData;
  t: TranslationDictionary;
  testId?: string;
}

/**
 * Renders one credit-card-ratio (85.6mm x 54mm) Player Pass unit at 505.5x319.5 CSS px.
 * Used in the off-screen 1011x639 PNG export and scaled cleanly to 85.6mm x 54mm in print views.
 */
export const PlayerPassCardUnit: React.FC<PlayerPassCardUnitProps> = ({
  item,
  t,
  testId,
}) => {
  const { player, teamNamesText, photoDataUrl, qrDataUrl, hasClubSecurityCode } = item;
  const resolvedPhotoSrc =
    photoDataUrl || buildDeterministicAvatarDataUrl(player.name, player.jerseyNumber);
  const qrLabel = hasClubSecurityCode ? t.players.qrHeading : t.players.playerIdQrHeading;

  return (
    <div
      data-testid={testId}
      className="w-full h-full bg-brand-950 text-white p-4 flex flex-col justify-between font-sans border-2 border-brand-700 box-border overflow-hidden"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-brand-800 pb-2">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo-128.png"
            alt={t.appName}
            className="w-7 h-7 rounded-md object-contain bg-brand-900 p-0.5 border border-brand-700"
          />
          <div>
            <span className="text-xs font-mono tracking-widest text-accent font-extrabold block leading-none">
              {t.players.officialPlayerPass}
            </span>
            <span className="text-xs font-mono text-brand-200 block mt-0.5 leading-none">
              {player.id}
            </span>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded bg-brand-900 border border-brand-700 font-mono text-base font-extrabold text-accent">
          {player.jerseyNumber !== null ? `#${player.jerseyNumber}` : '—'}
        </span>
      </div>

      {/* Main Content: Left Photo + Details, Right >=140px QR */}
      <div className="flex items-center justify-between gap-3 my-auto py-1">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img
            data-testid="player-pass-photo"
            src={resolvedPhotoSrc}
            alt={player.name}
            referrerPolicy="no-referrer"
            className="w-20 h-20 rounded-2xl object-cover border-2 border-accent bg-brand-900 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-lg font-extrabold text-white leading-tight break-words">
              {player.name}
            </h3>
            <p className="text-xs font-bold text-accent">
              {player.role}
              {teamNamesText ? ` · ${teamNamesText}` : ''}
            </p>
            <p className="text-xs text-brand-200">
              {t.players.dobLabel}: {player.dob || '—'}
            </p>
            <p className="text-xs text-brand-100">
              {player.battingStyle} · {formatBowlingStyle(player.bowlingStyle, t)}
            </p>
          </div>
        </div>

        {qrDataUrl && (
          <div className="shrink-0 flex flex-col items-center bg-white p-1.5 rounded-xl border-2 border-accent">
            <img
              data-testid="player-pass-qr"
              src={qrDataUrl}
              alt={`${t.players.qrAltPrefix} ${player.name}`}
              width={144}
              height={144}
              className="w-36 h-36 object-contain block"
            />
          </div>
        )}
      </div>

      {/* Bottom Footer */}
      <div className="flex items-center justify-between border-t border-brand-800 pt-1.5 text-xs text-brand-200">
        <span className="font-semibold">{qrLabel}</span>
        <span className="font-mono text-brand-300">{t.careers.byEsportZignal}</span>
      </div>
    </div>
  );
};

interface PlayerPassOffscreenExportProps {
  item: PlayerPassCardData;
  t: TranslationDictionary;
}

/**
 * Off-screen Player Pass export node sized 505.5 x 319.5 CSS px
 * so exporting with pixelRatio: 2 produces an exact 1011 x 639 px PNG (85.6 x 54 mm at 300 dpi).
 */
export const PlayerPassOffscreenExport = React.forwardRef<
  HTMLDivElement,
  PlayerPassOffscreenExportProps
>(({ item, t }, ref) => {
  return (
    <div
      aria-hidden="true"
      className="fixed -left-[9999px] top-0 w-0 h-0 overflow-hidden pointer-events-none select-none no-print"
    >
      <div
        ref={ref}
        data-testid="player-pass-export-offscreen"
        className="w-[505.5px] h-[319.5px] bg-brand-950"
      >
        <PlayerPassCardUnit item={item} t={t} />
      </div>
    </div>
  );
});

PlayerPassOffscreenExport.displayName = 'PlayerPassOffscreenExport';

interface PlayerPassPrintPortalProps {
  mode: 'single' | 'sheet' | null;
  singlePass: PlayerPassCardData | null;
  sheetPasses: PlayerPassCardData[];
  onExitPrint: () => void;
  t: TranslationDictionary;
}

/**
 * Dedicated print view & portal for single credit-card pass (85.6mm x 54mm) or
 * 8-passes-per-A4 squad print sheet. Renders into document.body so print CSS can
 * hide the rest of the app cleanly with zero trailing blank pages.
 */
export const PlayerPassPrintPortal: React.FC<PlayerPassPrintPortalProps> = ({
  mode,
  singlePass,
  sheetPasses,
  onExitPrint,
  t,
}) => {
  if (!mode || typeof document === 'undefined') return null;

  const pages = chunkPassesIntoPages(sheetPasses, 8);

  return createPortal(
    <div
      data-testid="player-pass-print-portal"
      data-print-mode={mode}
      className="crics-print-portal"
    >
      <style>
        {mode === 'single'
          ? `@page { size: 85.6mm 54mm; margin: 0; }`
          : `@page { size: A4 portrait; margin: 8mm; }`}
      </style>

      {/* Screen-only print preview controls (automatically hidden in @media print) */}
      <div className="no-print fixed top-4 right-4 z-[100] flex items-center gap-2">
        <button
          type="button"
          data-testid="trigger-browser-print-btn"
          onClick={() => window.print()}
          className="min-h-[48px] px-4 py-2 rounded-xl bg-accent text-brand-950 text-xs font-bold shadow-lg flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          <span>{mode === 'sheet' ? t.players.printSheetBtn : t.players.printCardBtn}</span>
        </button>
        <button
          type="button"
          data-testid="exit-print-view-btn"
          onClick={onExitPrint}
          className="min-h-[48px] px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-lg"
        >
          {t.players.exitPrintBtn}
        </button>
      </div>

      {mode === 'single' && singlePass && (
        <div
          data-testid="print-single-pass-card"
          className="crics-print-single-card"
        >
          <div className="crics-print-card-scaler">
            <PlayerPassCardUnit item={singlePass} t={t} />
          </div>
        </div>
      )}

      {mode === 'sheet' && (
        <div data-testid="print-sheet-container" className="crics-print-sheet-pages">
          {pages.map((pageItems, pageIdx) => (
            <div
              key={pageIdx}
              data-testid={`print-sheet-page-${pageIdx + 1}`}
              className="crics-print-sheet-page"
            >
              {pageItems.map((passItem) => (
                <div
                  key={passItem.player.id}
                  data-testid={`print-sheet-card-${passItem.player.id}`}
                  className="crics-print-sheet-cell"
                >
                  <div className="crics-print-card-scaler">
                    <PlayerPassCardUnit item={passItem} t={t} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
};
