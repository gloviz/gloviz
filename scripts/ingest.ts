import { writeClient } from '../lib/supabase';
import { Adapter, FetchWindow } from '../lib/adapters/types';
import { entsoeDayAhead } from '../lib/adapters/entsoe';
import { openMeteoTemperature } from '../lib/adapters/openmeteo';
import { worldBankIndicators } from '../lib/adapters/worldbank';
import { ecbFx } from '../lib/adapters/ecb';
import { usgsQuakes } from '../lib/adapters/usgs';
import { owidIndicators } from '../lib/adapters/owid';
import { whoIndicators } from '../lib/adapters/who';
import { nasaPower } from '../lib/adapters/nasapower';
import { fredSeries } from '../lib/adapters/fred';
import { openaqAir } from '../lib/adapters/openaq';
import { eurostat } from '../lib/adapters/eurostat';
import { oecd } from '../lib/adapters/oecd';
import { gbifOccurrences } from '../lib/adapters/gbif';
import { openskyFlights } from '../lib/adapters/opensky';

export const ADAPTERS: Adapter[] = [
  entsoeDayAhead,
  openMeteoTemperature,
  worldBankIndicators,
  ecbFx,
  usgsQuakes,
  owidIndicators,
  whoIndicators,
  nasaPower,
  fredSeries,
  openaqAir,
  eurostat,
  oecd,
  gbifOccurrences,
  openskyFlights,
];

const CHUNK = 5000;

async function runAdapter(adapter: Adapter, window: FetchWindow): Promise<void> {
  const db = writeClient();
  const started = Date.now();
  const { data: run, error: runErr } = await db
    .from('ingestion_runs')
    .insert({ source_id: adapter.sourceId, job: adapter.job })
    .select('id')
    .single();
  if (runErr) throw runErr;

  let rowsWritten = 0;
  let status = 'success';
  let errorMsg: string | null = null;
  try {
    const payloads = await adapter.fetch(window);
    if (payloads.length === 0) status = 'partial'; // reachable but empty
    for (const p of payloads) {
      const { data: series, error: sErr } = await db
        .from('series')
        .upsert(
          {
            source_id: adapter.sourceId,
            external_id: p.externalId,
            title: p.title,
            domain: p.domain,
            geo_code: p.geoCode,
            unit: p.unit,
            frequency: p.frequency,
            metadata: p.metadata ?? {},
          },
          { onConflict: 'source_id,external_id' },
        )
        .select('id')
        .single();
      if (sErr) throw sErr;
      for (let i = 0; i < p.observations.length; i += CHUNK) {
        const chunk = p.observations
          .slice(i, i + CHUNK)
          .map((o) => ({ series_id: series.id, ts: o.ts, value: o.value }));
        const { error: oErr } = await db
          .from('observations')
          .upsert(chunk, { onConflict: 'series_id,ts' });
        if (oErr) throw oErr;
        rowsWritten += chunk.length;
      }
    }
  } catch (err) {
    status = 'error';
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  await db
    .from('ingestion_runs')
    .update({
      finished_at: new Date().toISOString(),
      status,
      rows_written: rowsWritten,
      duration_ms: Date.now() - started,
      error: errorMsg,
    })
    .eq('id', run.id);

  console.log(`${adapter.job}: ${status}, ${rowsWritten} rows`);
  if (status === 'error') throw new Error(`${adapter.job} failed: ${errorMsg}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const daysIdx = args.indexOf('--days');
  const days = daysIdx >= 0 ? Number(args[daysIdx + 1]) : 3;
  const jobs = args.filter((a, i) => !a.startsWith('--') && i !== daysIdx + 1);

  // Reach two days past "now": day-ahead prices publish ~12:45 CET.
  const end = new Date(Date.now() + 2 * 86_400_000);
  const start = new Date(Date.now() - days * 86_400_000);
  const window: FetchWindow = { start, end };

  const selected = jobs.length
    ? ADAPTERS.filter((a) => jobs.includes(a.job))
    : ADAPTERS;
  if (selected.length === 0) throw new Error(`No adapter matches: ${jobs.join(', ')}`);

  // One broken adapter does not stop the others; process still exits non-zero.
  let failed = false;
  for (const adapter of selected) {
    const missing = (adapter.requiredEnv ?? []).filter((k) => !process.env[k]);
    if (missing.length) {
      console.warn(`${adapter.job}: skipped, missing env ${missing.join(', ')}`);
      continue;
    }
    try {
      await runAdapter(adapter, window);
    } catch (err) {
      failed = true;
      console.error(err);
    }
  }
  if (failed) process.exit(1);
}

main();
