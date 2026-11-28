import { expect, test } from '@playwright/test';
import { decodePngToRgba } from '../../scripts/generate-icons.mjs';

test.describe('Stage 10 — Intro Mode Race, Handoff Continuity & Localized Tournament Groups', () => {
  test('1. Cold load with a live match waits for DB init and freezes data-intro-mode to exactly one value (live-short)', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
    });
    const page = await context.newPage();

    // Load app once and seed sample data (which includes a live match MATCH-102)
    await page.goto('/');
    await page.getByTestId('intro-splash').click();
    const sampleBtn = page.getByTestId('welcome-sample-data-btn');
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();

    // Prepare cold start by clearing session flag and installing a 50ms sampler before navigation
    await page.evaluate(() => {
      window.sessionStorage.removeItem('crics_intro_shown_session');
    });

    await page.addInitScript(() => {
      const modes: string[] = [];
      (window as unknown as { __recordedIntroModes: string[] }).__recordedIntroModes = modes;
      const sample = () => {
        const el = document.querySelector('[data-testid="intro-splash"]');
        const mode = el?.getAttribute('data-intro-mode');
        if (mode) {
          modes.push(mode);
        }
      };
      window.setInterval(sample, 50);
      const obs = new MutationObserver(sample);
      obs.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-intro-mode'],
      });
    });

    const externalModes: string[] = [];
    const reloadPromise = page.reload();

    // Poll every 50ms during the cold load for 1200ms
    for (let elapsed = 0; elapsed <= 1200; elapsed += 50) {
      await page.waitForTimeout(50);
      const mode = await page
        .evaluate(() =>
          document.querySelector('[data-testid="intro-splash"]')?.getAttribute('data-intro-mode') ||
          null
        )
        .catch(() => null);
      if (mode) {
        externalModes.push(mode);
      }
    }
    await reloadPromise;

    const inPageModes = await page.evaluate(
      () => (window as unknown as { __recordedIntroModes: string[] }).__recordedIntroModes || []
    );
    const allRecordedModes = [...inPageModes, ...externalModes];

    expect(allRecordedModes.length).toBeGreaterThan(0);
    const distinctModes = Array.from(new Set(allRecordedModes));
    expect(distinctModes).toEqual(['live-short']);

    await context.close();
  });

  test('2. Handoff continuity: captures screenshots every 50 ms for the first 600 ms of a cold load at 360x640 and asserts the centre of every frame contains the CRICS logo', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
    });
    const page = await context.newPage();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const startMs = Date.now();
    const frameBuffers: { targetMs: number; buffer: Buffer }[] = [];

    for (let targetMs = 0; targetMs <= 600; targetMs += 50) {
      const nowElapsed = Date.now() - startMs;
      if (nowElapsed < targetMs) {
        await page.waitForTimeout(targetMs - nowElapsed);
      }
      const buffer = await page.screenshot();
      frameBuffers.push({ targetMs, buffer });
    }

    expect(frameBuffers.length).toBe(13);

    // Navy background #121A45 is RGB(18, 26, 69)
    const navyR = 18;
    const navyG = 26;
    const navyB = 69;

    for (const frame of frameBuffers) {
      const decoded = decodePngToRgba(frame.buffer);
      expect(decoded.width).toBe(360);
      expect(decoded.height).toBe(640);

      // Inspect the 40x40 centre region around (180, 320)
      let logoPixelCount = 0;
      for (let y = 300; y < 340; y++) {
        for (let x = 160; x < 200; x++) {
          const idx = (y * decoded.width + x) * 4;
          const r = decoded.rgba[idx + 0];
          const g = decoded.rgba[idx + 1];
          const b = decoded.rgba[idx + 2];
          const colorDiff = Math.abs(r - navyR) + Math.abs(g - navyG) + Math.abs(b - navyB);
          if (colorDiff > 60) {
            logoPixelCount += 1;
          }
        }
      }

      expect(
        logoPixelCount,
        `Frame at ${frame.targetMs}ms had only navy background at viewport centre (logoPixelCount=${logoPixelCount})`
      ).toBeGreaterThan(200);
    }

    await context.close();
  });

  test('3. Tournament groups in Hindi and Spanish UI display localized group labels and zero English "Group A" or "Group B" strings', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
    });
    const page = await context.newPage();

    await page.goto('/');
    await page.getByTestId('intro-splash').click();
    await page.getByTestId('welcome-sample-data-btn').click();
    await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible();

    // Navigate to Tournaments and create a Groups tournament
    await page.goto('/#/tournaments');
    await page.getByTestId('create-tournament-btn').click();
    await page.locator('#create-tour-name').fill('Stage 10 Group Cup');
    await page.locator('#create-tour-type').selectOption('Groups');
    await page.locator('button[type="submit"]').click();

    // Switch to Hindi and check Tournaments UI
    await page.goto('/#/settings');
    await page.locator('#settings-language-select').selectOption('hi');
    await page.goto('/#/tournaments');

    await expect(page.getByRole('button', { name: 'ग्रुप A' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ग्रुप B' })).toBeVisible();
    await page.getByRole('button', { name: 'ग्रुप A' }).click();

    const hiTourText = await page.locator('main').innerText();
    expect(hiTourText).toContain('ग्रुप A');
    expect(hiTourText).not.toContain('Group A');
    expect(hiTourText).not.toContain('Group B');

    // Switch to Spanish and check Tournaments UI
    await page.goto('/#/settings');
    await page.locator('#settings-language-select').selectOption('es');
    await page.goto('/#/tournaments');

    await expect(page.getByRole('button', { name: 'Grupo A' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Grupo B' })).toBeVisible();
    await page.getByRole('button', { name: 'Grupo B' }).click();

    const esTourText = await page.locator('main').innerText();
    expect(esTourText).toContain('Grupo B');
    expect(esTourText).not.toContain('Group A');
    expect(esTourText).not.toContain('Group B');

    await context.close();
  });
});
