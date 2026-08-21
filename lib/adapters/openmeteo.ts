import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/**
 * Open-Meteo hourly weather for 30 world cities, four variables each.
 * No key. CC BY 4.0. NOTE: free tier is non-commercial only (docs/02).
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

const VARIABLES: { key: string; label: string; unit: string; domain: string }[] = [
  { key: 'temperature_2m', label: 'Temperature', unit: '°C', domain: 'climate' },
  { key: 'relative_humidity_2m', label: 'Humidity', unit: '%', domain: 'climate' },
  { key: 'wind_speed_10m', label: 'Wind speed', unit: 'km/h', domain: 'climate' },
  { key: 'surface_pressure', label: 'Surface pressure', unit: 'hPa', domain: 'climate' },
];

const CHUNK = 10; // cities per request

export const openMeteoTemperature: Adapter = {
  sourceId: 'open-meteo',
  job: 'open-meteo:weather',
  async fetch(window: FetchWindow): Promise<SeriesPayload[]> {
    const pastDays = Math.min(
      92,
      Math.max(1, Math.ceil((Date.now() - window.start.getTime()) / 86_400_000)),
    );
    const out: SeriesPayload[] = [];
    for (let i = 0; i < CITIES.length; i += CHUNK) {
      const batch = CITIES.slice(i, i + CHUNK);
      const url =
        'https://api.open-meteo.com/v1/forecast' +
        `?latitude=${batch.map((c) => c.lat).join(',')}` +
        `&longitude=${batch.map((c) => c.lon).join(',')}` +
        `&hourly=${VARIABLES.map((v) => v.key).join(',')}` +
        `&past_days=${pastDays}&forecast_days=3&timezone=UTC`;
      const res = await fetchWithRetry(url);
      const body = await res.json();
      const locations = Array.isArray(body) ? body : [body];
      locations.forEach((loc: any, idx: number) => {
        const c = batch[idx];
        const times: string[] = loc.hourly?.time ?? [];
        for (const v of VARIABLES) {
          const values: (number | null)[] = loc.hourly?.[v.key] ?? [];
          if (!values.length) continue;
          out.push({
            externalId: `${v.key}:${c.name.toLowerCase().replace(/ /g, '-')}`,
            title: `${v.label} ${c.name}`,
            domain: v.domain,
            geoCode: c.geo,
            unit: v.unit,
            frequency: 'hourly',
            metadata: { lat: c.lat, lon: c.lon, city: c.name, variable: v.key },
            observations: times.map((t, j) => ({
              ts: new Date(t + ':00Z').toISOString(),
              value: values[j],
            })),
          });
        }
      });
    }
    return out;
  },
};
