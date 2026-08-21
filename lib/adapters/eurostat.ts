import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';
import { parseJsonStat } from '../parsers/jsonstat';
import { sdmxPeriodToIso } from '../parsers/sdmx';

/**
 * Eurostat, through the shared JSON-stat parser. One integration replaces
 * thirty national statistics offices for EU and EEA countries.
 */

const GEOS = [
  'NO','SE','DK','FI','IS','DE','FR','ES','IT','NL','BE','PL','AT','CZ','PT',
  'GR','IE','RO','HU','BG','HR','SK','SI','LT','LV','EE','LU','CY','MT','CH','EU27_2020',
];

const DATASETS: {
  code: string; title: string; unit: string; domain: string; freq: string;
  filters: Record<string, string | string[]>;
}[] = [
  { code: 'une_rt_m', title: 'Unemployment rate', unit: '% of labour force',
    domain: 'economy', freq: 'monthly',
    filters: { s_adj: 'SA', age: 'TOTAL', sex: 'T', unit: 'PC_ACT' } },
  { code: 'prc_hicp_manr', title: 'Inflation, HICP annual rate', unit: '% annual',
    domain: 'economy', freq: 'monthly', filters: { coicop: 'CP00', unit: 'RCH_A' } },
  { code: 'ei_isir_m', title: 'Industrial production, annual change', unit: '% annual',
    domain: 'economy', freq: 'monthly',
    filters: { indic: 'IS-IP-SCA', nace_r2: 'B-D', unit: 'RT12' } },
  { code: 'nrg_ind_ren', title: 'Renewable energy share', unit: '% of gross final consumption',
    domain: 'energy', freq: 'annual', filters: { nrg_bal: 'REN' } },
];

export const eurostat: Adapter = {
  sourceId: 'eurostat',
  job: 'eurostat:indicators',
  async fetch(_window: FetchWindow): Promise<SeriesPayload[]> {
    const out: SeriesPayload[] = [];
    for (const ds of DATASETS) {
      const params = new URLSearchParams({ format: 'JSON', lang: 'EN' });
      for (const [k, v] of Object.entries(ds.filters)) {
        for (const one of Array.isArray(v) ? v : [v]) params.append(k, one);
      }
      for (const g of GEOS) params.append('geo', g);
      params.append('lastTimePeriod', ds.freq === 'monthly' ? '120' : '30');

      // A renamed dataset or an invalid filter must not fail the whole run:
      // Eurostat answers 400 with an explanation, and fetchWithRetry throws on 4xx.
      let body: any;
      try {
        const res = await fetchWithRetry(
          `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${ds.code}?${params}`,
        );
        body = await res.json();
      } catch (err) {
        console.warn(`eurostat ${ds.code}: ${(err as Error).message.slice(0, 160)}`);
        continue;
      }
      if (body?.error) {
        console.warn(`eurostat ${ds.code}: ${JSON.stringify(body.error).slice(0, 160)}`);
        continue;
      }

      const byGeo = new Map<string, { ts: string; value: number | null }[]>();
      for (const p of parseJsonStat(body)) {
        const geo = p.dims.geo;
        const ts = sdmxPeriodToIso(p.dims.time ?? '');
        if (!geo || !ts) continue;
        if (!byGeo.has(geo)) byGeo.set(geo, []);
        byGeo.get(geo)!.push({ ts, value: p.value });
      }
      for (const [geo, observations] of byGeo) {
        if (observations.length < 2) continue;
        out.push({
          externalId: `eurostat:${ds.code}:${geo}`,
          title: `${ds.title} ${geo}`,
          domain: ds.domain,
          geoCode: geo,
          unit: ds.unit,
          frequency: ds.freq,
          metadata: { dataset: ds.code },
          observations: observations.sort((a, b) => a.ts.localeCompare(b.ts)),
        });
      }
    }
    return out;
  },
};
