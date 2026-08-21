import DomainPage from '@/components/DomainPage';
import OrbitChart from '@/components/OrbitChart';
import { ICONS } from '@/lib/icons';
import { getLatest, getScatter, getSeriesRefs } from '@/lib/queries';
import { dumbbellSeries, scatterSeries } from '@/lib/charts';

export const revalidate = 300;
export const metadata = { title: 'The pandemic dip · GLOVIZ' };

export default async function PandemicDip() {
  const [life, who, healthy, spend] = await Promise.all([
    getSeriesRefs('SP.DYN.LE00.IN:', 14),
    getLatest('WHOSIS_000001:'),
    getLatest('WHOSIS_000002:'),
    getScatter('SH.XPD.CHEX.GD.ZS:', 'SP.DYN.LE00.IN:', 'SP.POP.TOTL:'),
  ]);

  return (
    <DomainPage
      pageKey="gloviz-story-pandemic"
      charts={4}
      kicker="Story · World Bank and WHO"
      title="The pandemic" accent="dip."
      icon="health"
      lead="Life expectancy rose almost everywhere for fifty years, then fell in 2020 and 2021. Anomaly detection is open on the first chart: it finds the dip without being told the years. Use Compare in the page bar to put 2019 against 2021."
    >
      <OrbitChart
        chartId="pan-life"
        title="Life expectancy at birth"
        subtitle="World Bank · annual · years · anomaly detection open"
        unit="years"
        iconHtml={ICONS.anomaly}
        attribution="Source: World Bank Open Data"
        series={life.refs}
        type="spline"
        initialTool="anomaly"
        note="Life expectancy at birth, both sexes. The 2020-2021 decline is the first sustained global fall since the second world war."
        height={440}
      />

      <OrbitChart
        chartId="pan-trend"
        title="The same data, with the long trend fitted"
        subtitle="World Bank · annual · trend line open, R2 per country"
        unit="years"
        iconHtml={ICONS.forecast}
        attribution="Source: World Bank Open Data"
        series={life.refs}
        type="line"
        initialTool="trendline"
        note="A least-squares fit across the whole record. Where R2 is high the dip is a genuine outlier, not noise."
        height={400}
      />

      <OrbitChart
        chartId="pan-gap"
        title="Years lived, and years lived well"
        subtitle="WHO · latest year · life expectancy against healthy life expectancy"
        unit="years"
        iconHtml={ICONS.health}
        attribution="Source: WHO Global Health Observatory"
        tools={['summary', 'kpi', 'distribution', 'insights', 'narrate', 'ai', 'export', 'annotate', 'fullscreen', 'share']}
        note="The span of each bar is the number of years typically lived in poor health."
        height={460}
        {...dumbbellSeries('Life expectancy', who, healthy, 20)}
      />

      <OrbitChart
        chartId="pan-spend"
        title="Does spending buy years?"
        subtitle="World Bank · latest year · bubble size is population"
        iconHtml={ICONS.correlations}
        attribution="Source: World Bank Open Data"
        tools={['summary', 'correlations', 'insights', 'narrate', 'ai', 'export', 'annotate', 'fullscreen', 'share']}
        initialTool="correlations"
        height={420}
        {...scatterSeries('Countries', spend, 'Health spending (% of GDP)', 'Life expectancy (years)')}
      />
    </DomainPage>
  );
}
