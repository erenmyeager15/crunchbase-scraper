# Resume Notes - Crunchbase Scraper

## Status

Fixed by adding a reliable API-first path and making browser mode explicit:

- `dataSource: "auto"` uses Crunchbase API mode when `crunchbaseApiKey` is supplied.
- `dataSource: "api"` requires `crunchbaseApiKey` and avoids Cloudflare entirely.
- `dataSource: "browser"` keeps the existing Playwright scraper, now with optional `crunchbaseCookies`.
- Browser mode remains guarded: it never saves or charges for blocked, gated, or empty pages.

## Why this was needed

The previous browser-only actor was blocked by Cloudflare before any Crunchbase page could render. Residential proxy and session warm-up were not enough. Crunchbase funding data is also partly plan/API gated, so the official API is the correct production path.

## What works now

- Official API key input: `crunchbaseApiKey` (secret)
- Browser cookie input: `crunchbaseCookies` (secret)
- API company resolution from direct URLs and company names
- Existing output shape retained
- PAY_PER_EVENT `company-scraped` @ `$0.005`
- Charge only after `Actor.pushData(record)` succeeds

## Remaining risk

- API field availability depends on the user's Crunchbase API plan and permissions.
- Browser mode can still fail on Cloudflare if cookies/proxy are weak or expired.
- Search filters in API mode are best-effort text search; direct URLs or company names are the most reliable inputs.

## Recommended Apify test

```json
{
  "dataSource": "api",
  "crunchbaseApiKey": "YOUR_KEY",
  "companyNames": ["OpenAI"],
  "maxResults": 1
}
```

Expected: one valid company record saved, then one `company-scraped` event charged.
