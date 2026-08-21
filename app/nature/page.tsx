import DomainPage from '@/components/DomainPage';
import OrbitChart from '@/components/OrbitChart';
import OrbitMap from '@/components/OrbitMap';
import { ICONS } from '@/lib/icons';
import { getLatest, getSeriesRefs } from '@/lib/queries';
import { columnSeries, treemapSeries } from '@/lib/charts';

export const revalidate = 300;
export const metadata = { title: 'Nature · GLOVIZ' };

export default async function Nature() {
  const [byCountry, kingdoms, countrySeries, kingdomSeries] = await Promise.all([
    getLatest('gbif:occurrences:'),
    getLatest('gbif:kingdom:'),
    getSeriesRefs('gbif:occurrences:', 14),
    getSeriesRefs('gbif:kingdom:', 6),
  ]);
  const attribution = 'Source: GBIF.org';
  const m = (n?: number) => (n === undefined ? 'n/a' : `${(n / 1e6).toFixed(1)}M`);

  return (
    <DomainPage
      pageKey="gloviz-nature"
      charts={5}
      kicker="Nature · GBIF · annual"
      title="Every sighting," accent="counted."
      icon="environment"
      lead="GBIF holds more than three billion species occurrence records from museums, monitoring programmes and phone apps. Counted per country and per year, it is a record of biodiversity monitoring effort as much as of biodiversity itself."
      kpis={[
        { label: 'Most records', value: `${byCountry[0]?.name ?? ''} ${m(byCountry[0]?.value)}` },
        { label: 'Largest kingdom', value: `${kingdoms[0]?.name ?? ''} ${m(kingdoms[0]?.value)}` },
        { label: 'Countries tracked', value: String(byCountry.length) },
        { label: 'Record since', value: '2000' },
      ]}
    >
      <OrbitMap
        chartId="nat-map"
        title="Species observations, latest year"
        subtitle="GBIF · records per country"
        unit="records"
        iconHtml={ICONS.environment}
        attribution={attribution}
        data={byCountry.map((p) => ({ code: p.code, name: p.code, value: Math.round(p.value) }))}
      />

      <OrbitChart
        chartId="nat-trend"
        title="Observations per year"
        subtitle="GBIF · annual · records · trend line open"
        unit="records"
        iconHtml={ICONS.forecast}
        attribution={attribution}
        series={countrySeries.refs}
        type="spline"
        initialTool="trendline"
        note="Growth here is mostly growth in digitised monitoring, not in the number of organisms."
        height={420}
      />

      <OrbitChart
        chartId="nat-kingdoms"
        title="Records by kingdom"
        subtitle="GBIF · annual · stacked · contribution open"
        unit="records"
        iconHtml={ICONS.environment}
        attribution={attribution}
        series={kingdomSeries.refs}
        type="areaspline"
        initialTool="contribution"
        extraOptions={{ plotOptions: { areaspline: { stacking: 'normal', fillOpacity: 0.4, lineWidth: 1 } } }}
        height={400}
      />

      <OrbitChart
        chartId="nat-tree"
        title="Where the records come from"
        subtitle="GBIF · latest year · share of the tracked total"
        iconHtml={ICONS.summary}
        attribution={attribution}
        tools={['summary', 'contribution', 'kpi', 'insights', 'narrate', 'ai', 'export', 'fullscreen', 'share']}
        height={420}
        {...treemapSeries('Species observations', byCountry, 26)}
      />

      <OrbitChart
        chartId="nat-rank"
        title="Ranked by records"
        subtitle="GBIF · latest year · log scale"
        unit="records"
        iconHtml={ICONS.economy}
        attribution={attribution}
        tools={['summary', 'kpi', 'distribution', 'insights', 'ai', 'export', 'fullscreen', 'share']}
        height={360}
        staticSeries={columnSeries('Records', byCountry, 26).staticSeries}
        extraOptions={{ ...columnSeries('Records', byCountry, 26).extraOptions, yAxis: { type: 'logarithmic' } }}
      />
    </DomainPage>
  );
}
