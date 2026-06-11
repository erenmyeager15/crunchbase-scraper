import { PlaywrightCrawler } from 'crawlee';
import { makeDefaultRecord } from './types.js';
import { Actor } from 'apify';

export interface RouteHandlerContext {
  page: import('playwright').Page;
  request: import('crawlee').Request;
  log: import('crawlee').Log;
  session?: import('crawlee').Session;
  crawler: PlaywrightCrawler;
}

export const COMPANY_ROUTES: Record<string, (ctx: RouteHandlerContext) => Promise<void>> = {
  'companyProfile': async ({ page, request, log, session }) => {
    const url = request.url;
    log.info(`Scraping company profile: ${url}`);

    try {
      await page.waitForSelector('[data-test-id="profile-section"]', { timeout: 15000 });
    } catch {
      try {
        await page.waitForSelector('h1', { timeout: 10000 });
      } catch {
        log.warning(`Could not find profile section for ${url}, attempting extraction anyway.`);
      }
    }

    const record = makeDefaultRecord(url);

    try {
      record.companyName = await page.evaluate(() => {
        const el = document.querySelector('h1.profile-name, [data-test-id="profile-name"], h1');
        return el?.textContent?.trim() || null;
      });

      record.website = await page.evaluate(() => {
        const el = document.querySelector('a[data-test-id="website-link"], a[href^="http"]:not([href*="crunchbase"])');
        return el?.getAttribute('href') || null;
      });

      record.description = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="description"], .description, p.short-description');
        return el?.textContent?.trim() || null;
      });

      record.foundedDate = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="founded-date"], [aria-label="Founded Date"]');
        return el?.textContent?.trim() || null;
      });

      const hqText = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="headquarters-location"], [aria-label="Headquarters Location"]');
        return el?.textContent?.trim() || null;
      });
      if (hqText) {
        const parts = hqText.split(',').map((p: string) => p.trim());
        record.HQCity = parts[0] || null;
        record.HQCountry = parts.length > 1 ? parts[parts.length - 1] : null;
      }

      record.companyType = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="company-type"], [aria-label="Company Type"], [aria-label="Organization Type"]');
        return el?.textContent?.trim() || null;
      });

      record.operatingStatus = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="operating-status"], [aria-label="Operating Status"]');
        return el?.textContent?.trim() || null;
      });

      record.employeeCountRange = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="number-of-employees"], [aria-label="Number of Employees"]');
        return el?.textContent?.trim() || null;
      });

      record.totalFundingAmount = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="total-funding"], [aria-label="Total Funding Amount"], [aria-label="Total Raised"]');
        return el?.textContent?.trim() || null;
      });

      record.numberOfFundingRounds = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="funding-rounds"], [aria-label="Number of Funding Rounds"]');
        const text = el?.textContent || '0';
        const match = text.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      });

      record.lastFundingDate = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="last-funding-date"], [aria-label="Last Funding Date"]');
        return el?.textContent?.trim() || null;
      });

      record.lastFundingType = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="last-funding-type"], [aria-label="Last Funding Type"], [aria-label="Funding Stage"]');
        return el?.textContent?.trim() || null;
      });

      record.lastFundingAmount = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="last-funding-amount"], [aria-label="Last Funding Amount"]');
        return el?.textContent?.trim() || null;
      });

      record.leadInvestorsLastRound = await page.evaluate(() => {
        const els = document.querySelectorAll('[data-test-id="lead-investor"] a, [aria-label="Lead Investors"] a');
        return Array.from(els).map((el: Element) => el.textContent?.trim()).filter(Boolean) as string[];
      });

      record.allInvestorsList = await page.evaluate(() => {
        const els = document.querySelectorAll('[data-test-id="investor-name"] a, [aria-label="Investors"] a');
        return Array.from(els).map((el: Element) => el.textContent?.trim()).filter(Boolean) as string[];
      });

      record.acquirer = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="acquirer"], [aria-label="Acquirer"]');
        return el?.textContent?.trim() || null;
      });

      record.acquisitionDate = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="acquisition-date"], [aria-label="Acquisition Date"]');
        return el?.textContent?.trim() || null;
      });

      record.IPODate = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="ipo-date"], [aria-label="IPO Date"], [aria-label="IPO"]');
        return el?.textContent?.trim() || null;
      });

      record.stockSymbol = await page.evaluate(() => {
        const el = document.querySelector('[data-test-id="stock-symbol"], [aria-label="Stock Symbol"], [aria-label="Ticker Symbol"]');
        return el?.textContent?.trim() || null;
      });

      record.industriesList = await page.evaluate(() => {
        const els = document.querySelectorAll('[data-test-id="industry"] a, [aria-label="Industries"] a, [aria-label="Categories"] a');
        return Array.from(els).map((el: Element) => el.textContent?.trim()).filter(Boolean) as string[];
      });

      record.foundersList = await page.evaluate(() => {
        const els = document.querySelectorAll('[data-test-id="founder-name"] a, [aria-label="Founders"] a');
        return Array.from(els).map((el: Element) => el.textContent?.trim()).filter(Boolean) as string[];
      });

      record.companyLogoUrl = await page.evaluate(() => {
        const el = document.querySelector('img[data-test-id="profile-image"], .profile-logo img, img[alt*="logo"]');
        return el?.getAttribute('src') || null;
      });

      record.linkedInUrl = await page.evaluate(() => {
        const el = document.querySelector('a[href*="linkedin.com/company"]');
        const href = el?.getAttribute('href');
        return href || null;
      });

      record.twitterUrl = await page.evaluate(() => {
        const el = document.querySelector('a[href*="twitter.com/"], a[href*="x.com/"]');
        const href = el?.getAttribute('href');
        return href || null;
      });

      record.facebookUrl = await page.evaluate(() => {
        const el = document.querySelector('a[href*="facebook.com/"]');
        const href = el?.getAttribute('href');
        return href || null;
      });

      const BLOCK_RE = /^\s*(50\d|4\d\d|bad gateway|access denied|just a moment|attention required|forbidden|error|not found|page not found)\b/i;
      const hasValidData = !!record.companyName
        && !BLOCK_RE.test(record.companyName)
        && (record.description !== null || record.website !== null || record.totalFundingAmount !== null || record.foundedDate !== null);

      if (!hasValidData) {
        log.warning(`No valid company data for ${url} (blocked, gated, or not found: "${record.companyName ?? 'null'}"). Not saving or charging.`);
        return;
      }

      await Actor.pushData(record);
      await Actor.charge({ eventName: 'company-scraped' });

      log.info(`Successfully scraped: ${record.companyName || url}`);
    } catch (error) {
      log.error(`Error scraping ${url}: ${(error as Error).message}`);
    }
  },

  'searchResults': async ({ page, request, log, crawler, session }) => {
    const searchTerm = request.userData.searchTerm;
    const maxResults = typeof request.userData.maxResults === 'number' ? request.userData.maxResults : 10;

    log.info(`Processing search results for: ${searchTerm}`);

    try {
      await page.waitForSelector('[class*="results"]', { timeout: 15000 });
    } catch {
      log.warning('Search results page did not load properly.');
    }

    const links = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a[href*="/organization/"]');
      return Array.from(anchors)
        .map((a: Element) => a.getAttribute('href'))
        .filter((href): href is string => Boolean(href))
        .map((href) => href.startsWith('http') ? href : `https://www.crunchbase.com${href}`);
    });

    const uniqueLinks = [...new Set(links)];
    log.info(`Found ${uniqueLinks.length} company links from search.`);

    for (const link of uniqueLinks.slice(0, maxResults)) {
      await crawler.addRequests([{
        url: link,
        userData: { label: 'companyProfile' },
      }]);
    }
  },
};
