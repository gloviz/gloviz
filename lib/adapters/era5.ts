import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/**
 * Open-Meteo Historical Weather API (Copernicus ERA5 reanalysis).
 * Daily mean temperature and precipitation for the same 30 cities the live
 * hourly adapter covers, back to 1940. This is the baseline that turns
 * "highest in 90 days" into "warmest since 1940".
 *
 * The archive lags real time by about five days; the live Open-Meteo series
 * covers the gap. Response format verified 2026-08-22:
 * daily: { time: ['1940-01-01', ...], temperature_2m_mean: [...],
 * precipitation_sum: [...] }, nulls possible.
 */

const CITIES: { name: string; geo: string; lat: number; lon: number }[] = [
  { name: 'Oslo', geo: 'NO', lat: 59.91, lon: 10.75 },
  { name: 'Stockholm', geo: 'SE', lat: 59.33, lon: 18.07 },
  { name: 'Berlin', geo: 'DE', lat: 52.52, lon: 13.41 },
  { name: 'Paris', geo: 'FR', lat: 48.85, lon: 2.35 },
  { name: 'Madrid', geo: 'ES', lat: 40.42, lon: -3.7 },
  { name: 'Rome', geo: 'IT', lat: 41.89, lon: 12.48 },
  { name: 'London', geo: 'GB', lat: 51.51, lon: -0.13 },
  { name: 'Warsaw', geo: 'PL', lat: 52.23, lon: 21.01 },
  { name: 'Istanbul', geo: 'TR', lat: 41.01, lon: 28.98 },
  { name: 'Moscow', geo: 'RU', lat: 55.76, lon: 37.62 },
  { name: 'New York', geo: 'US', lat: 40.71, lon: -74.01 },
  { name: 'Chicago', geo: 'US', lat: 41.88, lon: -87.63 },
  { name: 'Los Angeles', geo: 'US', lat: 34.05, lon: -118.24 },
  { name: 'Toronto', geo: 'CA', lat: 43.65, lon: -79.38 },
  { name: 'Mexico City', geo: 'MX', lat: 19.43, lon: -99.13 },
  { name: 'Bogota', geo: 'CO', lat: 4.71, lon: -74.07 },
  { name: 'Sao Paulo', geo: 'BR', lat: -23.55, lon: -46.63 },
  { name: 'Buenos Aires', geo: 'AR', lat: -34.6, lon: -58.38 },
  { name: 'Lagos', geo: 'NG', lat: 6.52, lon: 3.38 },
  { name: 'Cairo', geo: 'EG', lat: 30.04, lon: 31.24 },
  { name: 'Nairobi', geo: 'KE', lat: -1.29, lon: 36.82 },
  { name: 'Johannesburg', geo: 'ZA', lat: -26.2, lon: 28.05 },
  { name: 'Dubai', geo: 'AE', lat: 25.2, lon: 55.27 },
  { name: 'Mumbai', geo: 'IN', lat: 19.08, lon: 72.88 },
  { name: 'Delhi', geo: 'IN', lat: 28.61, lon: 77.21 },
  { name: 'Bangkok', geo: 'TH', lat: 13.76, lon: 100.5 },
  { name: 'Singapore', geo: 'SG', lat: 1.35, lon: 103.82 },
  { name: 'Beijing', geo: 'CN', lat: 39.9, lon: 116.41 },
  { name: 'Tokyo', geo: 'JP', lat: 35.68, lon: 139.69 },
  { name: 'Sydney', geo: 'AU', lat: -33.87, lon: 151.21 },
];

const VARS: { key: string; label: string; unit: string }[] = [
  { key: 'temperature_2m_mean', label: 'Daily mean temperature', unit: '°C' },
  { key: 'precipitation_sum', label: 'Daily precipitation', unit: 'mm' },
];

const FLOOR = '1940-01-01';

export const era5History: Adapter = {
  sourceId: 'era5',
  job: 'era5:history',
  async fetch(window: FetchWindow): Promise<SeriesPayload[]> {
    const out: SeriesPayload[] = [];
    const startIso = window.start.toISOString().slice(0, 10);
    const start = startIso < FLOOR ? FLOOR : startIso;
    // The archive lags ~5 days; asking for the future returns nulls.
    const end = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
    if (start >= end) return out;

    // The free tier rate-limits by request weight: one request for 85 years
    // of daily data across 30 cities returns HTTP 429 (hit in production on
    // 2026-08-22). Chunk the range per decade and pause between requests.
    const chunks: { from: string; to: string }[] = [];
    for (let y = Number(start.slice(0, 4)); ; y += 10) {
      const from = `${y}-01-01` < start ? start : `${y}-01-01`;
      const to = `${y + 9}-12-31` > end ? end : `${y + 9}-12-31`;
      chunks.push({ from, to });
      if (to === end) break;
    }
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    for (const city of CITIES) {
      const byVar = new Map<string, { ts: string; value: number | null }[]>(
        VARS.map((v) => [v.key, []]));
      for (const ch of chunks) {
        const url =
          'https://archive-api.open-meteo.com/v1/archive' +
          `?latitude=${city.lat}&longitude=${city.lon}` +
          `&start_date=${ch.from}&end_date=${ch.to}` +
          `&daily=${VARS.map((v) => v.key).join(',')}&timezone=UTC`;
        let body: { daily?: Record<string, (string | number | null)[]> };
        try {
          body = await (await fetchWithRetry(url)).json();
        } catch (err) {
          // One long pause on a rate limit, then a final attempt.
          await sleep(65_000);
          body = await (await fetchWithRetry(url)).json();
        }
        const time = (body.daily?.time ?? []) as string[];
        for (const v of VARS) {
          const values = (body.daily?.[v.key] ?? []) as (number | null)[];
          byVar.get(v.key)!.push(...time.map((t, i) => ({
            ts: `${t}T00:00:00Z`,
            value: typeof values[i] === 'number' ? (values[i] as number) : null,
          })));
        }
        await sleep(1500);
      }
      for (const v of VARS) {
        const observations = byVar.get(v.key)!;
        if (!observations.length) continue;
        out.push({
          externalId: `era5:${v.key}:${city.name.toLowerCase().replace(/ /g, '-')}`,
          title: `${v.label} ${city.name} (since 1940)`,
          domain: 'climate',
          geoCode: city.geo,
          unit: v.unit,
          frequency: 'daily',
          metadata: { city: city.name, lat: city.lat, lon: city.lon, reanalysis: 'ERA5' },
          observations,
        });
      }
    }
    return out;
  },
};
