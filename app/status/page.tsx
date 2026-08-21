import OrbitChart from '@/components/OrbitChart';
import { ICONS } from '@/lib/icons';
import { readClient } from '@/lib/supabase';
import { getKpis } from '@/lib/queries';

export const revalidate = 60;
export const metadata = { title: 'Status · GLOVIZ' };

export default async function Status() {
  const db = readClient();
  const [{ data: runs }, { data: freshness }, kpis] = await Promise.all([
    db.from('ingestion_runs')
      .select('id, source_id, job, started_at, finished_at, status, rows_written, duration_ms, error')
      .order('started_at', { ascending: false })
      .limit(120),
    db.from('series_freshness')
      .select('series_id, source_id, title, geo_code, latest_ts, observation_count')
      .order('latest_ts', { ascending: true, nullsFirst: true })
      .limit(12),
    getKpis(),
  ]);

  const rows = runs ?? [];
  const byJob = new Map<string, [number, number][]>();
  for (const r of [...rows].reverse()) {
    const list = byJob.get(r.job) ?? [];
    list.push([new Date(r.started_at).getTime(), r.rows_written]);
    byJob.set(r.job, list);
  }
  const durations = new Map<string, [number, number][]>();
  for (const r of [...rows].reverse()) {
    if (!r.duration_ms) continue;
    const list = durations.get(r.job) ?? [];
    list.push([new Date(r.started_at).getTime(), Math.round(r.duration_ms / 1000)]);
    durations.set(r.job, list);
  }

  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="dot" /> Operations
      </div>
      <h2 style={{ marginTop: 12 }}>Ingestion <em>status</em></h2>
      <p className="muted" style={{ maxWidth: '60ch', marginTop: 12 }}>
        A green run with zero rows means the source published nothing. No run at
        all means the cron is broken. This page distinguishes them.
      </p>

      <div className="kpis" style={{ margin: '26px 0' }}>
        <div className="kpi" data-orbit-context="Sources live"><div className="num">{kpis.sources}</div><div className="lbl">Sources</div></div>
        <div className="kpi" data-orbit-context="Time series"><div className="num">{kpis.series}</div><div className="lbl">Series</div></div>
        <div className="kpi" data-orbit-context="Observations"><div className="num">{kpis.observations.toLocaleString('en')}</div><div className="lbl">Observations</div></div>
        <div className="kpi" data-orbit-context="Latest datapoint UTC"><div className="num" style={{ fontSize: 19 }}>{kpis.latest?.slice(0, 16).replace('T', ' ') ?? 'n/a'}</div><div className="lbl">Latest datapoint · UTC</div></div>
      </div>

      <div style={{ display: 'grid', gap: 18 }}>
        <OrbitChart
          chartId="status-rows"
          title="Rows written per run"
          subtitle="ingestion_runs · one series per job"
          unit="rows"
          iconHtml={ICONS.summary}
          staticSeries={[...byJob.entries()].map(([job, data]) => ({ type: 'column', name: job, data }))}
          tools={['summary', 'kpi', 'distribution', 'anomaly', 'insights', 'ai', 'export', 'fullscreen', 'share']}
          extraOptions={{ xAxis: { type: 'datetime' }, plotOptions: { column: { stacking: 'normal', borderWidth: 0 } } }}
          height={320}
        />

        <OrbitChart
          chartId="status-duration"
          title="How long each run takes"
          subtitle="ingestion_runs · seconds · control limits open"
          unit="seconds"
          iconHtml={ICONS.anomaly}
          staticSeries={[...durations.entries()].map(([job, data]) => ({ type: 'line', name: job, data }))}
          initialTool="control-limits"
          extraOptions={{ xAxis: { type: 'datetime' } }}
          height={320}
        />
      </div>

      <h3 style={{ marginTop: 32 }}>Last 20 runs</h3>
      <div className="vh-card card" style={{ marginTop: 14, overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Job</th><th>Started</th><th>Status</th><th>Rows</th><th>ms</th><th>Error</th></tr></thead>
          <tbody>
            {rows.slice(0, 20).map((r) => (
              <tr key={r.id}>
                <td>{r.job}</td>
                <td>{r.started_at?.slice(0, 19).replace('T', ' ')}</td>
                <td className={`status-${r.status}`}>{r.status}</td>
                <td>{r.rows_written}</td>
                <td>{r.duration_ms ?? ''}</td>
                <td>{r.error ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6}>No runs recorded.</td></tr>}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: 32 }}>Stalest series</h3>
      <div className="vh-card card" style={{ marginTop: 14, overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Series</th><th>Source</th><th>Geo</th><th>Latest</th><th>Points</th></tr></thead>
          <tbody>
            {(freshness ?? []).map((f) => (
              <tr key={f.series_id}>
                <td>{f.title}</td>
                <td>{f.source_id}</td>
                <td>{f.geo_code}</td>
                <td>{f.latest_ts?.slice(0, 19).replace('T', ' ') ?? 'never'}</td>
                <td>{f.observation_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
