# Resume Notes — Crunchbase Scraper (PARKED)

## Status
Build is fixed, compiles, runs, and is **safe** (guard never saves/charges for blocked, gated, or error pages). Pricing configured: `company-scraped` @ $5.00/1000. On GitHub and pushed to Apify. **Not earning** — Cloudflare blocks it.

## What works
- Compiles clean; `actor.json` pricing valid (PAY_PER_EVENT `company-scraped`).
- Input schema fixed (was `type:actor` with invalid `oneOf`/`groups`).
- Charge guard: only bills when real company data (name + description/website/funding) is extracted.
- Session warm-up (homepage → org page) is implemented as a Cloudflare-bypass attempt.

## What's blocking (where it stopped)
- **Cloudflare returns 403** on every request — bare IP, residential US proxy, AND warmed session all 403. Even `crunchbase.com` homepage 403s, so no `cf_clearance` cookie is ever issued.
- Separately, Crunchbase's funding/investor data is largely **Crunchbase Pro login-gated**, so even past Cloudflare the headline data may be limited.

## What it needs next (turnkey resume)
1. A **paid Cloudflare unblocker** — e.g. Apify's anti-blocking/“super” proxy, or a Turnstile-solving service (ScrapingBee / ZenRows / ScraperAPI style). Route requests through it instead of plain Playwright.
2. OR the **official Crunchbase API** with a key (clean JSON, no Cloudflare) — changes the model but is the reliable path for funding data.
3. Once a request gets through, parse the embedded `window.__APP_STATE__` / `<script>` JSON (more reliable than the `data-test-id` DOM selectors currently in routes.ts).

## Test command
```bash
apify push
# then run: { "companyNames": ["OpenAI"], "maxResults": 1, "proxyConfiguration": { "useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"], "apifyProxyCountry": "US" } }
```
Watch for: no 403, and `Successfully scraped: OpenAI` with populated fields.
