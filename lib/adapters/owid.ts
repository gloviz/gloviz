import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/** Our World in Data grapher CSVs: annual CO2, energy and emissions per country. CC BY 4.0. */

const DATASETS: {
  slug: string; column: string; title: string; unit: string; domain: string;
}[] = [
  { slug: 'annual-co2-emissions-per-country', column: 'Annual CO₂ emissions',
    title: 'CO2 emissions', unit: 'tonnes', domain: 'environment' },
  { slug: 'co-emissions-per-capita', column: 'Annual CO₂ emissions (per capita)',
    title: 'CO2 per capita', unit: 'tonnes per person', domain: 'environment' },
  { slug: 'per-capita-energy-use', column: 'Primary energy consumption per capita (kWh)',
    title: 'Energy use per capita', unit: 'kWh', domain: 'energy' },
  { slug: 'share-electricity-renewables', column: 'Renewables - % electricity',
    title: 'Renewable electricity share', unit: '% of electricity', domain: 'energy' },
];

const COUNTRIES = new Set([
  'NOR','SWE','DNK','FIN','DEU','FRA','ESP','ITA','GBR','NLD','POL','TUR','RUS',
  'USA','CAN','MEX','BRA','ARG','CHL','CHN','IND','JPN','KOR','IDN','AUS','ZAF','NGA','EGY','SAU','WLD',
]);

function parseCsv(text: string): string[][] {
  // OWID CSVs quote fields containing commas.
  return text.trim().split('\n').map((line) => {
    const cells: string[] = [];
    let cur = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { quoted = !quoted; continue; }
      if (ch === ',' && !quoted) { cells.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur);
    return cells;
  });
}

export const owidIndicators: Adapter = {
  sourceId: 'owid',
  job: 'owid:indicators',
  async fetch(_window: FetchWindow): Promise<SeriesPayload[]> {
    const out: SeriesPayload[] = [];
    for (const ds of DATASETS) {
      const res = await fetchWithRetry(
        `https://ourworldindata.org/grapher/${ds.slug}.csv?v=1&csvType=full&useColumnShortNames=false`,
        { headers: { 'User-Agent': 'gloviz.app' } },
      );
      const rows = parseCsv(await res.text());
      const header = rows[0];
      const iCode = header.indexOf('Code');
      const iYear = header.indexOf('Year');
      let iVal = header.indexOf(ds.column);
      if (iVal < 0) iVal = header.length - 1; // column renamed upstream: last column is the value
      const byCode = new Map<string, { ts: string; value: number | null }[]>();
      for (const r of rows.slice(1)) {
        const code = r[iCode];
        if (!code || !COUNTRIES.has(code)) continue;
        const v = Number(r[iVal]);
        if (!Number.isFinite(v)) continue;
        if (!byCode.has(code)) byCode.set(code, []);
        byCode.get(code)!.push({ ts: `${r[iYear]}-01-01T00:00:00Z`, value: v });
      }
      for (const [code, observations] of byCode) {
        out.push({
          externalId: `${ds.slug}:${code}`,
          title: `${ds.title} ${code}`,
          domain: ds.domain,
          geoCode: code,
          unit: ds.unit,
          frequency: 'annual',
          metadata: { dataset: ds.slug },
          observations: observations.sort((a, b) => a.ts.localeCompare(b.ts)),
        });
      }
    }
    return out;
  },
};
