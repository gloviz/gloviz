import OrbitPageMode from './OrbitPageMode';
import { ICONS } from '@/lib/icons';

export default function DomainPage({
  kicker, title, accent, lead, icon, children, kpis, pageKey, charts = 6, relationships,
}: {
  pageKey: string;
  charts?: number;
  relationships?: any;
  kicker: string;
  title: string;
  accent: string;
  lead: string;
  icon: string;
  kpis?: { label: string; value: string }[];
  children: React.ReactNode;
}) {
  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="shead">
        <div>
          <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="dot" /> {kicker}
          </div>
          <h2 style={{ marginTop: 12 }}>
            {title} <em>{accent}</em>
          </h2>
          <p>{lead}</p>
        </div>
        <span className="chip" style={{ width: 54, height: 54, borderRadius: 16 }}
              dangerouslySetInnerHTML={{ __html: ICONS[icon] }} />
      </div>

      {kpis && kpis.length > 0 && (
        <div className="kpis" style={{ marginBottom: 22 }}>
          {kpis.map((k) => (
            <div className="kpi" key={k.label} data-orbit-context={k.label}>
              <div className="num" style={{ fontSize: 26 }}>{k.value}</div>
              <div className="lbl">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gap: 18 }}>{children}</div>

      <p className="muted" style={{ marginTop: 28, fontSize: 12 }}>
        Every chart carries the full Orbit toolbar. The page bar adds Insights,
        Chat, Filters and Compare across all of them.
      </p>
      <OrbitPageMode pageKey={pageKey} expectedCharts={charts} relationships={relationships} />
    </main>
  );
}
