import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/**
 * GBIF: 3bn species occurrence records. Two shapes are useful here:
 * observations per country per year (a map and a long trend), and the record
 * count by kingdom (a contribution view). CC0 / CC BY per record.
 */

const COUNTRIES = [
  'NO','SE','DK','FI','IS','DE','FR','ES','IT','GB','NL','BE','PL','AT','CH',
  'US','CA','MX','BR','AR','ZA','KE','AU','NZ','JP','IN','CN','ID','CR','MG',
];

const ISO2_TO_ISO3: Record<string, string> = {
  NO: 'NOR', SE: 'SWE', DK: 'DNK', FI: 'FIN', IS: 'ISL', DE: 'DEU', FR: 'FRA',
  ES: 'ESP', IT: 'ITA', GB: 'GBR', NL: 'NLD', BE: 'BEL', PL: 'POL', AT: 'AUT',
  CH: 'CHE', US: 'USA', CA: 'CAN', MX: 'MEX', BR: 'BRA', AR: 'ARG', ZA: 'ZAF',
  KE: 'KEN', AU: 'AUS', NZ: 'NZL', JP: 'JPN', IN: 'IND', CN: 'CHN', ID: 'IDN',
  CR: 'CRI', MG: 'MDG',
};

const KINGDOMS = ['Animalia', 'Plantae', 'Fungi', 'Bacteria', 'Chromista', 'Protozoa'];

const YEAR_FROM = 2000;

export const gbifOccurrences: Adapter = {
  sourceId: 'gbif',
  job: 'gbif:occurrences',
  async fetch(_window: FetchWindow): Promise<SeriesPayload[]> {
    const thisYear = new Date().getUTCFullYear();
    const out: SeriesPayload[] = [];

    for (const iso2 of COUNTRIES) {
      // One request per country: facet the year dimension instead of looping years.
      const res = await fetchWithRetry(
        'https://api.gbif.org/v1/occurrence/search?limit=0' +
        `&country=${iso2}&year=${YEAR_FROM},${thisYear}` +
        '&facet=year&facetLimit=60',
      );
      const body = await res.json();
      const counts: { name: string; count: number }[] =
        body.facets?.find((f: any) => f.field === 'YEAR')?.counts ?? [];
      const observations = counts
        .map((c) => ({ ts: `${c.name}-01-01T00:00:00Z`, value: c.count }))
        .filter((o) => /^\d{4}-/.test(o.ts))
        .sort((a, b) => a.ts.localeCompare(b.ts));
      if (observations.length < 2) continue;
      out.push({
        externalId: `gbif:occurrences:${iso2}`,
        title: `Species observations ${ISO2_TO_ISO3[iso2] ?? iso2}`,
        domain: 'nature',
        geoCode: ISO2_TO_ISO3[iso2] ?? iso2,
        unit: 'records',
        frequency: 'annual',
        metadata: { iso2 },
        observations,
      });
    }

    // Kingdom split for the current year, one series per kingdom.
    for (const kingdom of KINGDOMS) {
      const res = await fetchWithRetry(
        `https://api.gbif.org/v1/occurrence/search?limit=0&kingdom=${kingdom}` +
        `&year=${YEAR_FROM},${thisYear}&facet=year&facetLimit=60`,
      );
      const body = await res.json();
      const counts: { name: string; count: number }[] =
        body.facets?.find((f: any) => f.field === 'YEAR')?.counts ?? [];
      const observations = counts
        .map((c) => ({ ts: `${c.name}-01-01T00:00:00Z`, value: c.count }))
        .sort((a, b) => a.ts.localeCompare(b.ts));
      if (observations.length < 2) continue;
      out.push({
        externalId: `gbif:kingdom:${kingdom.toLowerCase()}`,
        title: `Records by kingdom ${kingdom}`,
        domain: 'nature',
        geoCode: 'WORLD',
        unit: 'records',
        frequency: 'annual',
        metadata: { kingdom },
        observations,
      });
    }
    return out;
  },
};
