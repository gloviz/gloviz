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
    'Open-Meteo, hourly', '/climate'));
  push(one(temps, 'Coldest city right now', (p) => `${p.name} ${p.value.toFixed(1)} °C`,
    'Open-Meteo, hourly', '/climate', 'last'));
  push(one(quakesMag, 'Strongest quake today', (p) => `Magnitude ${p.value.toFixed(1)}`,
    'USGS, M4.0+ worldwide', '/environment'));
  push(one(quakesCount, 'Earthquakes today', (p) => `${p.value} events, M4.0+`,
    'USGS, per UTC day', '/stories/quake-week'));
  push(one(pm25, 'Dirtiest air today', (p) => `${p.name} ${p.value.toFixed(0)} µg/m³ PM2.5`,
    'OpenAQ, daily mean', '/environment'));
  push(one(solar, 'Most sunlight today', (p) => `${p.name} ${p.value.toFixed(1)} kWh/m²`,
    'NASA POWER, daily', '/energy'));

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
