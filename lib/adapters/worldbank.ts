import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/** World Bank annual indicators. No key. CC BY 4.0. */

const COUNTRIES = ['NOR', 'DEU', 'FRA', 'ESP', 'GBR', 'USA', 'JPN', 'AUS', 'CHN', 'IND'];

const INDICATORS: { code: string; title: string; unit: string }[] = [
  { code: 'NY.GDP.MKTP.KD.ZG', title: 'GDP growth', unit: '% annual' },
  { code: 'SP.POP.TOTL', title: 'Population', unit: 'people' },
];

export const worldBankIndicators: Adapter = {
  sourceId: 'worldbank',
  job: 'worldbank:indicators',
  async fetch(_window: FetchWindow): Promise<SeriesPayload[]> {
    const out: SeriesPayload[] = [];
    for (const ind of INDICATORS) {
      const url =
        `https://api.worldbank.org/v2/country/${COUNTRIES.join(';')}` +
        `/indicator/${ind.code}?format=json&per_page=5000&date=1990:2026`;
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
        out.push({
          externalId: `${ind.code}:${iso}`,
          title: `${ind.title} ${iso}`,
          domain: 'economy',
          geoCode: iso,
          unit: ind.unit,
          frequency: 'annual',
          observations: observations.sort((a, b) => a.ts.localeCompare(b.ts)),
        });
      }
    }
    return out;
  },
};
