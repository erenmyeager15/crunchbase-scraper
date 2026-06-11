import { PlaywrightCrawler, log } from 'crawlee';
import { Actor } from 'apify';
import { ActorInput } from './types.js';
import { COMPANY_ROUTES, RouteHandlerContext } from './routes.js';
import { runCrunchbaseApiMode } from './api.js';

const MAX_SESSION_USES = 15;
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;
const MAX_RETRIES = 3;

interface BrowserCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  url?: string;
}

function normalizeSameSite(value: unknown): BrowserCookie['sameSite'] {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'strict') return 'Strict';
  if (normalized === 'lax') return 'Lax';
  if (normalized === 'none' || normalized === 'no_restriction') return 'None';
  return undefined;
}

function parseCrunchbaseCookies(rawCookies: string | undefined): BrowserCookie[] {
  const trimmed = rawCookies?.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((cookie): cookie is Record<string, unknown> => Boolean(cookie && typeof cookie === 'object'))
        .map((cookie): BrowserCookie => {
          const normalized: BrowserCookie = {
            name: String(cookie.name ?? ''),
            value: String(cookie.value ?? ''),
            domain: typeof cookie.domain === 'string' ? cookie.domain : '.crunchbase.com',
            path: typeof cookie.path === 'string' ? cookie.path : '/',
            secure: typeof cookie.secure === 'boolean' ? cookie.secure : true,
          };
          if (typeof cookie.expires === 'number') normalized.expires = cookie.expires;
          if (typeof cookie.expirationDate === 'number') normalized.expires = cookie.expirationDate;
          if (typeof cookie.httpOnly === 'boolean') normalized.httpOnly = cookie.httpOnly;
          const sameSite = normalizeSameSite(cookie.sameSite);
          if (sameSite) normalized.sameSite = sameSite;
          if (typeof cookie.url === 'string') normalized.url = cookie.url;
          return normalized;
        })
        .filter((cookie) => cookie.name && cookie.value);
    }
  } catch {
    // Fall back to Cookie header format below.
  }

  return trimmed
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part): BrowserCookie | null => {
      const separator = part.indexOf('=');
      if (separator <= 0) return null;
      const name = part.slice(0, separator).trim();
      if (/^(path|domain|expires|max-age|samesite)$/i.test(name)) return null;

      return {
        name,
        value: part.slice(separator + 1).trim(),
        domain: '.crunchbase.com',
        path: '/',
        secure: true,
      };
    })
    .filter((cookie): cookie is BrowserCookie => Boolean(cookie?.name && cookie.value));
}

function buildSearchUrl(input: {
  searchIndustry?: string;
  searchLocation?: string;
  searchFundingStage?: string;
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

function buildStartUrls(input: ActorInput): { url: string; userData: { label: string; searchTerm?: string; maxResults?: number } }[] {
  const { companyUrls = [], companyNames = [], searchIndustry, searchLocation, searchFundingStage } = input;
  const urls: { url: string; userData: { label: string; searchTerm?: string; maxResults?: number } }[] = [];

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
      userData: { label: 'searchResults', searchTerm: searchIndustry || searchLocation || searchFundingStage, maxResults: input.maxResults ?? 10 },
    });
  }

  return urls;
}

Actor.main(async () => {
  const input = (await Actor.getInput()) as ActorInput | undefined;

  if (!input) {
    throw new Error('INPUT_REQUIRED: Provide companyUrls, companyNames, or search parameters.');
  }

  const dataSource = input.dataSource ?? 'auto';
  if (dataSource !== 'browser' && input.crunchbaseApiKey?.trim()) {
    log.info('Using Crunchbase API mode because crunchbaseApiKey was supplied.');
    await runCrunchbaseApiMode(input);
    await Actor.exit();
    return;
  }

  if (dataSource === 'api') {
    await runCrunchbaseApiMode(input);
    await Actor.exit();
    return;
  }

  const { maxResults = 10, proxyConfiguration } = input;
  const startUrls = buildStartUrls(input);
  const crunchbaseCookies = parseCrunchbaseCookies(input.crunchbaseCookies);

  if (startUrls.length === 0) {
    throw new Error('NO_INPUT: Supply companyUrls, companyNames, or searchIndustry/searchLocation/searchFundingStage.');
  }

  log.info(crunchbaseCookies.length
    ? `Loaded ${crunchbaseCookies.length} Crunchbase cookie(s) for browser mode.`
    : 'No Crunchbase cookies supplied; browser mode may be blocked by Cloudflare.');

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
    requestHandlerTimeoutSecs: 180,
    navigationTimeoutSecs: 90,
    retryOnBlocked: true,
    headless: false,
    browserPoolOptions: {
      useFingerprints: true,
    },
    launchContext: {
      useChrome: true,
      launchOptions: {
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-dev-shm-usage'],
      },
    },

    preNavigationHooks: [
      async ({ page, session }) => {
        if (crunchbaseCookies.length) {
          await page.context().addCookies(crunchbaseCookies.map((cookie) => ({
            ...cookie,
            url: cookie.url ?? (cookie.domain ? undefined : 'https://www.crunchbase.com'),
          })));
        }

        // Warm up the session on the Cloudflare-lighter homepage so a cf_clearance
        // cookie is issued, then the org-page navigation reuses it. Once per session.
        const s = session as (typeof session & { userData?: Record<string, unknown> }) | undefined;
        if (s && !(s.userData?.cbWarmed)) {
          try {
            await page.goto('https://www.crunchbase.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(4000 + Math.floor(Math.random() * 3000));
            if (s.userData) s.userData.cbWarmed = true;
          } catch {
            /* warm-up best effort */
          }
        }
      },
    ],

    postNavigationHooks: [
      async ({ page, request, log }) => {
        const jitter = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS) + MIN_DELAY_MS);
        await page.waitForTimeout(jitter);

        if (request.userData.label === 'searchResults') {
          log.debug('Search-result pagination is intentionally capped to the first rendered page in browser mode. Use API mode for larger discovery jobs.');
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
