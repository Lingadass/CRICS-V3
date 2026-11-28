import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  decodePngToRgba,
  encodeIndexedPng,
} from '../../scripts/generate-icons.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../../public');

async function ensureCompressedScreenshot(filePath: string) {
  const rawBytes = await fs.readFile(filePath);
  const decoded = decodePngToRgba(rawBytes);
  expect(decoded.width).toBe(1080);
  expect(decoded.height).toBe(1920);
  if (rawBytes.byteLength >= 150 * 1024) {
    const compressed = encodeIndexedPng(
      decoded.width,
      decoded.height,
      decoded.rgba,
      128
    );
    await fs.writeFile(filePath, compressed);
  }
  const finalStat = await fs.stat(filePath);
  expect(finalStat.size).toBeLessThan(150 * 1024);
}

async function loadSampleDataOnFreshPage(page: import('@playwright/test').Page) {
  await page.goto('/');
  const sampleBtn = page.getByTestId('welcome-sample-data-btn');
  await expect(sampleBtn).toBeVisible({ timeout: 10000 });
  await sampleBtn.click();
  await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible({
    timeout: 15000,
  });
}

test.describe('CRICS Stage 6 & 6.1 Rendered E2E, Small-Screen Fit, Screenshots & Axe Audit', () => {
  test('1. Captures 4 real 1080x1920 screenshots (Home, Live, Scorecard, Tournament) under 150 KB with sample data', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 540, height: 960 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    await loadSampleDataOnFreshPage(page);

    // 1. Home Screenshot
    const homePath = path.join(publicDir, 'screenshot-home.png');
    await page.screenshot({ path: homePath, fullPage: false });
    await ensureCompressedScreenshot(homePath);

    // 2. Live Scorer Screenshot
    await page.getByTestId('hero-resume-live-btn').click();
    await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();
    const livePath = path.join(publicDir, 'screenshot-live.png');
    await page.screenshot({ path: livePath, fullPage: false });
    await ensureCompressedScreenshot(livePath);

    // Leave live match back to Home
    await page.getByTestId('live-back-btn').click();
    const confirmLeaveDialog = page.getByRole('dialog');
    if (await confirmLeaveDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmLeaveDialog
        .getByRole('button', { name: /leave|salir|छोड़ें/i })
        .click();
    }

    // 3. Scorecard Screenshot
    await page.getByTestId('quick-link-scorecards').click();
    await expect(page.getByTestId('export-csv-btn')).toBeVisible();
    const scorecardPath = path.join(publicDir, 'screenshot-scorecard.png');
    await page.screenshot({ path: scorecardPath, fullPage: false });
    await ensureCompressedScreenshot(scorecardPath);

    // 4. Tournament Screenshot
    await page.goto('/#/tournaments');
    await expect(page.getByTestId('create-tournament-btn')).toBeVisible();
    const tournamentPath = path.join(publicDir, 'screenshot-tournament.png');
    await page.screenshot({ path: tournamentPath, fullPage: false });
    await ensureCompressedScreenshot(tournamentPath);

    await context.close();
  });

  test('2. Fits all Live Scorer controls at 360x640 and 360x560 with zero scroll, zero overlap, zero horizontal clipping in EN/HI/ES, >=48px targets, >=32px hero score, and captures 360x640 & 412x915 screenshots', async ({
    browser,
  }) => {
    const afterScreenshotsDir = path.resolve(__dirname, '../../assets/screenshots');
    await fs.mkdir(afterScreenshotsDir, { recursive: true });

    for (const viewport of [
      { width: 360, height: 640 },
      { width: 360, height: 560 },
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      await loadSampleDataOnFreshPage(page);

      if (viewport.height === 640) {
        // Stage 9B Item 7: Home screen shows "New Match" once, backup status once, and symmetric bottom-nav pill margins
        await expect(
          page.getByRole('button', { name: /^New Match$/i })
        ).toHaveCount(1);
        await expect(page.getByText(/Last backup:/i)).toHaveCount(1);

        const navMargins = await page.evaluate(() => {
          const nav = document.querySelector('[data-testid="mobile-bottom-nav"]');
          if (!nav) return null;
          const buttons = nav.querySelectorAll('button');
          if (buttons.length < 5) return null;
          const navRect = nav.getBoundingClientRect();
          const firstRect = buttons[0].getBoundingClientRect();
          const lastRect = buttons[buttons.length - 1].getBoundingClientRect();
          return {
            leftMargin: Math.round(firstRect.left - navRect.left),
            rightMargin: Math.round(navRect.right - lastRect.right),
          };
        });
        expect(navMargins).not.toBeNull();
        if (navMargins) {
          expect(
            Math.abs(navMargins.leftMargin - navMargins.rightMargin)
          ).toBeLessThanOrEqual(1);
        }
      }

      await page.getByTestId('hero-resume-live-btn').click();
      await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();

      // Confirm mobile bottom nav is hidden on Live Scorer
      const bottomNav = page.getByTestId('mobile-bottom-nav');
      await expect(bottomNav).toBeHidden();

      // Stage 9B Item 6: Hero score >= 32px bold, overs & chase equation >= 14px, Partnership & labeled bowler figures
      const heroChecks = await page.evaluate(() => {
        const scoreEl = document.querySelector('[data-testid="live-total-score"]');
        const oversEl = document.querySelector('[data-testid="live-overs-display"]');
        const chaseEl = document.querySelector('[data-testid="chase-equation-bar"]');
        const bowlerRow = document.querySelector('[data-testid="live-bowler-row"]');
        return {
          scoreFontPx: scoreEl ? parseFloat(window.getComputedStyle(scoreEl).fontSize) : 0,
          scoreWeight: scoreEl ? parseInt(window.getComputedStyle(scoreEl).fontWeight, 10) : 0,
          oversFontPx: oversEl ? parseFloat(window.getComputedStyle(oversEl).fontSize) : 0,
          chaseFontPx: chaseEl ? parseFloat(window.getComputedStyle(chaseEl).fontSize) : 0,
          bowlerRowText: bowlerRow?.textContent || '',
        };
      });
      expect(heroChecks.scoreFontPx).toBeGreaterThanOrEqual(32);
      expect(heroChecks.scoreWeight).toBeGreaterThanOrEqual(700);
      expect(heroChecks.oversFontPx).toBeGreaterThanOrEqual(14);
      expect(heroChecks.chaseFontPx).toBeGreaterThanOrEqual(14);
      expect(heroChecks.bowlerRowText).toContain('Partnership');
      // Stage 11.1 Requirement 6: compact bowler row with labelled O, M, R, W
      expect(heroChecks.bowlerRowText).toContain('O:0.3 M:0 R:11 W:0');

      const requiredTestIds = [
        'live-total-score',
        'live-overs-display',
        'chase-equation-bar',
        'live-striker-row',
        'live-nonstriker-row',
        'live-bowler-row',
        'live-this-over-row',
        'live-extras-row',
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

      for (const testId of requiredTestIds) {
        const locator = page.getByTestId(testId);
        await expect(
          locator,
          `${testId} visible at ${viewport.width}x${viewport.height}`
        ).toBeVisible();
        const box = await locator.boundingBox();
        expect(
          box,
          `${testId} boundingBox at ${viewport.width}x${viewport.height}`
        ).not.toBeNull();
        if (box) {
          expect(
            box.y,
            `${testId} top >= 0 at ${viewport.width}x${viewport.height}`
          ).toBeGreaterThanOrEqual(0);
          expect(
            box.y + box.height,
            `${testId} bottom (${box.y + box.height}) <= ${viewport.height}`
          ).toBeLessThanOrEqual(viewport.height);

          const isTopElement = await locator.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const hit = document.elementFromPoint(cx, cy);
            return Boolean(hit && (el.contains(hit) || hit.contains(el)));
          });
          expect(
            isTopElement,
            `${testId} hit by elementFromPoint at ${viewport.width}x${viewport.height}`
          ).toBe(true);
        }
      }

      // Verify tap targets >= 48px on all interactive buttons on the Live Scorer screen
      const tapTargetIds = [
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

      for (const btnId of tapTargetIds) {
        const box = await page.getByTestId(btnId).boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          expect(
            box.height,
            `${btnId} height >= 48px at ${viewport.width}x${viewport.height}`
          ).toBeGreaterThanOrEqual(47.5);
          expect(
            box.width,
            `${btnId} width >= 48px at ${viewport.width}x${viewport.height}`
          ).toBeGreaterThanOrEqual(47.5);
        }
      }

      // Verify all visible text inside Live Scorer is >= 14px
      const minFontSize = await page
        .getByTestId('live-scorer-root')
        .evaluate((root) => {
          let smallest = Infinity;
          const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            null
          );
          let node = walker.nextNode();
          while (node) {
            if (node.textContent && node.textContent.trim().length > 0) {
              const parent = node.parentElement;
              if (parent) {
                const style = window.getComputedStyle(parent);
                if (
                  style.display !== 'none' &&
                  style.visibility !== 'hidden' &&
                  parseFloat(style.opacity) > 0
                ) {
                  const px = parseFloat(style.fontSize);
                  if (px < smallest) smallest = px;
                }
              }
            }
            node = walker.nextNode();
          }
          return smallest;
        });
      expect(minFontSize).toBeGreaterThanOrEqual(14);

      // Measure section heights and verify keypad is anchored to the bottom (thumb zone)
      const metrics = await page.evaluate(() => {
        const rect = (testId: string) =>
          document.querySelector(`[data-testid="${testId}"]`)?.getBoundingClientRect();
        const scoreCard = rect('live-scoreboard-card');
        const thisOver = rect('live-this-over-row');
        const extras = rect('live-extras-row');
        const runBtn = rect('run-btn-0');
        const runGrid = rect('live-run-grid');
        const bottomRow = rect('live-bottom-actions-row');
        return {
          scoreCardHeight: scoreCard ? Math.round(scoreCard.height) : 0,
          thisOverHeight: thisOver ? Math.round(thisOver.height) : 0,
          extrasHeight: extras ? Math.round(extras.height) : 0,
          runBtnHeight: runBtn ? Math.round(runBtn.height) : 0,
          runGridHeight: runGrid ? Math.round(runGrid.height) : 0,
          bottomRowHeight: bottomRow ? Math.round(bottomRow.height) : 0,
          bottomEdgeY: bottomRow ? Math.round(bottomRow.bottom) : 0,
          gapFromViewportBottom: bottomRow
            ? Math.round(window.innerHeight - bottomRow.bottom)
            : 999,
        };
      });
      console.log(
        `[Layout Metrics ${viewport.width}x${viewport.height}]`,
        JSON.stringify(metrics)
      );
      expect(metrics.gapFromViewportBottom).toBeLessThanOrEqual(24);
      if (viewport.height === 640) {
        expect(metrics.runBtnHeight).toBeGreaterThanOrEqual(48);
        expect(metrics.runBtnHeight).toBeLessThanOrEqual(80);
        await page.screenshot({
          path: path.join(afterScreenshotsDir, 'after-scoring-360x640.png'),
          fullPage: false,
        });
      }

      // Stage 9B Item 4: Check zero horizontal clipping (scrollWidth > clientWidth) in EN, HI, and ES
      for (const lang of ['en', 'hi', 'es'] as const) {
        if (lang !== 'en') {
          await page.goto('/#/settings');
          const leaveDlg = page.getByRole('dialog');
          if (await leaveDlg.isVisible({ timeout: 400 }).catch(() => false)) {
            await leaveDlg
              .getByRole('button', { name: /leave|छोड़ें|salir/i })
              .click();
            await page.goto('/#/settings');
          }
          await page.locator('#settings-language-select').selectOption(lang);
          await page.goto('/#/live');
          await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();
        }

        const clippedElements = await page
          .getByTestId('live-scorer-root')
          .evaluate((root) => {
            const offenders: string[] = [];
            const elements = [
              root,
              ...Array.from(root.querySelectorAll<HTMLElement>('*')),
            ];
            for (const el of elements) {
              if (el.closest('[data-testid="live-over-strip"]') || el.getAttribute('data-testid') === 'live-over-strip') continue;
              if (el.closest('.sr-only') || el.classList.contains('sr-only') || el.getAttribute('data-testid') === 'live-sr-confirmation') continue;
              const style = window.getComputedStyle(el);
              if (
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                parseFloat(style.opacity) === 0
              ) {
                continue;
              }
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) continue;
              if (el.scrollWidth > el.clientWidth) {
                offenders.push(
                  `${el.tagName.toLowerCase()}[${
                    el.getAttribute('data-testid') || el.className
                  }] (${el.scrollWidth} > ${el.clientWidth}): "${(
                    el.textContent || ''
                  )
                    .trim()
                    .slice(0, 40)}"`
                );
              }
            }
            return offenders;
          });

        expect(
          clippedElements,
          `Zero horizontal clipping at ${viewport.width}x${viewport.height} in ${lang}`
        ).toEqual([]);
      }

      await context.close();
    }

    // Also capture 412x915 after screenshot and verify keypad anchored to bottom with 80px run buttons
    const ctx412 = await browser.newContext({
      viewport: { width: 412, height: 915 },
    });
    const page412 = await ctx412.newPage();
    await loadSampleDataOnFreshPage(page412);
    await page412.getByTestId('hero-resume-live-btn').click();
    await expect(page412.getByTestId('live-scoreboard-card')).toBeVisible();
    const metrics412 = await page412.evaluate(() => {
      const runBtn = document
        .querySelector('[data-testid="run-btn-0"]')
        ?.getBoundingClientRect();
      const bottomRow = document
        .querySelector('[data-testid="live-bottom-actions-row"]')
        ?.getBoundingClientRect();
      return {
        runBtnHeight: runBtn ? Math.round(runBtn.height) : 0,
        bottomEdgeY: bottomRow ? Math.round(bottomRow.bottom) : 0,
        gapFromViewportBottom: bottomRow
          ? Math.round(window.innerHeight - bottomRow.bottom)
          : 999,
      };
    });
    console.log('[Layout Metrics 412x915]', JSON.stringify(metrics412));
    expect(metrics412.runBtnHeight).toBe(80);
    expect(metrics412.gapFromViewportBottom).toBeLessThanOrEqual(24);
    await page412.screenshot({
      path: path.join(afterScreenshotsDir, 'after-scoring-412x915.png'),
      fullPage: false,
    });
    await ctx412.close();
  });

  test('3. Scores a full over, handles Android-style browser back button, and persists scoring lock across page refresh', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
    });
    const page = await context.newPage();

    await loadSampleDataOnFreshPage(page);

    // Open Live Scorer and score a full 6-ball over
    await page.getByTestId('hero-resume-live-btn').click();
    await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();

    const initialOvers = await page
      .getByTestId('live-overs-display')
      .textContent();
    expect(initialOvers).toBeTruthy();

    // Score 6 legal deliveries (1, 0, 2, 4, 1, 0) across the over boundary
    const runsToScore = [1, 0, 2, 4, 1, 0];
    for (const run of runsToScore) {
      await page.getByTestId(`run-btn-${run}`).click();
      const setBowlerBtn = page
        .getByRole('dialog')
        .getByRole('button', { name: /set bowler|start|confirm|शुरू|iniciar|confirmar/i })
        .first();
      if (await setBowlerBtn.isVisible({ timeout: 300 }).catch(() => false)) {
        await setBowlerBtn.click();
        await page.getByTestId(`run-btn-${run}`).click();
      }
    }

    const updatedOvers = await page
      .getByTestId('live-overs-display')
      .textContent();
    expect(updatedOvers).not.toEqual(initialOvers);

    // Test Android-style browser back button while on Live Scorer: opens leave confirmation modal
    await page.goBack();
    const leaveModal = page.getByRole('dialog');
    await expect(leaveModal).toBeVisible();
    await leaveModal
      .getByRole('button', { name: /leave|salir|छोड़ें/i })
      .click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();

    // Navigate to Settings via Quick Links or Bottom Nav and set a 4-digit PIN
    await page.goto('/#/settings');
    const pinInput = page.getByTestId('settings-pin-input');
    await expect(pinInput).toBeVisible();
    await pinInput.fill('1234');
    await page.getByTestId('save-pin-btn').click();

    // Return to Live Scorer, lock keypad, and refresh page
    await page.goto('/#/live');
    await expect(page.getByTestId('live-lock-btn')).toBeVisible();
    await page.getByTestId('live-lock-btn').click();
    await expect(page.getByTestId('pin-unlock-input')).toBeVisible();

    // Reload page and confirm scoring lock survives refresh
    await page.reload();
    await expect(page.getByTestId('pin-unlock-input')).toBeVisible({
      timeout: 15000,
    });

    // Unlock with PIN 1234
    await page.getByTestId('pin-unlock-input').fill('1234');
    await page.getByTestId('pin-unlock-submit').click();
    await expect(page.getByTestId('pin-unlock-input')).toBeHidden();

    await context.close();
  });

  test('4. Runs Axe accessibility check on all main screens and modals with zero serious/critical issues and verifies modal focus return', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await loadSampleDataOnFreshPage(page);

    const viewsToAudit: { name: string; hash: string; waitForTestId?: string }[] = [
      { name: 'Home', hash: '/#/dashboard', waitForTestId: 'hero-resume-live-btn' },
      { name: 'Match Wizard', hash: '/#/wizard', waitForTestId: 'wizard-step-indicator' },
      { name: 'Live Scorer', hash: '/#/live', waitForTestId: 'live-scoreboard-card' },
      { name: 'Scorecard', hash: '/#/scorecards', waitForTestId: 'export-csv-btn' },
      { name: 'Players', hash: '/#/players', waitForTestId: 'add-player-btn' },
      { name: 'Teams', hash: '/#/teams' },
      { name: 'Careers', hash: '/#/careers' },
      { name: 'Tournaments', hash: '/#/tournaments', waitForTestId: 'create-tournament-btn' },
      { name: 'Leaderboards', hash: '/#/leaderboards' },
      { name: 'Settings', hash: '/#/settings', waitForTestId: 'check-for-update-btn' },
    ];

    for (const view of viewsToAudit) {
      await page.goto(view.hash);
      // If confirm leave modal appears when leaving live scorer, confirm it
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible({ timeout: 500 }).catch(() => false)) {
        const leaveBtn = dialog.getByRole('button', {
          name: /leave|salir|छोड़ें/i,
        });
        if (await leaveBtn.isVisible().catch(() => false)) {
          await leaveBtn.click();
          await page.goto(view.hash);
        }
      }

      if (view.waitForTestId) {
        await expect(page.getByTestId(view.waitForTestId)).toBeVisible({
          timeout: 10000,
        });
      } else {
        await expect(page.locator('h1').first()).toBeVisible({
          timeout: 10000,
        });
      }

      const axeResults = await new AxeBuilder({ page }).analyze();
      const seriousOrCritical = axeResults.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      );

      if (seriousOrCritical.length > 0) {
        console.error(
          `[Axe Violations on ${view.name}]`,
          JSON.stringify(
            seriousOrCritical.map((v) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              nodes: v.nodes.map((n) => n.html),
            })),
            null,
            2
          )
        );
      }

      expect(
        seriousOrCritical,
        `Axe serious/critical violations on ${view.name}`
      ).toHaveLength(0);
    }

    // Verify modal focus trap, Axe check inside open modal, and focus return on Escape
    await page.goto('/#/players');
    const addPlayerBtn = page.getByTestId('add-player-btn');
    await expect(addPlayerBtn).toBeVisible();
    await addPlayerBtn.focus();
    await addPlayerBtn.click();

    const playerModal = page.getByRole('dialog');
    await expect(playerModal).toBeVisible();
    await expect(playerModal).toHaveAttribute('aria-modal', 'true');

    // Initial focus should be inside the dialog
    const focusInsideDialog = await playerModal.evaluate((dlg) =>
      dlg.contains(document.activeElement)
    );
    expect(focusInsideDialog).toBe(true);

    // Run Axe while modal is open
    const modalAxe = await new AxeBuilder({ page }).analyze();
    const modalViolations = modalAxe.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(modalViolations, 'Axe violations on open Register Player modal').toHaveLength(0);

    // Press Escape to close modal and verify focus returns to trigger button
    await page.keyboard.press('Escape');
    await expect(playerModal).toBeHidden();
    const focusedTestId = await page.evaluate(() =>
      document.activeElement?.getAttribute('data-testid')
    );
    expect(focusedTestId).toBe('add-player-btn');

    await context.close();
  });
});

