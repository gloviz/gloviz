import DomainPage from '@/components/DomainPage';
import OrbitChart from '@/components/OrbitChart';
import OrbitMap from '@/components/OrbitMap';
import { ICONS } from '@/lib/icons';
import OrbitGrid from '@/components/OrbitGrid';
import { getGridColumns, getLatest, getScatter, getSeriesRefs } from '@/lib/queries';
import { columnSeries, dumbbellSeries, scatterSeries } from '@/lib/charts';

export const revalidate = 300;

export default async function Health() {
  const [life, healthy, infant, spendVsLife, lifeSeries, ncd] = await Promise.all([
    getLatest('WHOSIS_000001:'),
    getLatest('WHOSIS_000002:'),
    getLatest('SP.DYN.IMRT.IN:'),
    getScatter('SH.XPD.CHEX.GD.ZS:', 'SP.DYN.LE00.IN:', 'SP.POP.TOTL:'),
    getSeriesRefs('SP.DYN.LE00.IN:', 14),
    getSeriesRefs('NCDMORT3070:', 12),
  ]);
  const grid = await getGridColumns([
    { prefix: 'WHOSIS_000001:', label: 'Life expectancy (yrs)' },
    { prefix: 'WHOSIS_000002:', label: 'Healthy life expectancy (yrs)' },
    { prefix: 'SP.DYN.IMRT.IN:', label: 'Infant mortality (per 1,000)' },
    { prefix: 'SH.XPD.CHEX.GD.ZS:', label: 'Health spending (% GDP)' },
    { prefix: 'NCDMORT3070:', label: 'NCD mortality 30-70 (%)' },
  ]);

  return (
    <DomainPage
      pageKey="gloviz-health"
      charts={7}
      kicker="Health · WHO GHO, World Bank"
      title="Years lived," accent="and years lost."
      icon="health"
      lead="Life expectancy against healthy life expectancy, infant mortality, non-communicable disease mortality, and what health spending actually buys."
      kpis={[
        { label: 'Longest life expectancy', value: `${life[0]?.code ?? ''} ${life[0]?.value.toFixed(1) ?? ''} yrs` },
        { label: 'Lowest infant mortality', value: `${infant.at(-1)?.code ?? ''} ${infant.at(-1)?.value.toFixed(1) ?? ''}` },
        { label: 'Countries, WHO', value: String(life.length) },
        { label: 'Indicators', value: '7' },
      ]}
    >
      <OrbitMap
        chartId="hea-map"
        title="Life expectancy at birth"
        subtitle="WHO Global Health Observatory · latest year · years"
        unit="years"
        iconHtml={ICONS.health}
        attribution="Source: WHO Global Health Observatory"
        data={life.map((p) => ({ code: p.code, name: p.code, value: Math.round(p.value * 10) / 10 }))}
      />

      <OrbitChart
        chartId="hea-gap"
        title="Life expectancy against healthy life expectancy"
        subtitle="WHO · latest year · the gap is years lived in poor health"
        unit="years"
        iconHtml={ICONS.correlations}
        attribution="Source: WHO Global Health Observatory"
        tools={['summary', 'kpi', 'distribution', 'insights', 'narrate', 'ai', 'export', 'annotate', 'fullscreen']}
        note="Each bar spans healthy life expectancy to total life expectancy; the span is years lived with illness or disability."
        height={460}
        {...dumbbellSeries('Life expectancy', life, healthy, 20)}
      />

      <OrbitChart
        chartId="hea-spend"
        title="Health spending against life expectancy"
        subtitle="World Bank · latest year · bubble size is population"
        iconHtml={ICONS.correlations}
        attribution="Source: World Bank Open Data"
        tools={['summary', 'correlations', 'insights', 'narrate', 'ai', 'export', 'annotate', 'fullscreen']}
        height={420}
        {...scatterSeries('Countries', spendVsLife, 'Health spending (% of GDP)', 'Life expectancy (years)')}
      />

      <OrbitChart
        chartId="hea-life-series"
        title="Life expectancy, the long run"
        subtitle="World Bank · annual · years · forecast open"
        unit="years"
        iconHtml={ICONS.forecast}
        attribution="Source: World Bank Open Data"
        series={lifeSeries.refs}
        type="spline"
        initialTool="forecast"
        note="Look for the 2020-2021 dip: the pandemic is visible in most of these lines."
        height={400}
      />

      <OrbitChart
        chartId="hea-ncd"
        title="Premature mortality from non-communicable disease"
        subtitle="WHO · annual · % probability of dying between 30 and 70"
        unit="% probability"
        iconHtml={ICONS.anomaly}
        attribution="Source: WHO Global Health Observatory"
        series={ncd.refs}
        type="line"
        initialTool="trendline"
        height={380}
      />

      <OrbitGrid
        gridId="hea-grid"
        title="Every country, every health indicator"
        subtitle="WHO and World Bank · latest year · sortable, filters with the charts"
        iconHtml={ICONS.health}
        attribution="Sources: WHO Global Health Observatory, World Bank Open Data"
        columns={grid}
      />

      <OrbitChart
        chartId="hea-infant"
        title="Infant mortality, ranked"
        subtitle="World Bank · latest year · deaths per 1,000 live births"
        unit="per 1,000"
        iconHtml={ICONS.summary}
        attribution="Source: World Bank Open Data"
        tools={['summary', 'kpi', 'distribution', 'contribution', 'insights', 'ai', 'export', 'fullscreen']}
        height={360}
        {...columnSeries('Infant mortality', infant, 26)}
      />
    </DomainPage>
  );
}
