import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/** WHO Global Health Observatory (OData, no key). Both-sexes values only. */

const INDICATORS: { code: string; title: string; unit: string }[] = [
  { code: 'WHOSIS_000001', title: 'Life expectancy at birth', unit: 'years' },
  { code: 'WHOSIS_000002', title: 'Healthy life expectancy', unit: 'years' },
  { code: 'NCDMORT3070', title: 'Premature NCD mortality (30-70)', unit: '% probability' },
  { code: 'SA_0000001688', title: 'Alcohol consumption per capita', unit: 'litres' },
];

const COUNTRIES = new Set([
  'NOR','SWE','DNK','FIN','DEU','FRA','ESP','ITA','GBR','NLD','POL','TUR','RUS',
  'USA','CAN','MEX','BRA','ARG','CHN','IND','JPN','KOR','IDN','AUS','ZAF','NGA','EGY','KEN',
]);

export const whoIndicators: Adapter = {
  sourceId: 'who',
  job: 'who:indicators',
  async fetch(_window: FetchWindow): Promise<SeriesPayload[]> {
    const out: SeriesPayload[] = [];
    for (const ind of INDICATORS) {
      const res = await fetchWithRetry(
        `https://ghoapi.azureedge.net/api/${ind.code}?$filter=SpatialDimType eq 'COUNTRY'`,
      );
      const body = await res.json();
      const byCountry = new Map<string, Map<number, number>>();
      for (const r of body.value ?? []) {
        const iso = r.SpatialDim;
        if (!iso || !COUNTRIES.has(iso)) continue;
        // Keep both-sexes / total rows only, so one series per country.
        if (r.Dim1 && !['BTSX', 'SEX_BTSX', 'TOTL'].includes(r.Dim1)) continue;
        const year = Number(r.TimeDim);
        const value = r.NumericValue;
        if (!Number.isFinite(year) || value === null || value === undefined) continue;
        if (!byCountry.has(iso)) byCountry.set(iso, new Map());
        byCountry.get(iso)!.set(year, Number(value));
      }
      for (const [iso, years] of byCountry) {
        if (years.size < 2) continue;
        out.push({
          externalId: `${ind.code}:${iso}`,
          title: `${ind.title} ${iso}`,
          domain: 'health',
          geoCode: iso,
          unit: ind.unit,
          frequency: 'annual',
          metadata: { indicator: ind.code },
          observations: [...years.entries()]
            .sort(([a], [b]) => a - b)
            .map(([y, v]) => ({ ts: `${y}-01-01T00:00:00Z`, value: v })),
        });
      }
    }
    return out;
  },
};
