import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/** NASA POWER daily climate for 12 sites: solar irradiance and temperature. Public domain. */

const SITES: { name: string; geo: string; lat: number; lon: number }[] = [
  { name: 'Oslo', geo: 'NO', lat: 59.91, lon: 10.75 },
  { name: 'Berlin', geo: 'DE', lat: 52.52, lon: 13.41 },
  { name: 'Madrid', geo: 'ES', lat: 40.42, lon: -3.7 },
  { name: 'Cairo', geo: 'EG', lat: 30.04, lon: 31.24 },
  { name: 'Nairobi', geo: 'KE', lat: -1.29, lon: 36.82 },
  { name: 'Phoenix', geo: 'US', lat: 33.45, lon: -112.07 },
  { name: 'Sao Paulo', geo: 'BR', lat: -23.55, lon: -46.63 },
  { name: 'Delhi', geo: 'IN', lat: 28.61, lon: 77.21 },
  { name: 'Beijing', geo: 'CN', lat: 39.9, lon: 116.41 },
  { name: 'Sydney', geo: 'AU', lat: -33.87, lon: 151.21 },
  { name: 'Reykjavik', geo: 'IS', lat: 64.15, lon: -21.94 },
  { name: 'Santiago', geo: 'CL', lat: -33.45, lon: -70.67 },
];

const PARAMS: { key: string; title: string; unit: string; domain: string }[] = [
  { key: 'ALLSKY_SFC_SW_DWN', title: 'Solar irradiance', unit: 'kWh/m2/day', domain: 'energy' },
  { key: 'T2M', title: 'Daily mean temperature', unit: '°C', domain: 'climate' },
];

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

export const nasaPower: Adapter = {
  sourceId: 'nasa-power',
  job: 'nasa-power:climate',
  async fetch(window: FetchWindow): Promise<SeriesPayload[]> {
    // POWER daily lags ~2 days; ask up to yesterday.
    const end = new Date(Math.min(window.end.getTime(), Date.now() - 2 * 86_400_000));
    const out: SeriesPayload[] = [];
    for (const s of SITES) {
      const url =
        'https://power.larc.nasa.gov/api/temporal/daily/point' +
        `?parameters=${PARAMS.map((p) => p.key).join(',')}&community=RE` +
        `&latitude=${s.lat}&longitude=${s.lon}` +
        `&start=${ymd(window.start)}&end=${ymd(end)}&format=JSON`;
      const res = await fetchWithRetry(url);
      const body = await res.json();
      const params = body?.properties?.parameter ?? {};
      for (const p of PARAMS) {
        const values: Record<string, number> = params[p.key] ?? {};
        const observations = Object.entries(values)
          .filter(([, v]) => v > -900) // POWER fill value is -999
          .map(([d, v]) => ({
            ts: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T00:00:00Z`,
            value: v,
          }));
        if (!observations.length) continue;
        out.push({
          externalId: `${p.key}:${s.name.toLowerCase().replace(/ /g, '-')}`,
          title: `${p.title} ${s.name}`,
          domain: p.domain,
          geoCode: s.geo,
          unit: p.unit,
          frequency: 'daily',
          metadata: { lat: s.lat, lon: s.lon, parameter: p.key },
          observations: observations.sort((a, b) => a.ts.localeCompare(b.ts)),
        });
      }
    }
    return out;
  },
};
