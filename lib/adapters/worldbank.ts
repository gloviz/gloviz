import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/** World Bank annual indicators: 12 indicators across 45 economies. No key. CC BY 4.0. */

const COUNTRIES = [
  'NOR','SWE','DNK','FIN','ISL','DEU','FRA','ESP','ITA','GBR','NLD','BEL','POL','AUT','CHE',
  'PRT','GRC','IRL','CZE','ROU','USA','CAN','MEX','BRA','ARG','CHL','COL','PER','CHN','IND',
  'JPN','KOR','IDN','THA','VNM','AUS','NZL','ZAF','NGA','EGY','KEN','MAR','TUR','SAU','ARE',
];

const INDICATORS: { code: string; title: string; unit: string; domain: string }[] = [
  { code: 'NY.GDP.MKTP.KD.ZG', title: 'GDP growth', unit: '% annual', domain: 'economy' },
  { code: 'NY.GDP.PCAP.CD', title: 'GDP per capita', unit: 'current US$', domain: 'economy' },
  { code: 'FP.CPI.TOTL.ZG', title: 'Inflation', unit: '% annual', domain: 'economy' },
  { code: 'SL.UEM.TOTL.ZS', title: 'Unemployment', unit: '% labour force', domain: 'economy' },
  { code: 'NE.TRD.GNFS.ZS', title: 'Trade', unit: '% of GDP', domain: 'economy' },
  { code: 'SP.POP.TOTL', title: 'Population', unit: 'people', domain: 'economy' },
  { code: 'SP.DYN.LE00.IN', title: 'Life expectancy', unit: 'years', domain: 'health' },
  { code: 'SH.XPD.CHEX.GD.ZS', title: 'Health spending', unit: '% of GDP', domain: 'health' },
  { code: 'SP.DYN.IMRT.IN', title: 'Infant mortality', unit: 'per 1,000 births', domain: 'health' },
  { code: 'EG.USE.PCAP.KG.OE', title: 'Energy use per capita', unit: 'kg oil eq.', domain: 'energy' },
  { code: 'EG.FEC.RNEW.ZS', title: 'Renewable energy share', unit: '% final energy', domain: 'energy' },
  { code: 'IT.NET.USER.ZS', title: 'Internet users', unit: '% of population', domain: 'economy' },
];

const CHUNK = 15; // countries per request (URL length)

export const worldBankIndicators: Adapter = {
  sourceId: 'worldbank',
  job: 'worldbank:indicators',
  async fetch(_window: FetchWindow): Promise<SeriesPayload[]> {
    const out: SeriesPayload[] = [];
    for (const ind of INDICATORS) {
      for (let i = 0; i < COUNTRIES.length; i += CHUNK) {
        const batch = COUNTRIES.slice(i, i + CHUNK);
        const url =
          `https://api.worldbank.org/v2/country/${batch.join(';')}` +
          `/indicator/${ind.code}?format=json&per_page=20000&date=1970:2026`;
        const res = await fetchWithRetry(url);
        const body = await res.json();
        const rows: any[] = body?.[1] ?? [];
        const byCountry = new Map<string, { ts: string; value: number | null }[]>();
        for (const r of rows) {
          const iso = r.countryiso3code;
          if (!iso) continue;
          if (!byCountry.has(iso)) byCountry.set(iso, []);
          byCountry.get(iso)!.push({
            ts: `${r.date}-01-01T00:00:00Z`,
            value: r.value === null ? null : Number(r.value),
          });
        }
        for (const [iso, observations] of byCountry) {
          if (observations.every((o) => o.value === null)) continue;
          out.push({
            externalId: `${ind.code}:${iso}`,
            title: `${ind.title} ${iso}`,
            domain: ind.domain,
            geoCode: iso,
            unit: ind.unit,
            frequency: 'annual',
            metadata: { indicator: ind.code },
            observations: observations.sort((a, b) => a.ts.localeCompare(b.ts)),
          });
        }
      }
    }
    return out;
  },
};
