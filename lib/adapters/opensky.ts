import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/**
 * OpenSky Network: every aircraft currently transmitting ADS-B. The API returns
 * a snapshot, not a history, so each run appends one point per region: how many
 * aircraft were in the air at that moment, and how high they were flying.
 *
 * NON-COMMERCIAL USE ONLY (docs/02-data-sources.md). Anonymous access is rate
 * limited, which is why this runs hourly and never in a loop.
 */

const REGIONS: { name: string; geo: string; box: [number, number, number, number] }[] = [
  // lamin, lomin, lamax, lomax
  { name: 'Europe', geo: 'EU', box: [35, -11, 60, 30] },
  { name: 'North America', geo: 'NA', box: [25, -125, 50, -66] },
  { name: 'East Asia', geo: 'AS', box: [20, 100, 46, 146] },
  { name: 'Nordics', geo: 'NORDIC', box: [55, 4, 71, 32] },
];

/** state vector indices, see the OpenSky API docs */
const BARO_ALTITUDE = 7;
const VELOCITY = 9;
const ON_GROUND = 8;

export const openskyFlights: Adapter = {
  sourceId: 'opensky',
  job: 'opensky:flights',
  async fetch(_window: FetchWindow): Promise<SeriesPayload[]> {
    const out: SeriesPayload[] = [];
    for (const r of REGIONS) {
      const [lamin, lomin, lamax, lomax] = r.box;
      let body: any;
      try {
        const res = await fetchWithRetry(
          `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`,
          { headers: { 'User-Agent': 'gloviz.app' } },
          2,
        );
        body = await res.json();
      } catch (err) {
        console.warn(`opensky ${r.name}: ${(err as Error).message.slice(0, 120)}`);
        continue;
      }
      const states: any[] = (body?.states ?? []).filter((s: any) => !s[ON_GROUND]);
      if (!states.length) continue;
      const ts = new Date((body.time ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();

      const altitudes = states.map((s) => s[BARO_ALTITUDE]).filter((v: any) => typeof v === 'number');
      const speeds = states.map((s) => s[VELOCITY]).filter((v: any) => typeof v === 'number');
      const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

      out.push({
        externalId: `opensky:count:${r.geo}`,
        title: `Aircraft airborne ${r.name}`,
        domain: 'transport',
        geoCode: r.geo,
        unit: 'aircraft',
        frequency: 'hourly',
        metadata: { box: r.box },
        observations: [{ ts, value: states.length }],
      });
      out.push({
        externalId: `opensky:altitude:${r.geo}`,
        title: `Mean cruising altitude ${r.name}`,
        domain: 'transport',
        geoCode: r.geo,
        unit: 'metres',
        frequency: 'hourly',
        metadata: { box: r.box },
        observations: [{ ts, value: mean(altitudes) === null ? null : Math.round(mean(altitudes)!) }],
      });
      out.push({
        externalId: `opensky:speed:${r.geo}`,
        title: `Mean ground speed ${r.name}`,
        domain: 'transport',
        geoCode: r.geo,
        unit: 'm/s',
        frequency: 'hourly',
        metadata: { box: r.box },
        observations: [{ ts, value: mean(speeds) === null ? null : Math.round(mean(speeds)!) }],
      });
    }
    return out;
  },
};
