import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, Camera, CheckCircle2, Download,
  Image as ImageIcon, QrCode, Upload,
} from 'lucide-react';
import { getTranslations } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';
import { getLocalDateString } from '../utils/dateUtils';
import {
  buildClubRosterExport,
  ClubRosterPlayerEntry,
  loadImportedClubRoster,
  parseClubRosterImport,
  QrVerificationResult,
  saveImportedClubRoster,
  verifyScannedPlayerQr,
} from '../utils/playerQrUtils';
import { triggerBlobDownload } from '../utils/scorecardExportUtils';
import { ScanResultCard } from './ScanResultCard';

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

async function decodeQrFromCanvasOrBitmap(
  source: HTMLImageElement | HTMLVideoElement,
  width: number,
  height: number
): Promise<string | null> {
  if (width <= 0 || height <= 0) return null;

  if (typeof window !== 'undefined' && typeof window.BarcodeDetector === 'function') {
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const results = await detector.detect(source);
      const found = results.find((r) => typeof r.rawValue === 'string' && r.rawValue.trim().length > 0);
      if (found?.rawValue) {
        return found.rawValue.trim();
      }
    } catch {
      // Fall back to jsQR if BarcodeDetector fails on image/video
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  const jsQRModule = await import('jsqr');
  const jsQR = jsQRModule.default;
  const decoded = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
  return decoded?.data ? decoded.data.trim() : null;
}

export const ScanPassView: React.FC = () => {
  const { players, settings, setActiveTab } = useCricsStore();
  const t = getTranslations(settings.language);

  const [manualCode, setManualCode] = useState('');
  const [verificationResult, setVerificationResult] = useState<QrVerificationResult | null>(null);
  const [importedRoster, setImportedRoster] = useState<ClubRosterPlayerEntry[]>(() =>
    loadImportedClubRoster()
  );
  const [rosterMessage, setRosterMessage] = useState('');
  const [rosterError, setRosterError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [cameraState, setCameraState] = useState<'idle' | 'active' | 'denied' | 'unavailable'>('idle');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanRafRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string>('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const rosterInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (scanRafRef.current !== null) {
      cancelAnimationFrame(scanRafRef.current);
      scanRafRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState((prev) => (prev === 'active' ? 'idle' : prev));
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const runVerification = useCallback(
    async (rawCode: string, rosterOverride?: ClubRosterPlayerEntry[]) => {
      const cleaned = rawCode.trim();
      setManualCode(cleaned);
      lastScannedRef.current = cleaned;
      if (!cleaned) return;

      const result = await verifyScannedPlayerQr(cleaned, {
        players,
        clubSecurityCode: settings.clubSecurityCode,
        importedRoster: rosterOverride ?? importedRoster,
      });
      setVerificationResult(result);
    },
    [players, settings.clubSecurityCode, importedRoster]
  );

  const startCamera = useCallback(async () => {
    setPhotoError('');
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('active');

      const scanFrame = async () => {
        if (!streamRef.current || !videoRef.current) return;
        const video = videoRef.current;
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          const decoded = await decodeQrFromCanvasOrBitmap(
            video,
            video.videoWidth,
            video.videoHeight
          );
          if (decoded) {
            stopCamera();
            await runVerification(decoded);
            return;
          }
        }
        scanRafRef.current = requestAnimationFrame(() => {
          void scanFrame();
        });
      };
      scanRafRef.current = requestAnimationFrame(() => {
        void scanFrame();
      });
    } catch (err) {
      const errName = err instanceof DOMException ? err.name : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errName === 'SecurityError') {
        setCameraState('denied');
      } else {
        setCameraState('unavailable');
      }
    }
  }, [runVerification, stopCamera]);

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoError('');
    try {
      const objectUrl = URL.createObjectURL(file);
      try {
        const img = new Image();
        img.src = objectUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Image load error'));
        });
        if (typeof img.decode === 'function') {
          await img.decode().catch(() => undefined);
        }
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const decoded = await decodeQrFromCanvasOrBitmap(img, w, h);
        if (!decoded) {
          setPhotoError(t.scanner.noQrFoundInPhoto);
          return;
        }
        await runVerification(decoded);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch {
      setPhotoError(t.scanner.photoDecodeError);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhotoError('');
    await runVerification(manualCode);
  };

  const handleExportRoster = async () => {
    setRosterError('');
    const payload = await buildClubRosterExport(players, settings.clubSecurityCode);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    triggerBlobDownload(blob, `crics-club-roster-${getLocalDateString()}.json`);
    setRosterMessage(t.players.rosterExportedStatus);
  };

  const handleImportRosterFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setRosterError('');
    setRosterMessage('');
    try {
      const text = await file.text();
      const parsed = parseClubRosterImport(text);
      if (!parsed.valid || !parsed.entries) {
        setRosterError(parsed.error || t.players.rosterImportError);
        return;
      }
      const nextRoster = saveImportedClubRoster(parsed.entries);
      setImportedRoster(nextRoster);
      setRosterMessage(
        `${t.players.rosterImportedPrefix} ${parsed.entries.length} ${t.players.rosterImportedSuffix}`
      );
      if (lastScannedRef.current) {
        await runVerification(lastScannedRef.current, nextRoster);
      }
    } catch {
      setRosterError(t.players.rosterImportError);
    }
  };

  return (
    <div className="space-y-5 pb-20 lg:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">{t.scanner.title}</h1>
          <p className="text-sm text-muted">{t.scanner.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="scanner-back-to-players-btn"
            onClick={() => setActiveTab('players')}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line text-xs font-semibold flex items-center gap-1.5 hover:bg-page"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.scanner.backToPlayersBtn}</span>
          </button>
          <button
            type="button"
            data-testid="scanner-export-roster-btn"
            onClick={() => void handleExportRoster()}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line text-xs font-semibold flex items-center gap-1.5 hover:bg-page"
          >
            <Download className="w-4 h-4" />
            <span>{t.scanner.exportRosterActionBtn}</span>
          </button>
          <input
            ref={rosterInputRef}
            data-testid="scanner-roster-file-input"
            type="file"
            accept=".json,application/json"
            onChange={(e) => void handleImportRosterFile(e)}
            className="hidden"
          />
          <button
            type="button"
            data-testid="scanner-import-roster-btn"
            onClick={() => rosterInputRef.current?.click()}
            className="min-h-[48px] px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>{t.scanner.importRosterActionBtn}</span>
          </button>
        </div>
      </div>

      {rosterMessage && (
        <div
          role="status"
          data-testid="scanner-roster-status"
          className="p-3.5 rounded-2xl bg-success/10 border border-success/40 text-xs font-semibold text-success flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{rosterMessage}</span>
        </div>
      )}

      {rosterError && (
        <div
          role="alert"
          data-testid="scanner-roster-error"
          className="p-3.5 rounded-2xl bg-wicket/10 border border-wicket/40 text-xs font-semibold text-wicket flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{rosterError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="rounded-2xl bg-card border border-line p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-text flex items-center gap-2">
              <Camera className="w-4 h-4 text-brand-600 dark:text-brand-300" />
              <span>{t.scanner.cameraSectionTitle}</span>
            </h2>
            {cameraState === 'active' ? (
              <button
                type="button"
                data-testid="scanner-stop-camera-btn"
                onClick={stopCamera}
                className="min-h-[48px] px-3.5 py-2 rounded-xl bg-wicket text-white text-xs font-bold"
              >
                {t.scanner.stopCameraBtn}
              </button>
            ) : (
              <button
                type="button"
                data-testid="scanner-start-camera-btn"
                onClick={() => void startCamera()}
                className="min-h-[48px] px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>{t.scanner.startCameraBtn}</span>
              </button>
            )}
          </div>

          {cameraState === 'active' && (
            <div className="rounded-2xl overflow-hidden bg-brand-950 border border-brand-700 aspect-video">
              <video
                ref={videoRef}
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {(cameraState === 'denied' || cameraState === 'unavailable') && (
            <div
              role="alert"
              data-testid="scanner-camera-help"
              className="p-3.5 rounded-2xl bg-extra/10 border border-extra/40 text-xs font-semibold text-text flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-extra shrink-0 mt-0.5" />
              <span>
                {cameraState === 'denied'
                  ? t.scanner.cameraPermissionDeniedHelp
                  : t.scanner.cameraUnavailableHelp}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-line space-y-3">
            <input
              ref={photoInputRef}
              data-testid="scanner-photo-input"
              type="file"
              accept="image/*"
              onChange={(e) => void handlePhotoSelected(e)}
              className="hidden"
            />
            <button
              type="button"
              data-testid="scanner-choose-photo-btn"
              onClick={() => photoInputRef.current?.click()}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-page border border-line hover:border-brand-500 text-xs font-bold text-text flex items-center justify-center gap-2"
            >
              <ImageIcon className="w-4 h-4 text-brand-600 dark:text-brand-300" />
              <span>{t.scanner.choosePhotoLabel}</span>
            </button>

            {photoError && (
              <p data-testid="scanner-photo-error" role="alert" className="text-xs font-semibold text-wicket">
                {photoError}
              </p>
            )}
          </div>

          <form onSubmit={(e) => void handleManualSubmit(e)} className="pt-2 border-t border-line space-y-2">
            <label htmlFor="scanner-manual-code-input" className="block text-xs font-semibold text-muted">
              {t.scanner.typeCodeLabel}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="scanner-manual-code-input"
                data-testid="scanner-manual-code-input"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={t.scanner.typeCodePlaceholder}
                className="flex-1 min-w-[200px] min-h-[48px] rounded-xl bg-page border border-line px-3 py-2 text-xs font-mono text-text"
              />
              <button
                type="submit"
                data-testid="scanner-verify-code-btn"
                className="min-h-[48px] px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <QrCode className="w-4 h-4" />
                <span>{t.scanner.verifyCodeBtn}</span>
              </button>
            </div>
          </form>

          {importedRoster.length > 0 && (
            <p className="text-xs text-muted pt-1">
              {t.scanner.rosterSummaryPrefix}{' '}
              <strong className="text-text">{importedRoster.length}</strong>{' '}
              {t.scanner.rosterSummarySuffix}
            </p>
          )}
        </section>

        <ScanResultCard
          verificationResult={verificationResult}
          onTriggerImportRoster={() => rosterInputRef.current?.click()}
          t={t}
        />
      </div>
    </div>
  );
};
