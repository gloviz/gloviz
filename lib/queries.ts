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
    const g = groups.get(key)!;
    const name = r.title.replace(/\s+[A-Z]{2,5}$/, '').trim() === r.title
      ? r.geo_code
      : r.title.slice(r.title.lastIndexOf(' ') + 1);
    g.series.push({ id: r.id, name });
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
