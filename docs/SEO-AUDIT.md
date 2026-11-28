# CRICS SEO and Hosting Audit

Audit date: 2026-11-28
Live origin: https://crics.lingadass.dev/
Hosting platform: Cloudflare Pages

## Live response headers

| Path | Status | Content-Type | Cache-Control | Content-Encoding | HSTS | CSP | X-Content-Type-Options | Referrer-Policy | Permissions-Policy |
|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 OK | text/html | public, max-age=0, must-revalidate | absent | absent | absent | absent | absent | absent |
| `/sw.js` | 200 OK | text/javascript | public, max-age=0, must-revalidate | absent | absent | absent | absent | absent | absent |
| `/manifest.webmanifest` | 200 OK | application/manifest+json | public, max-age=0, must-revalidate | absent | absent | absent | absent | absent | absent |
| `/robots.txt` | 200 OK | text/html | public, max-age=0, must-revalidate | absent | absent | absent | absent | absent | absent |
| `/sitemap.xml` | 200 OK | text/html | public, max-age=0, must-revalidate | absent | absent | absent | absent | absent | absent |
| `/privacy-policy.html` | 307 Temporary Redirect to `/privacy-policy` | absent | absent | absent | absent | absent | absent | absent | absent |
| `/.well-known/assetlinks.json` | 200 OK | application/json | public, max-age=0, must-revalidate | absent | absent | absent | absent | absent | absent |
| `/assets/index-5G1jgQxq.js` | 200 OK | text/javascript | public, max-age=0, must-revalidate | absent | absent | absent | absent | absent | absent |
| `/pwa-512x512.png` | 200 OK | image/png | public, max-age=0, must-revalidate | absent | absent | absent | absent | absent | absent |
| `/` over HTTP | 200 OK | text/html | public, max-age=0, must-revalidate | absent | absent | absent | absent | absent | absent |

## Findings

- Cloudflare Pages serves the site.
- HTTP does not redirect to HTTPS at the origin response observed; the HTTP request returned 200.
- `robots.txt` and `sitemap.xml` are currently returning `text/html`, indicating that those files are not deployed or are falling back to the app shell.
- No Strict-Transport-Security, CSP, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy response headers were present.
- `/privacy-policy.html` currently redirects with 307 to `/privacy-policy`.
- Static assets and the service worker use short cache headers rather than the required production cache policy.
- `curl.exe -sI` reported no explicit `Content-Encoding` header for the sampled responses.

## Cloudflare Pages deployment

- Deploy `dist` to the Cloudflare Pages project. The files `public/_headers` and `public/_redirects` are copied into `dist` by Vite.
- Verify the custom domain settings redirect apex and `www` traffic to `https://crics.lingadass.dev/`. The `_redirects` file provides origin-level 301 rules.
- Deploy the new headers. `Content-Security-Policy-Report-Only` is intentionally not enforcing: the browser will log violations without blocking the app.
- Inline `<style>` CSS is why `style-src 'unsafe-inline'` is required in report-only mode. `script-src` uses `'self'` plus the SHA-256 hash of the executable theme/intro inline script.
- Keep the asset fingerprint placeholder unresolved until Play Console provides the real SHA-256 signing fingerprint.
- Cloudflare normally serves Brotli-compressed responses for supported clients. Confirm this from live response headers or a browser request after deployment.

## Feature compatibility checks before enforcing CSP

- Camera access: `Permissions-Policy camera=(self)` and `img-src data: blob:` allow the pass scanner.
- Exports: PDF/image exports use Blob and data URLs. They require browser download support but do not require network CSP sources.
- Service worker: `worker-src 'self'` and the same-origin worker scope remain allowed.
- PDF preview: keep report-only mode until a browser console check confirms that generated Blob URLs and object rendering have no violations.
- Cross-origin opener policy: `same-origin` is enabled. It should not affect first-party, hash-routed app views or local exports; recheck scanner and PWA installation if issues appear.

## Lighthouse local audit

Local production preview: `http://127.0.0.1:4173/`

Chrome was available and the audits ran with `--headless=new --no-sandbox`.

The final full mobile run reported:

- Performance: 65
- Accessibility: 100
- Best Practices: 100
- SEO: 100
- LCP: 3.2 s
- CLS: 0
- TBT: 2450 ms

Earlier local full/mobile runs reported Performance 88 and 91 in the performance preset. Lighthouse results varied with machine load and are not a live-site measurement. The 65 final run exceeded the LCP target and TBT was high; it may be improved further by reviewing the unused JavaScript and network dependency findings, but host/network differences will affect the live result.

Live-site Lighthouse for `https://crics.lingadass.dev/` was not run because the deployment must be updated first.

## Bundle and precache sizes

- Initial measured precache: 2208.83 KiB across 43 entries.
- Final precache: 2216.08 KiB across 53 entries.
- Final `dist` total: 3,442,002 bytes.
- Final `dist/assets` total: 2,260,276 bytes.

New static files and key assets:

| File | Size |
|---|---:|
| `index.html` | 8,985 bytes |
| `og-image.jpg` | 52,765 bytes |
| `robots.txt` | 77 bytes |
| `sitemap.xml` | 678 bytes |
| `404.html` | 937 bytes |
| `about/index.html` | 3,140 bytes |
| `features/index.html` | 3,312 bytes |
| `faq/index.html` | 4,063 bytes |
| `how-to-score-a-cricket-match/index.html` | 3,629 bytes |
| `privacy-policy.html` | 3,446 bytes |
| `site.css` | 1,576 bytes |
| `sw.js` | 4,278 bytes |
| `workbox-2fbc6a65.js` | 15,026 bytes |
| `.well-known/security.txt` | 75 bytes |
