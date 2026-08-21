import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/**
 * USGS earthquakes M4.0+, aggregated per UTC day: global count, strongest magnitude,
 * released energy, and per-region counts. Public domain.
 */

const REGIONS: { name: string; test: (lat: number, lon: number) => boolean }[] = [
  { name: 'Americas', test: (_la, lo) => lo < -30 },
  { name: 'Europe & Africa', test: (_la, lo) => lo >= -30 && lo < 60 },
  { name: 'Asia & Oceania', test: (_la, lo) => lo >= 60 },
];

export const usgsQuakes: Adapter = {
  sourceId: 'usgs',
  job: 'usgs:quakes',
  async fetch(window: FetchWindow): Promise<SeriesPayload[]> {
    // The FDSN API caps a response at 20k events; page by month.
    type Day = { count: number; maxMag: number; energy: number; byRegion: Record<string, number> };
    const byDay = new Map<string, Day>();
    const monthMs = 30 * 86_400_000;
    for (let t = window.start.getTime(); t < window.end.getTime(); t += monthMs) {
      const s = new Date(t);
      const e = new Date(Math.min(t + monthMs, window.end.getTime()));
      const url =
        'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson' +
        `&starttime=${s.toISOString()}&endtime=${e.toISOString()}` +
        '&minmagnitude=4.0&limit=20000&orderby=time-asc';
      const res = await fetchWithRetry(url);
      const body = await res.json();
      for (const f of body.features ?? []) {
        const day = new Date(f.properties.time).toISOString().slice(0, 10);
        const d: Day = byDay.get(day) ?? { count: 0, maxMag: 0, energy: 0, byRegion: {} };
        const mag = f.properties.mag ?? 0;
        d.count += 1;
        d.maxMag = Math.max(d.maxMag, mag);
        // Gutenberg-Richter: log10(E) = 1.5 M + 4.8 joules; report as gigajoules.
        d.energy += 10 ** (1.5 * mag + 4.8) / 1e9;
        const [lon, lat] = f.geometry?.coordinates ?? [0, 0];
        const region = REGIONS.find((r) => r.test(lat, lon))?.name ?? 'Americas';
        d.byRegion[region] = (d.byRegion[region] ?? 0) + 1;
        byDay.set(day, d);
      }
    }
    const days = [...byDay.keys()].sort();
    const mk = (
      ext: string, title: string, unit: string, geo: string, pick: (d: Day) => number,
    ): SeriesPayload => ({
      externalId: ext,
      title,
      domain: 'environment',
      geoCode: geo,
      unit,
      frequency: 'daily',
      observations: days.map((d) => ({ ts: `${d}T00:00:00Z`, value: pick(byDay.get(d)!) })),
    });
    return [
      mk('quakes:count:m40', 'Earthquakes per day (M4.0+)', 'count', 'WORLD', (d) => d.count),
      mk('quakes:maxmag', 'Strongest earthquake per day', 'magnitude', 'WORLD', (d) => d.maxMag),
      mk('quakes:energy', 'Seismic energy released per day', 'GJ', 'WORLD', (d) =>
        Math.round(d.energy)),
      ...REGIONS.map((r) =>
        mk(
          `quakes:count:${r.name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
          `Earthquakes per day, ${r.name}`,
          'count',
          r.name,
          (d) => d.byRegion[r.name] ?? 0,
        ),
      ),
    ];
  },
};
