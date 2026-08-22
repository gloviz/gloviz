import Link from 'next/link';
import MetricPicker from '@/components/MetricPicker';
import OrbitChart from '@/components/OrbitChart';
import OrbitPageMode from '@/components/OrbitPageMode';
import { ICONS } from '@/lib/icons';
import { getCorrelationBoard, getMetricOptions, getPair } from '@/lib/queries';

export const revalidate = 300;
export const metadata = { title: 'Metric explorer · GLOVIZ' };

function strength(r: number): { text: string; colour: string } {
  const a = Math.abs(r);
  if (a >= 0.8) return { text: `${r > 0 ? 'Strong positive' : 'Strong negative'} · r = ${r}`, colour: 'var(--s3)' };
  if (a >= 0.5) return { text: `${r > 0 ? 'Moderate positive' : 'Moderate negative'} · r = ${r}`, colour: 'var(--s2)' };
  if (a >= 0.2) return { text: `Weak · r = ${r}`, colour: 'var(--s6)' };
  return { text: `No linear relationship · r = ${r}`, colour: 'var(--faint)' };
}

export default async function Explore({
  searchParams,
}: { searchParams: Promise<{ x?: string; y?: string }> }) {
  const sp = await searchParams;
  const [options, board] = await Promise.all([
    getMetricOptions(400),
    getCorrelationBoard(),
  ]);
  // Suggestions and the default pair are credible co-movements (the changes
  // agree), so the first thing a visitor sees is apples against apples.
  const suggestions = board.credible.slice(0, 8).map((c) => ({
    a: { id: c.a.id, title: c.a.title }, b: { id: c.b.id, title: c.b.title }, r: c.rDiff,
  }));
  const fallbackX = suggestions[0]?.a.id
    ?? options.find((o) => o.label.startsWith('Temperature'))?.id ?? options[0]?.id;
  const fallbackY = suggestions[0]?.b.id
    ?? options.find((o) => o.id !== fallbackX)?.id;
  const x = Number(sp.x) || fallbackX || 0;
  const y = Number(sp.y) || fallbackY || 0;

  const pair = x && y && x !== y ? await getPair(x, y) : null;
  const s = pair ? strength(pair.r) : null;

  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="dot" /> Any two series in the database
      </div>
      <h2 style={{ marginTop: 12 }}>Metric <em>explorer</em></h2>
      <p className="muted" style={{ maxWidth: '62ch', marginTop: 12 }}>
        Pick any two of the 400 longest series, from any of the 18 sources, and
        GLOVIZ pairs them on time and plots one against the other. Correlation is
        computed server-side over the matched points; Orbit&apos;s Correlations tool
        opens on the time chart so you can see the same question two ways.
        Correlation is not causation, and the point of this page is how easy it
        is to find a convincing coincidence.
      </p>

      <MetricPicker options={options} x={x} y={y} />

      {suggestions.length > 0 && (
        <div className="chiprow chipopts" style={{ marginTop: 4 }}>
          <span className="muted" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Try:
          </span>
          {suggestions.map((s) => (
            <Link key={`${s.a.id}-${s.b.id}`} className="chipopt" href={`/explore?x=${s.a.id}&y=${s.b.id}`}>
              {s.a.title.slice(0, 26)} × {s.b.title.slice(0, 26)} (rΔ={s.r})
            </Link>
          ))}
        </div>
      )}

      {pair && s && (
        <>
          <div className="pagetools">
            <span className="rbadge" style={{ background: 'var(--surface2)', color: s.colour, border: `1px solid ${s.colour}` }}>
              {s.text}
            </span>
            <span className="muted" style={{ fontSize: 12 }}>
              {pair.overlap.toLocaleString('en')} matched observations
            </span>
          </div>

          <div style={{ display: 'grid', gap: 18, marginTop: 18 }}>
            <OrbitChart
              chartId="exp-time"
              title={`${pair.a.label} and ${pair.b.label}`}
              subtitle={`${pair.a.source} against ${pair.b.source} · two axes, one time line`}
              iconHtml={ICONS.correlations}
              attribution={`Sources: ${pair.a.source}, ${pair.b.source}`}
              series={[{ id: pair.a.id, name: pair.a.label }, { id: pair.b.id, name: pair.b.label }]}
              type="spline"
              initialTool="correlations"
              note={`Pearson r over ${pair.overlap} matched observations is ${pair.r}. The two series keep their own units, so the axes are independent.`}
              extraOptions={{
                yAxis: [
                  { title: { text: pair.a.unit } },
                  { title: { text: pair.b.unit }, opposite: true },
                ],
                series: [{ yAxis: 0 }, { yAxis: 1 }],
              }}
              height={440}
            />

            <OrbitChart
              chartId="exp-scatter"
              title="One against the other"
              subtitle={`${pair.overlap} points, matched on the nearest shared timestamp`}
              iconHtml={ICONS.summary}
              attribution={`Sources: ${pair.a.source}, ${pair.b.source}`}
              tools={['summary', 'correlations', 'trendline', 'distribution', 'insights', 'narrate', 'ai', 'export', 'annotate', 'fullscreen', 'share']}
              initialTool="trendline"
              staticSeries={[{
                type: 'scatter',
                name: `${pair.a.label} vs ${pair.b.label}`,
                data: pair.scatter,
                color: 'var(--s1)',
              }]}
              extraOptions={{
                xAxis: { type: 'linear', title: { text: `${pair.a.label} (${pair.a.unit})` }, gridLineWidth: 1 },
                yAxis: { title: { text: `${pair.b.label} (${pair.b.unit})` } },
                legend: { enabled: false },
                plotOptions: { scatter: { marker: { enabled: true, radius: 3.5, symbol: 'circle' } } },
                tooltip: { pointFormat: '{point.x} , {point.y}' },
              }}
              height={460}
            />
          </div>
        </>
      )}

      {!pair && (
        <p className="muted" style={{ marginTop: 24 }}>
          These two do not overlap in time closely enough to pair. Pick two series
          with a similar cadence, or two that cover the same years.
        </p>
      )}

      <p className="muted" style={{ marginTop: 26, fontSize: 12 }}>
        Looking for something curated instead? Try <Link href="/stories">the stories</Link>.
      </p>

      <OrbitPageMode pageKey="gloviz-explore" expectedCharts={2} />
    </main>
  );
}
