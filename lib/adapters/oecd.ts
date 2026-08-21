import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';
import { parseSdmxJson, sdmxPeriodToIso } from '../parsers/sdmx';

/** OECD, through the shared SDMX-JSON parser. */

const AREAS = [
  'NOR','SWE','DNK','FIN','DEU','FRA','ESP','ITA','GBR','NLD','POL','AUT','CHE',
  'USA','CAN','MEX','JPN','KOR','AUS','NZL','TUR','CHL','ISR','CZE','PRT','IRL',
].join('+');

const FLOWS: {
  key: string; flow: string; filter: string; title: string; unit: string;
  domain: string; freq: string; start: string;
}[] = [
  {
    key: 'unemployment',
    flow: 'OECD.SDD.TPS,DSD_LFS@DF_IALFS_UNE_M,1.0',
    filter: `${AREAS}..._Z.Y._T.Y_GE15..M`,
    title: 'Unemployment rate', unit: '% of labour force',
    domain: 'economy', freq: 'monthly', start: '2015-01',
  },
  {
    key: 'cpi',
    flow: 'OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0',
    filter: `${AREAS}.M.N.CPI.PA._T.N.GY`,
    title: 'Inflation, CPI annual rate', unit: '% annual',
    domain: 'economy', freq: 'monthly', start: '2015-01',
  },
];

export const oecd: Adapter = {
  sourceId: 'oecd',
  job: 'oecd:indicators',
  async fetch(_window: FetchWindow): Promise<SeriesPayload[]> {
    const out: SeriesPayload[] = [];
    for (const f of FLOWS) {
      const url =
        `https://sdmx.oecd.org/public/rest/data/${f.flow}/${f.filter}` +
        `?startPeriod=${f.start}&dimensionAtObservation=AllDimensions`;
      let body: any;
      try {
        const res = await fetchWithRetry(url, {
          headers: { Accept: 'application/vnd.sdmx.data+json;version=1.0' },
        });
        body = await res.json();
      } catch {
        continue; // a renamed flow must not fail the whole run
      }

      const byArea = new Map<string, { ts: string; value: number | null }[]>();
      for (const p of parseSdmxJson(body)) {
        const area = p.dims.REF_AREA;
        const ts = sdmxPeriodToIso(p.dims.TIME_PERIOD ?? '');
        if (!area || !ts) continue;
        if (!byArea.has(area)) byArea.set(area, []);
        byArea.get(area)!.push({ ts, value: p.value });
      }
      for (const [area, observations] of byArea) {
        if (observations.length < 2) continue;
        out.push({
          externalId: `oecd:${f.key}:${area}`,
          title: `${f.title} ${area}`,
          domain: f.domain,
          geoCode: area,
          unit: f.unit,
          frequency: f.freq,
          metadata: { flow: f.flow },
          observations: observations.sort((a, b) => a.ts.localeCompare(b.ts)),
        });
      }
    }
    return out;
  },
};
