import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';

const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 360, height: 700 },
  { width: 360, height: 728 },
  { width: 393, height: 780 },
  { width: 412, height: 915 },
  { width: 498, height: 780 },
];

async function ensureLiveMatchLoaded(page: Page) {
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

async function handleDialogIfPresent(page: Page) {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible({ timeout: 500 }).catch(() => false)) {
    const setBowlerBtn = dialog.getByRole('button', { name: /set bowler|confirm/i }).first();
    if (await setBowlerBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await setBowlerBtn.click();
      await expect(dialog).toBeHidden();
      return;
    }
    const cancelBtn = dialog.getByRole('button', { name: /cancel|close|cerrar|रद्द/i }).first();
    if (await cancelBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await cancelBtn.click();
      await expect(dialog).toBeHidden();
    }
  }
}

async function assertKeypadAnchoredAndNoScroll(page: Page, vp: { width: number; height: number }, stateLabel: string) {
  const metrics = await page.evaluate(() => {
    const keypad = document.querySelector('[data-testid="live-scoring-keypad"]')?.getBoundingClientRect();
    const overStrip = (document.querySelector('[data-testid="live-over-strip"]') || document.querySelector('[data-testid="live-this-over-row"]'))?.getBoundingClientRect();
    const scroller = document.scrollingElement || document.documentElement;
    return {
      vh: window.innerHeight,
      keypadBottom: keypad ? keypad.bottom : 0,
      keypadTop: keypad ? keypad.top : 0,
      overStripBottom: overStrip ? overStrip.bottom : 0,
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
    };
  });

  // 1. Viewport height minus keypad bottom is at most 16px
  const bottomDist = metrics.vh - metrics.keypadBottom;
  expect(
    bottomDist,
    `[${stateLabel} ${vp.width}x${vp.height}] keypad bottom to viewport bottom (got ${bottomDist}px) <= 16px`
  ).toBeLessThanOrEqual(16);

  // 2. Gap between over strip and keypad is at most 24px when height <= 700px (at most 120px when taller)
  const gap = metrics.keypadTop - metrics.overStripBottom;
  const maxGap = vp.height <= 700 ? 24 : 120;
  expect(
    gap,
    `[${stateLabel} ${vp.width}x${vp.height}] gap between over strip and keypad (got ${gap}px) <= ${maxGap}px`
  ).toBeLessThanOrEqual(maxGap);
  expect(
    gap,
    `[${stateLabel} ${vp.width}x${vp.height}] gap between over strip and keypad (got ${gap}px) >= -1px (no overlap)`
  ).toBeGreaterThanOrEqual(-1);

  // 3. No page scroll
  expect(
    metrics.scrollHeight,
    `[${stateLabel} ${vp.width}x${vp.height}] page scrollHeight (${metrics.scrollHeight}) <= innerHeight + 1 (${metrics.vh + 1})`
  ).toBeLessThanOrEqual(metrics.vh + 1);
}

test.describe('STAGE 11.5: Keypad Anchoring and Over Strip Polish', () => {
  test('1. Keypad anchoring, band gaps, and no page scroll across viewports at 0 balls, 7 balls and chase', async ({
    browser,
  }) => {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await ensureLiveMatchLoaded(page);

      // (A) State 1: 0 balls
      await assertKeypadAnchoredAndNoScroll(page, vp, '0-balls');

      // (B) State 2: 7 balls (6 legal balls + 1 wide)
      const sixBalls = [4, 1, 6, 2, 0, 1];
      for (const r of sixBalls) {
        await handleDialogIfPresent(page);
        await page.getByTestId(`run-btn-${r}`).click();
        await handleDialogIfPresent(page);
      }
      // 7th ball: Wide
      await handleDialogIfPresent(page);
      await page.getByTestId('extra-wide-btn').click();
      await page.getByRole('button', { name: '+1', exact: true }).click();
      await handleDialogIfPresent(page);

      await assertKeypadAnchoredAndNoScroll(page, vp, '7-balls');

      // Take screenshots at 360x640 and 360x728 with 7 balls
      if (vp.width === 360 && (vp.height === 640 || vp.height === 728)) {
        const screenshotsDir = path.resolve(process.cwd(), 'assets/screenshots');
        await page.screenshot({
          path: path.join(screenshotsDir, `after-scoring-${vp.width}x${vp.height}.png`),
          fullPage: false,
        });
      }

      // (C) State 3: Chase (Target set via DLS modal)
      await page.getByTestId('live-more-actions-btn').click();
      const moreSheet = page.getByRole('dialog');
      await expect(moreSheet).toBeVisible();

      const dlsBtn = moreSheet.getByRole('button', { name: /revised target|dls/i });
      await dlsBtn.click();
      const targetModal = page.getByRole('dialog');
      await expect(targetModal).toBeVisible();

      const runsInput = page.locator('#revised-target-runs-input');
      await runsInput.click();
      await runsInput.fill('175');
      const saveTargetBtn = targetModal.getByRole('button', { name: /save|apply|confirm|रखें/i }).first();
      await saveTargetBtn.click();
      await expect(targetModal).toBeHidden();

      await assertKeypadAnchoredAndNoScroll(page, vp, 'chase');

      await context.close();
    }
  });

  test('2. Over strip: 9 balls including 3 wides, newest chip is fully visible after each ball', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 728 });
    await ensureLiveMatchLoaded(page);

    // Over with 9 balls: Wide, 1, Wide, 4, 0, Wide, 2, 6, 1
    const deliverySequence = [
      { isWide: true, runs: 1 },
      { isWide: false, runs: 1 },
      { isWide: true, runs: 1 },
      { isWide: false, runs: 4 },
      { isWide: false, runs: 0 },
      { isWide: true, runs: 1 },
      { isWide: false, runs: 2 },
      { isWide: false, runs: 6 },
      { isWide: false, runs: 1 },
    ];

    for (let i = 0; i < deliverySequence.length; i++) {
      const del = deliverySequence[i];
      await handleDialogIfPresent(page);
      if (del.isWide) {
        await page.getByTestId('extra-wide-btn').click();
        await page.getByRole('button', { name: '+1', exact: true }).click();
      } else {
        await page.getByTestId(`run-btn-${del.runs}`).click();
      }
      await handleDialogIfPresent(page);

      // Assert newest chip is fully visible
      const isNewestVisible = await page.evaluate(() => {
        const strip = document.querySelector('[data-testid="live-over-strip"]');
        if (!strip) return false;
        const chips = strip.querySelectorAll('[data-ball-chip="true"]');
        if (chips.length === 0) return false;
        const lastChip = chips[chips.length - 1] as HTMLElement;
        const stripRect = strip.getBoundingClientRect();
        const chipRect = lastChip.getBoundingClientRect();
        return chipRect.left >= stripRect.left - 2 && chipRect.right <= stripRect.right + 2;
      });
      expect(isNewestVisible, `Newest ball chip must be fully visible after ball ${i + 1}`).toBe(true);
    }
  });

  test('3. Over strip: tabIndex={0}, focus ring, and keyboard arrow keys scroll it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 728 });
    await ensureLiveMatchLoaded(page);

    // Score enough balls to make over strip overflow (15 balls)
    const runSeq = [1, 2, 4, 0, 6, 1, 2, 0, 1, 4, 1, 2, 0, 1, 4];
    for (const r of runSeq) {
      await handleDialogIfPresent(page);
      await page.getByTestId(`run-btn-${r}`).click();
      await handleDialogIfPresent(page);
    }

    const overStrip = page.getByTestId('live-over-strip');
    await expect(overStrip).toBeVisible();

    // Assert tabIndex={0}
    const tabIndex = await overStrip.getAttribute('tabindex');
    expect(tabIndex, 'Over strip must have tabIndex=0 for keyboard accessibility').toBe('0');

    // Focus over strip
    await overStrip.focus();
    const isFocused = await overStrip.evaluate((el) => document.activeElement === el);
    expect(isFocused).toBe(true);

    // Assert visible focus ring
    const hasFocusRing = await overStrip.evaluate((el) => {
      const cls = el.className || '';
      return cls.includes('focus:') || cls.includes('focus-visible:') || window.getComputedStyle(el).outlineStyle !== 'none';
    });
    expect(hasFocusRing, 'Over strip must have a visible focus ring styling').toBe(true);

    // Test that arrow keys scroll it
    const scrollMax = await overStrip.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(scrollMax, 'Over strip must have overflow to scroll').toBeGreaterThan(20);

    const initialScroll = await overStrip.evaluate((el) => el.scrollLeft);
    // Press ArrowLeft to scroll back
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    const scrollAfterLeft = await overStrip.evaluate((el) => el.scrollLeft);
    expect(scrollAfterLeft, 'ArrowLeft must scroll strip to the left').toBeLessThan(initialScroll);

    // Press ArrowRight to scroll forward
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    const scrollAfterRight = await overStrip.evaluate((el) => el.scrollLeft);
    expect(scrollAfterRight, 'ArrowRight must scroll strip to the right').toBeGreaterThan(scrollAfterLeft);
  });

  test('4. Axe accessibility check on scoring screen with overflowing over strip', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 728 });
    await ensureLiveMatchLoaded(page);

    // Score 24 balls (4 full overs) so the strip heavily overflows
    const balls = [
      4, 1, 6, 2, 0, 1,
      1, 0, 2, 4, 1, 6,
      0, 1, 1, 2, 4, 0,
      6, 1, 2, 0, 1, 4,
    ];
    for (const r of balls) {
      await handleDialogIfPresent(page);
      await page.getByTestId(`run-btn-${r}`).click();
      await handleDialogIfPresent(page);
    }

    const axeResults = await new AxeBuilder({ page }).analyze();
    const serious = axeResults.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, 'Zero serious or critical Axe violations with overflowing over strip').toHaveLength(0);
  });
});
