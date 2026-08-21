import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/**
 * OpenAQ v3: air quality from ~2,000 networks worldwide. One daily mean per
 * city and pollutant, built from the sensor measurements in that city's
 * bounding box. CC BY 4.0. Key is free and issued instantly.
 */

const CITIES: { name: string; geo: string; lat: number; lon: number }[] = [
  { name: 'Oslo', geo: 'NO', lat: 59.91, lon: 10.75 },
  { name: 'London', geo: 'GB', lat: 51.51, lon: -0.13 },
  { name: 'Paris', geo: 'FR', lat: 48.85, lon: 2.35 },
  { name: 'Berlin', geo: 'DE', lat: 52.52, lon: 13.41 },
  { name: 'Madrid', geo: 'ES', lat: 40.42, lon: -3.7 },
  { name: 'Delhi', geo: 'IN', lat: 28.61, lon: 77.21 },
  { name: 'Beijing', geo: 'CN', lat: 39.9, lon: 116.41 },
  { name: 'Los Angeles', geo: 'US', lat: 34.05, lon: -118.24 },
  { name: 'New York', geo: 'US', lat: 40.71, lon: -74.01 },
  { name: 'Mexico City', geo: 'MX', lat: 19.43, lon: -99.13 },
  { name: 'Sao Paulo', geo: 'BR', lat: -23.55, lon: -46.63 },
  { name: 'Bangkok', geo: 'TH', lat: 13.76, lon: 100.5 },
];

/** OpenAQ parameter ids: 2 = PM2.5, 1 = PM10, 7 = NO2. */
const PARAMETERS = [
  { id: 2, name: 'pm25', title: 'PM2.5', unit: 'µg/m³' },
  { id: 1, name: 'pm10', title: 'PM10', unit: 'µg/m³' },
  { id: 7, name: 'no2', title: 'NO2', unit: 'µg/m³' },
];

const RADIUS_DEG = 0.35;

async function api(path: string, key: string): Promise<any> {
  const res = await fetchWithRetry(`https://api.openaq.org/v3${path}`, {
    headers: { 'X-API-Key': key },
  });
  return res.json();
}

export const openaqAir: Adapter = {
  sourceId: 'openaq',
  job: 'openaq:air',
  requiredEnv: ['OPENAQ_API_KEY'],
  async fetch(window: FetchWindow): Promise<SeriesPayload[]> {
    const key = process.env.OPENAQ_API_KEY!;
    const from = new Date(Math.max(window.start.getTime(), Date.now() - 90 * 86_400_000));
    const out: SeriesPayload[] = [];

    for (const city of CITIES) {
      const bbox = [
        (city.lon - RADIUS_DEG).toFixed(3), (city.lat - RADIUS_DEG).toFixed(3),
        (city.lon + RADIUS_DEG).toFixed(3), (city.lat + RADIUS_DEG).toFixed(3),
      ].join(',');

      for (const p of PARAMETERS) {
        // Find one active sensor for this pollutant in the city.
        const locations = await api(
          `/locations?bbox=${bbox}&parameters_id=${p.id}&limit=20`, key,
        );
        const sensor = (locations.results ?? [])
          .flatMap((l: any) => (l.sensors ?? []).map((s: any) => ({ ...s, location: l.name })))
          .find((s: any) => s.parameter?.id === p.id);
        if (!sensor) continue;

        const days = await api(
          `/sensors/${sensor.id}/days?datetime_from=${from.toISOString().slice(0, 10)}&limit=365`,
          key,
        );
        const observations = (days.results ?? [])
          .map((r: any) => ({
            ts: new Date(r.period?.datetimeFrom?.utc ?? r.period?.datetimeTo?.utc).toISOString(),
            value: typeof r.value === 'number' ? r.value : null,
          }))
          .filter((o: any) => o.ts && !Number.isNaN(new Date(o.ts).getTime()));
        if (observations.length < 2) continue;

        out.push({
          externalId: `openaq:${p.name}:${city.name.toLowerCase().replace(/ /g, '-')}`,
          title: `${p.title} ${city.name}`,
          domain: 'environment',
          geoCode: city.geo,
          unit: p.unit,
          frequency: 'daily',
          metadata: { city: city.name, parameter: p.name, sensorId: sensor.id, station: sensor.location },
          observations: observations.sort((a: any, b: any) => a.ts.localeCompare(b.ts)),
        });
      }
    }
    return out;
  },
};
