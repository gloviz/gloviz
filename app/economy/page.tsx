import DomainPage from '@/components/DomainPage';
import OrbitChart from '@/components/OrbitChart';
import OrbitMap from '@/components/OrbitMap';
import { ICONS } from '@/lib/icons';
import OrbitGrid from '@/components/OrbitGrid';
import { getGridColumns, getLatest, getScatter, getSeriesRefs } from '@/lib/queries';
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
  const grid = await getGridColumns([
    { prefix: 'NY.GDP.PCAP.CD:', label: 'GDP per capita (US$)' },
    { prefix: 'NY.GDP.MKTP.KD.ZG:', label: 'GDP growth (%)' },
    { prefix: 'FP.CPI.TOTL.ZG:', label: 'Inflation (%)' },
    { prefix: 'SL.UEM.TOTL.ZS:', label: 'Unemployment (%)' },
    { prefix: 'NE.TRD.GNFS.ZS:', label: 'Trade (% of GDP)' },
    { prefix: 'SP.POP.TOTL:', label: 'Population' },
  ]);
  const [weoGrowth, weoDebt, imfCpi] = await Promise.all([
    getSeriesRefs('imf:weo:NGDP_RPCH:', 12),
    getSeriesRefs('imf:weo:GGXWDG_NGDP:', 12),
    getSeriesRefs('imf:cpi:YOY_PCH_PA_PT:', 12),
  ]);
  const attribution = 'Source: World Bank Open Data';
  const fmt = (n?: number) => (n === undefined ? 'n/a' : n.toLocaleString('en', { maximumFractionDigits: 0 }));

  return (
    <DomainPage
      pageKey="gloviz-economy"
      charts={10}
      relationships={{
        links: [
          { a: { content: 'econ-map', field: 0 }, b: { content: 'econ-growth', field: 0 } },
          { a: { content: 'econ-growth', field: 0 }, b: { content: 'econ-pop', field: 0 } },
          { a: { content: 'econ-phillips', field: 0 }, b: { content: 'econ-growth', field: 0 } },
        ],
      }}
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
        chartId="econ-weo"
        title="GDP growth, with the IMF's own forecast"
        subtitle="IMF World Economic Outlook · annual · % · the lines run past today on purpose"
        unit="% annual"
        iconHtml={ICONS.forecast}
        attribution="Source: International Monetary Fund"
        series={weoGrowth.refs}
        type="spline"
        initialTool="forecast"
        note="WEO carries a published projection, so the last years of each line are the IMF's forecast. Running Orbit's own Forecast on top compares a statistical projection against an institutional one."
        height={420}
      />

      <OrbitChart
        chartId="econ-debt"
        title="Government debt"
        subtitle="IMF WEO · annual · % of GDP · anomaly detection open"
        unit="% of GDP"
        iconHtml={ICONS.anomaly}
        attribution="Source: International Monetary Fund"
        series={weoDebt.refs}
        type="line"
        initialTool="anomaly"
        height={400}
      />

      <OrbitChart
        chartId="econ-imfcpi"
        title="Inflation, monthly, from the IMF"
        subtitle="IMF CPI · monthly · % annual · a faster read than the annual series"
        unit="% annual"
        iconHtml={ICONS.correlations}
        attribution="Source: International Monetary Fund"
        series={imfCpi.refs}
        type="line"
        initialTool="correlations"
        height={400}
      />

      <OrbitGrid
        gridId="econ-grid"
        title="Every economy, every indicator"
        subtitle="World Bank · latest year · sortable, and it filters with the charts"
        iconHtml={ICONS.summary}
        attribution={attribution}
        note="One row per country, latest reported year per indicator. Blank cells mean the country has not reported that indicator."
        columns={grid}
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
