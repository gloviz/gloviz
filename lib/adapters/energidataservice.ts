import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/**
 * Energi Data Service (Energinet, DK). No key, and the fastest data in GLOVIZ:
 * CO2 intensity every five minutes, day-ahead prices per hour for the Nordic
 * and German bidding zones, and the live Danish power system every minute.
 *
 * Two things that bite:
 * 1. `Elspotprices` is frozen at 2025-09-30. The live dataset is
 *    **`DayAheadPrices`**, and its time column is `TimeUTC`, not `HourUTC`.
 * 2. Sorting by a column the dataset does not have returns HTTP 400, so every
 *    request here names the column that dataset actually uses.
 */

const BASE = 'https://api.energidataservice.dk/dataset';

interface Row { [k: string]: any }

async function eds(dataset: string, params: Record<string, string>): Promise<Row[]> {
  const q = new URLSearchParams(params).toString();
  const res = await fetchWithRetry(`${BASE}/${dataset}?${q}`);
  const body = await res.json();
  return body?.records ?? [];
}

const iso = (s: string) => new Date(`${s.replace(' ', 'T')}Z`).toISOString();

export const energiDataService: Adapter = {
  sourceId: 'energidataservice',
  job: 'eds:power',
  async fetch(window: FetchWindow): Promise<SeriesPayload[]> {
    const start = new Date(Math.max(window.start.getTime(), Date.now() - 30 * 86_400_000))
      .toISOString().slice(0, 16);
    const out: SeriesPayload[] = [];

    // 1. Day-ahead prices per bidding zone. This is the ENTSO-E stand-in:
    //    Energinet republishes the Nord Pool result for its neighbours too.
    const prices = await eds('DayAheadPrices', {
      start, limit: '20000', sort: 'TimeUTC ASC',
    });
    const byArea = new Map<string, { ts: string; value: number | null }[]>();
    for (const r of prices) {
      const area = r.PriceArea;
      const v = r.DayAheadPriceEUR;
      if (!area || v === null || v === undefined) continue;
      if (!byArea.has(area)) byArea.set(area, []);
      byArea.get(area)!.push({ ts: iso(r.TimeUTC), value: Number(v) });
    }
    for (const [area, observations] of byArea) {
      if (observations.length < 2) continue;
      out.push({
        externalId: `eds:dayahead:${area}`,
        title: `Day-ahead power price ${area}`,
        domain: 'energy',
        geoCode: area,
        unit: 'EUR/MWh',
        frequency: 'hourly',
        metadata: { dataset: 'DayAheadPrices' },
        observations,
      });
    }

    // 2. CO2 intensity of Danish electricity, every five minutes.
    const co2 = await eds('CO2Emis', {
      start, limit: '20000', sort: 'Minutes5UTC ASC',
    });
    const byCo2 = new Map<string, { ts: string; value: number | null }[]>();
    for (const r of co2) {
      const area = r.PriceArea;
      if (!area || r.CO2Emission === null) continue;
      if (!byCo2.has(area)) byCo2.set(area, []);
      byCo2.get(area)!.push({ ts: iso(r.Minutes5UTC), value: Number(r.CO2Emission) });
    }
    for (const [area, observations] of byCo2) {
      if (observations.length < 2) continue;
      out.push({
        externalId: `eds:co2:${area}`,
        title: `Grid CO2 intensity ${area}`,
        domain: 'energy',
        geoCode: area,
        unit: 'g/kWh',
        frequency: '5 minutes',
        metadata: { dataset: 'CO2Emis' },
        observations,
      });
    }

    // 3. The Danish power system right now, one series per generation type.
    const now = await eds('PowerSystemRightNow', {
      start, limit: '20000', sort: 'Minutes1UTC ASC',
    });
    const LIVE: { key: string; title: string; unit: string }[] = [
      { key: 'OffshoreWindPower', title: 'Offshore wind generation', unit: 'MW' },
      { key: 'OnshoreWindPower', title: 'Onshore wind generation', unit: 'MW' },
      { key: 'SolarPower', title: 'Solar generation', unit: 'MW' },
      { key: 'ProductionGe100MW', title: 'Central power generation', unit: 'MW' },
      { key: 'Exchange_Sum', title: 'Net exchange with neighbours', unit: 'MW' },
    ];
    for (const l of LIVE) {
      const observations = now
        .filter((r) => r[l.key] !== null && r[l.key] !== undefined)
        .map((r) => ({ ts: iso(r.Minutes1UTC), value: Number(r[l.key]) }));
      if (observations.length < 2) continue;
      out.push({
        externalId: `eds:live:${l.key}`,
        title: `${l.title} DK`,
        domain: 'energy',
        geoCode: 'DK',
        unit: l.unit,
        frequency: 'minute',
        metadata: { dataset: 'PowerSystemRightNow', column: l.key },
        observations,
      });
    }
    return out;
  },
};
