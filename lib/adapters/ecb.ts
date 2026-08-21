import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/** ECB daily FX reference rates (SDMX-JSON, no key). */

const CURRENCIES = ['USD', 'GBP', 'NOK', 'SEK', 'CHF', 'JPY'];

export const ecbFx: Adapter = {
  sourceId: 'ecb',
  job: 'ecb:fx',
  async fetch(window: FetchWindow): Promise<SeriesPayload[]> {
    const start = window.start.toISOString().slice(0, 10);
    const out: SeriesPayload[] = [];
    for (const cur of CURRENCIES) {
      const url =
        `https://data-api.ecb.europa.eu/service/data/EXR/D.${cur}.EUR.SP00.A` +
        `?format=jsondata&startPeriod=${start}`;
      const res = await fetchWithRetry(url, { headers: { Accept: 'application/json' } });
      const text = await res.text();
      if (!text) continue; // no data in window
      const body = JSON.parse(text);
      const dates: { id: string }[] =
        body?.structure?.dimensions?.observation?.[0]?.values ?? [];
      const seriesObj = body?.dataSets?.[0]?.series ?? {};
      const first = seriesObj[Object.keys(seriesObj)[0] ?? ''];
      const obs: Record<string, number[]> = first?.observations ?? {};
      out.push({
        externalId: `EXR:D.${cur}.EUR.SP00.A`,
        title: `${cur} per EUR`,
        domain: 'finance',
        geoCode: 'EU',
        unit: `${cur}/EUR`,
        frequency: 'daily',
        observations: Object.entries(obs).map(([idx, v]) => ({
          ts: `${dates[Number(idx)].id}T00:00:00Z`,
          value: v?.[0] ?? null,
        })),
      });
    }
    return out;
  },
};
