import Link from 'next/link';
import OrbitChart from '@/components/OrbitChart';
import OrbitPageMode from '@/components/OrbitPageMode';
import { ICONS } from '@/lib/icons';
import { getCorrelationBoard } from '@/lib/queries';

export const revalidate = 300;
export const metadata = {
  title: 'Correlations · GLOVIZ',
  description: 'Which correlations survive differencing, and which are trend artifacts.',
};

export default async function Correlations() {
  const { credible, spurious } = await getCorrelationBoard();
  const top = credible[0];

  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="dot" /> Recomputed nightly across every same-cadence pair
      </div>
      <h2 style={{ marginTop: 12 }}>Correlations, <em>sorted by honesty</em></h2>
      <p className="muted" style={{ maxWidth: '64ch', marginTop: 12 }}>
        Two series that both trend will always correlate. The test that matters
        is whether the <strong>changes</strong> move together: r is the
        correlation of levels, r<sub>Δ</sub> of the day-to-day changes. High
        r<sub>Δ</sub> means genuine co-movement. High r with r<sub>Δ</sub> near
        zero means two trends that happen to share a decade.
      </p>

      {top && (
        <OrbitChart
          chartId="corr-top"
          title={`${top.a.title} and ${top.b.title}`}
          subtitle={`The strongest credible pair right now · r = ${top.r}, rΔ = ${top.rDiff} over ${top.overlap} points`}
          iconHtml={ICONS.correlations}
          attribution="Both series from the GLOVIZ database"
          series={[{ id: top.a.id, name: top.a.title }, { id: top.b.id, name: top.b.title }]}
          type="spline"
          initialTool="correlations"
          note={`Level correlation ${top.r}; correlation of first differences ${top.rDiff}. The second number is why this pair is listed as credible.`}
          extraOptions={{ yAxis: [{ title: { text: '' } }, { title: { text: '' }, opposite: true }], series: [{ yAxis: 0 }, { yAxis: 1 }] }}
          height={420}
        />
      )}

      <section style={{ marginTop: 30 }}>
        <div className="kicker">Credible: the changes agree</div>
        <div className="card" style={{ marginTop: 14, overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Pair</th><th>r</th><th>rΔ</th><th>Points</th><th>Signals</th><th></th></tr></thead>
            <tbody>
              {credible.map((c) => (
                <tr key={`${c.a.id}-${c.b.id}`}>
                  <td>{c.a.title} × {c.b.title}</td>
                  <td>{c.r}</td>
                  <td style={{ color: 'var(--s3)', fontWeight: 700 }}>{c.rDiff}</td>
                  <td>{c.overlap}</td>
                  <td>
                    {c.geoMatch && <span className="pill on" style={{ marginRight: 4 }}>same place</span>}
                    {c.crossSource && <span className="pill">two sources</span>}
                  </td>
                  <td><Link className="link" href={`/explore?x=${c.a.id}&y=${c.b.id}`} style={{ fontSize: 10 }}>Open</Link></td>
                </tr>
              ))}
              {credible.length === 0 && <tr><td colSpan={6}>Nothing qualifies yet; the nightly job is still filling the table.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <div className="kicker">Probably coincidence: strong in levels, dead in changes</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 6, maxWidth: '60ch' }}>
          These look impressive and mean almost nothing. They are listed because
          knowing what a spurious correlation looks like is half the literacy.
        </p>
        <div className="card" style={{ marginTop: 14, overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Pair</th><th>r</th><th>rΔ</th><th>Points</th><th></th></tr></thead>
            <tbody>
              {spurious.map((c) => (
                <tr key={`${c.a.id}-${c.b.id}`}>
                  <td>{c.a.title} × {c.b.title}</td>
                  <td style={{ color: 'var(--s4)', fontWeight: 700 }}>{c.r}</td>
                  <td>{c.rDiff}</td>
                  <td>{c.overlap}</td>
                  <td><Link className="link" href={`/explore?x=${c.a.id}&y=${c.b.id}`} style={{ fontSize: 10 }}>Open</Link></td>
                </tr>
              ))}
              {spurious.length === 0 && <tr><td colSpan={5}>None flagged right now.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <OrbitPageMode pageKey="gloviz-correlations" expectedCharts={1} />
    </main>
  );
}
