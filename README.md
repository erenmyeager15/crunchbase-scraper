# Crunchbase Scraper - Company & Funding Data

Extract Crunchbase company profile and funding data with an API-first workflow. Supply an official Crunchbase API key for reliable structured data, or use guarded browser scraping with optional Crunchbase cookies for public pages.

## What This Actor Does

This Apify Actor collects structured company intelligence from Crunchbase:

- Company name, website, description, logo, and social links
- Headquarters, employee range, company type, and operating status
- Funding totals, number of funding rounds, last funding date/type/amount
- Industries, acquisition, IPO, and stock symbol fields when available

## Data Sources

### Crunchbase API mode

Recommended. Add `crunchbaseApiKey` and set `dataSource` to `auto` or `api`.

API mode avoids Crunchbase's Cloudflare browser wall and reads structured JSON from the official Crunchbase API. It is the reliable path for funding data.

### Browser mode

Fallback only. Set `dataSource` to `browser`.

Crunchbase is aggressively protected by Cloudflare, so browser mode may be blocked without a valid session and strong proxy. You can provide `crunchbaseCookies` from your own Crunchbase browser session to improve the chance of public profile extraction. The actor keeps a strict guard and will not save or charge for blocked, gated, or empty pages.

## Input

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `dataSource` | `string` | `auto`, `api`, or `browser` | `auto` |
| `crunchbaseApiKey` | `string` | Optional official Crunchbase API key. Secret input. | empty |
| `crunchbaseCookies` | `string` | Optional Cookie header or JSON cookie array for browser mode. Secret input. | empty |
| `companyUrls` | `string[]` | Direct Crunchbase organization URLs | `[]` |
| `companyNames` | `string[]` | Company names to resolve and scrape | `["OpenAI"]` |
| `searchIndustry` | `string` | Search text for API/browser discovery | empty |
| `searchLocation` | `string` | Optional location search text | empty |
| `searchFundingStage` | `string` | Optional funding-stage filter | empty |
| `maxResults` | `integer` | Maximum records to save | `10` |
| `proxyConfiguration` | `object` | Proxy settings for browser mode | Apify Residential |

## Example Inputs

### API mode

```json
{
  "dataSource": "api",
  "crunchbaseApiKey": "YOUR_CRUNCHBASE_API_KEY",
  "companyNames": ["OpenAI", "Anthropic"],
  "maxResults": 2
}
```

### Browser mode with cookies

```json
{
  "dataSource": "browser",
  "companyUrls": ["https://www.crunchbase.com/organization/openai"],
  "crunchbaseCookies": "name=value; name2=value2",
  "maxResults": 1,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"],
    "apifyProxyCountry": "US"
  }
}
```

## Output

```json
{
  "companyName": "OpenAI",
  "crunchbaseUrl": "https://www.crunchbase.com/organization/openai",
  "website": "https://openai.com",
  "description": "OpenAI is an AI research and deployment company.",
  "foundedDate": "2015-12-11",
  "HQCity": "San Francisco",
  "HQCountry": "United States",
  "companyType": "Company",
  "operatingStatus": "Active",
  "employeeCountRange": "1001-5000",
  "totalFundingAmount": "$11,300,000,000",
  "numberOfFundingRounds": 11,
  "lastFundingDate": "2024-10-02",
  "lastFundingType": "Venture",
  "lastFundingAmount": "$6,600,000,000",
  "leadInvestorsLastRound": [],
  "allInvestorsList": [],
  "acquirer": null,
  "acquisitionDate": null,
  "IPODate": null,
  "stockSymbol": null,
  "industriesList": ["Artificial Intelligence", "Machine Learning"],
  "companyLogoUrl": "https://...",
  "linkedInUrl": "https://www.linkedin.com/company/openai",
  "twitterUrl": "https://twitter.com/openai",
  "facebookUrl": null,
  "scrapedTimestamp": "2026-06-11T10:00:00.000Z"
}
```

## Pricing

| Event | Price |
|------|-------|
| Per company scraped | `$0.005` |

The actor charges only after a valid company record is saved. Blocked, gated, empty, and failed pages are not charged.

## Notes

- Use the official Crunchbase API key for production.
- Browser mode is best-effort because Crunchbase Cloudflare can block even residential proxies.
- Some funding and investor fields may require Crunchbase API permissions or a paid Crunchbase plan.

## Responsible Use

This Actor is intended for lawful collection of publicly available information only. Users are responsible for ensuring their use complies with the source website's terms, robots.txt, applicable privacy laws, including India's DPDP Act, and all local regulations.

Do not use this Actor to collect, store, sell, or misuse personal data without a lawful basis. The Actor author is not responsible for misuse by end users.

## License

Apache-2.0
