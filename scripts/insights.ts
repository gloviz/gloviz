import { writeClient } from '../lib/supabase';

/**
 * Nightly insight job. Four passes, each idempotent:
 * 1. Records: is the latest value a high or low against its own history?
 * 2. Correlations: Pearson r for same-cadence pairs, strongest kept.
 * 3. Baselines: naive ("tomorrow = today") and drift forecasts for fast series,
 *    written to the same ledger the real forecasters go into.
 * 4. Scoring: fill in actuals for every forecast whose target time has passed.
 */

const db = writeClient();

interface SeriesRow {
  id: number; title: string; geo_code: string; frequency: string; source_id: string;
}

async function loadSeries(): Promise<SeriesRow[]> {
  const { data, error } = await db
    .from('series')
    .select('id, title, geo_code, frequency, source_id')
    .limit(3000);
  if (error) throw error;
  return data as SeriesRow[];
}

async function recent(id: number, take: number): Promise<{ ts: string; value: number }[]> {
  const { data } = await db
    .from('observations')
    .select('ts, value')
    .eq('series_id', id)
    .order('ts', { ascending: false })
    .limit(take);
  return ((data ?? []) as any[])
    .filter((o) => o.value !== null)
    .map((o) => ({ ts: o.ts, value: Number(o.value) }))
    .reverse();
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

/* 1 ---------------------------------------------------------------- */
async function detectRecords(all: SeriesRow[]): Promise<number> {
  // Sub-daily and daily series only: an annual series setting a "90-day high"
  // is meaningless.
  const fast = all.filter((s) =>
    ['hourly', 'minute', '5 minutes', '30 minutes', 'daily'].includes(s.frequency));
  let written = 0;
  for (const s of fast) {
    const obs = await recent(s.id, 1000);
    if (obs.length < 30) continue;
    const latest = obs[obs.length - 1];
    const history = obs.slice(0, -1).map((o) => o.value);
    const rows = [];
    if (latest.value >= Math.max(...history)) {
      rows.push({ series_id: s.id, kind: 'high', window_days: 90, value: latest.value, ts: latest.ts });
    }
    if (latest.value <= Math.min(...history)) {
      rows.push({ series_id: s.id, kind: 'low', window_days: 90, value: latest.value, ts: latest.ts });
    }
    for (const r of rows) {
      const { error } = await db.from('records')
        .upsert({ ...r, detected_at: new Date().toISOString() }, { onConflict: 'series_id,kind,window_days' });
      if (!error) written++;
    }
  }
  return written;
}

/* 2 ---------------------------------------------------------------- */
async function computeCorrelations(all: SeriesRow[]): Promise<number> {
  // Same cadence pairs only; sample to keep the run bounded.
  const groups: Record<string, SeriesRow[]> = {};
  for (const s of all) (groups[s.frequency] ??= []).push(s);
  let written = 0;
  for (const [freq, rows] of Object.entries(groups)) {
    if (!['hourly', 'daily', 'monthly'].includes(freq) || rows.length < 2) continue;
    const sample = rows.slice(0, 60); // bounded: 60 series -> <=1770 pairs
    const cache = new Map<number, { ts: string; value: number }[]>();
    const get = async (id: number) => {
      if (!cache.has(id)) cache.set(id, await recent(id, 400));
      return cache.get(id)!;
    };
    for (let i = 0; i < sample.length; i++) {
      for (let j = i + 1; j < sample.length; j++) {
        const a = await get(sample[i].id);
        const b = await get(sample[j].id);
        if (a.length < 20 || b.length < 20) continue;
        const bByTs = new Map(b.map((o) => [o.ts, o.value]));
        const xs: number[] = [], ys: number[] = [];
        for (const o of a) {
          const v = bByTs.get(o.ts);
          if (v !== undefined) { xs.push(o.value); ys.push(v); }
        }
        if (xs.length < 20) continue;
        const r = pearson(xs, ys);
        if (Math.abs(r) < 0.5) continue;
        // Credibility test: correlate the CHANGES. Trends correlate in levels
        // for free; only genuine co-movement survives differencing.
        const dx = xs.slice(1).map((v, k) => v - xs[k]);
        const dy = ys.slice(1).map((v, k) => v - ys[k]);
        const rDiff = pearson(dx, dy);
        const [lo, hi] = sample[i].id < sample[j].id
          ? [sample[i], sample[j]] : [sample[j], sample[i]];
        const { error } = await db.from('correlations').upsert({
          series_a: lo.id, series_b: hi.id,
          r: Math.round(r * 1000) / 1000,
          r_diff: Math.round(rDiff * 1000) / 1000,
          overlap: xs.length,
          cross_source: lo.source_id !== hi.source_id,
          geo_match: lo.geo_code === hi.geo_code,
          computed_at: new Date().toISOString(),
        }, { onConflict: 'series_a,series_b' });
        if (!error) written++;
      }
    }
  }
  return written;
}

/* 3 ---------------------------------------------------------------- */
async function writeBaselines(all: SeriesRow[]): Promise<number> {
  // For fast series: predict the next step naively and with drift, into the
  // same ledger the institutional forecasts land in. The naive line is the
  // honesty benchmark every forecaster has to beat.
  const fast = all.filter((s) => ['hourly', 'daily', '30 minutes', '5 minutes'].includes(s.frequency)).slice(0, 120);
  const stepMs: Record<string, number> = {
    hourly: 3_600_000, daily: 86_400_000, '30 minutes': 1_800_000, '5 minutes': 300_000,
  };
  let written = 0;
  const now = new Date().toISOString();
  for (const s of fast) {
    const obs = await recent(s.id, 48);
    if (obs.length < 10) continue;
    const last = obs[obs.length - 1];
    const step = stepMs[s.frequency];
    const target = new Date(new Date(last.ts).getTime() + step).toISOString();
    const drift = last.value + (last.value - obs[0].value) / (obs.length - 1);
    const rows = [
      { predictor: 'baseline:naive', value: last.value },
      { predictor: 'baseline:drift', value: Math.round(drift * 1000) / 1000 },
    ];
    for (const r of rows) {
      const { error } = await db.from('forecasts').upsert({
        series_id: s.id, predictor: r.predictor,
        predicted_for: target, predicted_at: now, value: r.value,
      }, { onConflict: 'series_id,predictor,predicted_for,predicted_at', ignoreDuplicates: true });
      if (!error) written++;
    }
  }
  return written;
}

/* 4 ---------------------------------------------------------------- */
async function scoreForecasts(): Promise<number> {
  const { data } = await db
    .from('forecasts')
    .select('id, series_id, predicted_for, value')
    .is('actual', null)
    .lt('predicted_for', new Date().toISOString())
    .limit(2000);
  let scored = 0;
  for (const f of (data ?? []) as any[]) {
    const { data: obs } = await db
      .from('observations')
      .select('ts, value')
      .eq('series_id', f.series_id)
      .gte('ts', new Date(new Date(f.predicted_for).getTime() - 1800_000).toISOString())
      .lte('ts', new Date(new Date(f.predicted_for).getTime() + 1800_000).toISOString())
      .limit(3);
    const hit = ((obs ?? []) as any[]).find((o) => o.value !== null);
    if (!hit) continue;
    const actual = Number(hit.value);
    const { error } = await db.from('forecasts').update({
      actual,
      abs_error: Math.abs(actual - Number(f.value)),
      scored_at: new Date().toISOString(),
    }).eq('id', f.id);
    if (!error) scored++;
  }
  return scored;
}

async function main(): Promise<void> {
  const all = await loadSeries();
  console.log('series loaded:', all.length);
  console.log('records written:', await detectRecords(all));
  console.log('correlations written:', await computeCorrelations(all));
  console.log('baselines written:', await writeBaselines(all));
  console.log('forecasts scored:', await scoreForecasts());
}

main();
