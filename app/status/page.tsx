import { readClient } from '@/lib/supabase';

export const revalidate = 60;

export default async function Status() {
  const db = readClient();
  const [{ data: runs }, { data: freshness }] = await Promise.all([
    db
      .from('ingestion_runs')
      .select('id, source_id, job, started_at, finished_at, status, rows_written, duration_ms, error')
      .order('started_at', { ascending: false })
      .limit(20),
    db
      .from('series_freshness')
      .select('series_id, source_id, title, geo_code, latest_ts, observation_count')
      .order('latest_ts', { ascending: true, nullsFirst: true })
      .limit(20),
  ]);

  return (
    <main>
      <p className="vh-kicker">Operations</p>
      <h1>Status</h1>

      <h2 style={{ marginTop: 32 }}>Last 20 ingestion runs</h2>
      <div className="vh-card" style={{ marginTop: 16, overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>Job</th><th>Started</th><th>Status</th><th>Rows</th><th>ms</th><th>Error</th></tr>
          </thead>
          <tbody>
            {(runs ?? []).map((r) => (
              <tr key={r.id}>
                <td>{r.job}</td>
                <td>{r.started_at?.slice(0, 19).replace('T', ' ')}</td>
                <td className={`status-${r.status}`}>{r.status}</td>
                <td>{r.rows_written}</td>
                <td>{r.duration_ms ?? ''}</td>
                <td>{r.error ?? ''}</td>
              </tr>
            ))}
            {(runs ?? []).length === 0 && (
              <tr><td colSpan={6}>No runs recorded. The cron has not run yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 32 }}>Stalest series</h2>
      <div className="vh-card" style={{ marginTop: 16, overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>Series</th><th>Geo</th><th>Latest</th><th>Observations</th></tr>
          </thead>
          <tbody>
            {(freshness ?? []).map((f) => (
              <tr key={f.series_id}>
                <td>{f.title}</td>
                <td>{f.geo_code}</td>
                <td>{f.latest_ts?.slice(0, 19).replace('T', ' ') ?? 'never'}</td>
                <td>{f.observation_count}</td>
              </tr>
            ))}
            {(freshness ?? []).length === 0 && (
              <tr><td colSpan={4}>No series yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
