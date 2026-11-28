# CRICS — 100% Offline Event-Sourced Cricket Scoring PWA

CRICS is a complete, production-grade, 100% offline Progressive Web App (PWA) for cricket scoring, player registration, squad management, career analytics, tournaments, leaderboards, and portable JSON backup/restore.

## Architecture Highlights

1. **Event-Sourced Scoring Engine (`src/engine/scoringEngine.ts`)**:
   - Every delivery or field action is stored as an immutable `BallEvent`.
   - Scoreboards, batting/bowling cards, partnerships, fall of wickets, Manhattan/Worm charts, career stats, head-to-head matchups, and tournament Net Run Rate (NRR) standings are **derived 100% from events**—no derived totals are stored as the source of truth.
   - Pure TypeScript module with zero UI or database imports, verified by unit tests (`src/engine/scoringEngine.test.ts`).

2. **Atomic Offline Storage (`src/db/database.ts`)**:
   - Powered by **Dexie.js (IndexedDB)**.
   - Every ball write executes inside an atomic IndexedDB transaction (`recordBallEventAtomic`). If a phone loses power mid-over, reopening the app resumes the match at the exact last ball.
   - Requests persistent storage via `navigator.storage.persist()` on first launch and displays storage telemetry in **Backup & Settings**.

3. **100% Offline Service Worker (`vite.config.ts`)**:
   - Built with `vite-plugin-pwa` (Workbox) precaching all application shell assets.
   - Configured with `registerType: 'prompt'` and live-match gating in `src/App.tsx` so app update prompts **never interrupt a live match**.

---

## Setup, Development & Testing

```bash
# 1. Clean deterministic install
npm ci

# 2. Fast verification (ESLint + TypeScript + Vitest suites + Vite PWA production build)
npm run check

# 3. Full verification including Playwright rendered E2E & Axe checks
npm run check:all

# 4. Run Vitest unit & offline integration tests
npm test

# 5. Start local development server (port 3000)
npm run dev
```

---

## Backup & Restore Instructions

1. Open **Backup & Settings** in the navigation bar.
2. Tap **Export Everything to JSON** to download a single `.json` file containing all players, photos, teams, matches, ball-by-ball events, tournaments, and preferences.
3. To restore or migrate to a new device, tap **Import JSON Backup**, select your `.json` file, review the record count preview, choose **Merge** or **Replace**, and confirm.
