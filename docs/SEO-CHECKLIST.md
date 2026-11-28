# CRICS SEO Owner Checklist

## Search ownership and indexing

- [ ] Verify `lingadass.dev` as a domain property in Google Search Console using a DNS TXT record.
- [ ] Submit `https://crics.lingadass.dev/sitemap.xml` in Google Search Console.
- [ ] Inspect `https://crics.lingadass.dev/` and request indexing after deployment.
- [ ] Request indexing for `/about/`, `/features/`, `/how-to-score-a-cricket-match/`, `/faq/` and `/privacy-policy.html` if they need separate discovery.
- [ ] Monitor the Core Web Vitals report for real field data rather than relying only on local Lighthouse.
- [ ] In Bing Webmaster Tools, import ownership and sitemap data from Google Search Console.
- [ ] Submit the sitemap directly in Bing if the import does not include it.

## Structured data and previews

- [ ] Test `https://crics.lingadass.dev/` in Google's Rich Results Test.
- [ ] Test the FAQ page in Google's Rich Results Test.
- [ ] Send the CRICS link to yourself on WhatsApp and confirm the title, description and 1200 x 630 image preview.
- [ ] Test the URL in Facebook Sharing Debugger and refresh the cached preview if necessary.
- [ ] Test Telegram and LinkedIn previews if those channels are used.
- [ ] Recheck social previews after changing titles, descriptions or `og-image.jpg`.

## Public listings and profiles

- [ ] Put `https://crics.lingadass.dev/` in the Google Play listing.
- [ ] Put the site URL in the GitHub repository description and README.
- [ ] Put the site URL on the eSportZignal website.
- [ ] Put the site URL in the official eSportZignal Instagram and YouTube profiles.
- [ ] Keep the application name, contact email and publisher information consistent across listings.

## Honest backlink opportunities

- Add links to relevant cricket clubs, local cricket communities and sports-tech directories only where CRICS is appropriate.
- Share the scoring guide and feature page with cricket tournament organizers.
- Ask official clubs to link to the guide or app because they use or refer to it.
- Publish factual changelog or support posts instead of buying links or repeating exaggerated claims.
- Do not use "best", "number one", fake ratings or invented testimonials.

## Privacy and analytics

- [ ] Confirm no analytics, trackers or third-party runtime scripts are added.
- [ ] Keep the privacy policy promise aligned with actual network behavior.
- [ ] Recheck Service Worker update behavior after deploy.
- [ ] Audit browser console output with CSP report-only mode before enforcing CSP.
- [ ] Do not enable CSP reporting to a third-party endpoint.

## Deployment follow-up

- [ ] Deploy `dist` with `_headers` and `_redirects`.
- [ ] Confirm HTTP redirects to HTTPS with a 301.
- [ ] Confirm `www` redirects to `crics.lingadass.dev` with a 301.
- [ ] Replace the assetlinks placeholder fingerprint with the Google Play App Signing SHA-256 certificate.
- [ ] Run `npm run seo:headers -- https://crics.lingadass.dev/` after deployment.
- [ ] Run Lighthouse against the live URL after deployment.
- [ ] Confirm Brotli or gzip compression is visible in live response headers.
