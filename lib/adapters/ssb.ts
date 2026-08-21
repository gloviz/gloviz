import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';
import { parseJsonStat } from '../parsers/jsonstat';
import { sdmxPeriodToIso } from '../parsers/sdmx';

/**
 * Statistics Norway (SSB), through the same JSON-stat parser Eurostat uses.
 * POST a query, get JSON-stat 2.0 back. No key.
 *
 * Norwegian sources are used where they are genuinely the best, but nothing in
 * the interface is Norway-first (docs/00-decisions.md item 4).
 */

const TABLES: {
  table: string; title: string; unit: string; domain: string; frequency: string;
  query: any[]; valueDim?: string;
}[] = [
  {
    table: '03013', title: 'Consumer price index NO', unit: 'index 2015=100',
    domain: 'economy', frequency: 'monthly',
    query: [
      { code: 'Konsumgrp', selection: { filter: 'item', values: ['TOTAL'] } },
      { code: 'ContentsCode', selection: { filter: 'item', values: ['KpiIndMnd'] } },
      { code: 'Tid', selection: { filter: 'top', values: ['180'] } },
    ],
  },
  {
    table: '08517', title: 'Unemployment NO', unit: '% of labour force',
    domain: 'economy', frequency: 'monthly',
    query: [
      { code: 'ContentsCode', selection: { filter: 'item', values: ['Prosent'] } },
      { code: 'Tid', selection: { filter: 'top', values: ['120'] } },
    ],
  },
  {
    table: '09364', title: 'Electricity production NO', unit: 'GWh',
    domain: 'energy', frequency: 'monthly',
    query: [{ code: 'Tid', selection: { filter: 'top', values: ['120'] } }],
  },
];

export const ssb: Adapter = {
  sourceId: 'ssb',
  job: 'ssb:indicators',
  async fetch(_window: FetchWindow): Promise<SeriesPayload[]> {
    const out: SeriesPayload[] = [];
    for (const t of TABLES) {
      let body: any;
      try {
        const res = await fetchWithRetry(`https://data.ssb.no/api/v0/en/table/${t.table}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: t.query, response: { format: 'json-stat2' } }),
        });
        body = await res.json();
      } catch (err) {
        console.warn(`ssb ${t.table}: ${(err as Error).message.slice(0, 160)}`);
        continue;
      }

      // The time dimension is 'Tid'; every other dimension is a breakdown we
      // asked to be a single value, so the series is the time axis alone.
      const points = parseJsonStat(body)
        .map((p) => ({ ts: sdmxPeriodToIso(p.dims.Tid ?? '') ?? '', value: p.value }))
        .filter((p) => p.ts)
        .sort((a, b) => a.ts.localeCompare(b.ts));
      if (points.length < 2) continue;

      out.push({
        externalId: `ssb:${t.table}`,
        title: t.title,
        domain: t.domain,
        geoCode: 'NOR',
        unit: t.unit,
        frequency: t.frequency,
        metadata: { table: t.table },
        observations: points,
      });
    }
    return out;
  },
};
