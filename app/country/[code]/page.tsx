import Link from 'next/link';
import { notFound } from 'next/navigation';
import OrbitChart from '@/components/OrbitChart';
import OrbitPageMode from '@/components/OrbitPageMode';
import { ICONS } from '@/lib/icons';
import { getComparableGeos, getCountryProfile } from '@/lib/queries';

export const revalidate = 300;

const DOMAIN_ICON: Record<string, string> = {
  economy: 'economy', energy: 'zap', climate: 'climate',
  environment: 'environment', health: 'health', finance: 'finance', nature: 'environment',
};

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return { title: `${code.toUpperCase()} · GLOVIZ` };
}

export default async function Country({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const geos = await getComparableGeos();
  if (!geos.some((g) => g.code === code)) notFound();

  const metrics = await getCountryProfile([code]);
  const byDomain = new Map<string, typeof metrics>();
  for (const m of metrics) {
    if (!byDomain.has(m.domain)) byDomain.set(m.domain, [] as any);
    byDomain.get(m.domain)!.push(m);
  }
  const neighbours = geos.filter((g) => g.code !== code).slice(0, 8);

  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="dot" /> Everything GLOVIZ knows about one country
      </div>
      <h2 style={{ marginTop: 12 }}>{code} <em>in {metrics.length} series</em></h2>

      <div className="pagetools">
        {neighbours.slice(0, 4).map((g) => (
          <Link key={g.code} className="chipopt" href={`/compare?c=${code},${g.code}`}>
            vs {g.code}
          </Link>
        ))}
      </div>

      {[...byDomain.entries()].map(([domain, list]) => (
        <section key={domain} style={{ marginTop: 26 }}>
          <div className="kicker" style={{ marginBottom: 12 }}>{domain}</div>
          <div style={{ display: 'grid', gap: 18 }}>
            {list.slice(0, 4).map((m) => (
              <OrbitChart
                key={m.metric}
                chartId={`cty-${m.metric.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
                title={m.title}
                subtitle={`${m.source} · ${m.frequency} · ${m.unit}`}
                unit={m.unit}
                iconHtml={ICONS[DOMAIN_ICON[m.domain] ?? 'economy']}
                attribution={`Source: ${m.attribution}`}
                series={m.refs.filter((r) => r.code === code).map((r) => ({ id: r.id, name: m.title }))}
                type="line"
                height={300}
              />
            ))}
          </div>
        </section>
      ))}

      <OrbitPageMode pageKey={`gloviz-country-${code}`} expectedCharts={Math.min(metrics.length, 6)} />
    </main>
  );
}
