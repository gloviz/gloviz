import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/**
 * UK National Grid Carbon Intensity. No key, half-hourly, and unique in this
 * catalogue: it publishes **its own forecast alongside the actual value**, so
 * Orbit's Forecast tool can be compared against an operator's projection.
 */

const FUELS = ['gas', 'coal', 'nuclear', 'wind', 'solar', 'hydro', 'biomass', 'imports', 'other'];

export const carbonIntensity: Adapter = {
  sourceId: 'carbonintensity',
  job: 'carbonintensity:uk',
  async fetch(window: FetchWindow): Promise<SeriesPayload[]> {
    // The API serves at most 14 days per request, so page by week.
    const from = new Date(Math.max(window.start.getTime(), Date.now() - 30 * 86_400_000));
    const actual: { ts: string; value: number | null }[] = [];
    const forecast: { ts: string; value: number | null }[] = [];
    const week = 7 * 86_400_000;
    for (let t = from.getTime(); t < Date.now(); t += week) {
      const a = new Date(t).toISOString().slice(0, 16) + 'Z';
      const b = new Date(Math.min(t + week, Date.now())).toISOString().slice(0, 16) + 'Z';
      const res = await fetchWithRetry(`https://api.carbonintensity.org.uk/intensity/${a}/${b}`);
      const body = await res.json();
      for (const r of body?.data ?? []) {
        const ts = new Date(r.from).toISOString();
        if (typeof r.intensity?.actual === 'number') actual.push({ ts, value: r.intensity.actual });
        if (typeof r.intensity?.forecast === 'number') forecast.push({ ts, value: r.intensity.forecast });
      }
    }

    const out: SeriesPayload[] = [];
    const mk = (id: string, title: string, obs: typeof actual, unit: string): void => {
      if (obs.length < 2) return;
      out.push({
        externalId: id,
        title,
        domain: 'energy',
        geoCode: 'GB',
        unit,
        frequency: '30 minutes',
        metadata: { source: 'carbonintensity.org.uk' },
        observations: obs.sort((x, y) => x.ts.localeCompare(y.ts)),
      });
    };
    mk('ci:intensity:actual', 'Grid CO2 intensity GB', actual, 'gCO2/kWh');
    mk('ci:intensity:forecast', 'Grid CO2 intensity forecast GB', forecast, 'gCO2/kWh');

    // Generation mix: one snapshot per run, appended like OpenSky.
    try {
      const res = await fetchWithRetry('https://api.carbonintensity.org.uk/generation');
      const body = await res.json();
      const ts = new Date(body?.data?.from ?? Date.now()).toISOString();
      for (const f of body?.data?.generationmix ?? []) {
        if (!FUELS.includes(f.fuel)) continue;
        out.push({
          externalId: `ci:mix:${f.fuel}`,
          title: `Generation mix, ${f.fuel} GB`,
          domain: 'energy',
          geoCode: 'GB',
          unit: '% of generation',
          frequency: '30 minutes',
          metadata: { fuel: f.fuel },
          observations: [{ ts, value: Number(f.perc) }],
        });
      }
    } catch (err) {
      console.warn(`carbonintensity mix: ${(err as Error).message.slice(0, 120)}`);
    }
    return out;
  },
};
