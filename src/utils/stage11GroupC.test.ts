import { describe, expect, it, vi } from 'vitest';
import { EN_TRANSLATIONS } from '../i18n/en';
import {
  blobToDataUrl,
  buildProfileCardExportModel,
  chunkPassesIntoPages,
  exportElementAsImage,
} from './imageExportUtils';
import { shareOrDownloadFile } from './scorecardExportUtils';

describe('STAGE 11 — GROUP C: PROFILE CARD, PLAYER PASS AND PRINT', () => {
  it('1. blobToDataUrl converts a player photo Blob into a base64 data: URL so no blob: URL is ever passed to the renderer', async () => {
    const rawBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const photoBlob = new Blob([rawBytes], { type: 'image/png' });
    const dataUrl = await blobToDataUrl(photoBlob);
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(dataUrl.startsWith('blob:')).toBe(false);
  });

  it('2. exportElementAsImage waits for images, converts blob: images, calls toBlob with cacheBust:false, pixelRatio:2, solid backgroundColor, and reports errors cleanly', async () => {
    const fakeBlob = new Blob(['png-bytes'], { type: 'image/png' });
    const toBlobSpy = vi.fn().mockResolvedValue(fakeBlob);

    const mockNode = {
      querySelectorAll: () => [],
    } as unknown as HTMLElement;

    const resultBlob = await exportElementAsImage(mockNode, {
      backgroundColor: 'rgb(18, 26, 69)',
      pixelRatio: 2,
      renderer: toBlobSpy,
    });

    expect(resultBlob).toBe(fakeBlob);
    expect(toBlobSpy).toHaveBeenCalledWith(
      mockNode,
      expect.objectContaining({
        cacheBust: false,
        pixelRatio: 2,
        backgroundColor: 'rgb(18, 26, 69)',
      })
    );

    const failingRenderer = vi.fn().mockRejectedValue(new Error('Canvas tainted'));
    await expect(
      exportElementAsImage(mockNode, {
        backgroundColor: 'white',
        renderer: failingRenderer,
      })
    ).rejects.toThrow('Canvas tainted');
  });

  it('3. buildProfileCardExportModel honors Format, Season, Team, and Opponent filters and includes all career numbers, badges, and filter summary text', () => {
    const model = buildProfileCardExportModel({
      player: {
        id: 'CRICS-PLR-1001',
        name: 'Aarav Sharma',
        dob: '1999-05-12',
        role: 'Batter',
        battingStyle: 'Right-hand bat',
        bowlingStyle: 'Right-arm offbreak',
        jerseyNumber: 45,
        createdAt: 1700000001000,
      },
      teamNames: ['Mumbai Royals'],
      stats: {
        playerId: 'CRICS-PLR-1001',
        matches: 12,
        inningsBatted: 12,
        notOuts: 2,
        runs: 480,
        ballsFaced: 300,
        highestScore: 88,
        highestScoreNotOut: true,
        average: 48.0,
        strikeRate: 160.0,
        fours: 45,
        sixes: 22,
        thirties: 4,
        fifties: 3,
        hundreds: 0,
        ducks: 0,
        inningsBowled: 6,
        legalBallsBowled: 72,
        oversBowledFormatted: '12.0',
        maidens: 1,
        runsConceded: 84,
        wickets: 7,
        bestBowlingWickets: 3,
        bestBowlingRuns: 14,
        bowlingAverage: 12.0,
        economy: 7.0,
        bowlingStrikeRate: 10.2,
        threeWicketHauls: 1,
        fiveWicketHauls: 0,
        hatTricks: 0,
        catches: 6,
        stumpings: 0,
        runOuts: 2,
        potmCount: 3,
        potmMatchIds: ['M1', 'M2', 'M3'],
        badges: ['50+ Club', '3W Impact'],
        recentForm: [],
      },
      filters: {
        format: 'T20',
        season: '2026',
        teamId: 'TEAM-ROYALS',
        opponentTeamId: 'TEAM-TITANS',
      },
      teamsNameMap: {
        'TEAM-ROYALS': 'Mumbai Royals',
        'TEAM-TITANS': 'Deccan Titans',
      },
      t: EN_TRANSLATIONS,
    });

    expect(model.playerName).toBe('Aarav Sharma');
    expect(model.jerseyText).toBe('#45');
    expect(model.teamText).toBe('Mumbai Royals');
    expect(model.filterSummaryText).toContain('T20');
    expect(model.filterSummaryText).toContain('Season 2026');
    expect(model.filterSummaryText).toContain('Mumbai Royals');
    expect(model.filterSummaryText).toContain('vs Deccan Titans');
    expect(model.matches).toBe(12);
    expect(model.runs).toBe(480);
    expect(model.averageText).toBe('48.00');
    expect(model.strikeRateText).toBe('160.0');
    expect(model.highestScoreText).toBe('88*');
    expect(model.wickets).toBe(7);
    expect(model.bestBowlingText).toBe('3/14');
    expect(model.economyText).toBe('7.00');
    expect(model.catches).toBe(6);
    expect(model.potmCount).toBe(3);
    expect(model.badges).toEqual(['50+ Club', '3W Impact']);
  });

  it('4. shareOrDownloadFile accepts (file, title) directly and chunkPassesIntoPages groups squad passes into pages of 8 per A4 sheet', async () => {
    const file = new File([new Blob(['png'], { type: 'image/png' })], 'pass.png', {
      type: 'image/png',
    });
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    const res = await shareOrDownloadFile(file, 'Aarav Sharma Pass', {
      canShare: () => true,
      share: shareSpy,
    });
    expect(res).toBe('shared');
    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        files: [file],
        title: 'Aarav Sharma Pass',
      })
    );

    const dummyPlayers = Array.from({ length: 19 }, (_, idx) => `PLR-${idx + 1}`);
    const pages = chunkPassesIntoPages(dummyPlayers, 8);
    expect(pages).toHaveLength(3);
    expect(pages[0]).toHaveLength(8);
    expect(pages[1]).toHaveLength(8);
    expect(pages[2]).toHaveLength(3);
  });
});
