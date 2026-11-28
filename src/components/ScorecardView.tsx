import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Award, Download, FileText, Share2 } from 'lucide-react';
import { buildScorecardChartData, deriveMatchState } from '../engine/scoringEngine';
import { Player } from '../engine/types';
import { getTranslations } from '../i18n/translations';
import { useCricsStore } from '../store/useCricsStore';
import {
  buildExportScorecardData,
  buildScorecardPdfFilename,
  buildScorecardPngFilename,
  shareOrDownloadFile,
  triggerBlobDownload,
} from '../utils/scorecardExportUtils';
import { exportElementAsImage } from '../utils/imageExportUtils';
import { ExportScorecard } from './ExportScorecard';
import { ScorecardChartsAndOvers } from './ScorecardChartsAndOvers';
import { ScorecardInningsTables } from './ScorecardInningsTables';

type ExportActionType =
  | 'export-png'
  | 'export-pdf'
  | 'share-pdf'
  | 'share-image'
  | 'share-text';

export const ScorecardView: React.FC = () => {
  const {
    matches, selectedScorecardMatchId, setSelectedScorecardMatchId, setActiveTab,
    players, teams, ballEvents, settings, updateManualPotm, loadMatchBallEvents,
  } = useCricsStore();

  const t = getTranslations(settings.language);
  const scorecardRef = useRef<HTMLDivElement>(null);
  const exportScorecardRef = useRef<HTMLDivElement>(null);

  const match = useMemo(
    () => matches.find((m) => m.id === selectedScorecardMatchId) || matches[0],
    [matches, selectedScorecardMatchId]
  );

  useEffect(() => {
    if (match?.id) void loadMatchBallEvents(match.id);
  }, [match?.id, loadMatchBallEvents]);

  const playersMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => { map[p.id] = p; });
    return map;
  }, [players]);

  const teamsNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    teams.forEach((tm) => { map[tm.id] = tm.name; });
    return map;
  }, [teams]);

  const derived = useMemo(() => {
    if (!match) return null;
    const matchEvents = ballEvents.filter((e) => e.matchId === match.id);
    return deriveMatchState(match, matchEvents, playersMap, teamsNameMap, t);
  }, [match, ballEvents, playersMap, teamsNameMap, t]);

  const [selectedInningsNum, setSelectedInningsNum] = useState<number>(1);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [exportError, setExportError] = useState<string>('');
  const [lastFailedAction, setLastFailedAction] = useState<ExportActionType | null>(null);

  const inn1 = derived?.inningsStates[1];
  const inn2 = derived?.inningsStates[2];

  const chartData = useMemo(() => {
    if (!match) return [];
    return buildScorecardChartData(match.rules.oversPerInnings, inn1, inn2);
  }, [match, inn1, inn2]);

  const exportData = useMemo(() => {
    if (!match || !derived) return null;
    return buildExportScorecardData(match, derived, playersMap, teamsNameMap, t);
  }, [match, derived, playersMap, teamsNameMap, t]);

  if (!match || !derived || !exportData) {
    return (
      <div className="rounded-2xl bg-card border border-line p-8 text-center space-y-3">
        <p className="text-sm text-muted">{t.scorecards.emptyMessage}</p>
        <button
          type="button"
          onClick={() => setActiveTab('wizard')}
          className="min-h-[48px] px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold"
        >
          {t.nav.newMatch}
        </button>
      </div>
    );
  }

  const availableInningsNums = Object.keys(derived.inningsStates).map(Number);
  const activeInnNum = availableInningsNums.includes(selectedInningsNum)
    ? selectedInningsNum
    : availableInningsNums[0] || 1;
  const inn = derived.inningsStates[activeInnNum] || derived.currentInnings;

  const renderOffscreenPngBlob = async (): Promise<Blob> => {
    if (!exportScorecardRef.current) {
      throw new Error('Off-screen export node missing');
    }
    return exportElementAsImage(exportScorecardRef.current, {
      pixelRatio: 2,
      backgroundColor: 'white',
    });
  };

  const renderChartsPngDataUrl = async (): Promise<string | undefined> => {
    if (!exportScorecardRef.current) return undefined;
    const chartsEl = exportScorecardRef.current.querySelector(
      '[data-testid="export-scorecard-charts"]'
    ) as HTMLElement | null;
    if (!chartsEl) return undefined;
    try {
      const { toPng } = await import('html-to-image');
      return await toPng(chartsEl, {
        pixelRatio: 2,
        backgroundColor: 'white',
        cacheBust: false,
      });
    } catch {
      return undefined;
    }
  };

  const handleExportPng = async () => {
    setExportError('');
    setLastFailedAction(null);
    try {
      setExportStatus(t.scorecards.generatingImage);
      const blob = await renderOffscreenPngBlob();
      const filename = buildScorecardPngFilename(match.title, match.date);
      triggerBlobDownload(blob, filename);
      setExportStatus(t.scorecards.savedPngImage);
    } catch {
      setExportStatus('');
      setExportError(t.scorecards.failedExportPng);
      setLastFailedAction('export-png');
    }
  };

  const handleExportPdf = async () => {
    setExportError('');
    setLastFailedAction(null);
    try {
      setExportStatus(t.scorecards.generatingPdf);
      const [{ generateScorecardPdfBytes }, chartsDataUrl] = await Promise.all([
        import('../utils/scorecardPdfGenerator'),
        renderChartsPngDataUrl(),
      ]);
      const { blob } = generateScorecardPdfBytes(exportData, t, chartsDataUrl);
      const filename = buildScorecardPdfFilename(match.title, match.date);
      triggerBlobDownload(blob, filename);
      setExportStatus(t.scorecards.savedPdfDocument);
    } catch {
      setExportStatus('');
      setExportError(t.scorecards.failedExportPdf);
      setLastFailedAction('export-pdf');
    }
  };

  const handleSharePdf = async () => {
    setExportError('');
    setLastFailedAction(null);
    try {
      setExportStatus(t.scorecards.generatingPdf);
      const [{ generateScorecardPdfBytes }, chartsDataUrl] = await Promise.all([
        import('../utils/scorecardPdfGenerator'),
        renderChartsPngDataUrl(),
      ]);
      const { blob } = generateScorecardPdfBytes(exportData, t, chartsDataUrl);
      const filename = buildScorecardPdfFilename(match.title, match.date);
      const outcome = await shareOrDownloadFile({
        blob,
        filename,
        mimeType: 'application/pdf',
        title: match.title,
        text: `${match.title} — ${derived.resultSummaryText}`,
      });
      setExportStatus(
        outcome === 'shared'
          ? t.scorecards.sharedSuccess
          : t.scorecards.downloadedFallbackSuccess
      );
    } catch {
      setExportStatus('');
      setExportError(t.scorecards.failedSharePdf);
      setLastFailedAction('share-pdf');
    }
  };

  const handleShareImage = async () => {
    setExportError('');
    setLastFailedAction(null);
    try {
      setExportStatus(t.scorecards.generatingImage);
      const blob = await renderOffscreenPngBlob();
      const filename = buildScorecardPngFilename(match.title, match.date);
      const outcome = await shareOrDownloadFile({
        blob,
        filename,
        mimeType: 'image/png',
        title: match.title,
        text: `${match.title} — ${derived.resultSummaryText}`,
      });
      setExportStatus(
        outcome === 'shared'
          ? t.scorecards.sharedSuccess
          : t.scorecards.downloadedFallbackSuccess
      );
    } catch {
      setExportStatus('');
      setExportError(t.scorecards.failedShareImage);
      setLastFailedAction('share-image');
    }
  };

  const handleShareText = async () => {
    setExportError('');
    setLastFailedAction(null);
    const innSummary = exportData.innings
      .map((i) => `${i.battingTeamName} ${i.totalRuns}/${i.wickets} (${i.oversFormatted})`)
      .join(' | ');
    const shareText = `${match.title} — ${innSummary} — ${derived.resultSummaryText}`;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: match.title, text: shareText });
        setExportStatus(t.scorecards.sharedSuccess);
      } else if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(shareText);
        setExportStatus(t.scorecards.copiedSummarySuccess);
      } else {
        throw new Error('Text sharing unavailable');
      }
    } catch {
      setExportStatus('');
      setExportError(t.scorecards.failedShareText);
      setLastFailedAction('share-text');
    }
  };

  const handleRetryAction = async () => {
    if (lastFailedAction === 'export-png') await handleExportPng();
    else if (lastFailedAction === 'export-pdf') await handleExportPdf();
    else if (lastFailedAction === 'share-pdf') await handleSharePdf();
    else if (lastFailedAction === 'share-image') await handleShareImage();
    else if (lastFailedAction === 'share-text') await handleShareText();
  };

  const potmPlayer = derived.calculatedPotmPlayerId
    ? playersMap[derived.calculatedPotmPlayerId]
    : undefined;

  const matchParticipantIds = Array.from(new Set([...match.teamAXI, ...match.teamBXI]));

  return (
    <div className="space-y-5 pb-20 lg:pb-8">
      <ExportScorecard ref={exportScorecardRef} data={exportData} chartData={chartData} t={t} />

      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-line rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="scorecard-match-select" className="sr-only">
            {t.scorecards.selectMatchAria}
          </label>
          <select
            id="scorecard-match-select"
            value={match.id}
            onChange={(e) => setSelectedScorecardMatchId(e.target.value)}
            className="min-h-[48px] rounded-xl bg-page border border-line px-3.5 py-2 text-sm font-semibold"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.date})
              </option>
            ))}
          </select>
          {exportStatus && (
            <span data-testid="export-status-msg" className="text-xs font-medium text-success">
              {exportStatus}
            </span>
          )}
          {exportError && (
            <div
              data-testid="export-error-banner"
              role="alert"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-wicket/10 border border-wicket/40 text-xs font-semibold text-wicket"
            >
              <span>{exportError}</span>
              {lastFailedAction && (
                <button
                  type="button"
                  data-testid="export-retry-btn"
                  onClick={handleRetryAction}
                  className="min-h-[48px] px-3 py-1.5 rounded-lg bg-wicket text-white font-bold"
                >
                  {t.scorecards.retryBtn}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="export-csv-btn"
            onClick={handleExportPng}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line text-xs font-semibold flex items-center gap-1.5 hover:bg-page"
          >
            <Download className="w-4 h-4" />
            {t.common.exportPng}
          </button>
          <button
            type="button"
            data-testid="export-pdf-btn"
            onClick={handleExportPdf}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line text-xs font-semibold flex items-center gap-1.5 hover:bg-page"
          >
            <FileText className="w-4 h-4" />
            {t.common.exportPdf}
          </button>
          <button
            type="button"
            data-testid="share-pdf-btn"
            onClick={handleSharePdf}
            className="min-h-[48px] px-3.5 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-brand-500"
          >
            <Share2 className="w-4 h-4" />
            {t.scorecards.sharePdfBtn}
          </button>
          <button
            type="button"
            data-testid="share-image-btn"
            onClick={handleShareImage}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line text-xs font-semibold flex items-center gap-1.5 hover:bg-page"
          >
            <Share2 className="w-4 h-4" />
            {t.scorecards.shareImageBtn}
          </button>
          <button
            type="button"
            data-testid="share-text-btn"
            onClick={handleShareText}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-line text-xs font-semibold flex items-center gap-1.5 hover:bg-page"
          >
            <Share2 className="w-4 h-4" />
            {t.scorecards.shareTextBtn}
          </button>
        </div>
      </div>

      <div ref={scorecardRef} className="space-y-5">
        <section className="rounded-2xl bg-card border border-line p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted">
              {match.date} · {match.venue} · {match.format} · {t.scorecards.scorerLabel}: {match.scorerName}
            </p>
            <h1 className="text-xl font-bold text-text mt-0.5">{match.title}</h1>
            <p className="text-sm font-semibold text-success mt-1">{derived.resultSummaryText}</p>
          </div>

          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/40">
            <Award className="w-5 h-5 text-extra shrink-0" />
            <div>
              <span className="text-xs text-extra font-semibold block">
                {t.scorecards.potmLabel}{' '}
                {match.manualPlayerOfTheMatchId
                  ? t.scorecards.potmManualSuffix
                  : t.scorecards.potmAutoImpactSuffix}
              </span>
              <select
                aria-label={t.scorecards.potmLabel}
                value={match.manualPlayerOfTheMatchId || ''}
                onChange={(e) => updateManualPotm(match.id, e.target.value)}
                className="min-h-[48px] bg-transparent text-sm font-bold text-text focus:outline-none cursor-pointer"
              >
                <option value="">
                  {potmPlayer
                    ? `${potmPlayer.name} ${t.scorecards.potmAutoSuffix}`
                    : t.scorecards.potmAutoCalculated}
                </option>
                {matchParticipantIds.map((pid) => {
                  const p = playersMap[pid];
                  return (
                    <option key={pid} value={pid}>
                      {p?.name || pid}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          {availableInningsNums.map((num) => {
            const st = derived.inningsStates[num];
            const tName = teamsNameMap[st.battingTeamId] || st.battingTeamId;
            return (
              <button
                key={num}
                onClick={() => setSelectedInningsNum(num)}
                className={`min-h-[48px] px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  activeInnNum === num
                    ? 'bg-brand-600 text-white'
                    : 'bg-card border border-line text-muted'
                }`}
              >
                {st.isSuperOver
                  ? `${t.scorecards.superOverLabel} (${tName})`
                  : `${t.scorecards.inningsLabel} ${num}: ${tName}`}{' '}
                — {st.totalRuns}/{st.wickets} ({st.oversFormatted})
              </button>
            );
          })}
        </div>

        <ScorecardInningsTables
          inn={inn}
          teamsNameMap={teamsNameMap}
          playersMap={playersMap}
          t={t}
        />

        <ScorecardChartsAndOvers
          chartData={chartData}
          inn1={inn1}
          inn2={inn2}
          activeInnNum={activeInnNum}
          inn={inn}
          teamsNameMap={teamsNameMap}
          playersMap={playersMap}
          t={t}
        />
      </div>
    </div>
  );
};
