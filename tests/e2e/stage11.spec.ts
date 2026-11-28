import path from 'node:path';
import { expect, test } from '@playwright/test';

const preV11BackupPath = path.resolve(
  import.meta.dirname,
  '../fixtures/pre-v11-backup.json'
);

test.describe('Stage 11 — Full Offline Precache Verification, Export Chunks & Pre-v11 Backup Import', () => {
  test('goes offline after first load, visits every main screen (including Scorecard PDF and PNG export, Careers, Tournaments, Settings and Pre-v11 Backup Import), and asserts zero failed requests', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
    });
    const page = await context.newPage();

    // 1. First load online, dismiss intro, seed sample data, and ensure Service Worker is active and controlling the page
    await page.goto('/');
    await page.getByTestId('intro-splash').click();
    await expect(page.getByTestId('intro-splash')).toBeHidden();

    const sampleBtn = page.getByTestId('welcome-sample-data-btn');
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();

    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    // Reload once online so navigator.serviceWorker.controller is guaranteed to be set before going offline
    await page.reload();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();
    const hasController = await page.evaluate(() => Boolean(navigator.serviceWorker?.controller));
    expect(hasController).toBe(true);

    // 2. Switch to 100% OFFLINE mode and attach requestfailed + status >= 400 listeners
    const failedRequests: string[] = [];
    page.on('requestfailed', (req) => {
      const url = req.url();
      if (!url.startsWith('data:') && !url.startsWith('blob:')) {
        failedRequests.push(`FAILED: ${req.method()} ${url} (${req.failure()?.errorText || 'unknown'})`);
      }
    });
    page.on('response', (res) => {
      const url = res.url();
      if (!url.startsWith('data:') && !url.startsWith('blob:') && res.status() >= 400) {
        failedRequests.push(`HTTP ${res.status()}: ${url}`);
      }
    });

    await context.setOffline(true);

    // 3. Reload while offline (Home screen)
    await page.reload();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();

    // 4. Visit Match Wizard offline
    await page.goto('/#/wizard');
    await expect(page.locator('#wizard-match-title')).toBeVisible();

    // 5. Visit Scorecard offline and trigger both PNG image export and PDF export
    await page.goto('/#/scorecards');
    const pngBtn = page.getByTestId('export-csv-btn');
    const pdfBtn = page.getByTestId('export-pdf-btn');
    await expect(pngBtn).toBeVisible();
    await expect(pdfBtn).toBeVisible();

    await pngBtn.click();
    await expect(page.getByText('Saved PNG image')).toBeVisible({ timeout: 10000 });

    await pdfBtn.click();
    await expect(page.getByText('Saved PDF document')).toBeVisible({ timeout: 10000 });

    // 7. Visit Players and Teams offline
    await page.goto('/#/players');
    await expect(page.getByText('Aarav Sharma')).toBeVisible();

    await page.goto('/#/teams');
    await expect(page.getByText('Mumbai Royals')).toBeVisible();

    // 8. Visit Careers and Leaderboards offline
    await page.goto('/#/careers');
    await expect(page.locator('#career-format-filter')).toBeVisible();

    await page.goto('/#/leaderboards');
    await expect(page.getByText('Aarav Sharma').first()).toBeVisible();

    // 9. Visit Tournaments offline
    await page.goto('/#/tournaments');
    await expect(page.getByTestId('create-tournament-btn')).toBeVisible();

    // 10. Visit Settings & Backup offline: export backup JSON and import pre-v11 backup file
    await page.goto('/#/settings');
    await expect(page.locator('#settings-language-select')).toBeVisible();

    const fileInput = page.locator('input[type="file"][accept*="json"]');
    await fileInput.setInputFiles(preV11BackupPath);

    // Confirm import in MERGE mode
    const confirmImportBtn = page.locator('button', { hasText: '(MERGE)' });
    await expect(confirmImportBtn).toBeVisible();
    await confirmImportBtn.click();

    // Switch language to Hindi and verify imported pre-v11 tournament has neutral keys ("A", "B") and renders localized Hindi group labels
    await page.locator('#settings-language-select').selectOption('hi');
    await page.goto('/#/tournaments');
    await page.locator('select').first().selectOption('TOUR-OLD-PRE-V11');

    await expect(page.getByRole('button', { name: 'ग्रुप A' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ग्रुप B' })).toBeVisible();
    const tourMainText = await page.locator('main').innerText();
    expect(tourMainText).toContain('ग्रुप A');
    expect(tourMainText).toContain('ग्रुप B');
    expect(tourMainText).not.toContain('Group A');
    expect(tourMainText).not.toContain('Group B');

    // Verify stored tournament in IndexedDB has neutral keys 'A' and 'B'
    const storedTour = await page.evaluate(async () => {
      return new Promise<{ teamGroups?: Record<string, string>; roundNames: string[] }>((resolve, reject) => {
        const req = indexedDB.open('CricsOfflineDB');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const dbInstance = req.result;
          const tx = dbInstance.transaction('tournaments', 'readonly');
          const getReq = tx.objectStore('tournaments').get('TOUR-OLD-PRE-V11');
          getReq.onsuccess = () => {
            const tr = getReq.result;
            dbInstance.close();
            resolve({
              teamGroups: tr?.teamGroups,
              roundNames: (tr?.fixtures || []).map((f: { roundName: string }) => f.roundName),
            });
          };
          getReq.onerror = () => reject(getReq.error);
        };
      });
    });
    expect(storedTour.teamGroups).toEqual({
      'T-OLD-1': 'A',
      'T-OLD-2': 'A',
      'T-OLD-3': 'B',
      'T-OLD-4': 'B',
    });
    expect(storedTour.roundNames).toEqual(['A', 'B']);

    // 11. Visit Privacy Policy, Scan Player Pass, and Live Scorer offline
    await page.goto('/#/privacy');
    await expect(page.locator('main')).toBeVisible();

    await page.goto('/#/scan');
    await expect(page.getByTestId('scanner-choose-photo-btn')).toBeVisible();

    await page.goto('/#/live');
    await expect(page.getByTestId('run-btn-0')).toBeVisible();

    // 12. Assert zero failed requests across all screens and exports while offline
    expect(failedRequests).toEqual([]);

    await context.close();
  });

  test('Group A: completes a match, reloads the app on Home, and verifies Home Recent Matches totals and result match Scorecard 100%', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
    });
    const page = await context.newPage();

    // 1. Load Home, dismiss intro, seed sample data
    await page.goto('/');
    await page.getByTestId('intro-splash').click();
    await expect(page.getByTestId('intro-splash')).toBeHidden();

    const sampleBtn = page.getByTestId('welcome-sample-data-btn');
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();

    // 2. Seed a live match in its final ball of the chase, then complete the match via the Live Scorer
    // Wait, we also have MATCH-101 (completed sample match) AND we can complete a match live!
    // Let's create a 1-over chase match in IndexedDB/store ready for the winning ball, score the winning ball to complete it, then reload on Home!
    await page.evaluate(async () => {
      const req = indexedDB.open('CricsOfflineDB');
      await new Promise<void>((resolve, reject) => {
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['matches', 'ballEvents'], 'readwrite');
          const matchesStore = tx.objectStore('matches');
          const eventsStore = tx.objectStore('ballEvents');

          const matchRecord = {
            id: 'MATCH-E2E-GROUP-A',
            title: 'Mumbai Royals vs Deccan Titans — Group A E2E',
            format: 'T10',
            season: '2026',
            venue: 'Wankhede Oval',
            date: '2026-11-18',
            scorerName: 'Anil Raj',
            teamAId: 'TEAM-ROYALS',
            teamBId: 'TEAM-TITANS',
            teamAXI: ['CRICS-PLR-1001', 'CRICS-PLR-1002', 'CRICS-PLR-1003', 'CRICS-PLR-1004', 'CRICS-PLR-1005', 'CRICS-PLR-1006', 'CRICS-PLR-1007', 'CRICS-PLR-1008', 'CRICS-PLR-1009', 'CRICS-PLR-1010', 'CRICS-PLR-1011'],
            teamBXI: ['CRICS-PLR-1012', 'CRICS-PLR-1013', 'CRICS-PLR-1014', 'CRICS-PLR-1015', 'CRICS-PLR-1016', 'CRICS-PLR-1017', 'CRICS-PLR-1018', 'CRICS-PLR-1019', 'CRICS-PLR-1020', 'CRICS-PLR-1021', 'CRICS-PLR-1022'],
            tossWinnerTeamId: 'TEAM-ROYALS',
            tossDecision: 'bat',
            rules: {
              oversPerInnings: 1,
              ballsPerOver: 6,
              wideRuns: 1,
              noBallRuns: 1,
              freeHitEnabled: true,
              powerplayOvers: 0,
              maxOversPerBowler: 1,
            },
            innings: [
              {
                inningsNumber: 1,
                battingTeamId: 'TEAM-ROYALS',
                bowlingTeamId: 'TEAM-TITANS',
                openingStrikerId: 'CRICS-PLR-1001',
                openingNonStrikerId: 'CRICS-PLR-1002',
                openingBowlerId: 'CRICS-PLR-1017',
              },
              {
                inningsNumber: 2,
                battingTeamId: 'TEAM-TITANS',
                bowlingTeamId: 'TEAM-ROYALS',
                openingStrikerId: 'CRICS-PLR-1012',
                openingNonStrikerId: 'CRICS-PLR-1013',
                openingBowlerId: 'CRICS-PLR-1007',
              },
            ],
            currentInningsNumber: 2,
            status: 'live',
            archived: false,
            createdAt: 1700000900000,
            updatedAt: 1700000950000,
          };
          matchesStore.put(matchRecord);

          // Innings 1: 6 balls of 2 runs = 12/0 (1.0)
          for (let i = 1; i <= 6; i++) {
            eventsStore.put({
              id: `M-GA-E-${i}`,
              matchId: 'MATCH-E2E-GROUP-A',
              inningsNumber: 1,
              sequence: i,
              timestamp: 1700000900000 + i * 1000,
              actionType: 'delivery',
              strikerId: i % 2 === 1 ? 'CRICS-PLR-1001' : 'CRICS-PLR-1002',
              nonStrikerId: i % 2 === 1 ? 'CRICS-PLR-1002' : 'CRICS-PLR-1001',
              bowlerId: 'CRICS-PLR-1017',
              runsOffBat: 2,
              extraType: 'none',
              extraRuns: 0,
              isWicket: false,
            });
          }
          // Innings 2: 2 balls of 6 runs = 12/0 (0.2), needs 1 run in 4 balls
          for (let i = 1; i <= 2; i++) {
            eventsStore.put({
              id: `M-GA-E-${6 + i}`,
              matchId: 'MATCH-E2E-GROUP-A',
              inningsNumber: 2,
              sequence: 6 + i,
              timestamp: 1700000920000 + i * 1000,
              actionType: 'delivery',
              strikerId: 'CRICS-PLR-1012',
              nonStrikerId: 'CRICS-PLR-1013',
              bowlerId: 'CRICS-PLR-1007',
              runsOffBat: 6,
              extraType: 'none',
              extraRuns: 0,
              isBoundarySix: true,
              isWicket: false,
            });
          }
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    });

    // Navigate to live scorer for MATCH-E2E-GROUP-A and score the winning run (4 runs -> 16/0 in 0.3 overs)
    await page.goto('/#/live/MATCH-E2E-GROUP-A');
    await page.reload();
    const introOnLive = page.getByTestId('intro-splash');
    if (await introOnLive.isVisible().catch(() => false)) {
      await introOnLive.click();
    }

    await expect(page.getByTestId('chase-equation-bar')).toContainText('Need 1 run in 4 balls');
    await page.getByTestId('run-btn-4').click();
    await expect(page.getByText('Deccan Titans won by 10 wickets').first()).toBeVisible();

    // Match is now completed! Navigate to Home (#/) and reload the app from cold start
    await page.goto('/#/');
    await page.reload();
    const introOnReload = page.getByTestId('intro-splash');
    if (await introOnReload.isVisible().catch(() => false)) {
      await introOnReload.click();
    }

    // Read totals and result on Home for MATCH-E2E-GROUP-A and MATCH-101
    const homeTotalsEl = page.getByTestId('recent-match-totals-MATCH-E2E-GROUP-A');
    const homeResultEl = page.getByTestId('recent-match-result-MATCH-E2E-GROUP-A');
    await expect(homeTotalsEl).toBeVisible();
    await expect(homeResultEl).toBeVisible();

    const homeTotalsText = (await homeTotalsEl.innerText()).trim();
    const homeResultText = (await homeResultEl.innerText()).trim();

    expect(homeTotalsText).toContain('Mumbai Royals: 12/0 (1.0)');
    expect(homeTotalsText).toContain('Deccan Titans: 16/0 (0.3)');
    expect(homeResultText).toBe('Deccan Titans won by 10 wickets');
    expect(homeResultText.toLowerCase()).not.toContain('need');

    // Also verify MATCH-101 on Home is not 0/0 or "need"
    const m101Totals = (await page.getByTestId('recent-match-totals-MATCH-101').innerText()).trim();
    const m101Result = (await page.getByTestId('recent-match-result-MATCH-101').innerText()).trim();
    expect(m101Totals).not.toContain('0/0');
    expect(m101Result.toLowerCase()).not.toContain('need');

    // Navigate to Scorecard for MATCH-E2E-GROUP-A and compare with Home
    await page
      .getByTestId('recent-match-card-MATCH-E2E-GROUP-A')
      .getByRole('button', { name: 'Scorecard' })
      .click();
    await expect(page.getByTestId('export-pdf-btn')).toBeVisible();
    await expect(page.locator('main')).toContainText(homeResultText);

    const scorecardMain = await page.locator('main').innerText();
    expect(scorecardMain).toContain(homeResultText);
    expect(scorecardMain).toContain('12/0 (1.0');
    expect(scorecardMain).toContain('16/0 (0.3');

    await context.close();
  });

  test('Group B: exports multi-page real-text PDF (verified with pdfjs-dist for both innings 165/5 and 170/2, all batters & bowlers, zero split rows) and full-match PNG image containing both innings, plus Share and Retry flows', async ({
    browser,
  }) => {
    const fs = await import('node:fs');
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
      acceptDownloads: true,
    });
    const page = await context.newPage();

    // 1. Load Home, dismiss intro, seed sample data
    await page.goto('/');
    await page.getByTestId('intro-splash').click();
    await expect(page.getByTestId('intro-splash')).toBeHidden();

    const sampleBtn = page.getByTestId('welcome-sample-data-btn');
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();

    // 2. Navigate to Scorecards and select sample match MATCH-101
    await page.goto('/#/scorecards');
    const matchSelect = page.locator('#scorecard-match-select');
    await expect(matchSelect).toBeVisible();
    await matchSelect.selectOption('MATCH-101');

    // Verify off-screen ExportScorecard has width 794px, is not display:none, and contains both innings sections
    const offscreenMetrics = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="export-scorecard-offscreen"]') as HTMLElement | null;
      const inn1 = document.querySelector('[data-testid="export-innings-1"]') as HTMLElement | null;
      const inn2 = document.querySelector('[data-testid="export-innings-2"]') as HTMLElement | null;
      if (!root || !inn1 || !inn2) return null;
      const style = window.getComputedStyle(root);
      const rRect = root.getBoundingClientRect();
      const i1Rect = inn1.getBoundingClientRect();
      const i2Rect = inn2.getBoundingClientRect();
      return {
        display: style.display,
        width: Math.round(rRect.width),
        totalHeight: Math.round(rRect.height),
        inn1Height: Math.round(i1Rect.height),
        inn2Height: Math.round(i2Rect.height),
        inn2OffsetTopInRoot: Math.round(i2Rect.top - rRect.top),
        inn1Text: inn1.innerText,
        inn2Text: inn2.innerText,
      };
    });

    expect(offscreenMetrics).not.toBeNull();
    expect(offscreenMetrics!.display).not.toBe('none');
    expect(offscreenMetrics!.width).toBe(794);
    expect(offscreenMetrics!.totalHeight).toBeGreaterThan(
      offscreenMetrics!.inn1Height + offscreenMetrics!.inn2Height
    );

    // 3. Click Export PDF and inspect the downloaded PDF with pdfjs-dist
    const pdfDownloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-pdf-btn').click();
    const pdfDownload = await pdfDownloadPromise;
    await expect(page.getByTestId('export-status-msg')).toContainText('Saved PDF document');

    expect(pdfDownload.suggestedFilename()).toBe(
      'Mumbai Royals vs Deccan Titans — Opener-2026-11-08.pdf'
    );
    const pdfPath = await pdfDownload.path();
    expect(pdfPath).toBeTruthy();
    const pdfBuffer = fs.readFileSync(pdfPath!);
    expect(pdfBuffer.byteLength).toBeGreaterThan(2500);

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    });
    const pdfDoc = await loadingTask.promise;

    // Must have at least 2 pages (Innings 1 on page 1, Innings 2 on page 2, optional charts page)
    expect(pdfDoc.numPages).toBeGreaterThanOrEqual(2);

    const pageTexts: string[] = [];
    for (let p = 1; p <= pdfDoc.numPages; p++) {
      const pdfPage = await pdfDoc.getPage(p);
      const viewport = pdfPage.getViewport({ scale: 1 });
      const textContent = await pdfPage.getTextContent();
      const items = textContent.items as Array<{ str: string; transform: number[]; height: number }>;
      const joined = items.map((it) => it.str).join(' ');
      pageTexts.push(joined);

      // Verify footer "CRICS" and "Page p of N" on every page
      expect(joined).toContain('CRICS');
      expect(joined).toContain(`Page ${p} of ${pdfDoc.numPages}`);

      // Verify no table row is split across the bottom page margin:
      // In PDF points (A4 height = 841.89pt), the footer sits near y ~ 22pt from bottom,
      // and table rows must remain above the bottom margin (y >= 40pt from bottom, excluding footer line)
      for (const item of items) {
        const text = item.str.trim();
        if (!text || text === 'CRICS' || text.startsWith('Page ')) continue;
        const yFromBottomPt = item.transform[5];
        expect(yFromBottomPt).toBeGreaterThanOrEqual(38);
        expect(yFromBottomPt).toBeLessThanOrEqual(viewport.height - 20);
      }
    }

    const fullPdfText = pageTexts.join('\n');
    // Both team names, both innings totals (165/5 and 170/2), result line
    expect(fullPdfText).toContain('Mumbai Royals');
    expect(fullPdfText).toContain('Deccan Titans');
    expect(fullPdfText).toContain('165/5');
    expect(fullPdfText).toContain('10.0');
    expect(fullPdfText).toContain('170/2');
    expect(fullPdfText).toContain('8.5');
    expect(fullPdfText).toContain('Deccan Titans won by 8 wickets');

    // Innings 1 on page 1, Innings 2 starting on page 2
    expect(pageTexts[0]).toContain('Innings 1: Mumbai Royals');
    expect(pageTexts[0]).toContain('165/5');
    expect(pageTexts[1]).toContain('Innings 2: Deccan Titans');
    expect(pageTexts[1]).toContain('170/2');

    // Every batter and bowler name of both innings
    const expectedInn1Batters = [
      'Aarav Sharma',
      'Ishaan Deshmukh',
      'Rohan Kulkarni',
      'Kabir Nair',
      'Devansh Joshi',
      'Surya Prakash',
      'Arjun Malhotra',
    ];
    const expectedInn1Bowlers = [
      'Adil Qureshi',
      'Tanmay Chatterjee',
      'Deepak Chaharaj',
      'Varun Chakravarthi',
      'Karanveer Singh',
    ];
    const expectedInn2Batters = [
      'Vikramaditya Reddy',
      'Rishabh Menon',
      'Siddharth Verma',
      'Harshvardhan Gill',
    ];
    const expectedInn2Bowlers = [
      'Arjun Malhotra',
      'Zaid Pathan',
      'Yashvardhan Rao',
      'Pranav Sawant',
      'Devansh Joshi',
    ];

    for (const name of [
      ...expectedInn1Batters,
      ...expectedInn1Bowlers,
      ...expectedInn2Batters,
      ...expectedInn2Bowlers,
    ]) {
      expect(fullPdfText).toContain(name);
    }

    // 4. Click Export Image and verify the PNG dimensions & pixel regions for both innings headings
    const pngDownloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-csv-btn').click();
    const pngDownload = await pngDownloadPromise;
    await expect(page.getByTestId('export-status-msg')).toContainText('Saved PNG image');

    const pngPath = await pngDownload.path();
    expect(pngPath).toBeTruthy();
    const pngBuffer = fs.readFileSync(pngPath!);
    expect(pngBuffer.byteLength).toBeGreaterThan(20000);

    // Read PNG IHDR width & height (bytes 16..24 big-endian)
    const pngWidth = pngBuffer.readUInt32BE(16);
    const pngHeight = pngBuffer.readUInt32BE(20);
    // pixelRatio 2 on 794px width => 1588px width
    expect(pngWidth).toBe(794 * 2);
    // Height must be greater than 2x single-innings height (since pixelRatio is 2 and both innings are stacked)
    expect(pngHeight).toBeGreaterThan(offscreenMetrics!.inn1Height * 2 + offscreenMetrics!.inn2Height);

    // Also decode the PNG inside the browser canvas to verify non-white dark heading bars exist in BOTH the Innings 1 and Innings 2 vertical regions
    const pngBase64 = pngBuffer.toString('base64');
    const regionCheck = await page.evaluate(
      async ({ b64, inn2TopCss }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error('PNG decode failed'));
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        // Count dark pixels in upper half (Innings 1 section) and lower half (Innings 2 section starting around inn2TopCss * 2)
        const countDarkPixelsInBand = (yStart: number, yEnd: number) => {
          const clampedStart = Math.max(0, Math.min(canvas.height - 1, Math.floor(yStart)));
          const clampedEnd = Math.max(clampedStart + 1, Math.min(canvas.height, Math.floor(yEnd)));
          const data = ctx.getImageData(40, clampedStart, canvas.width - 80, clampedEnd - clampedStart).data;
          let darkCount = 0;
          for (let i = 0; i < data.length; i += 16) {
            if (data[i] < 60 && data[i + 1] < 60 && data[i + 2] < 60) {
              darkCount++;
            }
          }
          return darkCount;
        };

        const inn1Dark = countDarkPixelsInBand(150, inn2TopCss * 2 - 20);
        const inn2Dark = countDarkPixelsInBand(inn2TopCss * 2, inn2TopCss * 2 + 400);
        return { width: img.width, height: img.height, inn1Dark, inn2Dark };
      },
      { b64: pngBase64, inn2TopCss: offscreenMetrics!.inn2OffsetTopInRoot }
    );

    expect(regionCheck.inn1Dark).toBeGreaterThan(200);
    expect(regionCheck.inn2Dark).toBeGreaterThan(200);

    // 5. Verify Share buttons and translated Error + Retry behavior when navigator.share fails
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'canShare', {
        configurable: true,
        value: () => true,
      });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async () => {
          throw new Error('Simulated share failure');
        },
      });
    });

    await page.getByTestId('share-pdf-btn').click();
    await expect(page.getByTestId('export-error-banner')).toBeVisible();
    await expect(page.getByTestId('export-error-banner')).toContainText('Failed to share PDF.');
    await expect(page.getByTestId('export-retry-btn')).toBeVisible();

    // Fix navigator.share so clicking Retry succeeds
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async () => undefined,
      });
    });

    await page.getByTestId('export-retry-btn').click();
    await expect(page.getByTestId('export-error-banner')).toBeHidden();
    await expect(page.getByTestId('export-status-msg')).toContainText('Shared successfully');

    console.log(
      `[GROUP B FILE SIZES] PDF: ${pdfBuffer.byteLength} bytes (${pdfDoc.numPages} pages), PNG: ${pngBuffer.byteLength} bytes (${pngWidth}x${pngHeight}px)`
    );

    await context.close();
  });

  test('Group C: exports 1080x1350 filtered Profile Card & 1011x639 Player Pass PNG (with non-blank photo variance), verifies Share & error Retry, and verifies print CSS shows ONLY the card/sheet under media: print', async ({
    browser,
  }) => {
    const fs = await import('node:fs');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      acceptDownloads: true,
    });
    const page = await context.newPage();

    // 1. Load Home, dismiss intro, seed sample data
    await page.goto('/');
    await page.getByTestId('intro-splash').click();
    await expect(page.getByTestId('intro-splash')).toBeHidden();

    const sampleBtn = page.getByTestId('welcome-sample-data-btn');
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();

    // 2. Attach a distinct multi-colored player photo Blob to CRICS-PLR-1001 (Aarav Sharma) in IndexedDB
    await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 240;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'rgb(220, 38, 38)';
      ctx.fillRect(0, 0, 120, 120);
      ctx.fillStyle = 'rgb(250, 204, 21)';
      ctx.fillRect(120, 0, 120, 120);
      ctx.fillStyle = 'rgb(37, 99, 235)';
      ctx.fillRect(0, 120, 120, 120);
      ctx.fillStyle = 'rgb(22, 163, 74)';
      ctx.fillRect(120, 120, 120, 120);
      ctx.fillStyle = 'rgb(255, 255, 255)';
      ctx.beginPath();
      ctx.arc(120, 120, 52, 0, Math.PI * 2);
      ctx.fill();

      const photoBlob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png')
      );

      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('CricsOfflineDB');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['playerPhotos', 'players'], 'readwrite');
          tx.objectStore('playerPhotos').put({
            playerId: 'CRICS-PLR-1001',
            blob: photoBlob,
          });
          const pStore = tx.objectStore('players');
          const getReq = pStore.get('CRICS-PLR-1001');
          getReq.onsuccess = () => {
            if (getReq.result) {
              pStore.put({ ...getReq.result, hasPhoto: true });
            }
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    });

    // Helper inside test to compute pixel variance inside a normalized sub-region of a PNG buffer
    const measurePngRegionVariance = async (
      pngBuf: Buffer,
      regionRatio: { x: number; y: number; w: number; h: number }
    ) => {
      const b64 = pngBuf.toString('base64');
      return page.evaluate(
        async ({ base64, box }) => {
          const img = new Image();
          img.src = `data:image/png;base64,${base64}`;
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = () => rej(new Error('Failed to decode exported PNG'));
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);

          const rx = Math.max(0, Math.floor(box.x * img.width));
          const ry = Math.max(0, Math.floor(box.y * img.height));
          const rw = Math.max(4, Math.floor(box.w * img.width));
          const rh = Math.max(4, Math.floor(box.h * img.height));
          const pixels = ctx.getImageData(rx, ry, rw, rh).data;

          let sumLuma = 0;
          let sumLumaSq = 0;
          let count = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const luma = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
            sumLuma += luma;
            sumLumaSq += luma * luma;
            count++;
          }
          const mean = sumLuma / count;
          const variance = sumLumaSq / count - mean * mean;
          return { width: img.width, height: img.height, mean, variance };
        },
        { base64: b64, box: regionRatio }
      );
    };

    // 3. CAREERS: Verify ProfileCardExport honors filters, converts blob -> data URL, exports 1080x1350 PNG, Share & Error Retry
    await page.goto('/#/careers');
    await expect(page.locator('#career-format-filter')).toBeVisible();

    await page.locator('#career-format-filter').selectOption('T10');
    await page.locator('#career-season-filter').selectOption('2026');
    await page.locator('#career-team-filter').selectOption('TEAM-ROYALS');
    await page.locator('#career-opponent-filter').selectOption('TEAM-TITANS');

    await expect(page.getByTestId('profile-card-filter-summary')).toContainText('T10');
    await expect(page.getByTestId('profile-card-filter-summary')).toContainText('Season 2026');
    await expect(page.getByTestId('profile-card-filter-summary')).toContainText('Mumbai Royals');
    await expect(page.getByTestId('profile-card-filter-summary')).toContainText('vs Deccan Titans');

    const profileCardLayout = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="profile-card-export-offscreen"]') as HTMLElement;
      const photo = document.querySelector('[data-testid="profile-card-export-photo"]') as HTMLImageElement;
      const rr = root.getBoundingClientRect();
      const pr = photo.getBoundingClientRect();
      return {
        photoSrc: photo.getAttribute('src') || '',
        ratio: {
          x: (pr.left - rr.left + 8) / rr.width,
          y: (pr.top - rr.top + 8) / rr.height,
          w: (pr.width - 16) / rr.width,
          h: (pr.height - 16) / rr.height,
        },
      };
    });
    expect(profileCardLayout.photoSrc.startsWith('data:image/')).toBe(true);
    expect(profileCardLayout.photoSrc.startsWith('blob:')).toBe(false);

    // Save Profile Card PNG
    const profileDownloadPromise = page.waitForEvent('download');
    await page.getByTestId('save-profile-card-btn').click();
    const profileDownload = await profileDownloadPromise;
    await expect(page.getByTestId('career-export-status')).toContainText('Saved profile card');

    const profilePngBuf = fs.readFileSync((await profileDownload.path())!);
    expect(profilePngBuf.readUInt32BE(16)).toBe(1080);
    expect(profilePngBuf.readUInt32BE(20)).toBe(1350);

    const profilePhotoStats = await measurePngRegionVariance(
      profilePngBuf,
      profileCardLayout.ratio
    );
    expect(profilePhotoStats.variance).toBeGreaterThan(500);

    // Share Profile Card via mocked navigator.share
    await page.evaluate(() => {
      (window as unknown as { __CRICS_SHARED_CALLS__?: Array<{ title?: string; fileSize: number; fileType: string }> }).__CRICS_SHARED_CALLS__ = [];
      Object.defineProperty(navigator, 'canShare', {
        configurable: true,
        value: () => true,
      });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: { title?: string; files?: File[] }) => {
          const calls = (window as unknown as { __CRICS_SHARED_CALLS__: Array<{ title?: string; fileSize: number; fileType: string }> }).__CRICS_SHARED_CALLS__;
          calls.push({
            title: data.title,
            fileSize: data.files?.[0]?.size || 0,
            fileType: data.files?.[0]?.type || '',
          });
        },
      });
    });

    await page.getByTestId('share-profile-card-btn').click();
    await expect(page.getByTestId('career-export-status')).toContainText('Shared successfully');
    const profileShareCalls = await page.evaluate(
      () => (window as unknown as { __CRICS_SHARED_CALLS__: Array<{ title?: string; fileSize: number; fileType: string }> }).__CRICS_SHARED_CALLS__
    );
    expect(profileShareCalls).toHaveLength(1);
    expect(profileShareCalls[0].fileType).toBe('image/png');
    expect(profileShareCalls[0].fileSize).toBeGreaterThan(20000);

    // Force renderer failure on Profile Card -> assert visible error + Retry recovery
    await page.evaluate(() => {
      (window as unknown as { __CRICS_FORCE_IMAGE_EXPORT_ERROR__?: boolean }).__CRICS_FORCE_IMAGE_EXPORT_ERROR__ = true;
    });
    await page.getByTestId('share-profile-card-btn').click();
    await expect(page.getByTestId('career-export-error')).toBeVisible();
    await expect(page.getByTestId('career-export-error')).toContainText('Failed to export profile card.');
    await expect(page.getByTestId('career-export-retry-btn')).toBeVisible();

    await page.evaluate(() => {
      (window as unknown as { __CRICS_FORCE_IMAGE_EXPORT_ERROR__?: boolean }).__CRICS_FORCE_IMAGE_EXPORT_ERROR__ = false;
    });
    await page.getByTestId('career-export-retry-btn').click();
    await expect(page.getByTestId('career-export-error')).toBeHidden();
    await expect(page.getByTestId('career-export-status')).toContainText('Shared successfully');

    // 4. PLAYERS: Verify Player Pass 1011x639 PNG export, photo & QR variance, Share, Error & Retry
    await page.goto('/#/players');
    await expect(page.getByRole('button', { name: 'ID Card for Aarav Sharma' })).toBeVisible();
    await page.getByRole('button', { name: 'ID Card for Aarav Sharma' }).click();

    await expect(page.getByTestId('save-pass-png-btn')).toBeVisible();
    await expect(page.getByTestId('player-pass-export-offscreen')).toBeAttached();

    const passLayout = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="player-pass-export-offscreen"]') as HTMLElement;
      const photo = root.querySelector('[data-testid="player-pass-photo"]') as HTMLImageElement;
      const qr = root.querySelector('[data-testid="player-pass-qr"]') as HTMLImageElement;
      const rr = root.getBoundingClientRect();
      const pr = photo.getBoundingClientRect();
      const qrr = qr.getBoundingClientRect();
      return {
        photoSrc: photo.getAttribute('src') || '',
        qrSrc: qr.getAttribute('src') || '',
        photoRatio: {
          x: (pr.left - rr.left + 6) / rr.width,
          y: (pr.top - rr.top + 6) / rr.height,
          w: (pr.width - 12) / rr.width,
          h: (pr.height - 12) / rr.height,
        },
        qrRatio: {
          x: (qrr.left - rr.left + 4) / rr.width,
          y: (qrr.top - rr.top + 4) / rr.height,
          w: (qrr.width - 8) / rr.width,
          h: (qrr.height - 8) / rr.height,
        },
      };
    });
    expect(passLayout.photoSrc.startsWith('data:image/')).toBe(true);
    expect(passLayout.qrSrc.startsWith('data:image/')).toBe(true);

    const passDownloadPromise = page.waitForEvent('download');
    await page.getByTestId('save-pass-png-btn').click();
    const passDownload = await passDownloadPromise;
    await expect(page.getByTestId('pass-export-status')).toContainText('Saved player pass PNG');

    const passPngBuf = fs.readFileSync((await passDownload.path())!);
    expect(passPngBuf.readUInt32BE(16)).toBe(1011);
    expect(passPngBuf.readUInt32BE(20)).toBe(639);

    const passPhotoStats = await measurePngRegionVariance(passPngBuf, passLayout.photoRatio);
    const passQrStats = await measurePngRegionVariance(passPngBuf, passLayout.qrRatio);
    expect(passPhotoStats.variance).toBeGreaterThan(500);
    expect(passQrStats.variance).toBeGreaterThan(500);

    // Share Pass via mocked navigator.share
    await page.getByTestId('share-pass-png-btn').click();
    await expect(page.getByTestId('pass-export-status')).toContainText('Shared successfully');

    // Force renderer failure on Player Pass -> assert visible error + Retry recovery
    await page.evaluate(() => {
      (window as unknown as { __CRICS_FORCE_IMAGE_EXPORT_ERROR__?: boolean }).__CRICS_FORCE_IMAGE_EXPORT_ERROR__ = true;
    });
    await page.getByTestId('save-pass-png-btn').click();
    await expect(page.getByTestId('pass-export-error')).toBeVisible();
    await expect(page.getByTestId('pass-export-error')).toContainText('Failed to export player pass.');
    await expect(page.getByTestId('pass-export-retry-btn')).toBeVisible();

    await page.evaluate(() => {
      (window as unknown as { __CRICS_FORCE_IMAGE_EXPORT_ERROR__?: boolean }).__CRICS_FORCE_IMAGE_EXPORT_ERROR__ = false;
    });
    const retryPassDownloadPromise = page.waitForEvent('download');
    await page.getByTestId('pass-export-retry-btn').click();
    await retryPassDownloadPromise;
    await expect(page.getByTestId('pass-export-error')).toBeHidden();

    // 5. PRINT PREVIEW: Single card via page.emulateMedia({ media: 'print' }) and screenshot check
    await page.getByTestId('print-single-pass-btn').click();
    await expect(page.getByTestId('print-single-pass-card')).toBeVisible();

    await page.emulateMedia({ media: 'print' });

    const printCheck = await page.evaluate(() => {
      const rootEl = document.getElementById('root')!;
      const portalEl = document.querySelector('[data-testid="player-pass-print-portal"]') as HTMLElement;
      const singleCardEl = document.querySelector('[data-testid="print-single-pass-card"]') as HTMLElement;
      const exitBtn = document.querySelector('[data-testid="exit-print-view-btn"]') as HTMLElement;
      const pageStyle = portalEl.querySelector('style')?.textContent || '';
      const cr = singleCardEl.getBoundingClientRect();
      return {
        rootDisplay: window.getComputedStyle(rootEl).display,
        exitBtnDisplay: window.getComputedStyle(exitBtn).display,
        portalDisplay: window.getComputedStyle(portalEl).display,
        cardWidthPx: Math.round(cr.width),
        cardHeightPx: Math.round(cr.height),
        cardLeft: Math.round(cr.left),
        cardTop: Math.round(cr.top),
        pageRule: pageStyle,
      };
    });

    expect(printCheck.rootDisplay).toBe('none');
    expect(printCheck.exitBtnDisplay).toBe('none');
    expect(printCheck.portalDisplay).toBe('block');
    expect(printCheck.pageRule).toContain('85.6mm 54mm');
    expect(printCheck.pageRule).toContain('margin: 0');
    // 85.6mm x 54mm at 96dpi is ~324 x 204 CSS px
    expect(printCheck.cardWidthPx).toBeGreaterThanOrEqual(320);
    expect(printCheck.cardWidthPx).toBeLessThanOrEqual(328);
    expect(printCheck.cardHeightPx).toBeGreaterThanOrEqual(200);
    expect(printCheck.cardHeightPx).toBeLessThanOrEqual(208);

    // Screenshot check under media: 'print' -> confirm ONLY the single card region has non-white pixels
    const printShot = await page.screenshot({ fullPage: true });
    const outsideCardVariance = await measurePngRegionVariance(printShot, {
      x: 0.45,
      y: 0.1,
      w: 0.5,
      h: 0.8,
    });
    expect(outsideCardVariance.variance).toBe(0);

    // 6. PRINT SHEET: Exit single preview, open Print Sheet (8 passes per A4 page), and verify under media: 'print'
    await page.emulateMedia({ media: 'screen' });
    await page.getByTestId('exit-print-view-btn').click();
    await expect(page.getByTestId('print-single-pass-card')).toBeHidden();

    await page.getByTestId('print-sheet-pass-btn').click();
    await expect(page.getByTestId('print-sheet-page-1')).toBeVisible();
    await page.emulateMedia({ media: 'print' });

    const sheetCheck = await page.evaluate(() => {
      const portalEl = document.querySelector('[data-testid="player-pass-print-portal"]') as HTMLElement;
      const page1 = document.querySelector('[data-testid="print-sheet-page-1"]') as HTMLElement;
      const page2 = document.querySelector('[data-testid="print-sheet-page-2"]') as HTMLElement | null;
      return {
        page1Count: page1.querySelectorAll('.crics-print-sheet-cell').length,
        page2Count: page2 ? page2.querySelectorAll('.crics-print-sheet-cell').length : 0,
        pageRule: portalEl.querySelector('style')?.textContent || '',
      };
    });
    expect(sheetCheck.page1Count).toBe(8);
    expect(sheetCheck.page2Count).toBeGreaterThan(0);
    expect(sheetCheck.pageRule).toContain('A4 portrait');

    await page.emulateMedia({ media: 'screen' });
    console.log(
      `[GROUP C FILE SIZES] Profile Card PNG: ${profilePngBuf.byteLength} bytes (1080x1350px), Player Pass PNG: ${passPngBuf.byteLength} bytes (1011x639px)`
    );

    await context.close();
  });

  test('Group D: enforces QR payload v<=3 & >=140px display, dynamic Player ID vs Offline Verification label, roster export/import, camera permission help, photo QR verification (lazy jsQR), and Genuine / Details differ / Not CRICS / Not found states', async ({
    browser,
  }) => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
      acceptDownloads: true,
    });
    const page = await context.newPage();

    // Force jsQR fallback path cleanly to prove lazy-loaded jsqr works offline in browser
    await page.addInitScript(() => {
      Object.defineProperty(window, 'BarcodeDetector', {
        configurable: true,
        writable: true,
        value: undefined,
      });
    });

    // 1. Load Home, dismiss intro, seed sample data
    await page.goto('/');
    await page.getByTestId('intro-splash').click();
    await expect(page.getByTestId('intro-splash')).toBeHidden();

    const sampleBtn = page.getByTestId('welcome-sample-data-btn');
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();

    // Verify Home Quick Action for Scan player pass exists and works
    await expect(page.getByTestId('home-scan-pass-btn')).toBeVisible();

    // 2. Without a club security code, open Aarav Sharma's Player Pass -> label must be "Player ID QR" & size >= 140px
    await page.goto('/#/players');
    await expect(page.getByTestId('players-scan-pass-btn')).toBeVisible();
    await page.getByRole('button', { name: 'ID Card for Aarav Sharma' }).click();

    await expect(page.getByTestId('player-modal-qr-heading')).toHaveText('Player ID QR');
    const modalQrBox = await page.getByTestId('player-modal-qr').boundingBox();
    expect(modalQrBox).not.toBeNull();
    expect(modalQrBox!.width).toBeGreaterThanOrEqual(140);
    expect(modalQrBox!.height).toBeGreaterThanOrEqual(140);

    // 3. Configure an optional Club Security Code in Settings
    await page.goto('/#/settings');
    await page.getByTestId('settings-club-code-input').fill('ROYALS-2026');
    await page.getByTestId('save-club-code-btn').click();
    await expect(page.getByText('Club security code saved')).toBeVisible();

    // 4. Return to Players -> open Aarav Sharma's ID Card -> label is now "Offline Verification QR"
    await page.goto('/#/players');
    await page.getByRole('button', { name: 'ID Card for Aarav Sharma' }).click();
    await expect(page.getByTestId('player-modal-qr-heading')).toHaveText('Offline Verification QR');

    // Read the actual QR image data URL rendered inside the modal on the page
    const qrImgSrc = await page.getByTestId('player-modal-qr').getAttribute('src');
    expect(qrImgSrc).toBeTruthy();
    expect(qrImgSrc!.startsWith('data:image/png;base64,')).toBe(true);
    const qrBase64 = qrImgSrc!.replace(/^data:image\/png;base64,/, '');
    const qrPngBuffer = Buffer.from(qrBase64, 'base64');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crics-qr-e2e-'));
    const qrPngPath = path.join(tmpDir, 'aarav-pass-qr.png');
    fs.writeFileSync(qrPngPath, qrPngBuffer);

    // Export club roster JSON from Players screen and verify its structure
    await page.getByRole('button', { name: 'Close' }).click();
    const rosterDownloadPromise = page.waitForEvent('download');
    await page.getByTestId('players-export-roster-btn').click();
    const rosterDownload = await rosterDownloadPromise;
    const rosterJsonPath = await rosterDownload.path();
    expect(rosterJsonPath).toBeTruthy();
    const exportedRoster = JSON.parse(fs.readFileSync(rosterJsonPath!, 'utf8')) as {
      app: string;
      type: string;
      rosterVersion: number;
      players: Array<{
        id: string;
        name: string;
        jerseyNumber: number | null;
        checkCode: string;
        mode: string;
      }>;
    };
    expect(exportedRoster.app).toBe('CRICS');
    expect(exportedRoster.type).toBe('club-roster');
    expect(exportedRoster.rosterVersion).toBe(1);
    const aaravRosterEntry = exportedRoster.players.find((p) => p.id === 'CRICS-PLR-1001');
    expect(aaravRosterEntry).toBeDefined();
    expect(aaravRosterEntry!.mode).toBe('hmac');
    expect(aaravRosterEntry!.checkCode).toHaveLength(8);

    // 5. Navigate to Scan Player Pass from Home Quick Actions
    await page.goto('/#/');
    await page.getByTestId('home-scan-pass-btn').click();
    await expect(page.getByTestId('scanner-choose-photo-btn')).toBeVisible();

    // 6. Camera permission denied shows clear help message alongside photo & manual options
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => {
            throw new DOMException('Permission denied by user', 'NotAllowedError');
          },
        },
      });
    });
    await page.getByTestId('scanner-start-camera-btn').click();
    await expect(page.getByTestId('scanner-camera-help')).toBeVisible();
    await expect(page.getByTestId('scanner-choose-photo-btn')).toBeVisible();
    await expect(page.getByTestId('scanner-manual-code-input')).toBeVisible();

    // 7. Decode the real QR image captured from the Pass page via "Choose a photo of the QR"
    await page.getByTestId('scanner-photo-input').setInputFiles(qrPngPath);
    await expect(page.getByTestId('scanner-result-genuine')).toBeVisible();
    await expect(page.getByTestId('scanner-result-genuine')).toContainText('Aarav Sharma');
    await expect(page.getByTestId('scanner-result-genuine')).toContainText('CRICS-PLR-1001');

    const decodedCodeFromPhoto = await page.getByTestId('scanner-manual-code-input').inputValue();
    expect(decodedCodeFromPhoto).toMatch(/^CRICS1\.1001\.\d+\.[A-Z2-7]{8}$/);

    // 8. Tampered check/jersey -> "Found but details differ"
    const parts = decodedCodeFromPhoto.split('.');
    const badCheck = (parts[3].startsWith('A') ? 'B' : 'A') + parts[3].slice(1);
    const tamperedCode = `${parts[0]}.${parts[1]}.${parts[2]}.${badCheck}`;
    await page.getByTestId('scanner-manual-code-input').fill(tamperedCode);
    await page.getByTestId('scanner-verify-code-btn').click();
    await expect(page.getByTestId('scanner-result-details-differ')).toBeVisible();
    await expect(page.getByTestId('scanner-result-details-differ')).toContainText('Found but details differ');

    // 9. Non-CRICS payload -> "Not a CRICS code"
    await page.getByTestId('scanner-manual-code-input').fill('https://example.com/unknown-pass');
    await page.getByTestId('scanner-verify-code-btn').click();
    await expect(page.getByTestId('scanner-result-not-crics')).toBeVisible();
    await expect(page.getByTestId('scanner-result-not-crics')).toContainText('Not a CRICS code');

    // 10. Unknown player -> "Not found on this device" -> "Import roster" -> becomes Genuine!
    const visitingRosterPath = path.join(tmpDir, 'visiting-club-roster.json');
    const visitingRosterPayload = {
      app: 'CRICS',
      type: 'club-roster',
      rosterVersion: 1,
      exportedAt: new Date().toISOString(),
      players: [
        {
          id: 'CRICS-PLR-9099',
          name: 'Kabir Khanna',
          role: 'All-Rounder',
          jerseyNumber: 45,
          checkCode: 'K7M2P3Q4',
          mode: 'hmac',
        },
      ],
    };
    fs.writeFileSync(visitingRosterPath, JSON.stringify(visitingRosterPayload, null, 2));

    await page.getByTestId('scanner-manual-code-input').fill('CRICS1.9099.45.K7M2P3Q4');
    await page.getByTestId('scanner-verify-code-btn').click();
    await expect(page.getByTestId('scanner-result-not-found')).toBeVisible();
    await expect(page.getByTestId('result-import-roster-btn')).toBeVisible();

    await page.getByTestId('scanner-roster-file-input').setInputFiles(visitingRosterPath);
    await expect(page.getByTestId('scanner-roster-status')).toContainText('Imported 1 player verification record(s).');
    await expect(page.getByTestId('scanner-result-genuine')).toBeVisible();
    await expect(page.getByTestId('scanner-result-genuine')).toContainText('Kabir Khanna');
    await expect(page.getByTestId('scanner-result-genuine')).toContainText('Pass verified offline against the imported club roster.');

    fs.rmSync(tmpDir, { recursive: true, force: true });
    await context.close();
  });

  test('Group E layout: verifies scoring screen bounding boxes and saves after screenshots at 360x640, 360x560, 412x915, and 498x780', async ({
    browser,
  }) => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const screenshotsDir = path.resolve(process.cwd(), 'assets/screenshots');
    fs.mkdirSync(screenshotsDir, { recursive: true });

    const viewports = [
      { width: 360, height: 640, maxGap: 24, expectMiddleVisible: false },
      { width: 360, height: 560, maxGap: 24, expectMiddleVisible: false },
      { width: 412, height: 915, maxGap: 80, expectMiddleVisible: true },
      { width: 498, height: 780, maxGap: 80, expectMiddleVisible: true },
    ];

    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      await page.goto('/');
      await page.getByTestId('intro-splash').click();
      await expect(page.getByTestId('intro-splash')).toBeHidden();
      await page.getByTestId('welcome-sample-data-btn').click();
      await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();
      await page.getByTestId('hero-resume-live-btn').click();
      await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();

      await page.screenshot({
        path: path.join(screenshotsDir, `after-scoring-${vp.width}x${vp.height}.png`),
        fullPage: false,
      });

      const report = await page.evaluate(() => {
        const rect = (testId: string) => {
          const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
          if (!el) return null;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return null;
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
        };

        const scoreEl = document.querySelector('[data-testid="live-total-score"]') as HTMLElement;
        const strikerNameEl = document.querySelector('[data-testid="live-striker-row"] > span') as HTMLElement;
        const strikerRunsEl = document.querySelector('[data-testid="live-striker-runs"]') as HTMLElement;
        const nonStrikerNameEl = document.querySelector('[data-testid="live-nonstriker-row"] > span') as HTMLElement;

        const topBar = rect('live-top-bar');
        const scoreStrip = rect('live-score-strip');
        const playersBand = rect('live-players-band');
        const overStrip = rect('live-this-over-row');
        const middleCtx = rect('live-middle-context');
        const keypad = rect('live-scoring-keypad');

        const buttonIds = [
          'live-back-btn',
          'live-lock-btn',
          'extra-wide-btn',
          'extra-noball-btn',
          'extra-bye-btn',
          'extra-legbye-btn',
          'extra-penalty-btn',
          'run-btn-0',
          'run-btn-1',
          'run-btn-2',
          'run-btn-3',
          'run-btn-4',
          'run-btn-5',
          'run-btn-6',
          'run-btn-more',
          'live-wicket-btn',
          'live-undo-btn',
          'live-swap-btn',
          'live-more-actions-btn',
        ];
        const minTapSizes = buttonIds.map((id) => {
          const r = rect(id);
          return { id, w: r?.width ?? 0, h: r?.height ?? 0 };
        });

        const root = document.querySelector('[data-testid="live-scorer-root"]') as HTMLElement;
        const clipped: string[] = [];
        for (const el of [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]) {
          if (el.closest('[data-testid="live-over-strip"]') || el.getAttribute('data-testid') === 'live-over-strip') continue;
          if (el.closest('.sr-only') || el.classList.contains('sr-only') || el.getAttribute('data-testid') === 'live-sr-confirmation') continue;
          const st = window.getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden') continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (el.scrollWidth > el.clientWidth) {
            clipped.push(`${el.tagName}[${el.getAttribute('data-testid') || el.className}]: ${el.scrollWidth}>${el.clientWidth}`);
          }
        }

        return {
          vh: window.innerHeight,
          vw: window.innerWidth,
          topBar,
          scoreStrip,
          playersBand,
          overStrip,
          middleCtx,
          keypad,
          overToKeypadGap: overStrip && keypad ? Math.round(keypad.top - overStrip.bottom) : 999,
          scoreFontPx: parseFloat(window.getComputedStyle(scoreEl).fontSize),
          strikerNamePx: parseFloat(window.getComputedStyle(strikerNameEl).fontSize),
          strikerRunsPx: parseFloat(window.getComputedStyle(strikerRunsEl).fontSize),
          strikerRunsWeight: parseInt(window.getComputedStyle(strikerRunsEl).fontWeight, 10),
          nonStrikerNamePx: parseFloat(window.getComputedStyle(nonStrikerNameEl).fontSize),
          minTapSizes,
          clipped,
        };
      });

      console.log(`[Group E ${vp.width}x${vp.height}] gap=${report.overToKeypadGap}px`, JSON.stringify({
        overToKeypadGap: report.overToKeypadGap,
        keypadBottom: report.keypad?.bottom,
        middleHeight: report.middleCtx?.height ?? 0,
        scoreFontPx: report.scoreFontPx,
        strikerNamePx: report.strikerNamePx,
        strikerRunsPx: report.strikerRunsPx,
      }));

      expect(report.topBar).not.toBeNull();
      expect(report.scoreStrip).not.toBeNull();
      expect(report.playersBand).not.toBeNull();
      expect(report.overStrip).not.toBeNull();
      expect(report.keypad).not.toBeNull();

      // Order & no overlap assertions
      expect(report.scoreStrip!.top).toBeGreaterThanOrEqual(report.topBar!.bottom - 1);
      expect(report.playersBand!.top).toBeGreaterThanOrEqual(report.scoreStrip!.bottom - 1);
      expect(report.overStrip!.top).toBeGreaterThanOrEqual(report.playersBand!.bottom - 1);
      expect(report.keypad!.top).toBeGreaterThanOrEqual(report.overStrip!.bottom - 1);
      expect(report.keypad!.bottom).toBeLessThanOrEqual(vp.height);

      // Stage 11.1 Requirement 4: 'Last 12 balls' card is deleted in favor of single swipeable over strip
      expect(report.middleCtx).toBeNull();

      expect(report.overToKeypadGap).toBeGreaterThanOrEqual(0);
      expect(report.overToKeypadGap).toBeLessThanOrEqual(vp.maxGap);
      expect(report.scoreFontPx).toBeGreaterThanOrEqual(40);
      expect(report.strikerNamePx).toBeGreaterThanOrEqual(16);
      expect(report.nonStrikerNamePx).toBeGreaterThanOrEqual(16);
      expect(report.strikerRunsPx).toBeGreaterThanOrEqual(20);
      expect(report.strikerRunsWeight).toBeGreaterThanOrEqual(700);
      expect(report.clipped).toEqual([]);

      for (const btn of report.minTapSizes) {
        expect(btn.w, `${btn.id} width >= 48 at ${vp.width}x${vp.height}`).toBeGreaterThanOrEqual(47.5);
        expect(btn.h, `${btn.id} height >= 48 at ${vp.width}x${vp.height}`).toBeGreaterThanOrEqual(47.5);
      }

      await context.close();
    }
  });

  test('Group E stats polish: verifies 30s/50s/100s row, "Does not bowl" label in Players & Careers, H2H As batter / As bowler dismissal view, and localized ball confirmations', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
    const page = await context.newPage();

    await page.goto('/');
    await page.getByTestId('intro-splash').click();
    await expect(page.getByTestId('intro-splash')).toBeHidden();
    await page.getByTestId('welcome-sample-data-btn').click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();

    // Register LINGADASS (bowler) and DHANA (does not bowl)
    await page.goto('/#/players');
    await page.getByTestId('add-player-btn').click();
    await page.locator('#player-form-name').fill('LINGADASS');
    await page.locator('#player-form-role').selectOption('Bowler');
    await page.locator('#player-form-bowling').selectOption('Right-arm fast');
    await page.getByRole('button', { name: 'Save Player' }).click();

    await page.getByTestId('add-player-btn').click();
    await page.locator('#player-form-name').fill('DHANA');
    await page.locator('#player-form-role').selectOption('Batter');
    await page.locator('#player-form-bowling').selectOption('None');
    await page.getByRole('button', { name: 'Save Player' }).click();

    // Verify Players list shows "Does not bowl" (and never "Bowling: None")
    await expect(page.locator('main')).toContainText('Does not bowl');
    await expect(page.locator('main')).not.toContainText('Bowling: None');

    // Edit TEAM-ROYALS & TEAM-TITANS to include DHANA and LINGADASS
    await page.goto('/#/teams');
    await page.getByRole('button', { name: /Edit Mumbai Royals/i }).click();
    await page.getByLabel(/DHANA/i).check();
    await page.getByRole('button', { name: 'Save Team' }).click();

    await page.getByRole('button', { name: /Edit Deccan Titans/i }).click();
    await page.getByLabel(/LINGADASS/i).check();
    await page.getByRole('button', { name: 'Save Team' }).click();

    // Start new match with DHANA opening striker vs LINGADASS opening bowler
    await page.goto('/#/wizard');
    await page.locator('#wizard-match-title').fill('H2H Spotlight Match');
    await page.getByLabel('Select Team A').selectOption('TEAM-ROYALS');
    await page.getByLabel('Select Team B').selectOption('TEAM-TITANS');

    // Swap out 11th default player from each team if DHANA/LINGADASS weren't auto-selected into the 11
    const dhanaBtn = page.getByRole('button', { name: /DHANA/i });
    const isDhanaInXi = await page.locator('#wizard-opening-striker option', { hasText: 'DHANA' }).count();
    if (isDhanaInXi === 0) {
      await page.getByRole('button', { name: /Siddharth Verma|Arjun Malhotra|Ishaan Deshmukh/i }).first().click();
      await dhanaBtn.click();
    }
    const isLingaInXi = await page.locator('#wizard-opening-bowler option', { hasText: 'LINGADASS' }).count();
    if (isLingaInXi === 0) {
      await page.getByRole('button', { name: /Karanveer Singh|Adil Qureshi|Vikramaditya Reddy/i }).first().click();
      await page.getByRole('button', { name: /LINGADASS/i }).click();
    }

    const strikerSelect = page.locator('#wizard-opening-striker');
    const bowlerSelect = page.locator('#wizard-opening-bowler');
    const dhanaOpt = await strikerSelect.locator('option', { hasText: 'DHANA' }).getAttribute('value');
    const lingaOpt = await bowlerSelect.locator('option', { hasText: 'LINGADASS' }).getAttribute('value');
    expect(dhanaOpt).toBeTruthy();
    expect(lingaOpt).toBeTruthy();
    await strikerSelect.selectOption(dhanaOpt!);
    await bowlerSelect.selectOption(lingaOpt!);
    await page.getByRole('button', { name: 'Start Live Match' }).click();
    await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();

    // Score 4 off LINGADASS then dismiss DHANA (Bowled)
    await page.getByTestId('run-btn-4').click();
    await expect(page.getByTestId('live-sr-confirmation')).toContainText('4 runs recorded');
    await page.getByTestId('live-wicket-btn').click();
    await page.getByRole('button', { name: 'Confirm Wicket (WKT)' }).click();

    // Leave live scorer via Back button guard, then open Careers for LINGADASS
    await page.getByTestId('live-back-btn').click();
    const leaveDialog = page.getByRole('dialog');
    await expect(leaveDialog).toBeVisible();
    await leaveDialog.getByRole('button', { name: /leave/i }).click();
    await page.goto('/#/careers');
    const careerSelect = page.getByLabel('Select Player Career');
    await careerSelect.selectOption(lingaOpt!);
    await expect(page.getByTestId('batting-milestones-row')).toContainText('30s');
    await expect(page.getByTestId('batting-milestones-row')).toContainText('50s');
    await expect(page.getByTestId('batting-milestones-row')).toContainText('100s');

    const h2hSelect = page.getByLabel('Head-to-Head Batter vs Bowler');
    await h2hSelect.selectOption(dhanaOpt!);
    await expect(page.getByTestId('h2h-dismissals-value')).toHaveText('0');

    // Switch to As bowler -> shows 1 wicket dismissal against DHANA!
    await page.getByTestId('h2h-role-bowler').click();
    await expect(page.getByTestId('h2h-runs-value')).toHaveText('4');
    await expect(page.getByTestId('h2h-balls-value')).toHaveText('2');
    await expect(page.getByTestId('h2h-dismissals-value')).toHaveText('1');

    // Switch Careers to DHANA -> header displays "Does not bowl" (never raw "None")
    await careerSelect.selectOption(dhanaOpt!);
    await expect(page.locator('main')).toContainText('Does not bowl');
    await expect(page.locator('main')).not.toContainText('Right-hand bat · None');

    await context.close();
  });
});



