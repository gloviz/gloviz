import Link from 'next/link';
import OrbitChart from '@/components/OrbitChart';
import OrbitPageMode from '@/components/OrbitPageMode';
import { ICONS } from '@/lib/icons';
import { getScoreboard, getSeriesRefs } from '@/lib/queries';

export const revalidate = 300;
export const metadata = { title: 'Who called it? · GLOVIZ' };

const PREDICTOR_LABEL: Record<string, string> = {
  source: 'The source’s own forecast',
  'baseline:naive': 'Naive (tomorrow = today)',
  'baseline:drift': 'Drift (recent trend continues)',
};

export default async function Forecasts() {
  const [rows, ukActual, ukForecast] = await Promise.all([
    getScoreboard(),
    getSeriesRefs('ci:intensity:actual', 1),
    getSeriesRefs('ci:intensity:forecast', 1),
  ]);

  const bySeries = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!bySeries.has(r.seriesTitle)) bySeries.set(r.seriesTitle, [] as any);
    bySeries.get(r.seriesTitle)!.push(r);
  }

  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="dot" /> The ledger: every prediction, scored against what happened
      </div>
      <h2 style={{ marginTop: 12 }}>Who <em>called it?</em></h2>
      <p className="muted" style={{ maxWidth: '64ch', marginTop: 12 }}>
        GLOVIZ does not try to out-forecast the institutions. It keeps their
        receipts. Every forecast that enters the database, from a weather model,
        a grid operator or the IMF, is stored with a timestamp, and when the
        outcome arrives the error is computed. The naive baseline, tomorrow
        equals today, is the honesty benchmark: a forecaster that cannot beat it
        is not adding information.
      </p>

      <OrbitChart
        chartId="fc-uk"
        title="Forecast against outcome, the British grid"
        subtitle="National Grid · 30 minutes · gCO2/kWh · the cleanest test bench in the catalogue"
        unit="gCO2/kWh"
        iconHtml={ICONS.forecast}
        attribution="Source: National Grid ESO Carbon Intensity API"
        series={[...ukActual.refs, ...ukForecast.refs]}
        type="spline"
        initialTool="correlations"
        note="The operator publishes its forecast next to the outcome. Run Orbit's own Forecast tool on the actual line and you have three predictions on one chart: the operator's, the statistical one, and the naive assumption."
        height={420}
      />

      <h3 style={{ marginTop: 34 }}>The scoreboard</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 6, maxWidth: '60ch' }}>
        Mean absolute error per predictor, lowest first. Rows appear as
        forecasts mature: a prediction can only be scored after its target time
        has passed.
      </p>
      {bySeries.size === 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <p className="muted">
            No forecasts have matured yet. The ledger fills as hourly ingestion
            captures predictions and the nightly job scores them; check back
            tomorrow, or see the live test bench above in the meantime.
          </p>
        </div>
      )}
      {[...bySeries.entries()].map(([title, list]) => (
        <div className="card" style={{ marginTop: 14 }} key={title}>
          <div className="ch"><div><b>{title}</b><small>{list[0].unit} · lower is better</small></div></div>
          <table style={{ marginTop: 10 }}>
            <thead><tr><th>Predictor</th><th>Scored points</th><th>MAE</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.predictor}>
                  <td>{PREDICTOR_LABEL[r.predictor] ?? r.predictor}</td>
                  <td>{r.n}</td>
                  <td style={{ fontWeight: r === list[0] ? 700 : 400, color: r === list[0] ? 'var(--s3)' : undefined }}>
                    {r.mae}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <p className="muted" style={{ marginTop: 24, fontSize: 12 }}>
        Methodology: forecasts are captured at ingest, before the outcome can
        overwrite them. Scoring matches the nearest observation within 30
        minutes of the target. <Link href="/status">Ingestion status</Link>.
      </p>
      <OrbitPageMode pageKey="gloviz-forecasts" expectedCharts={1} />
    </main>
  );
}
