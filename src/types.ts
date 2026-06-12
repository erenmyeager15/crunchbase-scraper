export interface ActorInput {
  companyUrls?: string[];
  companyNames?: string[];
  searchIndustry?: string;
  searchLocation?: string;
  searchFundingStage?: string;
  maxResults?: number;
  dataSource?: 'auto' | 'api' | 'browser';
  crunchbaseApiKey?: string;
  crunchbaseCookies?: string;
  proxyConfiguration?: {
    useApifyProxy: boolean;
    apifyProxyGroups: string[];
    apifyProxyCountry: string;
    proxyUrls?: string[];
  };
}

export interface CompanyRecord {
  companyName: string | null;
  crunchbaseUrl: string | null;
  website: string | null;
  description: string | null;
  foundedDate: string | null;
  HQCity: string | null;
  HQCountry: string | null;
  companyType: string | null;
  operatingStatus: string | null;
  employeeCountRange: string | null;
  totalFundingAmount: string | null;
  numberOfFundingRounds: number;
  lastFundingDate: string | null;
  lastFundingType: string | null;
  lastFundingAmount: string | null;
  leadInvestorsLastRound: string[];
  allInvestorsList: string[];
  acquirer: string | null;
  acquisitionDate: string | null;
  IPODate: string | null;
  stockSymbol: string | null;
  industriesList: string[];
  companyLogoUrl: string | null;
  linkedInUrl: string | null;
  twitterUrl: string | null;
  facebookUrl: string | null;
  scrapedTimestamp: string;
}

export function makeDefaultRecord(url: string): CompanyRecord {
  return {
    companyName: null,
    crunchbaseUrl: url,
    website: null,
    description: null,
    foundedDate: null,
    HQCity: null,
    HQCountry: null,
    companyType: null,
    operatingStatus: null,
    employeeCountRange: null,
    totalFundingAmount: null,
    numberOfFundingRounds: 0,
    lastFundingDate: null,
    lastFundingType: null,
    lastFundingAmount: null,
    leadInvestorsLastRound: [],
    allInvestorsList: [],
    acquirer: null,
    acquisitionDate: null,
    IPODate: null,
    stockSymbol: null,
    industriesList: [],
    companyLogoUrl: null,
    linkedInUrl: null,
    twitterUrl: null,
    facebookUrl: null,
    scrapedTimestamp: new Date().toISOString(),
  };
}
