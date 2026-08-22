/**
 * One-off, resumable ERA5 backfill: fetches decade chunks per city with
 * generous pauses (the archive rate-limits by request weight; two full-range
 * attempts returned HTTP 429 and "fetch failed"), and upserts PER CITY so
 * progress survives an abort. The scheduled era5:history job keeps the series
 * fresh afterwards with cheap 7-day windows.
 *
 * Usage: tsx scripts/backfill-era5.ts <cityFrom> <cityTo>   (indices, inclusive)
 */
import { createClient } from '@supabase/supabase-js';

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
const VARS = [
  { key: 'temperature_2m_mean', label: 'Daily mean temperature', unit: '°C' },
  { key: 'precipitation_sum', label: 'Daily precipitation', unit: 'mm' },
];

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchChunk(city: (typeof CITIES)[0], from: string, to: string) {
  const url = 'https://archive-api.open-meteo.com/v1/archive' +
    `?latitude=${city.lat}&longitude=${city.lon}&start_date=${from}&end_date=${to}` +
    `&daily=${VARS.map((v) => v.key).join(',')}&timezone=UTC`;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) { console.log('  429, sleeping 90s'); await sleep(90_000); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json() as { daily?: Record<string, (string | number | null)[]> };
    } catch (e) {
      console.log(`  attempt ${attempt + 1} failed: ${e}`); await sleep(20_000);
    }
  }
  throw new Error('chunk failed after retries');
}

async function main() {
  const from = Number(process.argv[2] ?? 0);
  const to = Number(process.argv[3] ?? CITIES.length - 1);
  const end = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  for (let ci = from; ci <= to; ci++) {
    const city = CITIES[ci];
    const byVar = new Map<string, { ts: string; value: number | null }[]>(VARS.map((v) => [v.key, []]));
    for (let y = 1940; y <= Number(end.slice(0, 4)); y += 10) {
      const f = `${y}-01-01`;
      const t = `${y + 9}-12-31` > end ? end : `${y + 9}-12-31`;
      const body = await fetchChunk(city, f, t);
      const time = (body.daily?.time ?? []) as string[];
      for (const v of VARS) {
        const vals = (body.daily?.[v.key] ?? []) as (number | null)[];
        byVar.get(v.key)!.push(...time.map((tt, i) => ({
          ts: `${tt}T00:00:00Z`, value: typeof vals[i] === 'number' ? vals[i] : null,
        })));
      }
      await sleep(2500);
    }
    for (const v of VARS) {
      const obs = byVar.get(v.key)!;
      const { data: series, error: sErr } = await db.from('series').upsert({
        source_id: 'era5',
        external_id: `era5:${v.key}:${city.name.toLowerCase().replace(/ /g, '-')}`,
        title: `${v.label} ${city.name} (since 1940)`,
        domain: 'climate', geo_code: city.geo, unit: v.unit, frequency: 'daily',
        metadata: { city: city.name, lat: city.lat, lon: city.lon, reanalysis: 'ERA5' },
      }, { onConflict: 'source_id,external_id' }).select('id').single();
      if (sErr) throw new Error(JSON.stringify(sErr));
      for (let i = 0; i < obs.length; i += 5000) {
        const chunk = obs.slice(i, i + 5000).map((o) => ({ series_id: series!.id, ts: o.ts, value: o.value }));
        const { error: oErr } = await db.from('observations').upsert(chunk, { onConflict: 'series_id,ts' });
        if (oErr) throw new Error(JSON.stringify(oErr));
      }
      console.log(`${city.name} ${v.key}: ${obs.length} rows`);
    }
  }
  console.log('done', from, 'to', to);
}
main();
