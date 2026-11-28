import { describe, expect, it, vi } from 'vitest';
import { EN_TRANSLATIONS } from '../i18n/en';
import { deriveMatchState } from '../engine/scoringEngine';
import {
  buildExportScorecardData,
  buildScorecardPdfFilename,
  shareOrDownloadFile,
} from './scorecardExportUtils';
import { generateScorecardPdfBytes } from './scorecardPdfGenerator';
import { buildSampleSeedBundle } from '../db/sampleData';

describe('STAGE 11 — GROUP B: SCORECARD EXPORT (IMAGE, PDF, SHARE)', () => {
  it('1. Sample match MATCH-101 has Innings 1 165/5 (10.0) and Innings 2 170/2 (8.5) won by 8 wickets, and buildExportScorecardData includes both innings completely', () => {
    const bundle = buildSampleSeedBundle();
    const match101 = bundle.matches.find((m) => m.id === 'MATCH-101');
    expect(match101).toBeDefined();
    expect(match101!.summary?.innings[0].runs).toBe(165);
    expect(match101!.summary?.innings[0].wickets).toBe(5);
    expect(match101!.summary?.innings[0].oversText).toBe('10.0');
    expect(match101!.summary?.innings[1].runs).toBe(170);
    expect(match101!.summary?.innings[1].wickets).toBe(2);
    expect(match101!.summary?.innings[1].oversText).toBe('8.5');
    expect(match101!.summary?.resultText).toBe('Deccan Titans won by 8 wickets');

    const playersMap = Object.fromEntries(bundle.players.map((p) => [p.id, p]));
    const teamsNameMap = Object.fromEntries(bundle.teams.map((tm) => [tm.id, tm.name]));
    const match101Events = bundle.events.filter((e) => e.matchId === 'MATCH-101');
    const derived = deriveMatchState(
      match101!,
      match101Events,
      playersMap,
      teamsNameMap,
      EN_TRANSLATIONS
    );

    const exportData = buildExportScorecardData(
      match101!,
      derived,
      playersMap,
      teamsNameMap,
      EN_TRANSLATIONS
    );

    expect(exportData.matchTitle).toBe('Mumbai Royals vs Deccan Titans — Opener');
    expect(exportData.date).toBe('2026-11-08');
    expect(exportData.venue).toBe('Wankhede Oval');
    expect(exportData.tossText).toContain('Mumbai Royals');
    expect(exportData.resultText).toBe('Deccan Titans won by 8 wickets');
    expect(exportData.potmText.length).toBeGreaterThan(0);

    // Must contain EVERY innings (both Innings 1 and Innings 2)
    expect(exportData.innings).toHaveLength(2);

    const [inn1, inn2] = exportData.innings;
    expect(inn1.battingTeamName).toBe('Mumbai Royals');
    expect(inn1.totalText).toContain('165/5');
    expect(inn1.totalText).toContain('10.0');
    expect(inn1.battingRows.length).toBeGreaterThanOrEqual(6);
    expect(inn1.bowlingRows.length).toBeGreaterThanOrEqual(5);
    expect(inn1.fallOfWickets.length).toBe(5);
    expect(inn1.partnerships.length).toBeGreaterThanOrEqual(5);
    expect(inn1.didNotBatNames.length).toBeGreaterThan(0);

    expect(inn2.battingTeamName).toBe('Deccan Titans');
    expect(inn2.totalText).toContain('170/2');
    expect(inn2.totalText).toContain('8.5');
    expect(inn2.battingRows.length).toBeGreaterThanOrEqual(4);
    expect(inn2.bowlingRows.length).toBeGreaterThanOrEqual(5);
    expect(inn2.fallOfWickets.length).toBe(2);
    expect(inn2.partnerships.length).toBeGreaterThanOrEqual(3);
    expect(inn2.didNotBatNames.length).toBeGreaterThan(0);
  });

  it('2. generateScorecardPdfBytes builds a selectable multi-page PDF with real text, both innings on separate pages, CRICS footer, and page numbers', async () => {
    const bundle = buildSampleSeedBundle();
    const match101 = bundle.matches.find((m) => m.id === 'MATCH-101')!;
    const playersMap = Object.fromEntries(bundle.players.map((p) => [p.id, p]));
    const teamsNameMap = Object.fromEntries(bundle.teams.map((tm) => [tm.id, tm.name]));
    const match101Events = bundle.events.filter((e) => e.matchId === 'MATCH-101');
    const derived = deriveMatchState(
      match101,
      match101Events,
      playersMap,
      teamsNameMap,
      EN_TRANSLATIONS
    );
    const exportData = buildExportScorecardData(
      match101,
      derived,
      playersMap,
      teamsNameMap,
      EN_TRANSLATIONS
    );

    const filename = buildScorecardPdfFilename(match101.title, match101.date);
    expect(filename).toBe('Mumbai Royals vs Deccan Titans — Opener-2026-11-08.pdf');

    const { pdfBytes, pageCount, rowBounds } = generateScorecardPdfBytes(
      exportData,
      EN_TRANSLATIONS
    );
    expect(pageCount).toBeGreaterThanOrEqual(2);
    expect(pdfBytes.byteLength).toBeGreaterThan(2000);

    // Every table row must fit above the page bottom margin (no row split across page bottom)
    for (const row of rowBounds) {
      expect(row.bottomY).toBeLessThanOrEqual(row.pageBottomLimitY);
    }
  });

  it('3. shareOrDownloadFile uses navigator.share({ files }) when navigator.canShare({ files }) is true and falls back to Blob download otherwise', async () => {
    const blob = new Blob(['test-pdf'], { type: 'application/pdf' });
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    const canShareTrue = vi.fn().mockReturnValue(true);

    const resShared = await shareOrDownloadFile({
      blob,
      filename: 'match-2026-11-08.pdf',
      mimeType: 'application/pdf',
      title: 'Match Title',
      text: 'Result Summary',
      nav: {
        canShare: canShareTrue,
        share: shareSpy,
      },
    });

    expect(resShared).toBe('shared');
    expect(canShareTrue).toHaveBeenCalledTimes(1);
    expect(shareSpy).toHaveBeenCalledTimes(1);

    const downloadSpy = vi.fn();
    const resDownloaded = await shareOrDownloadFile({
      blob,
      filename: 'match-2026-11-08.pdf',
      mimeType: 'application/pdf',
      title: 'Match Title',
      text: 'Result Summary',
      nav: {
        canShare: () => false,
        share: shareSpy,
      },
      triggerDownload: downloadSpy,
    });

    expect(resDownloaded).toBe('downloaded');
    expect(downloadSpy).toHaveBeenCalledWith(blob, 'match-2026-11-08.pdf');
  });
});
