import Link from 'next/link';
import { readClient } from '@/lib/supabase';
import SeriesChart from '@/components/SeriesChart';

export const revalidate = 300;

export default async function Home() {
  const db = readClient();
  const { data: series } = await db
    .from('series')
    .select('id, title, geo_code, unit, source_id, sources(attribution)')
    .eq('domain', 'energy')
    .order('geo_code')
    .limit(12);

  return (
    <main>
      <p className="vh-kicker">Live open data observatory</p>
      <h1>
        GLO<em>VIZ</em>
      </h1>
      <p style={{ color: 'var(--muted)', maxWidth: 640 }}>
        Economy, energy, climate, environment, health and transport for 190+
        countries, streamed from global and regional open APIs.
      </p>
      <div style={{ display: 'grid', gap: 24, marginTop: 32 }}>
        {(series ?? []).map((s) => (
          <SeriesChart
            key={s.id}
            seriesId={s.id}
            title={s.title}
            unit={s.unit}
            attribution={(s.sources as any)?.attribution ?? ''}
          />
        ))}
        {(series ?? []).length === 0 && (
          <div className="vh-card">
            <p>No data yet. Check <Link href="/status">/status</Link> for ingestion runs.</p>
          </div>
        )}
      </div>
    </main>
  );
}
