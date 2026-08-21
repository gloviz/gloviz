import OrbitChart from '@/components/OrbitChart';
import OrbitPageMode from '@/components/OrbitPageMode';
import { getKpis, getSeriesGroups } from '@/lib/queries';
import { ICONS } from '@/lib/icons';

export const revalidate = 300;

export default async function Dashboard() {
  const [groups, kpis] = await Promise.all([getSeriesGroups(), getKpis()]);
  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="dot" /> Orbit page mode: filters, comparisons and AI across every chart
      </div>
      <h2 style={{ margin: '14px 0 6px' }}>Global <em>dashboard</em></h2>
      <p className="muted" style={{ maxWidth: '60ch' }}>
        Hover a point to highlight it everywhere. Click a value to filter the whole page.
        Every chart carries the full Orbit toolbar; the page bar adds Insights, Chat,
        Filters and Compare across all of it.
      </p>
      <div className="kpis" style={{ margin: '28px 0' }}>
        <div className="kpi" data-orbit-context="Integrated APIs"><div className="num">{kpis.sources}</div><div className="lbl">Sources live</div></div>
        <div className="kpi" data-orbit-context="Time series in database"><div className="num">{kpis.series}</div><div className="lbl">Time series</div></div>
        <div className="kpi" data-orbit-context="Total observations"><div className="num">{kpis.observations.toLocaleString('en')}</div><div className="lbl">Observations</div></div>
        <div className="kpi" data-orbit-context="Latest datapoint (UTC)"><div className="num" style={{ fontSize: 20 }}>{kpis.latest?.slice(0, 16).replace('T', ' ') ?? 'n/a'}</div><div className="lbl">Latest datapoint · UTC</div></div>
      </div>
      <div style={{ display: 'grid', gap: 18 }}>
        {groups.map((g) => (
          <OrbitChart
            key={g.key}
            chartId={`chart-${g.key}`}
            iconHtml={ICONS[{ temperature: 'climate', fx: 'finance', quakes: 'environment', gdp: 'economy', population: 'economy', power: 'zap' }[g.key] ?? 'economy']}
            live={['temperature', 'fx', 'quakes', 'power'].includes(g.key)}
            title={g.title}
            subtitle={g.subtitle}
            unit={g.unit}
            series={g.series}
            attribution={`Source: ${g.attribution}`}
            type={g.type ?? 'line'}
            height={380}
          />
        ))}
      </div>
      <OrbitPageMode />
    </main>
  );
}
