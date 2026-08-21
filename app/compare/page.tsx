import CountryPicker from '@/components/CountryPicker';
import OrbitChart from '@/components/OrbitChart';
import OrbitPageMode from '@/components/OrbitPageMode';
import { ICONS } from '@/lib/icons';
import { getComparableGeos, getCountryProfile } from '@/lib/queries';

export const revalidate = 300;
export const metadata = { title: 'Compare two countries · GLOVIZ' };

const DOMAIN_ICON: Record<string, string> = {
  economy: 'economy', energy: 'zap', climate: 'climate',
  environment: 'environment', health: 'health', finance: 'finance', nature: 'environment',
};

export default async function Compare({
  searchParams,
}: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a: rawA, b: rawB } = await searchParams;
  const geos = await getComparableGeos();
  const a = geos.some((g) => g.code === rawA) ? rawA! : (geos[0]?.code ?? 'NOR');
  const b = geos.some((g) => g.code === rawB) ? rawB! : (geos.find((g) => g.code !== a)?.code ?? 'SWE');

  const metrics = (await getCountryProfile([a, b])).slice(0, 18);
  const byDomain = new Map<string, typeof metrics>();
  for (const m of metrics) {
    if (!byDomain.has(m.domain)) byDomain.set(m.domain, [] as any);
    byDomain.get(m.domain)!.push(m);
  }

  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="dot" /> Two countries, every domain
      </div>
      <h2 style={{ marginTop: 12 }}>{a} against <em>{b}</em></h2>
      <p className="muted" style={{ maxWidth: '62ch', marginTop: 12 }}>
        Every metric that covers both countries, drawn on the same axes, one chart
        per metric. The page bar adds Orbit Compare on top: hold a filter steady
        and vary one dimension, and the change is listed per chart.
      </p>

      <CountryPicker geos={geos} a={a} b={b} />

      {metrics.length === 0 && (
        <p className="muted" style={{ marginTop: 24 }}>
          No metric covers both of these yet. Try two countries with more series.
        </p>
      )}

      {[...byDomain.entries()].map(([domain, list]) => (
        <section key={domain} style={{ marginTop: 30 }}>
          <div className="kicker" style={{ marginBottom: 12 }}>{domain}</div>
          <div style={{ display: 'grid', gap: 18 }}>
            {list.map((m) => (
              <OrbitChart
                key={m.metric}
                chartId={`cmp-${m.metric.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
                title={m.title}
                subtitle={`${m.source} · ${m.frequency} · ${m.unit}`}
                unit={m.unit}
                iconHtml={ICONS[DOMAIN_ICON[m.domain] ?? 'economy']}
                attribution={`Source: ${m.attribution}`}
                series={m.refs.map((r) => ({ id: r.id, name: r.code }))}
                type="spline"
                note={`${a} against ${b}. Both series come from the same source and unit, so the levels are directly comparable.`}
                height={320}
              />
            ))}
          </div>
        </section>
      ))}

      <OrbitPageMode
        pageKey={`gloviz-compare-${a}-${b}`}
        expectedCharts={Math.min(metrics.length, 6)}
      />
    </main>
  );
}
