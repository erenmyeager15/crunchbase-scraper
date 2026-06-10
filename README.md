# Crunchbase Scraper — Extract Startup & Funding Data

Extract comprehensive company and funding data from Crunchbase.com. Get detailed profiles including funding rounds, investors, company metrics, and more — all without writing code.

## What This Actor Does

This Apify Actor scrapes publicly available Crunchbase company profiles and extracts rich data points for each organization. Provide company URLs, company names, or search by industry/location/funding stage to collect structured intelligence on thousands of companies.

### Key Features

- **Multiple input modes**: Direct Crunchbase URLs, company name lookup, or industry/location search
- **28 data fields per company**: Name, funding, investors, founders, socials, and more
- **Anti-bot protection**: Residential proxy rotation, session pooling, random delays
- **Pay-per-event pricing**: Only pay $0.005 per company successfully scraped
- **Batch processing**: Scrape hundreds of companies in a single run
- **Deduplication**: Automatic deduplication by Crunchbase URL
- **Resilient**: 3 retries per request, null fallbacks for missing data

## Use Cases

1. **Investor Research** — Analyze portfolio companies, funding patterns, and investor activity across industries
2. **Competitor Intelligence** — Map competitor landscapes, track funding rounds, and benchmark company growth
3. **Market Mapping** — Discover companies in specific industries, locations, or funding stages for market analysis
4. **Due Diligence** — Gather company data for investment decisions, partnerships, or acquisitions
5. **Sales Prospecting** — Build targeted lead lists of companies matching your ideal customer profile

## Input Examples

### Direct Company Names
```json
{
  "companyNames": ["OpenAI", "Anthropic", "Stripe"],
  "maxResults": 100
}
```

### Industry Search with Filters
```json
{
  "searchIndustry": "Artificial Intelligence",
  "searchLocation": "San Francisco",
  "searchFundingStage": "series_a",
  "maxResults": 50
}
```

### Direct URLs
```json
{
  "companyUrls": [
    "https://www.crunchbase.com/organization/openai",
    "https://www.crunchbase.com/organization/anthropic"
  ]
}
```

## Output Schema

Each company record contains 28 fields:

```json
{
  "companyName": "OpenAI",
  "crunchbaseUrl": "https://www.crunchbase.com/organization/openai",
  "website": "https://openai.com",
  "description": "OpenAI is an AI research and deployment company...",
  "foundedDate": "2015-12-11",
  "HQCity": "San Francisco",
  "HQCountry": "United States",
  "companyType": "Company",
  "operatingStatus": "Active",
  "employeeCountRange": "201-500",
  "totalFundingAmount": "$13.5B",
  "numberOfFundingRounds": 8,
  "lastFundingDate": "2024-01-01",
  "lastFundingType": "Series B",
  "lastFundingAmount": "$6.6B",
  "leadInvestorsLastRound": ["Microsoft"],
  "allInvestorsList": ["Microsoft", "Khosla Ventures", "Reid Hoffman"],
  "acquirer": null,
  "acquisitionDate": null,
  "IPODate": null,
  "stockSymbol": null,
  "industriesList": ["Artificial Intelligence", "Machine Learning"],
  "foundersList": ["Sam Altman", "Elon Musk"],
  "companyLogoUrl": "https://example.com/logo.png",
  "linkedInUrl": "https://linkedin.com/company/openai",
  "twitterUrl": "https://twitter.com/openai",
  "facebookUrl": null,
  "scrapedTimestamp": "2026-06-09T10:00:00.000Z"
}
```

## Pricing

| Item | Price |
|------|-------|
| Per company scraped | $0.005 |
| Minimum charge | $0.005 |

The pay-per-event (PPE) model means you only pay for successfully scraped companies. No hidden fees.

## Limitations & Notes

- This actor scrapes **publicly visible data only** — no login required
- Crunchbase may rate-limit or block requests; residential proxies are strongly recommended
- Some data fields may be null if Crunchbase does not expose that data for a given company
- Maximum recommended batch size: 500 companies per run
- Use `maxResults` to limit scope for search-mode scraping

## Running the Actor

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run locally with Apify CLI
apify call -i input.json
```

## License

Apache-2.0
