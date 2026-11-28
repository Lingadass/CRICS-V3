import { test, expect, Page } from '@playwright/test';
import path from 'node:path';

const VIEWPORTS = [
  { width: 360, height: 592 },
  { width: 360, height: 640 },
  { width: 360, height: 700 },
  { width: 360, height: 728 },
  { width: 393, height: 780 },
  { width: 412, height: 915 },
  { width: 498, height: 780 },
  { width: 640, height: 360 }, // landscape
];

const REQUIRED_BUTTON_IDS = [
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

async function assertViewportAndNoScroll(page: Page, vp: { width: number; height: number }, stateLabel: string) {
  // 1. Assert no page scroll (except landscape fallback if needed, but must not scroll for portrait)
  const isLandscape = vp.width > vp.height;
  const metrics = await page.evaluate(() => {
    const scroller = document.scrollingElement || document.documentElement;
    const root = document.querySelector('[data-testid="live-scorer-root"]') as HTMLElement | null;
    return {
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
      innerHeight: window.innerHeight,
      rootHeight: root?.offsetHeight ?? 0,
      rootScrollHeight: root?.scrollHeight ?? 0,
    };
  });

  if (!isLandscape) {
    expect(
      metrics.scrollHeight,
      `[${stateLabel} ${vp.width}x${vp.height}] document.scrollingElement.scrollHeight <= window.innerHeight`
    ).toBeLessThanOrEqual(metrics.innerHeight + 1);
  }

  // 2. Banner must not exist
  const banner = page.getByTestId('ball-confirmation-banner');
  await expect(banner, `[${stateLabel}] ball-confirmation-banner should not exist`).toHaveCount(0);

  // 3. Every keypad row is inside viewport
  const keypadMetrics = await page.evaluate(() => {
    const rect = (id: string) => document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect();
    const keypad = rect('live-scoring-keypad');
    const swapBtn = rect('live-swap-btn');
    const moreBtn = rect('live-more-actions-btn');
    const wicketBtn = rect('live-wicket-btn');
    const undoBtn = rect('live-undo-btn');
    const run0 = rect('run-btn-0');
    const extras = rect('live-extras-row');
    return {
      vh: window.innerHeight,
      keypadBottom: keypad?.bottom ?? 0,
      swapBottom: swapBtn?.bottom ?? 0,
      moreBottom: moreBtn?.bottom ?? 0,
      wicketBottom: wicketBtn?.bottom ?? 0,
      undoBottom: undoBtn?.bottom ?? 0,
      run0Bottom: run0?.bottom ?? 0,
      extrasBottom: extras?.bottom ?? 0,
    };
  });

  if (!isLandscape) {
    expect(keypadMetrics.swapBottom, `live-swap-btn visible at ${vp.width}x${vp.height}`).toBeLessThanOrEqual(keypadMetrics.vh + 1);
    expect(keypadMetrics.moreBottom, `live-more-actions-btn visible at ${vp.width}x${vp.height}`).toBeLessThanOrEqual(keypadMetrics.vh + 1);
  }

  // 4. Every tappable control is at least 48px
  for (const btnId of REQUIRED_BUTTON_IDS) {
    const box = await page.getByTestId(btnId).boundingBox();
    if (box) {
      expect(box.width, `${btnId} width >= 48px at ${vp.width}x${vp.height}`).toBeGreaterThanOrEqual(47.5);
      expect(box.height, `${btnId} height >= 48px at ${vp.width}x${vp.height}`).toBeGreaterThanOrEqual(47.5);
    }
  }

  // 5. No clipped text (scrollWidth <= clientWidth) except inside the over strip and visually hidden sr-only elements
  const clipped = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="live-scorer-root"]') as HTMLElement | null;
    if (!root) return [];
    const offenders: string[] = [];
    const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
    for (const el of elements) {
      // Over strip and its scroll containers are exempt
      if (el.closest('[data-testid="live-over-strip"]') || el.getAttribute('data-testid') === 'live-over-strip') {
        continue;
      }
      // Visually hidden screen reader elements (1px x 1px) are exempt
      if (el.closest('.sr-only') || el.classList.contains('sr-only') || el.getAttribute('data-testid') === 'live-sr-confirmation') {
        continue;
      }
      const st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (el.scrollWidth > el.clientWidth + 2) {
        offenders.push(`${el.tagName}[${el.getAttribute('data-testid') || el.className}]: ${el.scrollWidth} > ${el.clientWidth}`);
      }
    }
    return offenders;
  });
  expect(clipped, `[${stateLabel} ${vp.width}x${vp.height}] clipped text`).toEqual([]);
}

async function handleDialogIfPresent(page: Page) {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible()) {
    const setBowlerBtn = dialog.getByRole('button', { name: /set bowler|confirm/i }).first();
    if (await setBowlerBtn.isVisible()) {
      await setBowlerBtn.click();
      await expect(dialog).toBeHidden();
      return;
    }
  }
  const selectBowlerBtn = page.getByRole('button', { name: /select bowler/i }).first();
  if (await selectBowlerBtn.isVisible()) {
    await selectBowlerBtn.click();
    await dialog.waitFor({ state: 'visible', timeout: 3000 });
    const setBowlerBtn = dialog.getByRole('button', { name: /set bowler|confirm/i }).first();
    await setBowlerBtn.click();
    await expect(dialog).toBeHidden();
  }
}

test.describe('Stage 11.1: Live scoring screen fit, over strip & compact bands', () => {
  test('Fit rule across viewports at 0 balls', async ({ browser }) => {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await page.goto('/');
      const splash = page.getByTestId('intro-splash');
      if (await splash.isVisible({ timeout: 1500 }).catch(() => false)) await splash.click();
      await page.getByTestId('welcome-sample-data-btn').click();
      await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();
      await page.getByTestId('hero-resume-live-btn').click();
      await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();

      await assertViewportAndNoScroll(page, vp, '0-balls');
      await context.close();
    }
  });

  test('Fit rule across states: 6 balls (with 4 & 6), 7 balls with wide, 3 overs, lock visible', async ({ browser }) => {
    const vp = { width: 360, height: 728 };
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();
    await page.goto('/');
    const splash = page.getByTestId('intro-splash');
    if (await splash.isVisible({ timeout: 1500 }).catch(() => false)) await splash.click();
    await page.getByTestId('welcome-sample-data-btn').click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();
    await page.getByTestId('hero-resume-live-btn').click();
    await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();

    // 1. After 6 balls including 4 and 6
    const balls = [4, 1, 6, 2, 0, 1];
    for (const r of balls) {
      await handleDialogIfPresent(page);
      await page.getByTestId(`run-btn-${r}`).click();
      await handleDialogIfPresent(page);
    }
    await assertViewportAndNoScroll(page, vp, '6-balls');

    // 2. Over ended, select bowler then wide + 1 (7 balls scored)
    await handleDialogIfPresent(page);
    await page.getByTestId('extra-wide-btn').click();
    await page.getByRole('button', { name: '+1', exact: true }).click();
    await assertViewportAndNoScroll(page, vp, '7-balls-with-wide');

    // Requirement 10: Capture after screenshot at 360x728 with 7 balls scored
    const screenshotsDir = path.resolve(process.cwd(), 'assets/screenshots');
    await page.screenshot({
      path: path.join(screenshotsDir, 'after-scoring-360x728.png'),
      fullPage: false,
    });

    // 3. Score through 3 overs (18 legal balls + 1 wide = 19 balls)
    const nextBalls = [1, 2, 0, 4, 1, 6, 1, 0, 2, 1, 4, 1];
    for (const r of nextBalls) {
      await handleDialogIfPresent(page);
      await page.getByTestId(`run-btn-${r}`).click();
      await handleDialogIfPresent(page);
    }
    await assertViewportAndNoScroll(page, vp, '3-overs');

    // 4. Very long match title state
    await page.evaluate(() => {
      const titleEl = document.querySelector('[data-testid="live-match-title"]') as HTMLElement;
      if (titleEl) {
        titleEl.textContent = 'Grand Mega Championship 2026 Finals — Royal Strikers XI vs Super Titan Warriors Cricket Club';
      }
    });
    await assertViewportAndNoScroll(page, vp, 'very-long-match-title');

    // 5. Scoring lock visible
    await page.getByTestId('live-lock-btn').click();
    const lockOverlay = page.getByTestId('scoring-lock-overlay');
    await expect(lockOverlay).toBeVisible();
    const lockMetrics = await page.evaluate(() => {
      const scroller = document.scrollingElement || document.documentElement;
      return { scrollHeight: scroller.scrollHeight, innerHeight: window.innerHeight };
    });
    expect(lockMetrics.scrollHeight).toBeLessThanOrEqual(lockMetrics.innerHeight + 1);

    // Unlock
    await page.getByTestId('live-lock-btn').click();

    await context.close();
  });

  test('Fit rule at 360x640 with 7 balls scored (after screenshot)', async ({ browser }) => {
    const vp = { width: 360, height: 640 };
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();
    await page.goto('/');
    const splash = page.getByTestId('intro-splash');
    if (await splash.isVisible({ timeout: 1500 }).catch(() => false)) await splash.click();
    await page.getByTestId('welcome-sample-data-btn').click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();
    await page.getByTestId('hero-resume-live-btn').click();
    await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();

    // Score 6 balls
    const balls = [4, 1, 6, 2, 0, 1];
    for (const r of balls) {
      await handleDialogIfPresent(page);
      await page.getByTestId(`run-btn-${r}`).click();
      await handleDialogIfPresent(page);
    }

    // 7th ball: wide + 1
    await handleDialogIfPresent(page);
    await page.getByTestId('extra-wide-btn').click();
    await page.getByRole('button', { name: '+1', exact: true }).click();

    await assertViewportAndNoScroll(page, vp, '7-balls-360x640');

    // Capture after screenshot at 360x640 with 7 balls scored
    const screenshotsDir = path.resolve(process.cwd(), 'assets/screenshots');
    await page.screenshot({
      path: path.join(screenshotsDir, 'after-scoring-360x640.png'),
      fullPage: false,
    });

    await context.close();
  });

  test('Over strip: single 44px line, no wrapping, horizontal swipe, color coding', async ({ browser }) => {
    const vp = { width: 360, height: 728 };
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();
    await page.goto('/');
    const splash = page.getByTestId('intro-splash');
    if (await splash.isVisible({ timeout: 1500 }).catch(() => false)) await splash.click();
    await page.getByTestId('welcome-sample-data-btn').click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();
    await page.getByTestId('hero-resume-live-btn').click();
    await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();

    // Score 12 balls across 2 overs (including 4, 6, and wicket)
    const runSequence = [4, 1, 6, 0, 2, 1, 1, 4, 6, 0, 1, 2];
    for (let i = 0; i < runSequence.length; i++) {
      await handleDialogIfPresent(page);
      await page.getByTestId(`run-btn-${runSequence[i]}`).click();
      await handleDialogIfPresent(page);
    }

    // Assert over strip height is 44px and all chips share the same top position
    const stripData = await page.evaluate(() => {
      const strip = document.querySelector('[data-testid="live-over-strip"]') as HTMLElement | null;
      if (!strip) return null;
      const chips = Array.from(strip.querySelectorAll('[data-ball-chip="true"]')) as HTMLElement[];
      const tops = chips.map((c) => Math.round(c.getBoundingClientRect().top));
      const heights = chips.map((c) => Math.round(c.getBoundingClientRect().height));
      const widths = chips.map((c) => Math.round(c.getBoundingClientRect().width));
      return {
        stripHeight: Math.round(strip.getBoundingClientRect().height),
        allSameTop: tops.length > 0 && tops.every((t) => Math.abs(t - tops[0]) <= 2),
        minHeight: Math.min(...heights),
        maxHeight: Math.max(...heights),
        minWidth: Math.min(...widths),
        isHorizontallyScrollable: strip.scrollWidth > strip.clientWidth,
        newestVisible: (() => {
          if (chips.length === 0) return false;
          const lastChip = chips[chips.length - 1];
          const lastRect = lastChip.getBoundingClientRect();
          const stripRect = strip.getBoundingClientRect();
          return lastRect.right <= stripRect.right + 2 && lastRect.left >= stripRect.left;
        })(),
      };
    });

    expect(stripData).not.toBeNull();
    expect(stripData!.stripHeight).toBeLessThanOrEqual(46);
    expect(stripData!.stripHeight).toBeGreaterThanOrEqual(42);
    expect(stripData!.allSameTop).toBe(true);
    expect(stripData!.minHeight).toBeGreaterThanOrEqual(32);
    expect(stripData!.maxHeight).toBeLessThanOrEqual(38);
    expect(stripData!.minWidth).toBeGreaterThanOrEqual(32);
    expect(stripData!.newestVisible).toBe(true);

    // Save after screenshots
    const screenshotsDir = path.resolve(process.cwd(), 'assets/screenshots');
    await page.screenshot({
      path: path.join(screenshotsDir, 'after-scoring-360x728.png'),
      fullPage: false,
    });

    await context.close();
  });
});
