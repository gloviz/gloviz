import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/** USGS earthquakes M4.5+, aggregated per UTC day: count and max magnitude. */

export const usgsQuakes: Adapter = {
  sourceId: 'usgs',
  job: 'usgs:quakes',
  async fetch(window: FetchWindow): Promise<SeriesPayload[]> {
    const url =
      'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson' +
      `&starttime=${window.start.toISOString()}&endtime=${window.end.toISOString()}` +
      '&minmagnitude=4.5&limit=20000&orderby=time-asc';
    const res = await fetchWithRetry(url);
    const body = await res.json();
    const byDay = new Map<string, { count: number; maxMag: number }>();
    for (const f of body.features ?? []) {
      const day = new Date(f.properties.time).toISOString().slice(0, 10);
      const e = byDay.get(day) ?? { count: 0, maxMag: 0 };
      e.count += 1;
      e.maxMag = Math.max(e.maxMag, f.properties.mag ?? 0);
      byDay.set(day, e);
    }
    const days = [...byDay.keys()].sort();
    const mk = (
      ext: string, title: string, unit: string, pick: (e: { count: number; maxMag: number }) => number,
    ): SeriesPayload => ({
      externalId: ext,
      title,
      domain: 'environment',
      geoCode: 'WORLD',
      unit,
      frequency: 'daily',
      observations: days.map((d) => ({ ts: `${d}T00:00:00Z`, value: pick(byDay.get(d)!) })),
    });
    return [
      mk('quakes:count:m45', 'Earthquakes per day (M4.5+)', 'count', (e) => e.count),
      mk('quakes:maxmag', 'Strongest earthquake per day', 'magnitude', (e) => e.maxMag),
    ];
  },
};
