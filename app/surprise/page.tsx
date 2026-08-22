import Link from 'next/link';
import OrbitChart from '@/components/OrbitChart';
import OrbitPageMode from '@/components/OrbitPageMode';
import { ICONS } from '@/lib/icons';
import { getSurprisingPair } from '@/lib/queries';

export const revalidate = 0; // a new pair on every visit
export const metadata = { title: 'Surprise me · GLOVIZ' };

export default async function Surprise({
  searchParams,
}: { searchParams: Promise<{ seed?: string }> }) {
  const sp = await searchParams;
  const seed = sp.seed ? Number(sp.seed) : Math.floor(Math.random() * 1e6);
  const pair = await getSurprisingPair(seed);

  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="dot" /> Two sources, one signal
      </div>
      <h2 style={{ marginTop: 12 }}>Surprise <em>me</em></h2>

      {!pair && (
        <p className="muted" style={{ marginTop: 18 }}>
          Nothing paired up this time. <Link href={`/surprise?seed=${seed + 1}`}>Try again</Link>.
        </p>
      )}

      {pair && (
        <>
          <p className="muted" style={{ maxWidth: '62ch', marginTop: 12 }}>
            GLOVIZ picked <strong>{pair.a.label}</strong> from {pair.a.source} and{' '}
            <strong>{pair.b.label}</strong> from {pair.b.source}: two institutions,
            two measurement programmes, one signal. The pair qualifies because the
            <em> changes</em> move together, not just the trends, with r ={' '}
            <strong>{pair.r}</strong> over {pair.overlap.toLocaleString('en')} matched
            observations. Coincidences are filtered on{' '}
            <Link href="/correlations">the correlation board</Link>.
          </p>

          <div className="pagetools">
            <Link className="btn amber" href={`/surprise?seed=${seed + 1}`}>Another pair</Link>
            <Link className="btn" href={`/explore?x=${pair.a.id}&y=${pair.b.id}`}>Open in the explorer</Link>
          </div>

          <div style={{ display: 'grid', gap: 18, marginTop: 8 }}>
            <OrbitChart
              chartId="sur-time"
              title={`${pair.a.label} and ${pair.b.label}`}
              subtitle={`${pair.a.source} against ${pair.b.source} · Insights opens on load`}
              iconHtml={ICONS.ai}
              attribution={`Sources: ${pair.a.source}, ${pair.b.source}`}
              series={[{ id: pair.a.id, name: pair.a.label }, { id: pair.b.id, name: pair.b.label }]}
              type="spline"
              initialTool="insights"
              note={`Two series from different institutions whose changes co-move (differenced correlation filter applied). Pearson r is ${pair.r} over ${pair.overlap} matched observations. Correlation still is not causation.`}
              extraOptions={{
                yAxis: [
                  { title: { text: pair.a.unit } },
                  { title: { text: pair.b.unit }, opposite: true },
                ],
                series: [{ yAxis: 0 }, { yAxis: 1 }],
              }}
              height={460}
            />

            <OrbitChart
              chartId="sur-scatter"
              title="The same two, plotted against each other"
              subtitle={`${pair.overlap} matched points · trend line open`}
              iconHtml={ICONS.correlations}
              attribution={`Sources: ${pair.a.source}, ${pair.b.source}`}
              tools={['summary', 'correlations', 'trendline', 'distribution', 'insights', 'ai', 'export', 'annotate', 'fullscreen', 'share']}
              initialTool="trendline"
              staticSeries={[{ type: 'scatter', name: 'Matched observations', data: pair.scatter }]}
              extraOptions={{
                xAxis: { type: 'linear', title: { text: `${pair.a.label} (${pair.a.unit})` }, gridLineWidth: 1 },
                yAxis: { title: { text: `${pair.b.label} (${pair.b.unit})` } },
                legend: { enabled: false },
                plotOptions: { scatter: { marker: { enabled: true, radius: 3.5 } } },
              }}
              height={420}
            />
          </div>
        </>
      )}

      <OrbitPageMode pageKey="gloviz-surprise" expectedCharts={2} />
    </main>
  );
}
