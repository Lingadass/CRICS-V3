# Packaging CRICS Cricket Scorer for Google Play Store (Trusted Web Activity / Bubblewrap)

CRICS Cricket Scorer is designed to be wrapped as a **Trusted Web Activity (TWA)** for publishing on the Google Play Store using `@bubblewrap/cli`.

## Prerequisites

1. **Hosted Production Build over HTTPS**:
   - Run `npm run check` (`npm run lint && npm run test && npm run build`) and deploy the `dist/` folder to any static HTTPS host (e.g., Firebase Hosting, Cloudflare Pages, Vercel, or Netlify).
2. **Java Development Kit (JDK 17+)** and **Android SDK Command-Line Tools** installed locally.
3. **Bubblewrap CLI**:
   ```bash
   npm install -g @bubblewrap/cli
   ```

---

## Replace Before Building Checklist

Before running `bubblewrap build` for Google Play release, replace these four placeholder values across `twa-manifest.json` and `public/.well-known/assetlinks.json`:

- [ ] **1. Host & Absolute URLs (`host`, `startUrl`, `iconUrl`, `maskableIconUrl`, `webManifestUrl`, `shortcuts`)**: Replace `TODO_REPLACE_WITH_PRODUCTION_DOMAIN.example.com` in `twa-manifest.json` with your real HTTPS production domain.
- [ ] **2. SHA-256 Certificate Fingerprint (`fingerprints` & `sha256_cert_fingerprints`)**: Replace `TODO_REPLACE_WITH_PLAY_CONSOLE_SHA256_CERT_FINGERPRINT_...` in both `public/.well-known/assetlinks.json` and `twa-manifest.json` with your Google Play App Signing SHA-256 certificate fingerprint.
- [ ] **3. Package Name (`packageId` & `package_name`)**: Confirm or replace `com.crics.offline.scorer` in both `twa-manifest.json` and `public/.well-known/assetlinks.json` so they match your registered Play Console application ID.
- [ ] **4. Signing Key (`signingKey.path` & `signingKey.alias`)**: Replace `./TODO_REPLACE_WITH_KEYSTORE_PATH.keystore` and `TODO_REPLACE_WITH_KEY_ALIAS` in `twa-manifest.json` with your local upload keystore path and key alias.

---

## Step-by-Step Packaging Guide

### 1. Initialize the Bubblewrap Project

Create a new directory for the Android wrapper and initialize from your deployed `manifest.webmanifest`:

```bash
mkdir crics-android-twa && cd crics-android-twa
bubblewrap init --manifest="https://your-production-domain.example.com/manifest.webmanifest"
```

When prompted:
- **Application ID**: `com.crics.offline.scorer`
- **Name**: `CRICS Cricket Scorer`
- **Launcher Name**: `CRICS`
- **Display Mode**: `standalone`
- **Orientation**: `any`
- **Signing Key**: Choose to generate a new keystore (`android.keystore`) and record your key alias and passwords securely.

### 2. Configure Digital Asset Links (`assetlinks.json`)

To run in full-screen standalone mode without the Chrome URL bar, extract your signing certificate's SHA-256 fingerprint (and once uploaded to Play Console, use the **Google Play App Signing certificate SHA-256 fingerprint** under **Setup > App signing**):

```bash
keytool -list -v -keystore ./android.keystore -alias android
```

Replace the `TODO_REPLACE_WITH_PLAY_CONSOLE_SHA256_CERT_FINGERPRINT_...` placeholder inside `public/.well-known/assetlinks.json` with your real SHA-256 fingerprint:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.crics.offline.scorer",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
      ]
    }
  }
]
```

> **Build-Time Safety Check**: `vite.config.ts` includes an automatic build-time check (`assetLinksPlaceholderWarningPlugin`) that emits a warning during `npm run build` if the placeholder fingerprint is still present in `public/.well-known/assetlinks.json`.

Redeploy your web app so `https://your-production-domain.example.com/.well-known/assetlinks.json` is publicly reachable with `Content-Type: application/json`.

### 3. Build the Signed APK and Android App Bundle (`.aab`)

```bash
bubblewrap build
```

This produces:
- `app-release-bundle.aab` — Upload this file to the **Google Play Console**.
- `app-release-signed.apk` — Install directly on an Android device via `adb install app-release-signed.apk` for offline testing.

### 4. Closed Testing Requirement for New Personal Developer Accounts (12 Testers / 14 Days)

If you are publishing from a **personal Google Play Developer account created after November 13, 2023**, Google Play enforces a mandatory closed-testing gate before you can apply for **Production** access:

- You must run a **Closed Test** track with at least **12 testers opted-in continuously for at least 14 days** (updated by Google Play from the earlier 20-tester requirement).
- Verify the current requirement and countdown status directly inside **Google Play Console > Dashboard** before submitting your Production access application.
- Organization developer accounts are exempt from the 12-tester closed-testing gate.

### 5. Offline Verification Checklist for Google Play Review

1. Launch the installed CRICS TWA once while connected to verify Digital Asset Links and precache the service worker.
2. Enable **Airplane Mode** on the Android device.
3. Force-close and reopen the CRICS app from the Android launcher.
4. Confirm that match creation, ball-by-ball scoring, scorecards, career stats, and JSON backup export work 100% offline.

### 6. Google Play Console Data Safety & Privacy Policy

- **Does your app collect or share any of the required user data types?** `No`
- **Offline Storage**: 100% of player profiles, photos, teams, matches, ball events, and tournaments remain on the user's device inside local IndexedDB (`CricsOfflineDB`).
- **Network Activity**: Zero runtime telemetry, analytics, ads, user accounts, or external server requests.
- **Privacy Policy Copies**:
  - In-app route: `#/privacy`
  - Static HTML page: `/privacy-policy.html`
  - Plain-text copy in repository root: `PRIVACY_POLICY.txt`
