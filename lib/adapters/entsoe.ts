import { XMLParser } from 'fast-xml-parser';
import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/**
 * ENTSO-E day-ahead prices (documentType A44).
 * Three things that bite everyone (docs/02-data-sources.md):
 * 1. Resolution is per-Period, not per-request (PT60M vs PT15M since Oct 2025).
 * 2. Point positions are sparse: a missing position means "same as previous".
 * 3. "No data" is HTTP 200 with an Acknowledgement_MarketDocument.
 * Also: prices can be negative; TimeSeries overlap at day boundaries
 * (deduped by the (series_id, ts) PK upsert).
 */

const ZONES: Record<string, string> = {
  '10YNO-1--------2': 'NO1',
  '10YNO-2--------T': 'NO2',
  '10YNO-3--------J': 'NO3',
  '10YNO-4--------9': 'NO4',
  '10Y1001A1001A48H': 'NO5',
  '10Y1001A1001A82H': 'DE-LU',
  '10YFR-RTE------C': 'FR',
  '10YNL----------L': 'NL',
  '10YBE----------2': 'BE',
  '10YES-REE------0': 'ES',
  '10YPL-AREA-----S': 'PL',
  '10YFI-1--------U': 'FI',
};

const RESOLUTION_MS: Record<string, number> = {
  PT15M: 15 * 60_000,
  PT30M: 30 * 60_000,
  PT60M: 60 * 60_000,
  P1D: 24 * 60 * 60_000,
};

function fmt(d: Date): string {
  return d.toISOString().replace(/[-:]|\.\d{3}/g, '').slice(0, 12);
}

function asArray<T>(x: T | T[] | undefined): T[] {
  if (x === undefined) return [];
  return Array.isArray(x) ? x : [x];
}

export function parseDayAhead(xml: string, zoneEic: string): SeriesPayload | null {
  const parser = new XMLParser({ ignoreAttributes: false });
  const doc = parser.parse(xml);

  if (doc.Acknowledgement_MarketDocument) return null; // "no data" is not an error

  const root = doc.Publication_MarketDocument;
  if (!root) throw new Error('Unexpected ENTSO-E response shape');

  const byTs = new Map<string, number>(); // last-write-wins dedupe across TimeSeries
  for (const ts of asArray<any>(root.TimeSeries)) {
    for (const period of asArray<any>(ts.Period)) {
      const resolution: string = period.resolution;
      const stepMs = RESOLUTION_MS[resolution];
      if (!stepMs) throw new Error(`Unknown resolution ${resolution}`);
      const start = new Date(period.timeInterval.start);
      const end = new Date(period.timeInterval.end);
      const points = asArray<any>(period.Point);
      const byPos = new Map<number, number>();
      for (const p of points) byPos.set(Number(p.position), Number(p['price.amount']));
      const nPositions = Math.round((end.getTime() - start.getTime()) / stepMs);
      let current: number | undefined;
      for (let pos = 1; pos <= nPositions; pos++) {
        if (byPos.has(pos)) current = byPos.get(pos);
        // sparse position = repeat previous value, not "no data"
        if (current === undefined) continue;
        const t = new Date(start.getTime() + (pos - 1) * stepMs);
        byTs.set(t.toISOString(), current);
      }
    }
  }

  const zone = ZONES[zoneEic] ?? zoneEic;
  return {
    externalId: `${zoneEic}:A44`,
    title: `Day-ahead price ${zone}`,
    domain: 'energy',
    geoCode: zone,
    unit: 'EUR/MWh',
    frequency: 'PT60M/PT15M',
    metadata: { zoneEic },
    observations: [...byTs.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ts, value]) => ({ ts, value })),
  };
}

export const entsoeDayAhead: Adapter = {
  sourceId: 'entsoe',
  job: 'entsoe:day-ahead',
  requiredEnv: ['ENTSOE_API_TOKEN'],
  async fetch(window: FetchWindow): Promise<SeriesPayload[]> {
    const token = process.env.ENTSOE_API_TOKEN;
    if (!token) throw new Error('ENTSOE_API_TOKEN is not set');
    const out: SeriesPayload[] = [];
    for (const zoneEic of Object.keys(ZONES)) {
      const url =
        'https://web-api.tp.entsoe.eu/api' +
        `?securityToken=${token}&documentType=A44` +
        `&in_Domain=${zoneEic}&out_Domain=${zoneEic}` +
        `&periodStart=${fmt(window.start)}&periodEnd=${fmt(window.end)}`;
      const res = await fetchWithRetry(url);
      const payload = parseDayAhead(await res.text(), zoneEic);
      if (payload) out.push(payload);
    }
    return out;
  },
};
