import { readClient } from './supabase';
import { SeriesRef } from '@/components/OrbitChart';

export interface SeriesGroup {
  key: string;
  title: string;
  subtitle: string;
  unit: string;
  attribution: string;
  type?: string;
  series: SeriesRef[];
}

/** Group DB series into dashboard charts, attribution from sources rows. */
export async function getSeriesGroups(): Promise<SeriesGroup[]> {
  const db = readClient();
  const { data } = await db
    .from('series')
    .select('id, title, geo_code, unit, domain, external_id, source_id, sources(attribution)')
    .order('geo_code');
  const rows = data ?? [];
  const attr = (sourceId: string) =>
    (rows.find((r) => r.source_id === sourceId)?.sources as any)?.attribution ?? '';
  const refs = (filter: (r: any) => boolean, name: (r: any) => string): SeriesRef[] =>
    rows.filter(filter).map((r) => ({ id: r.id, name: name(r) }));

  const groups: SeriesGroup[] = [
    {
      key: 'temperature',
      title: 'Temperature: eight world cities',
      subtitle: 'Open-Meteo · hourly · °C · trailing 30 days + 2-day forecast',
      unit: '°C',
      attribution: attr('open-meteo'),
      series: refs(
        (r) => r.source_id === 'open-meteo',
        (r) => r.title.replace('Temperature ', ''),
      ),
    },
    {
      key: 'fx',
      title: 'Exchange rates vs EUR',
      subtitle: 'European Central Bank · daily reference rates',
      unit: 'per EUR',
      attribution: attr('ecb'),
      series: refs(
        (r) => r.source_id === 'ecb',
        (r) => r.title.replace(' per EUR', ''),
      ),
    },
    {
      key: 'quakes',
      title: 'Earthquakes worldwide (M4.5+)',
      subtitle: 'USGS · daily count and strongest magnitude',
      unit: 'count / magnitude',
      attribution: attr('usgs'),
      type: 'column',
      series: refs((r) => r.source_id === 'usgs', (r) => r.title),
    },
    {
      key: 'gdp',
      title: 'GDP growth: ten economies',
      subtitle: 'World Bank · annual · %',
      unit: '% annual',
      attribution: attr('worldbank'),
      series: refs(
        (r) => r.source_id === 'worldbank' && r.external_id.startsWith('NY.GDP'),
        (r) => r.geo_code,
      ),
    },
    {
      key: 'population',
      title: 'Population: ten economies',
      subtitle: 'World Bank · annual',
      unit: 'people',
      attribution: attr('worldbank'),
      series: refs(
        (r) => r.source_id === 'worldbank' && r.external_id.startsWith('SP.POP'),
        (r) => r.geo_code,
      ),
    },
    {
      key: 'power',
      title: 'Day-ahead power prices',
      subtitle: 'ENTSO-E · hourly · EUR/MWh',
      unit: 'EUR/MWh',
      attribution: attr('entsoe'),
      series: refs(
        (r) => r.source_id === 'entsoe',
        (r) => r.geo_code,
      ),
    },
  ];
  return groups.filter((g) => g.series.length > 0);
}

export interface Kpis {
  sources: number;
  series: number;
  observations: number;
  latest: string | null;
}

export async function getKpis(): Promise<Kpis> {
  const db = readClient();
  const [s, se, o, f] = await Promise.all([
    db.from('sources').select('id', { count: 'exact', head: true }),
    db.from('series').select('id', { count: 'exact', head: true }),
    db.from('observations').select('series_id', { count: 'exact', head: true }),
    db.from('series_freshness').select('latest_ts').order('latest_ts', { ascending: false }).limit(1),
  ]);
  return {
    sources: s.count ?? 0,
    series: se.count ?? 0,
    observations: o.count ?? 0,
    latest: f.data?.[0]?.latest_ts ?? null,
  };
}

export async function getSources() {
  const db = readClient();
  const { data } = await db.from('sources').select('id, name, attribution').order('tier');
  return data ?? [];
}
