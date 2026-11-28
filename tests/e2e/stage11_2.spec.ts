import { test, expect, Page } from '@playwright/test';
import path from 'node:path';

const SCALING_VIEWPORTS = [
  { width: 360, height: 592 },
  { width: 360, height: 640 },
  { width: 360, height: 728 },
];

const FONT_SCALES = [130, 150, 200];

const KEYPAD_BUTTON_IDS = [
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

async function loadSampleDataAndGoToLive(page: Page) {
  await page.goto('/');
  const splash = page.getByTestId('intro-splash');
  if (await splash.isVisible({ timeout: 2000 }).catch(() => false)) {
    await splash.click({ force: true }).catch(() => {});
    await expect(splash).toBeHidden({ timeout: 5000 }).catch(() => {});
  }
  const resumeBtn = page.getByTestId('hero-resume-live-btn');
  if (!(await resumeBtn.isVisible({ timeout: 1500 }).catch(() => false))) {
    const sampleBtn = page.getByTestId('welcome-sample-data-btn');
    await expect(sampleBtn).toBeVisible({ timeout: 10000 });
    await sampleBtn.click();
    await expect(resumeBtn).toBeVisible({ timeout: 15000 });
  }
  await resumeBtn.click();
  await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();
}

test.describe('STAGE 11.2: Safety Checks for the Scoring Screen Fit', () => {
  // 1. Large system font scaling: 130%, 150%, 200% at 360x592, 360x640, 360x728
  for (const vp of SCALING_VIEWPORTS) {
    for (const scale of FONT_SCALES) {
      test(`Font scaling ${scale}% at ${vp.width}x${vp.height}: Keypad stays pinned and reachable, bands scroll inside container`, async ({
        browser,
      }) => {
        const context = await browser.newContext({ viewport: vp });
        const page = await context.newPage();

        await loadSampleDataAndGoToLive(page);

        // Apply OS root font scaling
        await page.evaluate((s) => {
          document.documentElement.style.fontSize = `${s}%`;
        }, scale);

        // Allow layout to settle
        await page.waitForTimeout(100);

        // 1. The document/page itself must NOT scroll
        const pageMetrics = await page.evaluate(() => {
          const scroller = document.scrollingElement || document.documentElement;
          return {
            scrollHeight: scroller.scrollHeight,
            innerHeight: window.innerHeight,
          };
        });
        expect(
          pageMetrics.scrollHeight,
          `document.scrollingElement.scrollHeight at ${scale}% ${vp.width}x${vp.height}`
        ).toBeLessThanOrEqual(pageMetrics.innerHeight + 1);

        // 2. The keypad must stay pinned and fully inside viewport
        const keypadMetrics = await page.evaluate(() => {
          const rect = (id: string) => document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect();
          const swapBtn = rect('live-swap-btn');
          const moreBtn = rect('live-more-actions-btn');
          const run0 = rect('run-btn-0');
          const extras = rect('live-extras-row');
          return {
            vh: window.innerHeight,
            swapBottom: swapBtn?.bottom ?? 0,
            moreBottom: moreBtn?.bottom ?? 0,
            run0Bottom: run0?.bottom ?? 0,
            extrasBottom: extras?.bottom ?? 0,
          };
        });

        expect(
          keypadMetrics.swapBottom,
          `live-swap-btn bottom <= innerHeight at ${scale}% ${vp.width}x${vp.height}`
        ).toBeLessThanOrEqual(keypadMetrics.vh + 1);

        expect(
          keypadMetrics.moreBottom,
          `live-more-actions-btn bottom <= innerHeight at ${scale}% ${vp.width}x${vp.height}`
        ).toBeLessThanOrEqual(keypadMetrics.vh + 1);

        // 3. Every keypad button is at least 48px and clickable
        for (const btnId of KEYPAD_BUTTON_IDS) {
          const box = await page.getByTestId(btnId).boundingBox();
          if (box) {
            expect(box.width, `${btnId} width >= 48px at ${scale}%`).toBeGreaterThanOrEqual(47.5);
            expect(box.height, `${btnId} height >= 48px at ${scale}%`).toBeGreaterThanOrEqual(47.5);
          }
        }

        // Tapping swap strike works
        const initialStriker = await page.getByTestId('live-striker-row').textContent();
        await page.getByTestId('live-swap-btn').click();
        const swappedStriker = await page.getByTestId('live-striker-row').textContent();
        expect(swappedStriker).not.toEqual(initialStriker);

        // 4. Verify bands container scrolls internally if content overflows
        const bandsContainerMetrics = await page.evaluate(() => {
          const container = document.querySelector('[data-testid="live-bands-container"]') as HTMLElement | null;
          if (!container) return null;
          return {
            clientHeight: container.clientHeight,
            scrollHeight: container.scrollHeight,
            overflowY: window.getComputedStyle(container).overflowY,
          };
        });

        expect(bandsContainerMetrics).toBeTruthy();
        expect(bandsContainerMetrics?.overflowY).toMatch(/auto|scroll/);

        // If content exceeded available bands height, it scrolls INSIDE the container
        if (bandsContainerMetrics && bandsContainerMetrics.scrollHeight > bandsContainerMetrics.clientHeight) {
          // Scroll bands container down by 30px
          await page.evaluate(() => {
            const container = document.querySelector('[data-testid="live-bands-container"]') as HTMLElement | null;
            if (container) container.scrollTop = 30;
          });
          const scrolledTop = await page.evaluate(() => {
            const container = document.querySelector('[data-testid="live-bands-container"]') as HTMLElement | null;
            return container?.scrollTop ?? 0;
          });
          expect(scrolledTop).toBeGreaterThan(0);
        }

        // Capture screenshot at 360x640 with 200% and 360x728 with 200%
        if (scale === 200 && (vp.height === 640 || vp.height === 728)) {
          const screenshotsDir = path.resolve(process.cwd(), 'assets/screenshots');
          await page.screenshot({
            path: path.join(screenshotsDir, `safety-font-${scale}-${vp.width}x${vp.height}.png`),
            fullPage: false,
          });
        }

        await context.close();
      });
    }
  }

  // 2. Scroll lock cleanup: unmount, Back, browser back, and dialogs
  test('Scroll lock cleanup: lock removed on dialog, Back, browser back, screen unmount, and page reload on other screens', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const page = await context.newPage();

    await loadSampleDataAndGoToLive(page);

    // Initial state on Live Scorer: scroll is locked
    const isLockedInitially = await page.evaluate(() => document.body.style.overflow === 'hidden');
    expect(isLockedInitially).toBe(true);

    // A. Open a dialog (Wicket Modal): lock MUST be removed while dialog is open
    await page.getByTestId('live-wicket-btn').click();
    const wicketDialog = page.getByRole('dialog');
    await expect(wicketDialog).toBeVisible();

    const isUnlockedWithDialog = await page.evaluate(() => document.body.style.overflow !== 'hidden');
    expect(isUnlockedWithDialog, 'Lock removed when dialog opens').toBe(true);

    // Close the dialog: lock restored
    const cancelBtn = wicketDialog.getByRole('button', { name: /cancel|cancelar|रद्द/i });
    await cancelBtn.click();
    await expect(wicketDialog).toBeHidden();
    const isLockedAgain = await page.evaluate(() => document.body.style.overflow === 'hidden');
    expect(isLockedAgain, 'Lock restored after dialog closes').toBe(true);

    // B. Tap Back button on Live Scorer: opens leave confirmation modal -> lock removed
    await page.getByTestId('live-back-btn').click();
    const leaveDialog = page.getByRole('dialog');
    await expect(leaveDialog).toBeVisible();
    const isUnlockedWithLeaveModal = await page.evaluate(() => document.body.style.overflow !== 'hidden');
    expect(isUnlockedWithLeaveModal, 'Lock removed when leave confirmation opens').toBe(true);

    // Confirm Leave: navigates to Home
    await leaveDialog.getByRole('button', { name: /leave|salir|छोड़ें/i }).click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();

    // Verify Home page can scroll
    const homeScrollMetrics = await page.evaluate(() => {
      const bodyOverflow = document.body.style.overflow;
      const htmlOverflow = document.documentElement.style.overflow;
      window.scrollTo(0, 150);
      return {
        bodyOverflow,
        htmlOverflow,
        scrollY: window.scrollY,
        scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
        innerHeight: window.innerHeight,
      };
    });
    expect(homeScrollMetrics.bodyOverflow).not.toBe('hidden');
    expect(homeScrollMetrics.htmlOverflow).not.toBe('hidden');
    expect(homeScrollMetrics.scrollHeight).toBeGreaterThan(homeScrollMetrics.innerHeight);
    expect(homeScrollMetrics.scrollY).toBeGreaterThan(0);

    // C. Navigate to Scorecards: assert it can scroll
    await page.goto('/#/scorecards');
    await page.waitForTimeout(300);
    const scorecardsMetrics = await page.evaluate(() => {
      window.scrollTo(0, 100);
      return {
        bodyOverflow: document.body.style.overflow,
        scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
        innerHeight: window.innerHeight,
        scrollY: window.scrollY,
      };
    });
    expect(scorecardsMetrics.bodyOverflow).not.toBe('hidden');
    expect(scorecardsMetrics.scrollHeight).toBeGreaterThan(scorecardsMetrics.innerHeight);
    expect(scorecardsMetrics.scrollY).toBeGreaterThan(0);

    // D. Navigate to Players: assert it can scroll
    await page.goto('/#/players');
    await page.waitForTimeout(300);
    const playersMetrics = await page.evaluate(() => {
      window.scrollTo(0, 100);
      return {
        bodyOverflow: document.body.style.overflow,
        scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
        innerHeight: window.innerHeight,
        scrollY: window.scrollY,
      };
    });
    expect(playersMetrics.bodyOverflow).not.toBe('hidden');
    expect(playersMetrics.scrollHeight).toBeGreaterThan(playersMetrics.innerHeight);
    expect(playersMetrics.scrollY).toBeGreaterThan(0);

    // E. Navigate to Settings: assert it can scroll and survives page reload
    await page.goto('/#/settings');
    await page.waitForTimeout(300);
    const settingsMetrics = await page.evaluate(() => {
      window.scrollTo(0, 100);
      return {
        bodyOverflow: document.body.style.overflow,
        scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
        innerHeight: window.innerHeight,
        scrollY: window.scrollY,
      };
    });
    expect(settingsMetrics.bodyOverflow).not.toBe('hidden');
    expect(settingsMetrics.scrollHeight).toBeGreaterThan(settingsMetrics.innerHeight);
    expect(settingsMetrics.scrollY).toBeGreaterThan(0);

    // Page reload on Settings: lock is still gone and page can scroll
    await page.reload();
    await page.waitForTimeout(500);
    const reloadMetrics = await page.evaluate(() => {
      window.scrollTo(0, 100);
      return {
        bodyOverflow: document.body.style.overflow,
        scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
        innerHeight: window.innerHeight,
        scrollY: window.scrollY,
      };
    });
    expect(reloadMetrics.bodyOverflow).not.toBe('hidden');
    expect(reloadMetrics.scrollY).toBeGreaterThan(0);

    // F. Re-enter Live Scorer and test browser back button (page.goBack())
    await page.goto('/#/live');
    await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    await page.goBack();
    const backLeaveModal = page.getByRole('dialog');
    await expect(backLeaveModal).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');

    await backLeaveModal.getByRole('button', { name: /leave|salir|छोड़ें/i }).click();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');

    await context.close();
  });
});
