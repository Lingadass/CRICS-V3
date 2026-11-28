import fs from 'node:fs';
import { defineConfig } from '@playwright/test';

const preinstalledShell =
  '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';
const chromeWin = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const executablePath = fs.existsSync(preinstalledShell)
  ? preinstalledShell
  : fs.existsSync(chromeWin)
    ? chromeWin
    : undefined;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: process.platform === 'win32' ? './node_modules/.playwright-results' : '/tmp/playwright-test-results',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    launchOptions: executablePath
      ? { executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
      : { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
  },
  webServer: {
    command: 'node ./node_modules/vite/bin/vite.js preview --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 15000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
