import Link from 'next/link';
import OrbitChart from '@/components/OrbitChart';
import OrbitPageMode from '@/components/OrbitPageMode';
import { ICONS } from '@/lib/icons';
import InsightCard from '@/components/InsightCard';
import {
  getInsights, getLiveHighlights, getRecords, getSeriesRefs, getTopCorrelations,
} from '@/lib/queries';

export const revalidate = 300;
export const metadata = {
  title: 'Today · GLOVIZ',
  description: 'The daily brief, written by the database.',
};

const DOMAIN_ICON: Record<string, string> = {
  economy: 'economy', energy: 'zap', climate: 'climate',
  environment: 'environment', health: 'health', finance: 'finance', transport: 'forecast',
};

export default async function Today() {
  const [records, correlations, live, insights] = await Promise.all([
    getRecords(10),
    getTopCorrelations(6, true),
    getLiveHighlights(),
    getInsights(6),
  ]);
  const date = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  // The most newsworthy record gets the chart.
  const lead = records[0];
  const leadRefs = lead ? { id: lead.seriesId, name: lead.title } : null;

  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="dot" /> {date} · written by the database, refreshed every five minutes
      </div>
      <h2 style={{ marginTop: 12 }}>To<em>day</em></h2>

      <section style={{ marginTop: 26 }}>
        <div className="kicker">Records set</div>
        {records.length === 0 && (
          <p className="muted" style={{ marginTop: 10 }}>
            Nothing broke its 90-day range today. That is itself unusual.
          </p>
        )}
        <div className="grid3" style={{ marginTop: 14 }}>
          {records.slice(0, 6).map((r) => (
            <Link key={`${r.seriesId}-${r.kind}`} className="card dcard" href={`/explore?x=${r.seriesId}`}>
              <div className="dtop">
                <span className="chip" dangerouslySetInnerHTML={{ __html: ICONS[DOMAIN_ICON[r.domain] ?? 'summary'] }} />
                <h3 style={{ fontSize: 16 }}>{r.title}</h3>
              </div>
              <p>
                {r.kind === 'high' ? 'Highest' : 'Lowest'} value in {r.windowDays} days:{' '}
                <strong>{r.value.toLocaleString('en', { maximumFractionDigits: 2 })} {r.unit}</strong>
              </p>
              <div className="dtags">
                <span className="pill on">{r.kind === 'high' ? '90-day high' : '90-day low'}</span>
                <span className="pill">{r.source}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {leadRefs && (
        <section style={{ marginTop: 30 }}>
          <OrbitChart
            chartId="today-lead"
            title={`${lead!.title}: the record in context`}
            subtitle={`${lead!.source} · anomaly detection open, so the record is marked by statistics, not by an editor`}
            unit={lead!.unit}
            iconHtml={ICONS.anomaly}
            attribution={`Source: ${lead!.source}`}
            series={[leadRefs]}
            type="line"
            initialTool="anomaly"
            note={`This series just set a ${lead!.windowDays}-day ${lead!.kind}. The anomaly tool decides independently whether the point is a statistical outlier.`}
            height={380}
          />
        </section>
      )}

      {insights.length > 0 && (
        <section style={{ marginTop: 30 }}>
          <div className="kicker">In context</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6, maxWidth: '60ch' }}>
            The numbers are computed from the database; the reading of them is
            AI-written and labelled per card.
          </p>
          <div style={{ display: 'grid', gap: 16, marginTop: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(430px, 100%), 1fr))' }}>
            {insights.map((i) => <InsightCard key={`${i.seriesId}-${i.createdAt}`} insight={i} />)}
          </div>
        </section>
      )}

      <section style={{ marginTop: 30 }}>
        <div className="kicker">Right now</div>
        <div className="tilerow" style={{ marginTop: 14 }}>
          {live.slice(0, 8).map((i) => (
            <Link key={i.kicker} className="tile" href={i.href}>
              <span className="tiletext">
                <b>{i.headline}</b>
                <small>{i.kicker} · {i.detail}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <div className="kicker">Strongest cross-source correlations</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 6, maxWidth: '60ch' }}>
          Two institutions, no shared method, moving together anyway. Click one
          to inspect it; remember that correlation is cheap.
        </p>
        <div className="grid3" style={{ marginTop: 14 }}>
          {correlations.map((c) => (
            <Link key={`${c.a.id}-${c.b.id}`} className="card dcard" href={`/explore?x=${c.a.id}&y=${c.b.id}`}>
              <div className="dtop"><h3 style={{ fontSize: 15 }}>{c.a.title} × {c.b.title}</h3></div>
              <p>r = <strong>{c.r}</strong> over {c.overlap} shared observations</p>
              <div className="dtags">
                <span className="pill on">{Math.abs(c.r) >= 0.8 ? 'strong' : 'moderate'}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <OrbitPageMode pageKey="gloviz-today" expectedCharts={1} />
    </main>
  );
}
