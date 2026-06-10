import { PlaywrightCrawler, log } from 'crawlee';
import { Actor } from 'apify';
import { ActorInput } from './types.js';
import { COMPANY_ROUTES, RouteHandlerContext } from './routes.js';

const MAX_SESSION_USES = 15;
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;
const MAX_RETRIES = 3;

function buildSearchUrl(input: {
  searchIndustry: string;
  searchLocation: string;
  searchFundingStage: string;
}): string | null {
  const { searchIndustry, searchLocation, searchFundingStage } = input;
  if (searchIndustry) {
    const locationParam = searchLocation ? `&location=${encodeURIComponent(searchLocation)}` : '';
    const fundingParam = searchFundingStage ? `&funding_stage=${encodeURIComponent(searchFundingStage)}` : '';
    return `https://www.crunchbase.com/discover/organizations/${encodeURIComponent(searchIndustry)}?page=1${locationParam}${fundingParam}`;
  }
  if (searchLocation || searchFundingStage) {
    const params = new URLSearchParams();
    if (searchLocation) params.set('location', searchLocation);
    if (searchFundingStage) params.set('funding_stage', searchFundingStage);
    return `https://www.crunchbase.com/discover/organizations?${params.toString()}&page=1`;
  }
  return null;
}

function buildStartUrls(input: ActorInput): { url: string; userData: { label: string; searchTerm?: string } }[] {
  const { companyUrls = [], companyNames = [], searchIndustry, searchLocation, searchFundingStage } = input;
  const urls: { url: string; userData: { label: string; searchTerm?: string } }[] = [];

  for (const raw of companyUrls) {
    const url = raw?.trim();
    if (!url) continue;
    if (url.includes('crunchbase.com/organization/')) {
      urls.push({
        url: url.startsWith('http') ? url : `https://${url}`,
        userData: { label: 'companyProfile' },
      });
    }
  }

  for (const name of companyNames) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (slug) {
      urls.push({
        url: `https://www.crunchbase.com/organization/${slug}`,
        userData: { label: 'companyProfile', searchTerm: name },
      });
    }
  }

  const searchUrl = buildSearchUrl({ searchIndustry, searchLocation, searchFundingStage });
  if (searchUrl) {
    urls.push({
      url: searchUrl,
      userData: { label: 'searchResults', searchTerm: searchIndustry || searchLocation || searchFundingStage },
    });
  }

  return urls;
}

Actor.main(async () => {
  const input = (await Actor.getInput()) as ActorInput | undefined;

  if (!input) {
    throw new Error('INPUT_REQUIRED: Provide companyUrls, companyNames, or search parameters.');
  }

  const { maxResults = 100, proxyConfiguration } = input;
  const startUrls = buildStartUrls(input);

  if (startUrls.length === 0) {
    throw new Error('NO_INPUT: Supply companyUrls, companyNames, or searchIndustry/searchLocation/searchFundingStage.');
  }

  let proxy;
  if (proxyConfiguration?.useApifyProxy) {
    proxy = await Actor.createProxyConfiguration({
      groups: proxyConfiguration.apifyProxyGroups?.length > 0 ? proxyConfiguration.apifyProxyGroups : ['RESIDENTIAL'],
      countryCode: proxyConfiguration.apifyProxyCountry || 'US',
    });
  }

  const sessionPoolOptions = {
    maxPoolSize: 50,
    sessionOptions: {
      maxUsageCount: MAX_SESSION_USES,
    },
  };

  const crawler = new PlaywrightCrawler({
    proxyConfiguration: proxy,
    useSessionPool: true,
    sessionPoolOptions,
    maxConcurrency: 5,
    maxRequestRetries: MAX_RETRIES,
    requestHandlerTimeoutSecs: 60,

    postNavigationHooks: [
      async ({ page, request, log }) => {
        const jitter = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS) + MIN_DELAY_MS);
        await page.waitForTimeout(jitter);

        if (request.userData.label !== 'searchResults') return;

        try {
          const nextButton = await page.$('a[aria-label="Next"], button[aria-label="Next page"]');
          const nextLink = nextButton ? await nextButton.getAttribute('href') : null;
          if (nextLink) {
            const full = nextLink.startsWith('http') ? nextLink : `https://www.crunchbase.com${nextLink}`;
            await crawler.addRequests([{
              url: full,
              userData: {
                label: 'searchResults',
                searchTerm: request.userData.searchTerm,
              },
            }]);
          }
        } catch (err) {
          log.debug(`Pagination check failed: ${(err as Error).message}`);
        }
      },
    ],

    async requestHandler(crawlingContext) {
      const { page, request, log, session } = crawlingContext;
      const { label } = request.userData;
      const handler = COMPANY_ROUTES[label];

      if (!handler) {
        log.warning(`No handler for label "${label}" — skipping ${request.url}`);
        return;
      }

      try {
        await page.setViewportSize({ width: 1920, height: 1080 });
      } catch { /* viewport may already be set */ }

      const title = await page.title();
      if (/access denied|blocked|403|forbidden/i.test(title)) {
        log.warning(`Blocked on ${request.url} — retiring session.`);
        session?.retire();
        throw new Error(`BLOCKED: ${request.url}`);
      }

      const ctx: RouteHandlerContext = {
        page: page as any,
        request: request as any,
        log: log as any,
        session,
        crawler,
      };

      await handler(ctx);
    },

    async failedRequestHandler({ request, log }, error) {
      log.error(`FAILED after ${MAX_RETRIES} retries: ${request.url} — ${(error as Error).message}`);
    },
  });

  await crawler.run(startUrls);

  log.info('Actor finished successfully.');
  await Actor.exit();
});
