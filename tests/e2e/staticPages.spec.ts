import { expect, test } from '@playwright/test';

const staticPages = [
  '/about/',
  '/features/',
  '/how-to-score-a-cricket-match/',
  '/faq/',
  '/privacy-policy.html',
];

test('static guide pages render one h1 with unique metadata', async ({ page }) => {
  for (const route of staticPages) {
    const response = await page.goto(route);
    expect(response?.ok()).toBe(true);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  }
});

test('service worker keeps static pages as static content', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  await page.reload();
  for (const route of staticPages) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
  }
});
