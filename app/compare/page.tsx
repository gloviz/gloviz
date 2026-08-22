import CountryChips from '@/components/CountryChips';
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
}: { searchParams: Promise<{ c?: string; a?: string; b?: string }> }) {
  const sp = await searchParams;
  const geos = await getComparableGeos();
  const valid = new Set(geos.map((g) => g.code));

  // ?c=NOR,SWE,DEU is the current form; ?a=&b= is kept so older links still work.
  const asked = (sp.c ? sp.c.split(',') : [sp.a, sp.b].filter(Boolean) as string[])
    .map((x) => x.trim().toUpperCase())
    .filter((x) => valid.has(x));
  const codes = (asked.length ? asked : [geos[0]?.code, geos[1]?.code].filter(Boolean) as string[])
    .slice(0, 5);

  const metrics = (await getCountryProfile(codes)).slice(0, 18);
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
      <h2 style={{ marginTop: 12 }}>
        {codes.slice(0, -1).join(', ')} against <em>{codes.at(-1)}</em>
      </h2>
      <p className="muted" style={{ maxWidth: '62ch', marginTop: 12 }}>
        Every metric that covers all of the selected countries, drawn on the same
        axes, one chart per metric. Up to five at a time, and the selection lives
        in the URL, so a comparison is a link. The page bar adds Orbit Compare on
        top: hold a filter steady, vary one dimension, and the change is listed
        per chart.
      </p>

      <CountryChips geos={geos} selected={codes} />

      {metrics.length === 0 && (
        <p className="muted" style={{ marginTop: 24 }}>
          No single metric covers all of these yet. Remove one, or pick countries
          with more series behind them.
        </p>
      )}

      {[...byDomain.entries()].map(([domain, list]) => (
        <section key={domain} style={{ marginTop: 30 }}>
          <div className="kicker" style={{ marginBottom: 12 }}>{domain}</div>
          <div style={{ display: 'grid', gap: 18 }}>
            {list.map((m) => (
              <OrbitChart
                key={`${m.metric}-${codes.join('-')}`}
                chartId={`cmp-${m.metric.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
                title={m.title}
                subtitle={`${m.source} · ${m.frequency} · ${m.unit}`}
                unit={m.unit}
                iconHtml={ICONS[DOMAIN_ICON[m.domain] ?? 'economy']}
                attribution={`Source: ${m.attribution}`}
                series={m.refs.map((r) => ({ id: r.id, name: r.code }))}
                type="spline"
                note={`${codes.join(', ')} on one axis. Every series here comes from the same source and unit, so the levels are directly comparable.`}
                height={320}
              />
            ))}
          </div>
        </section>
      ))}

      <OrbitPageMode
        pageKey={`gloviz-compare-${codes.join('-')}`}
        expectedCharts={Math.min(metrics.length, 6)}
      />
    </main>
  );
}
