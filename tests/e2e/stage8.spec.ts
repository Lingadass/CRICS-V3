import fs from 'node:fs/promises';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const artifactScreenshotsDir = path.resolve(
  process.cwd(),
  'assets/screenshots'
);

async function loadSampleDataAt360x640(page: import('@playwright/test').Page) {
  await page.goto('/');
  const sampleBtn = page.getByTestId('welcome-sample-data-btn');
  await expect(sampleBtn).toBeVisible({ timeout: 10000 });
  await sampleBtn.click();
  await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible({
    timeout: 15000,
  });
}

test.describe('CRICS Stage 8: 360x640 Full-Over Zero-Scroll, Back Nav, Offline Reload + Score, Lock Persistence & Light/Dark Audit', () => {
  test('1. At 360x640: scores a full over without scrolling, handles browser back navigation, reloads offline and scores a ball, and persists scoring lock across refresh', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
    });
    const page = await context.newPage();

    await loadSampleDataAt360x640(page);

    // Wait for Service Worker registration to be active & controlling so offline reload works
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    // 1. Open Live Scorer and score a full 6-ball over without scrolling (window.scrollY === 0)
    await page.getByTestId('hero-resume-live-btn').click();
    await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();
    await expect(page.getByTestId('live-total-score')).toHaveText('11/0');

    const initialScore = await page.getByTestId('live-total-score').textContent();
    const initialOvers = await page.getByTestId('live-overs-display').textContent();

    const deliveries = [1, 0, 2, 4, 1, 6];
    let expectedRuns = 11;
    for (const run of deliveries) {
      const scrollBefore = await page.evaluate(() => window.scrollY);
      expect(scrollBefore).toBe(0);

      await page.getByTestId(`run-btn-${run}`).click();

      // If end-of-over bowler modal appears mid-sequence, select next bowler without scrolling
      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible({ timeout: 250 }).catch(() => false)) {
        const setBowlerBtn = dialog
          .getByRole('button', { name: /set bowler|confirm|शुरू|confirmar/i })
          .first();
        if (await setBowlerBtn.isVisible().catch(() => false)) {
          await setBowlerBtn.click();
          await expect(dialog).toBeHidden();
          await page.getByTestId(`run-btn-${run}`).click();
        }
      }

      expectedRuns += run;
      await expect(page.getByTestId('live-total-score')).toHaveText(`${expectedRuns}/0`);

      const scrollAfter = await page.evaluate(() => window.scrollY);
      expect(scrollAfter).toBe(0);
    }

    const afterOverScore = await page.getByTestId('live-total-score').textContent();
    const afterOverOvers = await page.getByTestId('live-overs-display').textContent();
    expect(afterOverScore).toBe('25/0');
    expect(afterOverScore).not.toEqual(initialScore);
    expect(afterOverOvers).not.toEqual(initialOvers);

    // 2. Browser back navigation at 360x640: intercepts leave from Live Scorer with confirmation dialog
    await page.goBack();
    const leaveModal = page.getByRole('dialog');
    await expect(leaveModal).toBeVisible();
    // First test "Stay on Live Match"
    await leaveModal
      .getByRole('button', { name: /stay|रुकें|quedarse/i })
      .click();
    await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();

    // Now press back again and confirm leaving to Home
    await page.goBack();
    await expect(leaveModal).toBeVisible();
    await leaveModal
      .getByRole('button', { name: /leave|छोड़ें|salir/i })
      .click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();

    // 3. Load once, go offline, reload, then score a ball at 360x640
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible({
      timeout: 15000,
    });

    await page.getByTestId('hero-resume-live-btn').click();
    await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();
    await expect(page.getByTestId('live-total-score')).toHaveText(afterOverScore!);

    const scoreBeforeOfflineBall = await page
      .getByTestId('live-total-score')
      .textContent();
    await page.getByTestId('run-btn-4').click();
    const endOverModalOffline = page.getByRole('dialog');
    if (await endOverModalOffline.isVisible({ timeout: 250 }).catch(() => false)) {
      await endOverModalOffline
        .getByRole('button', { name: /set bowler|confirm/i })
        .first()
        .click();
      await expect(endOverModalOffline).toBeHidden();
      await page.getByTestId('run-btn-4').click();
    }
    await expect(page.getByTestId('live-total-score')).not.toHaveText(
      scoreBeforeOfflineBall!
    );

    // Re-enable network for subsequent navigation/reload checks
    await context.setOffline(false);

    // 4. Scoring lock survives a refresh at 360x640
    await page.goto('/#/settings');
    const leaveModalFromLive = page.getByRole('dialog');
    if (await leaveModalFromLive.isVisible({ timeout: 400 }).catch(() => false)) {
      await leaveModalFromLive
        .getByRole('button', { name: /leave|छोड़ें|salir/i })
        .click();
      await page.goto('/#/settings');
    }

    const pinInput = page.getByTestId('settings-pin-input');
    await expect(pinInput).toBeVisible();
    await pinInput.fill('2580');
    await page.getByTestId('save-pin-btn').click();

    await page.goto('/#/live');
    await expect(page.getByTestId('live-lock-btn')).toBeVisible();
    await page.getByTestId('live-lock-btn').click();
    await expect(page.getByTestId('scoring-lock-overlay')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('scoring-lock-overlay')).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId('pin-unlock-input').fill('2580');
    await page.getByTestId('pin-unlock-submit').click();
    await expect(page.getByTestId('scoring-lock-overlay')).toBeHidden();

    await context.close();
  });

  test('2. Captures Home, Scoring, Scorecard, and Settings screenshots in Light and Dark mode and records Performance, PWA & Accessibility audit metrics', async ({
    browser,
  }) => {
    await fs.mkdir(artifactScreenshotsDir, { recursive: true });

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    await loadSampleDataAt360x640(page);

    // Measure navigation timing & PWA installability readiness
    const perfAndPwaMetrics = await page.evaluate(async () => {
      const navEntry = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming | undefined;
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find((e) => e.name === 'first-contentful-paint');
      const swReg =
        'serviceWorker' in navigator
          ? await navigator.serviceWorker.ready
          : undefined;
      const manifestLink = document.querySelector('link[rel="manifest"]');
      return {
        domContentLoadedMs: navEntry
          ? Math.round(navEntry.domContentLoadedEventEnd)
          : 0,
        loadCompleteMs: navEntry ? Math.round(navEntry.loadEventEnd) : 0,
        fcpMs: fcp ? Math.round(fcp.startTime) : 0,
        hasActiveServiceWorker: Boolean(swReg?.active),
        hasManifest: Boolean(manifestLink?.getAttribute('href')),
      };
    });

    console.log('[STAGE 8 PERF & PWA METRICS]', JSON.stringify(perfAndPwaMetrics));
    expect(perfAndPwaMetrics.hasActiveServiceWorker).toBe(true);
    expect(perfAndPwaMetrics.hasManifest).toBe(true);

    const screens: {
      slug: string;
      hash: string;
      waitForTestId: string;
    }[] = [
      { slug: 'home', hash: '/#/dashboard', waitForTestId: 'hero-resume-live-btn' },
      { slug: 'scoring', hash: '/#/live', waitForTestId: 'live-scoreboard-card' },
      { slug: 'scorecard', hash: '/#/scorecards', waitForTestId: 'export-csv-btn' },
      { slug: 'settings', hash: '/#/settings', waitForTestId: 'check-for-update-btn' },
    ];

    for (const mode of ['light', 'dark'] as const) {
      // Switch theme in Settings
      await page.goto('/#/settings');
      const leaveDialog = page.getByRole('dialog');
      if (await leaveDialog.isVisible({ timeout: 400 }).catch(() => false)) {
        await leaveDialog
          .getByRole('button', { name: /leave|छोड़ें|salir/i })
          .click();
        await page.goto('/#/settings');
      }
      await expect(page.getByTestId(`theme-btn-${mode}`)).toBeVisible();
      await page.getByTestId(`theme-btn-${mode}`).click();

      // Verify document.documentElement reflects the active theme
      const isDarkHtml = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );
      expect(isDarkHtml).toBe(mode === 'dark');

      for (const scr of screens) {
        await page.goto(scr.hash);
        const modal = page.getByRole('dialog');
        if (await modal.isVisible({ timeout: 400 }).catch(() => false)) {
          await modal
            .getByRole('button', { name: /leave|छोड़ें|salir/i })
            .click();
          await page.goto(scr.hash);
        }
        await expect(page.getByTestId(scr.waitForTestId)).toBeVisible({
          timeout: 10000,
        });

        // Run Axe in both light and dark modes on all 4 screens
        const axe = await new AxeBuilder({ page }).analyze();
        const seriousOrCritical = axe.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical'
        );
        expect(
          seriousOrCritical,
          `Axe violations on ${scr.slug} (${mode})`
        ).toHaveLength(0);

        const outPath = path.join(
          artifactScreenshotsDir,
          `${scr.slug}-${mode}.png`
        );
        await page.screenshot({ path: outPath, fullPage: false });
        const stat = await fs.stat(outPath);
        expect(stat.size).toBeGreaterThan(5000);
      }
    }

    await context.close();
  });
});
