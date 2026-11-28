import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { checkAssetLinksPlaceholder } from './src/utils/pwaUtils.ts';

function assetLinksPlaceholderWarningPlugin(): Plugin {
  return {
    name: 'crics-assetlinks-placeholder-warning',
    apply: 'build',
    buildStart() {
      const assetLinksPath = path.resolve(
        import.meta.dirname,
        'public/.well-known/assetlinks.json'
      );
      if (fs.existsSync(assetLinksPath)) {
        const raw = fs.readFileSync(assetLinksPath, 'utf8');
        const check = checkAssetLinksPlaceholder(raw);
        if (check.hasPlaceholder && check.warningMessage) {
          console.warn(check.warningMessage);
        }
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      assetLinksPlaceholderWarningPlugin(),
      VitePWA({
        // Prompt mode ensures updates NEVER automatically reload during a live match
        registerType: 'prompt',
        // Precached public assets (intro-crics.webp, intro-esz.png, logo-128.png, logo-256.png, favicon.ico, icon.svg, apple-touch-icon.png, privacy-policy.html, .well-known/assetlinks.json; pwa-192x192.png, pwa-512x512.png, pwa-maskable-512x512.png, screenshot-home.png, screenshot-live.png, screenshot-scorecard.png, screenshot-tournament.png are automatically precached via manifest)
        includeAssets: [
          'intro-crics.webp',
          'intro-esz.png',
          'logo-128.png',
          'logo-256.png',
          'favicon.ico',
          'icon.svg',
          'apple-touch-icon.png',
          'privacy-policy.html',
          '404.html',
          'robots.txt',
          'sitemap.xml',
          'about/index.html',
          'features/index.html',
          'how-to-score-a-cricket-match/index.html',
          'faq/index.html',
          'site.css',
          'og-image.jpg',
          '.well-known/security.txt',
          '.well-known/assetlinks.json',
        ],
        manifest: {
          id: '/',
          name: 'CRICS Cricket Scorer',
          short_name: 'CRICS',
          description:
            '100% offline cricket scoring, player registry, career stats, and tournament manager.',
          theme_color: '#2C47D6',
          background_color: '#121A45',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          categories: ['sports', 'utilities', 'productivity'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: '/screenshot-home.png',
              sizes: '1080x1920',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Home Dashboard, Recent Matches, and Guided Setup',
            },
            {
              src: '/screenshot-live.png',
              sizes: '1080x1920',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Live Ball-by-Ball Cricket Scorer',
            },
            {
              src: '/screenshot-scorecard.png',
              sizes: '1080x1920',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Full Match Scorecards and Career Analytics',
            },
            {
              src: '/screenshot-tournament.png',
              sizes: '1080x1920',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Tournament Standings, NRR, and Knockout Brackets',
            },
          ],
          shortcuts: [
            {
              name: 'New Match Wizard',
              short_name: 'New Match',
              description: 'Configure teams, playing XI, toss, and rules',
              url: '/#/wizard',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Live Scorer',
              short_name: 'Live Scorer',
              description: 'Resume ball-by-ball cricket scoring',
              url: '/#/live',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Match Scorecards',
              short_name: 'Scorecards',
              description: 'View batting, bowling, and partnership cards',
              url: '/#/scorecards',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          // Public webp/png/ico/svg assets are registered once via includeAssets + manifest
          globPatterns: ['**/*.{js,css,html,woff,woff2}'],
          globIgnores: [
            '**/assets/aistudio/**',
            '**/intro-esz.webp',
            'privacy-policy.html',
            '404.html',
            'about/index.html',
            'features/index.html',
            'how-to-score-a-cricket-match/index.html',
            'faq/index.html',
            'site.css',
          ],
          cleanupOutdatedCaches: true,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [
            /^\/privacy-policy\.html$/,
            /^\/about\/?$/,
            /^\/features\/?$/,
            /^\/how-to-score-a-cricket-match\/?$/,
            /^\/faq\/?$/,
            /^\/404\.html$/,
            /^\/robots\.txt$/,
            /^\/sitemap\.xml$/,
            /^\/\.well-known\//,
          ],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      }),
    ],
    build: {
      chunkSizeWarningLimit: 800,
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
