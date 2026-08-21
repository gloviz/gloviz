import DomainPage from '@/components/DomainPage';
import OrbitChart from '@/components/OrbitChart';
import OrbitMap from '@/components/OrbitMap';
import { ICONS } from '@/lib/icons';
import { getLatest, getScatter, getSeriesRefs } from '@/lib/queries';
import { columnSeries, scatterSeries, treemapSeries } from '@/lib/charts';

export const revalidate = 300;

export default async function Economy() {
  const [gdpPc, growth, pop, inflation, unemp, phillips] = await Promise.all([
    getLatest('NY.GDP.PCAP.CD:'),
    getLatest('NY.GDP.MKTP.KD.ZG:'),
    getLatest('SP.POP.TOTL:'),
    getSeriesRefs('FP.CPI.TOTL.ZG:', 12),
    getSeriesRefs('SL.UEM.TOTL.ZS:', 12),
    getScatter('SL.UEM.TOTL.ZS:', 'FP.CPI.TOTL.ZG:', 'SP.POP.TOTL:'),
  ]);
  const attribution = 'Source: World Bank Open Data';
  const fmt = (n?: number) => (n === undefined ? 'n/a' : n.toLocaleString('en', { maximumFractionDigits: 0 }));

  return (
    <DomainPage
      kicker="Economy · World Bank · annual"
      title="The money," accent="measured."
      icon="economy"
      lead="GDP, inflation, unemployment, trade and population for 45 economies, straight from the World Bank's open API. Ranked, mapped and cross-plotted, with Orbit's analysis on every one."
      kpis={[
        { label: 'Richest per capita', value: `${gdpPc[0]?.code ?? ''} $${fmt(gdpPc[0]?.value)}` },
        { label: 'Fastest growth', value: `${growth[0]?.code ?? ''} ${growth[0]?.value.toFixed(1) ?? ''}%` },
        { label: 'Largest population', value: `${pop[0]?.code ?? ''} ${fmt(pop[0]?.value)}` },
        { label: 'Economies tracked', value: String(gdpPc.length) },
      ]}
    >
      <OrbitMap
        chartId="econ-map"
        title="GDP per capita"
        subtitle="World Bank · latest available year · current US$"
        unit="US$"
        iconHtml={ICONS.economy}
        attribution={attribution}
        note="Latest available year per country; gaps mean the country has not reported."
        data={gdpPc.map((p) => ({ code: p.code, name: p.code, value: Math.round(p.value) }))}
      />

      <OrbitChart
        chartId="econ-growth"
        title="GDP growth, ranked"
        subtitle="World Bank · latest year · % annual"
        unit="% annual"
        iconHtml={ICONS.forecast}
        attribution={attribution}
        tools={['summary', 'kpi', 'contribution', 'distribution', 'insights', 'narrate', 'ai', 'export', 'annotate', 'fullscreen']}
        initialTool="kpi"
        height={340}
        {...columnSeries('GDP growth', growth, 24)}
      />

      <OrbitChart
        chartId="econ-inflation"
        title={inflation.title || 'Inflation'}
        subtitle="World Bank · annual · % · anomaly detection open"
        unit="% annual"
        iconHtml={ICONS.anomaly}
        attribution={attribution}
        series={inflation.refs}
        type="spline"
        initialTool="anomaly"
        note="Consumer price inflation, annual %. Spikes are usually currency crises or energy shocks."
        height={380}
      />

      <OrbitChart
        chartId="econ-phillips"
        title="Unemployment against inflation"
        subtitle="World Bank · latest year · bubble size is population"
        iconHtml={ICONS.correlations}
        attribution={attribution}
        tools={['summary', 'correlations', 'insights', 'ai', 'narrate', 'export', 'annotate', 'fullscreen']}
        note="A Phillips-curve style plot: each bubble is one economy in its most recent reported year."
        height={420}
        {...scatterSeries('Economies', phillips, 'Unemployment (%)', 'Inflation (%)')}
      />

      <OrbitChart
        chartId="econ-pop"
        title="Population, share of the tracked world"
        subtitle="World Bank · latest year · people"
        iconHtml={ICONS.economy}
        attribution={attribution}
        tools={['summary', 'contribution', 'kpi', 'insights', 'ai', 'export', 'fullscreen']}
        height={420}
        {...treemapSeries('Population', pop, 30)}
      />

      <OrbitChart
        chartId="econ-unemp"
        title={unemp.title || 'Unemployment'}
        subtitle="World Bank · annual · % of labour force · trend line open"
        unit="% labour force"
        iconHtml={ICONS.summary}
        attribution={attribution}
        series={unemp.refs}
        type="line"
        initialTool="trendline"
        height={380}
      />
    </DomainPage>
  );
}
