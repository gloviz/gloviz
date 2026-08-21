import DomainPage from '@/components/DomainPage';
import OrbitChart from '@/components/OrbitChart';
import { ICONS } from '@/lib/icons';
import { getSeriesRefs } from '@/lib/queries';

export const revalidate = 300;
export const metadata = { title: 'A week of earthquakes · GLOVIZ' };

export default async function QuakeWeek() {
  const [count, energy, mag, regions] = await Promise.all([
    getSeriesRefs('quakes:count:m40', 1),
    getSeriesRefs('quakes:energy', 1),
    getSeriesRefs('quakes:maxmag', 1),
    getSeriesRefs('quakes:count:', 6),
  ]);
  const regional = regions.refs.filter((r) => !/m40/.test(String(r.name)));

  return (
    <DomainPage
      pageKey="gloviz-story-quakes"
      charts={4}
      relationships={{
        dateToleranceMs: 86_400_000,
        links: [
          { a: { content: 'qw-count', field: 'x' }, b: { content: 'qw-energy', field: 'x' } },
          { a: { content: 'qw-count', field: 'x' }, b: { content: 'qw-mag', field: 'x' } },
          { a: { content: 'qw-count', field: 'x' }, b: { content: 'qw-regions', field: 'x' } },
        ],
      }}
      kicker="Story · U.S. Geological Survey"
      title="A week of" accent="earthquakes."
      icon="environment"
      lead="Roughly forty magnitude-4 events happen every day, and the number is remarkably stable. What is not stable is the energy: one large quake releases more than a thousand small ones, which is why the second chart needs a logarithmic axis. Control limits are open on the count, so days outside the usual range are marked."
    >
      <OrbitChart
        chartId="qw-count"
        title="Events per day, M4.0+"
        subtitle="USGS · daily · control limits open at ±2σ and ±3σ"
        unit="count"
        iconHtml={ICONS.environment}
        attribution="Source: U.S. Geological Survey"
        series={count.refs}
        type="column"
        initialTool="control-limits"
        live
        note="Counts come from the USGS FDSN event service, aggregated per UTC day."
        extraOptions={{ plotOptions: { column: { borderWidth: 0, borderRadius: 2 } } }}
        height={360}
      />

      <OrbitChart
        chartId="qw-energy"
        title="Energy released, log scale"
        subtitle="USGS · gigajoules · derived from magnitude"
        unit="GJ"
        iconHtml={ICONS.zap}
        attribution="Source: U.S. Geological Survey"
        series={energy.refs}
        type="area"
        initialTool="anomaly"
        extraOptions={{ yAxis: { type: 'logarithmic' }, plotOptions: { area: { fillOpacity: 0.25 } } }}
        note="log10(E) = 1.5M + 4.8 joules. A single M7 releases about a thousand times the energy of an M5."
        live
        height={360}
      />

      <OrbitChart
        chartId="qw-mag"
        title="The strongest event each day"
        subtitle="USGS · magnitude · forecast open"
        unit="magnitude"
        iconHtml={ICONS.forecast}
        attribution="Source: U.S. Geological Survey"
        series={mag.refs}
        type="line"
        initialTool="forecast"
        live
        height={340}
      />

      <OrbitChart
        chartId="qw-regions"
        title="Which third of the planet is moving"
        subtitle="USGS · daily counts by longitude band · stacked"
        unit="count"
        iconHtml={ICONS.summary}
        attribution="Source: U.S. Geological Survey"
        series={regional}
        type="areaspline"
        initialTool="contribution"
        extraOptions={{ plotOptions: { areaspline: { stacking: 'normal', fillOpacity: 0.35, lineWidth: 1 } } }}
        live
        height={380}
      />
    </DomainPage>
  );
}
