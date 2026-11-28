import { expect, test } from '@playwright/test';

test.describe('Stage 9C — Branded Intro Screen E2E & Timeline Screenshots', () => {
  test('1. Cold load shows intro and auto-dismisses within 3.5s, captures 0.3s/1.0s/1.8s/2.4s screenshots, and does not repeat on refresh', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
    });
    const page = await context.newPage();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const startMs = Date.now();

    const intro = page.getByTestId('intro-splash');
    await expect(intro).toBeVisible({ timeout: 1000 });
    await expect(intro).toHaveAttribute(
      'aria-label',
      'CRICS, produced by eSportZignal, created by LINGADASS K'
    );

    const waitUntilElapsed = async (targetMs: number) => {
      const elapsed = Date.now() - startMs;
      if (elapsed < targetMs) {
        await page.waitForTimeout(targetMs - elapsed);
      }
    };

    await waitUntilElapsed(300);
    await page.screenshot({ path: 'assets/screenshots/intro-0.3s.png' });

    await waitUntilElapsed(1000);
    await expect(page.getByTestId('intro-skip-btn')).toBeVisible();
    const skipBox = await page.getByTestId('intro-skip-btn').boundingBox();
    expect(skipBox?.height).toBeGreaterThanOrEqual(48);
    expect(skipBox?.width).toBeGreaterThanOrEqual(48);
    await page.screenshot({ path: 'assets/screenshots/intro-1.0s.png' });

    await waitUntilElapsed(1800);
    await page.screenshot({ path: 'assets/screenshots/intro-1.8s.png' });

    await waitUntilElapsed(2400);
    await page.screenshot({ path: 'assets/screenshots/intro-2.4s.png' });

    // Must disappear within 3.5 seconds of cold load
    await expect(intro).toBeHidden({ timeout: 1500 });
    expect(Date.now() - startMs).toBeLessThanOrEqual(3500);

    // App is immediately usable right after intro finishes
    const sampleBtn = page.getByTestId('welcome-sample-data-btn');
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();

    // Refresh in the same session does NOT show the intro again
    await page.reload();
    await expect(page.getByTestId('intro-splash')).toBeHidden();
    await expect(page.locator('#initial-intro-splash')).toBeHidden();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();

    // Cold start when a match is live shows the 1000 ms CRICS-logo-only version
    await page.evaluate(() => window.sessionStorage.removeItem('crics_intro_shown_session'));
    await page.reload();
    await expect(page.getByTestId('intro-splash')).toHaveAttribute('data-intro-mode', 'live-short');
    await expect(page.getByTestId('intro-produced-block')).toHaveCount(0);
    await expect(page.getByTestId('intro-splash')).toBeHidden({ timeout: 2000 });

    await context.close();
  });

  test('2. Tap anywhere and Skip button dismiss the intro immediately, and both credit lines are readable without clipping in EN, HI, and ES at 360x640', async ({
    browser,
  }) => {
    // A. Dismiss via Skip button & verify English, Hindi, and Spanish credit lines are unclipped
    for (const lang of ['en', 'hi', 'es'] as const) {
      const context = await browser.newContext({
        viewport: { width: 360, height: 640 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();

      await page.goto('/');
      // Set language if needed and re-trigger cold start in reduced-motion mode so both credits are immediately static
      if (lang !== 'en') {
        await page.evaluate(() => window.sessionStorage.clear());
        await page.getByTestId('intro-splash').click();
        await page.goto('/#/settings');
        await page.locator('#settings-language-select').selectOption(lang);
        await page.evaluate(() => window.sessionStorage.removeItem('crics_intro_shown_session'));
        await page.goto('/');
      }

      const intro = page.getByTestId('intro-splash');
      await expect(intro).toBeVisible();

      const clipping = await page.evaluate(() => {
        const ids = [
          'intro-produced-caption',
          'intro-created-caption',
          'intro-creator-name',
          'intro-esz-logo',
        ];
        const clipped: string[] = [];
        for (const id of ids) {
          const el = document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
          if (!el) {
            clipped.push(`missing:${id}`);
            continue;
          }
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0 || rect.left < 0 || rect.right > 360) {
            clipped.push(`bounds:${id}`);
          }
          if (el.scrollWidth > el.clientWidth + 1) {
            clipped.push(`scroll:${id}(${el.scrollWidth}>${el.clientWidth})`);
          }
        }
        const esz = document.querySelector('[data-testid="intro-esz-logo"]') as HTMLElement | null;
        const eszWidth = esz ? esz.getBoundingClientRect().width : 999;
        return { clipped, eszWidth };
      });

      expect(clipping.clipped, `Clipped intro elements in ${lang}`).toEqual([]);
      expect(clipping.eszWidth).toBeLessThanOrEqual(235);

      if (lang === 'en') {
        // Wait for Skip button at 800ms and click it
        const skipBtn = page.getByTestId('intro-skip-btn');
        await expect(skipBtn).toBeVisible({ timeout: 1500 });
        await skipBtn.click();
        await expect(intro).toBeHidden();
      } else {
        // Tap anywhere on intro dismisses immediately
        await intro.click({ position: { x: 20, y: 20 } });
        await expect(intro).toBeHidden();
      }

      await context.close();
    }
  });

  test('3. Works 100% offline with zero network requests and respects Settings "Show intro animation" switch', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
    });
    const page = await context.newPage();

    const externalRequests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith('http://127.0.0.1') && !url.startsWith('http://localhost') && !url.startsWith('data:') && !url.startsWith('blob:')) {
        externalRequests.push(url);
      }
    });

    await page.goto('/');
    await page.getByTestId('intro-splash').click();
    await expect(page.getByTestId('intro-splash')).toBeHidden();

    // Ensure Service Worker is active and controlling the page
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    // Go offline, clear session flag to simulate cold start while offline, and reload
    await context.setOffline(true);
    await page.evaluate(() => window.sessionStorage.removeItem('crics_intro_shown_session'));
    await page.reload();

    await expect(page.getByTestId('intro-splash')).toBeVisible();
    await page.getByTestId('intro-splash').click();
    await expect(page.getByTestId('intro-splash')).toBeHidden();

    // Turn off "Show intro animation" in Settings and verify cold start skips intro
    await context.setOffline(false);
    await page.goto('/#/settings');
    const toggle = page.getByTestId('settings-show-intro-checkbox');
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
    await expect(toggle).not.toBeChecked();

    await page.evaluate(() => window.sessionStorage.removeItem('crics_intro_shown_session'));
    await page.reload();
    await expect(page.getByTestId('intro-splash')).toBeHidden();
    await expect(page.locator('#initial-intro-splash')).toBeHidden();

    expect(externalRequests).toEqual([]);
    await context.close();
  });
});
