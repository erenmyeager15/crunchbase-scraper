import { Actor, log } from 'apify';
import type { ActorInput, CompanyRecord } from './types.js';
import { makeDefaultRecord } from './types.js';

const API_BASE_URL = 'https://api.crunchbase.com/api/v4';

const ORGANIZATION_FIELD_IDS = [
  'identifier',
  'short_description',
  'description',
  'website_url',
  'founded_on',
  'company_type',
  'operating_status',
  'num_employees_enum',
  'funding_total',
  'num_funding_rounds',
  'last_funding_at',
  'last_funding_type',
  'last_funding_total',
  'categories',
  'location_identifiers',
  'founder_identifiers',
  'linkedin',
  'twitter',
  'facebook',
  'image_url',
  'stock_symbol',
];

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asObject(value: unknown): JsonObject {
  return isObject(value) ? value : {};
}

function getObject(obj: JsonObject, key: string): JsonObject {
  return asObject(obj[key]);
}

function stringValue(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  if (!isObject(value)) return null;

  for (const key of ['value', 'name', 'title', 'url']) {
    const nested = stringValue(value[key]);
    if (nested) return nested;
  }

  return null;
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = stringValue(value);
  if (!text) return 0;
  const parsed = Number(text.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!isObject(value)) return null;
  return stringValue(value.value) ?? stringValue(value.date) ?? stringValue(value.precision_date);
}

function moneyValue(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return `$${value.toLocaleString('en-US')}`;
  if (!isObject(value)) return null;

  const currency = stringValue(value.currency) ?? 'USD';
  const amount = typeof value.value_usd === 'number'
    ? value.value_usd
    : typeof value.value === 'number'
      ? value.value
      : undefined;

  if (amount === undefined) return stringValue(value.value) ?? stringValue(value.value_usd);
  const prefix = currency === 'USD' ? '$' : `${currency} `;
  return `${prefix}${amount.toLocaleString('en-US')}`;
}

function arrayValues(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(stringValue).filter((item): item is string => Boolean(item));
}

function permalinkFromUrl(url: string): string | null {
  const match = url.match(/crunchbase\.com\/organization\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

function slugifyCompanyName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
}

function extractIdentifierPermalink(identifier: unknown): string | null {
  if (!isObject(identifier)) return null;
  return stringValue(identifier.permalink) ?? stringValue(identifier.uuid) ?? null;
}

function extractEntityPermalink(entity: unknown): string | null {
  const obj = asObject(entity);
  const properties = getObject(obj, 'properties');
  return extractIdentifierPermalink(properties.identifier)
    ?? extractIdentifierPermalink(obj.identifier)
    ?? stringValue(obj.permalink)
    ?? stringValue(obj.uuid);
}

function apiUrl(path: string, apiKey: string, params: Record<string, string> = {}): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  url.searchParams.set('user_key', apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

async function crunchbaseFetch(path: string, apiKey: string, init: RequestInit = {}, params: Record<string, string> = {}): Promise<unknown> {
  const response = await fetch(apiUrl(path, apiKey, params), {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Crunchbase API ${response.status}: ${text.slice(0, 500)}`);
  }

  return text ? JSON.parse(text) as unknown : {};
}

async function fetchOrganization(permalink: string, apiKey: string): Promise<unknown> {
  return crunchbaseFetch(`/entities/organizations/${encodeURIComponent(permalink)}`, apiKey, undefined, {
    field_ids: ORGANIZATION_FIELD_IDS.join(','),
  });
}

async function searchOrganizations(apiKey: string, query: string, limit: number): Promise<string[]> {
  const body = {
    field_ids: ['identifier', 'short_description', 'website_url'],
    query: [
      {
        type: 'predicate',
        field_id: 'identifier',
        operator_id: 'contains',
        values: [query],
      },
    ],
    limit,
  };

  const response = await crunchbaseFetch('/searches/organizations', apiKey, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const entities = asObject(response).entities;
  if (!Array.isArray(entities)) return [];

  return entities
    .map(extractEntityPermalink)
    .filter((permalink): permalink is string => Boolean(permalink));
}

function mapApiEntityToRecord(entity: unknown, permalink: string): CompanyRecord {
  const obj = asObject(entity);
  const properties = getObject(obj, 'properties');
  const record = makeDefaultRecord(`https://www.crunchbase.com/organization/${permalink}`);

  record.companyName = stringValue(properties.identifier) ?? stringValue(properties.name);
  record.website = stringValue(properties.website_url);
  record.description = stringValue(properties.short_description) ?? stringValue(properties.description);
  record.foundedDate = dateValue(properties.founded_on);
  record.companyType = stringValue(properties.company_type);
  record.operatingStatus = stringValue(properties.operating_status);
  record.employeeCountRange = stringValue(properties.num_employees_enum);
  record.totalFundingAmount = moneyValue(properties.funding_total);
  record.numberOfFundingRounds = numberValue(properties.num_funding_rounds);
  record.lastFundingDate = dateValue(properties.last_funding_at);
  record.lastFundingType = stringValue(properties.last_funding_type);
  record.lastFundingAmount = moneyValue(properties.last_funding_total);
  record.industriesList = arrayValues(properties.categories);
  record.foundersList = arrayValues(properties.founder_identifiers);
  record.companyLogoUrl = stringValue(properties.image_url);
  record.linkedInUrl = stringValue(properties.linkedin);
  record.twitterUrl = stringValue(properties.twitter);
  record.facebookUrl = stringValue(properties.facebook);
  record.stockSymbol = stringValue(properties.stock_symbol);

  const locations = arrayValues(properties.location_identifiers);
  if (locations.length) {
    record.HQCity = locations[0] ?? null;
    record.HQCountry = locations[locations.length - 1] ?? null;
  }

  return record;
}

function isValidApiRecord(record: CompanyRecord): boolean {
  return Boolean(record.companyName && (record.description || record.website || record.totalFundingAmount || record.foundedDate));
}

async function saveRecord(record: CompanyRecord): Promise<boolean> {
  if (!isValidApiRecord(record)) return false;
  await Actor.pushData(record);
  await Actor.charge({ eventName: 'company-scraped' }).catch((error) => {
    log.warning(`PPE charge failed: ${(error as Error).message}`);
  });
  return true;
}

export async function runCrunchbaseApiMode(input: ActorInput): Promise<void> {
  const apiKey = input.crunchbaseApiKey?.trim();
  if (!apiKey) throw new Error('CRUNCHBASE_API_KEY_REQUIRED: Provide crunchbaseApiKey or use browser dataSource.');

  const maxResults = input.maxResults ?? 10;
  const permalinks = new Set<string>();

  for (const url of input.companyUrls ?? []) {
    const permalink = permalinkFromUrl(url);
    if (permalink) permalinks.add(permalink);
  }

  for (const name of input.companyNames ?? []) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    try {
      const [permalink] = await searchOrganizations(apiKey, trimmed, 1);
      permalinks.add(permalink ?? slugifyCompanyName(trimmed));
    } catch (error) {
      log.warning(`API search failed for "${trimmed}", falling back to slug lookup: ${(error as Error).message}`);
      permalinks.add(slugifyCompanyName(trimmed));
    }
  }

  if ((input.searchIndustry || input.searchLocation || input.searchFundingStage) && permalinks.size < maxResults) {
    const searchText = [input.searchIndustry, input.searchLocation, input.searchFundingStage].filter(Boolean).join(' ');
    if (searchText) {
      const found = await searchOrganizations(apiKey, searchText, maxResults - permalinks.size);
      for (const permalink of found) permalinks.add(permalink);
    }
  }

  if (!permalinks.size) {
    throw new Error('NO_API_TARGETS: Provide companyUrls, companyNames, or API-searchable filters.');
  }

  let saved = 0;
  for (const permalink of [...permalinks].slice(0, maxResults)) {
    try {
      const entity = await fetchOrganization(permalink, apiKey);
      const record = mapApiEntityToRecord(entity, permalink);
      if (await saveRecord(record)) {
        saved++;
        log.info(`API scraped: ${record.companyName ?? permalink}`);
      } else {
        log.warning(`API returned insufficient company data for ${permalink}; not saving or charging.`);
      }
    } catch (error) {
      log.warning(`API scrape failed for ${permalink}: ${(error as Error).message}`);
    }
  }

  log.info(`Crunchbase API mode finished. Saved ${saved} company record(s).`);
}
