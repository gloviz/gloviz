import { readClient } from './supabase';
import { SeriesRef } from '@/components/OrbitChart';

export interface SeriesGroup {
  key: string;
  title: string;
  subtitle: string;
  unit: string;
  domain: string;
  attribution: string;
  type?: string;
  series: SeriesRef[];
}

interface Row {
  id: number;
  title: string;
  geo_code: string;
  unit: string;
  domain: string;
  external_id: string;
  source_id: string;
  frequency: string;
  sources: { name: string; attribution: string } | null;
}

/**
 * Charts are built from the data itself: series sharing a metric (the part of
 * external_id before the last colon) become one chart, so a new adapter shows up
 * without touching this file.
 */
export async function getSeriesGroups(limit = 24): Promise<SeriesGroup[]> {
  const db = readClient();
  const { data } = await db
    .from('series')
    .select('id, title, geo_code, unit, domain, external_id, source_id, frequency, sources(name, attribution)')
    .limit(5000);
  const rows = (data ?? []) as unknown as Row[];

  const groups = new Map<string, SeriesGroup>();
  for (const r of rows) {
    const metric = r.external_id.slice(0, r.external_id.lastIndexOf(':')) || r.external_id;
    const key = `${r.source_id}:${metric}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    if (!groups.has(key)) {
      // "Life expectancy at birth NOR" -> "Life expectancy at birth"
      const label = r.title.replace(/\s+[A-Z]{2,5}$/, '').trim();
      groups.set(key, {
        key,
        title: label,
        subtitle: `${r.sources?.name ?? r.source_id} · ${r.frequency} · ${r.unit}`,
        unit: r.unit,
        domain: r.domain,
        attribution: r.sources?.attribution ?? '',
        series: [],
      });
    }
    groups.get(key)!.series.push({ id: r.id, name: r.title });
  }

  const ordered = [...groups.values()]
    .map((g) => ({ ...g, series: g.series.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 14) }))
    .filter((g) => g.series.length > 0)
    .sort((a, b) => a.domain.localeCompare(b.domain) || b.series.length - a.series.length);
  return ordered.slice(0, limit);
}

export async function getGroupsByDomain(): Promise<Record<string, SeriesGroup[]>> {
  const groups = await getSeriesGroups(200);
  const byDomain: Record<string, SeriesGroup[]> = {};
  for (const g of groups) (byDomain[g.domain] ??= []).push(g);
  return byDomain;
}

export interface Kpis {
  sources: number;
  series: number;
  observations: number;
  latest: string | null;
  countries: number;
}

export async function getKpis(): Promise<Kpis> {
  const db = readClient();
  const [s, se, o, f, geo] = await Promise.all([
    db.from('sources').select('id', { count: 'exact', head: true }),
    db.from('series').select('id', { count: 'exact', head: true }),
    db.from('observations').select('series_id', { count: 'exact', head: true }),
    db.from('series_freshness').select('latest_ts').order('latest_ts', { ascending: false }).limit(1),
    db.from('series').select('geo_code').limit(5000),
  ]);
  return {
    sources: s.count ?? 0,
    series: se.count ?? 0,
    observations: o.count ?? 0,
    latest: f.data?.[0]?.latest_ts ?? null,
    countries: new Set((geo.data ?? []).map((r: any) => r.geo_code)).size,
  };
}

export async function getSources() {
  const db = readClient();
  const { data } = await db.from('sources').select('id, name, attribution').order('tier');
  return data ?? [];
}


/**
 * Series in one group share a metric prefix ("Temperature Oslo", "Temperature
 * Berlin"). The distinguishing part is what belongs in a legend, so strip the
 * longest shared word prefix; when nothing is shared, keep the whole title.
 */
function shortLabels(titles: string[]): string[] {
  if (titles.length < 2) return titles;
  const words = titles.map((t) => t.split(/\s+/));
  let shared = 0;
  while (
    shared < words[0].length - 1 &&
    words.every((w) => w.length > shared + 1 && w[shared] === words[0][shared])
  ) shared += 1;
  return words.map((w) => w.slice(shared).join(' '));
}

/* ------------------------------------------------------------------ *
 * Snapshot queries: latest value per series, for ranked bars, maps,
 * treemaps and scatter plots. Small payloads, passed straight into the
 * chart config from a server component.
 * ------------------------------------------------------------------ */

export interface Point {
  code: string;   // geo code (ISO3 or city/region)
  name: string;
  value: number;
  ts: string;
}

interface LatestRow {
  id: number;
  geo_code: string;
  title: string;
  unit: string;
  external_id: string;
  series_latest: { ts: string; value: number }[] | { ts: string; value: number } | null;
}

/** Latest value per geography for one metric (external_id prefix). */
export async function getLatest(metricPrefix: string): Promise<Point[]> {
  const db = readClient();
  const { data } = await db
    .from('series')
    .select('id, geo_code, title, unit, external_id, series_latest(ts, value)')
    .like('external_id', `${metricPrefix}%`)
    .limit(500);
  const rows = (data ?? []) as unknown as LatestRow[];
  const usable = rows.filter((r) => {
    const l = Array.isArray(r.series_latest) ? r.series_latest[0] : r.series_latest;
    return l && l.value !== null;
  });
  const labels = shortLabels(usable.map((r) => r.title));
  const points: Point[] = usable.map((r, i) => {
    const l = (Array.isArray(r.series_latest) ? r.series_latest[0] : r.series_latest)!;
    return { code: r.geo_code, name: labels[i], value: Number(l.value), ts: l.ts };
  });
  return points.sort((a, b) => b.value - a.value);
}

/** Latest values for two (optionally three) metrics, joined on geography. */
export async function getScatter(
  xMetric: string, yMetric: string, sizeMetric?: string,
): Promise<{ code: string; x: number; y: number; z?: number }[]> {
  const [xs, ys, zs] = await Promise.all([
    getLatest(xMetric),
    getLatest(yMetric),
    sizeMetric ? getLatest(sizeMetric) : Promise.resolve([] as Point[]),
  ]);
  const yBy = new Map(ys.map((p) => [p.code, p.value]));
  const zBy = new Map(zs.map((p) => [p.code, p.value]));
  return xs
    .filter((p) => yBy.has(p.code))
    .map((p) => ({
      code: p.code,
      x: p.value,
      y: yBy.get(p.code)!,
      ...(sizeMetric && zBy.has(p.code) ? { z: zBy.get(p.code)! } : {}),
    }));
}

/** Series references for one metric, for multi-series time charts. */
export async function getSeriesRefs(
  metricPrefix: string, limit = 14,
): Promise<{ refs: SeriesRef[]; unit: string; source: string; attribution: string; title: string }> {
  const db = readClient();
  const { data } = await db
    .from('series')
    .select('id, geo_code, title, unit, frequency, external_id, sources(name, attribution)')
    .like('external_id', `${metricPrefix}%`)
    .order('geo_code')
    .limit(limit);
  const rows = (data ?? []) as any[];
  const labels = shortLabels(rows.map((r) => r.title));
  return {
    refs: rows.map((r, i) => ({ id: r.id, name: labels[i] })),
    unit: rows[0]?.unit ?? '',
    source: rows[0]?.sources?.name ?? '',
    attribution: rows[0]?.sources?.attribution ?? '',
    title: (rows[0]?.title ?? '').replace(/\s+[A-Z]{2,5}$/, '').trim(),
  };
}

/* ------------------------------------------------------------------ *
 * "Happening now": the freshest value from each fast-moving source,
 * for the ticker on the front page.
 * ------------------------------------------------------------------ */

export interface LiveItem {
  kicker: string;
  headline: string;
  detail: string;
  ts: string;
  href: string;
}

const ago = (ts: string) => {
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 90) return `${Math.max(1, mins)} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 36) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} d ago`;
};

export async function getLiveHighlights(): Promise<LiveItem[]> {
  const [temps, quakesMag, quakesCount, pm25, fred, fx, solar] = await Promise.all([
    getLatest('temperature_2m:'),
    getLatest('quakes:maxmag'),
    getLatest('quakes:count:m40'),
    getLatest('openaq:pm25:'),
    getLatest('fred:'),
    getLatest('EXR:D.'),
    getLatest('ALLSKY_SFC_SW_DWN:'),
  ]);
  const items: LiveItem[] = [];
  const push = (i: LiveItem | null) => { if (i) items.push(i); };
  const one = (
    arr: Point[], kicker: string, headline: (p: Point) => string,
    detail: string, href: string, pick: 'first' | 'last' = 'first',
  ) => {
    const p = pick === 'first' ? arr[0] : arr.at(-1);
    return p ? { kicker, headline: headline(p), detail, ts: p.ts, href } : null;
  };

  push(one(temps, 'Warmest city right now', (p) => `${p.name} ${p.value.toFixed(1)} °C`,
    'Open-Meteo, hourly', '/stories/the-heat-right-now'));
  push(one(temps, 'Coldest city right now', (p) => `${p.name} ${p.value.toFixed(1)} °C`,
    'Open-Meteo, hourly', '/stories/the-heat-right-now', 'last'));
  push(one(quakesMag, 'Strongest quake today', (p) => `Magnitude ${p.value.toFixed(1)}`,
    'USGS, M4.0+ worldwide', '/stories/the-ground-is-moving'));
  push(one(quakesCount, 'Earthquakes today', (p) => `${p.value} events, M4.0+`,
    'USGS, per UTC day', '/stories/the-ground-is-moving'));
  push(one(pm25, 'Dirtiest air today', (p) => `${p.name} ${p.value.toFixed(0)} µg/m³ PM2.5`,
    'OpenAQ, daily mean', '/stories/what-you-are-breathing'));
  push(one(solar, 'Most sunlight today', (p) => `${p.name} ${p.value.toFixed(1)} kWh/m²`,
    'NASA POWER, daily', '/stories/how-clean-is-the-power'));

  const fredPick = (needle: string, label: string, fmt: (v: number) => string, href: string) => {
    const p = fred.find((x) => x.name.toLowerCase().includes(needle));
    if (p) items.push({ kicker: label, headline: fmt(p.value), detail: 'FRED, daily', ts: p.ts, href });
  };
  fredPick('brent', 'Brent crude', (v) => `$${v.toFixed(2)} per barrel`, '/markets');
  fredPick('vix', 'Market volatility', (v) => `VIX at ${v.toFixed(1)}`, '/markets');
  fredPick('10-year', 'US 10-year yield', (v) => `${v.toFixed(2)} %`, '/markets');

  const usd = fx.find((p) => p.name.startsWith('USD'));
  if (usd) items.push({ kicker: 'Euro exchange rate', headline: `$${usd.value.toFixed(4)} per EUR`,
    detail: 'ECB reference rate', ts: usd.ts, href: '/finance' });

  return items.map((i) => ({ ...i, detail: `${i.detail} · ${ago(i.ts)}` }));
}

/** Latest value per geography for several metrics, shaped as grid columns. */
export async function getGridColumns(
  metrics: { prefix: string; label: string }[],
  keyLabel = 'Country',
): Promise<Record<string, (string | number | null)[]>> {
  const sets = await Promise.all(metrics.map((m) => getLatest(m.prefix)));
  const keys = new Set<string>();
  sets.forEach((s) => s.forEach((p) => keys.add(p.code)));
  const byMetric = sets.map((s) => new Map(s.map((p) => [p.code, p.value])));
  const rows = [...keys].sort();
  const columns: Record<string, (string | number | null)[]> = { [keyLabel]: rows };
  metrics.forEach((m, i) => {
    columns[m.label] = rows.map((k) => {
      const v = byMetric[i].get(k);
      return v === undefined ? null : Math.round(v * 100) / 100;
    });
  });
  // Drop rows with no data at all, so the table is not mostly empty.
  const keep = rows.map((_, r) => metrics.some((m) => columns[m.label][r] !== null));
  for (const col of Object.keys(columns)) columns[col] = columns[col].filter((_, r) => keep[r]);
  return columns;
}

/** Every metric that covers all of the given geographies. */
export async function getCountryProfile(codes: string[]) {
  const db = readClient();
  const { data } = await db
    .from('series')
    .select('id, geo_code, title, unit, domain, external_id, frequency, sources(name, attribution)')
    .in('geo_code', codes)
    .limit(2000);
  const rows = (data ?? []) as any[];

  const byMetric = new Map<string, {
    metric: string; title: string; unit: string; domain: string;
    source: string; attribution: string; frequency: string;
    refs: { id: number; name: string; code: string }[];
  }>();
  for (const r of rows) {
    const metric = r.external_id.slice(0, r.external_id.lastIndexOf(':')) || r.external_id;
    if (!byMetric.has(metric)) {
      byMetric.set(metric, {
        metric,
        title: r.title.replace(/\s+\S+$/, '').trim() || r.title,
        unit: r.unit,
        domain: r.domain,
        source: r.sources?.name ?? '',
        attribution: r.sources?.attribution ?? '',
        frequency: r.frequency,
        refs: [],
      });
    }
    byMetric.get(metric)!.refs.push({ id: r.id, name: r.geo_code, code: r.geo_code });
  }
  // Only metrics that actually cover every requested geography are comparable.
  return [...byMetric.values()]
    .filter((m) => codes.every((c) => m.refs.some((r) => r.code === c)))
    .map((m) => ({ ...m, refs: m.refs.filter((r) => codes.includes(r.code)) }))
    .sort((a, b) => a.domain.localeCompare(b.domain) || a.title.localeCompare(b.title));
}

/** Geographies that have enough series to be worth comparing. */
export async function getComparableGeos(): Promise<{ code: string; count: number }[]> {
  const db = readClient();
  const { data } = await db.from('series').select('geo_code').limit(5000);
  const counts = new Map<string, number>();
  for (const r of (data ?? []) as any[]) counts.set(r.geo_code, (counts.get(r.geo_code) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([code, n]) => n >= 8 && /^[A-Z]{3}$/.test(code))
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------ *
 * Metric explorer and correlations.
 * ------------------------------------------------------------------ */

export interface MetricOption {
  id: number;
  label: string;
  source: string;
  domain: string;
  unit: string;
  frequency: string;
  points: number;
}

/** Series with enough history to be worth plotting against something else. */
export async function getMetricOptions(limit = 400): Promise<MetricOption[]> {
  const db = readClient();
  const { data } = await db
    .from('series_freshness')
    .select('series_id, title, source_id, geo_code, observation_count')
    .gte('observation_count', 12)
    .order('observation_count', { ascending: false })
    .limit(limit);
  const ids = (data ?? []).map((r: any) => r.series_id);
  if (!ids.length) return [];
  const { data: meta } = await db
    .from('series')
    .select('id, title, unit, domain, frequency, sources(name)')
    .in('id', ids);
  const byId = new Map((meta ?? []).map((m: any) => [m.id, m]));
  return (data ?? [])
    .map((r: any) => {
      const m = byId.get(r.series_id);
      if (!m) return null;
      return {
        id: r.series_id,
        label: m.title,
        source: m.sources?.name ?? '',
        domain: m.domain,
        unit: m.unit,
        frequency: m.frequency,
        points: r.observation_count,
      } as MetricOption;
    })
    .filter(Boolean) as MetricOption[];
}

export interface PairedSeries {
  a: { id: number; label: string; unit: string; source: string };
  b: { id: number; label: string; unit: string; source: string };
  /** [x value, y value] pairs, matched on the nearest shared timestamp */
  scatter: [number, number][];
  /** Pearson correlation over the matched pairs */
  r: number;
  overlap: number;
}

async function readSeries(id: number): Promise<{ ts: number; value: number }[]> {
  const db = readClient();
  const { data } = await db
    .from('observations')
    .select('ts, value')
    .eq('series_id', id)
    .order('ts')
    .limit(20000);
  return (data ?? [])
    .filter((o: any) => o.value !== null)
    .map((o: any) => ({ ts: new Date(o.ts).getTime(), value: Number(o.value) }));
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

/**
 * Pair two series on time. The two sides can have different cadences, so each
 * point on the sparser series is matched to the nearest point on the denser one
 * within a tolerance derived from that cadence.
 */
export async function getPair(idA: number, idB: number): Promise<PairedSeries | null> {
  const db = readClient();
  const [{ data: meta }, a, b] = await Promise.all([
    db.from('series').select('id, title, unit, sources(name)').in('id', [idA, idB]),
    readSeries(idA),
    readSeries(idB),
  ]);
  const info = new Map((meta ?? []).map((m: any) => [m.id, m]));
  if (!info.get(idA) || !info.get(idB) || a.length < 3 || b.length < 3) return null;

  const spanA = (a.at(-1)!.ts - a[0].ts) / Math.max(1, a.length - 1);
  const spanB = (b.at(-1)!.ts - b[0].ts) / Math.max(1, b.length - 1);
  const tolerance = Math.max(spanA, spanB) * 0.75;

  const dense = a.length >= b.length ? a : b;
  const sparse = a.length >= b.length ? b : a;
  const scatter: [number, number][] = [];
  const xs: number[] = [], ys: number[] = [];
  let j = 0;
  for (const p of sparse) {
    while (j + 1 < dense.length && Math.abs(dense[j + 1].ts - p.ts) <= Math.abs(dense[j].ts - p.ts)) j++;
    const q = dense[j];
    if (!q || Math.abs(q.ts - p.ts) > tolerance) continue;
    const xv = a.length >= b.length ? q.value : p.value;
    const yv = a.length >= b.length ? p.value : q.value;
    scatter.push([xv, yv]);
    xs.push(xv); ys.push(yv);
  }
  if (scatter.length < 5) return null;

  const mk = (id: number) => ({
    id,
    label: info.get(id)!.title,
    unit: info.get(id)!.unit,
    source: info.get(id)!.sources?.name ?? '',
  });
  return {
    a: mk(idA), b: mk(idB),
    scatter,
    r: Math.round(pearson(xs, ys) * 1000) / 1000,
    overlap: scatter.length,
  };
}

/**
 * "Surprise me": sample pairs from different sources, keep the one with the
 * strongest correlation. Cross-source on purpose, because a coincidence between
 * two unrelated institutions is the interesting kind.
 */
export async function getSurprisingPair(seed?: number): Promise<PairedSeries | null> {
  const options = await getMetricOptions(220);
  if (options.length < 4) return null;

  // Deterministic per hour unless a seed is given, so the page can be cached.
  const s = seed ?? Math.floor(Date.now() / 3_600_000);
  const rand = (n: number, salt: number) => {
    const x = Math.sin(s * 9301 + salt * 49297) * 233280;
    return Math.floor((x - Math.floor(x)) * n);
  };

  let best: PairedSeries | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const a = options[rand(options.length, attempt * 2 + 1)];
    const b = options[rand(options.length, attempt * 2 + 2)];
    if (!a || !b || a.id === b.id || a.source === b.source) continue;
    const pair = await getPair(a.id, b.id);
    if (!pair || pair.overlap < 12) continue;
    if (!best || Math.abs(pair.r) > Math.abs(best.r)) best = pair;
    if (best && Math.abs(best.r) > 0.85) break;
  }
  return best;
}

/** A metric's value per geography per year, for the ranking slider. */
export async function getRankingFrames(metricPrefix: string): Promise<{
  years: number[];
  byYear: Record<number, { code: string; value: number }[]>;
  unit: string;
  title: string;
  attribution: string;
}> {
  const db = readClient();
  const { data: series } = await db
    .from('series')
    .select('id, geo_code, title, unit, sources(attribution)')
    .like('external_id', `${metricPrefix}%`)
    .limit(300);
  const rows = (series ?? []) as any[];
  if (!rows.length) return { years: [], byYear: {}, unit: '', title: '', attribution: '' };

  const ids = rows.map((r) => r.id);
  const byId = new Map(rows.map((r) => [r.id, r.geo_code]));
  const { data: obs } = await db
    .from('observations')
    .select('series_id, ts, value')
    .in('series_id', ids)
    .order('ts')
    .limit(40000);

  const byYear: Record<number, { code: string; value: number }[]> = {};
  for (const o of (obs ?? []) as any[]) {
    if (o.value === null) continue;
    const year = new Date(o.ts).getUTCFullYear();
    const code = byId.get(o.series_id);
    if (!code) continue;
    (byYear[year] ??= []).push({ code, value: Number(o.value) });
  }
  // Keep the years where enough countries reported to make a ranking sensible.
  const years = Object.keys(byYear)
    .map(Number)
    .filter((y) => byYear[y].length >= 8)
    .sort((a, b) => a - b);
  for (const y of years) byYear[y].sort((a, b) => b.value - a.value);

  return {
    years,
    byYear: Object.fromEntries(years.map((y) => [y, byYear[y].slice(0, 15)])),
    unit: rows[0].unit,
    title: rows[0].title.replace(/\s+\S+$/, '').trim(),
    attribution: rows[0].sources?.attribution ?? '',
  };
}

/* ------------------------------------------------------------------ *
 * Live stories: the same freshest values that drive the ticker, turned
 * into a page each, so "happening now" has somewhere to lead.
 * ------------------------------------------------------------------ */

export interface LiveStory {
  slug: string;
  kicker: string;
  title: string;
  accent: string;
  lead: string;
  icon: string;
  /** series prefixes drawn on the story, in order */
  charts: { prefix: string; title: string; subtitle: string; type: string; tool: string; limit: number; note?: string }[];
  headline: string;
  domain: string;
}

export async function getLiveStories(): Promise<LiveStory[]> {
  const [temps, quakes, pm25, dkCo2, ukActual, flights] = await Promise.all([
    getLatest('temperature_2m:'),
    getLatest('quakes:maxmag'),
    getLatest('openaq:pm25:'),
    getLatest('eds:co2:'),
    getLatest('ci:intensity:actual'),
    getLatest('opensky:count:'),
  ]);

  const stories: LiveStory[] = [
    {
      slug: 'the-heat-right-now',
      kicker: 'Live · Open-Meteo',
      title: 'The heat', accent: 'right now.',
      icon: 'climate',
      domain: 'climate',
      headline: temps[0] ? `${temps[0].name} is the warmest city on the board at ${temps[0].value.toFixed(1)} °C` : 'Thirty cities, hour by hour',
      lead: temps[0] && temps.at(-1)
        ? `Right now the spread between the warmest and the coldest city GLOVIZ watches is ${(temps[0].value - temps.at(-1)!.value).toFixed(1)} degrees: ${temps[0].name} at ${temps[0].value.toFixed(1)} °C against ${temps.at(-1)!.name} at ${temps.at(-1)!.value.toFixed(1)} °C. The forecast tool is open on the first chart, so you can see where each line is heading over the next three days.`
        : 'Thirty cities, refreshed every hour, with a three-day forecast attached.',
      charts: [
        { prefix: 'temperature_2m:', title: 'Temperature', subtitle: 'Open-Meteo · hourly · °C', type: 'spline', tool: 'forecast', limit: 14,
          note: 'The last three days of each line are Open-Meteo\'s own forecast, not measurements.' },
        { prefix: 'relative_humidity_2m:', title: 'Humidity, the same cities', subtitle: 'Open-Meteo · hourly · %', type: 'areaspline', tool: 'correlations', limit: 10 },
      ],
    },
    {
      slug: 'the-ground-is-moving',
      kicker: 'Live · USGS',
      title: 'The ground', accent: 'is moving.',
      icon: 'environment',
      domain: 'environment',
      headline: quakes[0] ? `The strongest quake today measured ${quakes[0].value.toFixed(1)}` : 'Every M4+ event on Earth',
      lead: quakes[0]
        ? `The strongest earthquake recorded in the current UTC day measured magnitude ${quakes[0].value.toFixed(1)}. Roughly forty events above magnitude four happen every day, and the count is remarkably stable; the energy is not, which is why the second chart needs a logarithmic axis.`
        : 'Every magnitude 4 and above, aggregated per UTC day.',
      charts: [
        { prefix: 'quakes:count:m40', title: 'Events per day', subtitle: 'USGS · daily · M4.0+', type: 'column', tool: 'control-limits', limit: 1 },
        { prefix: 'quakes:energy', title: 'Energy released', subtitle: 'USGS · daily · gigajoules', type: 'area', tool: 'anomaly', limit: 1,
          note: 'Energy is derived from magnitude, so a single large event dwarfs a hundred small ones.' },
        { prefix: 'quakes:count:', title: 'Which third of the planet', subtitle: 'USGS · daily · by longitude band', type: 'areaspline', tool: 'contribution', limit: 6 },
      ],
    },
    {
      slug: 'what-you-are-breathing',
      kicker: 'Live · OpenAQ',
      title: 'What you are', accent: 'breathing.',
      icon: 'environment',
      domain: 'environment',
      headline: pm25[0] ? `${pm25[0].name} is at ${pm25[0].value.toFixed(0)} µg/m³ PM2.5` : 'Twelve cities, daily means',
      lead: pm25[0]
        ? `${pm25[0].name} currently reports ${pm25[0].value.toFixed(0)} µg/m³ of PM2.5 as a daily mean. The WHO 24-hour guideline is 15. Anomaly detection is open, so the days that break the pattern are marked without anyone deciding in advance what counts as bad.`
        : 'PM2.5, PM10 and NO2 for twelve cities.',
      charts: [
        { prefix: 'openaq:pm25:', title: 'PM2.5', subtitle: 'OpenAQ · daily mean · µg/m³', type: 'spline', tool: 'anomaly', limit: 12 },
        { prefix: 'openaq:no2:', title: 'Nitrogen dioxide', subtitle: 'OpenAQ · daily mean · µg/m³', type: 'line', tool: 'trendline', limit: 12 },
      ],
    },
    {
      slug: 'how-clean-is-the-power',
      kicker: 'Live · Energinet and National Grid',
      title: 'How clean is', accent: 'the power?',
      icon: 'zap',
      domain: 'energy',
      headline: dkCo2[0] ? `Danish electricity is at ${dkCo2[0].value.toFixed(0)} g/kWh` : 'Carbon intensity, minute by minute',
      lead: dkCo2[0] && ukActual[0]
        ? `Danish electricity currently carries ${dkCo2[0].value.toFixed(0)} grams of CO2 per kilowatt hour, updated every five minutes; the British grid is at ${ukActual[0].value.toFixed(0)}. The two systems are measured by different operators with different methods, but the shape of the day is the same: intensity falls when the wind blows.`
        : 'Carbon intensity of two European grids, five minutes and half an hour apart.',
      charts: [
        { prefix: 'eds:co2:', title: 'Danish grid CO2 intensity', subtitle: 'Energi Data Service · every 5 minutes · g/kWh', type: 'line', tool: 'control-limits', limit: 4 },
        { prefix: 'ci:intensity:', title: 'British grid, forecast against outcome', subtitle: 'National Grid · 30 minutes · gCO2/kWh', type: 'spline', tool: 'correlations', limit: 2,
          note: 'The operator publishes its own forecast alongside the actual value, which is unusual and makes this the natural place to test a statistical forecast against a professional one.' },
        { prefix: 'eds:live:', title: 'The Danish system right now', subtitle: 'Energi Data Service · every minute · MW', type: 'areaspline', tool: 'contribution', limit: 6 },
      ],
    },
    {
      slug: 'everything-in-the-air',
      kicker: 'Live · OpenSky',
      title: 'Everything', accent: 'in the air.',
      icon: 'forecast',
      domain: 'transport',
      headline: flights.length ? `${flights.reduce((a, p) => a + p.value, 0).toLocaleString('en')} aircraft airborne in the last snapshot` : 'Aircraft counted every hour',
      lead: flights.length
        ? `In the most recent hourly snapshot, GLOVIZ counted ${flights.reduce((a, p) => a + p.value, 0).toLocaleString('en')} aircraft transmitting ADS-B across four regions, with ${flights[0].name} the busiest. Coverage depends on volunteer receivers, so the level is a lower bound. The shape over the day is the real signal.`
        : 'Aircraft transmitting ADS-B, counted hourly over four regions.',
      charts: [
        { prefix: 'opensky:count:', title: 'Aircraft airborne', subtitle: 'OpenSky · hourly snapshot', type: 'line', tool: 'anomaly', limit: 6 },
        { prefix: 'opensky:altitude:', title: 'Mean cruising altitude', subtitle: 'OpenSky · hourly · metres', type: 'spline', tool: 'control-limits', limit: 6 },
      ],
    },
  ];
  return stories;
}
