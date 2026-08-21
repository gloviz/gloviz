import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/**
 * Open-Meteo hourly 2m temperature. No key. CC BY 4.0.
 * NOTE: free tier is non-commercial only (docs/02); resolve before commercial use.
 */

const CITIES: { name: string; geo: string; lat: number; lon: number }[] = [
  { name: 'Oslo', geo: 'NO', lat: 59.91, lon: 10.75 },
  { name: 'Berlin', geo: 'DE', lat: 52.52, lon: 13.41 },
  { name: 'Paris', geo: 'FR', lat: 48.85, lon: 2.35 },
  { name: 'Madrid', geo: 'ES', lat: 40.42, lon: -3.7 },
  { name: 'London', geo: 'GB', lat: 51.51, lon: -0.13 },
  { name: 'New York', geo: 'US', lat: 40.71, lon: -74.01 },
  { name: 'Tokyo', geo: 'JP', lat: 35.68, lon: 139.69 },
  { name: 'Sydney', geo: 'AU', lat: -33.87, lon: 151.21 },
];

export const openMeteoTemperature: Adapter = {
  sourceId: 'open-meteo',
  job: 'open-meteo:temperature',
  async fetch(window: FetchWindow): Promise<SeriesPayload[]> {
    const pastDays = Math.min(
      92,
      Math.max(1, Math.ceil((Date.now() - window.start.getTime()) / 86_400_000)),
    );
    const out: SeriesPayload[] = [];
    for (const c of CITIES) {
      const url =
        'https://api.open-meteo.com/v1/forecast' +
        `?latitude=${c.lat}&longitude=${c.lon}` +
        `&hourly=temperature_2m&past_days=${pastDays}&forecast_days=2&timezone=UTC`;
      const res = await fetchWithRetry(url);
      const body = await res.json();
      const times: string[] = body.hourly?.time ?? [];
      const temps: (number | null)[] = body.hourly?.temperature_2m ?? [];
      out.push({
        externalId: `temperature_2m:${c.name.toLowerCase().replace(/ /g, '-')}`,
        title: `Temperature ${c.name}`,
        domain: 'weather',
        geoCode: c.geo,
        unit: '°C',
        frequency: 'hourly',
        metadata: { lat: c.lat, lon: c.lon },
        observations: times.map((t, i) => ({
          ts: new Date(t + ':00Z').toISOString(),
          value: temps[i],
        })),
      });
    }
    return out;
  },
};
