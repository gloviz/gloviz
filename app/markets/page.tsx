import DomainPage from '@/components/DomainPage';
import OrbitChart from '@/components/OrbitChart';
import { ICONS } from '@/lib/icons';
import { getLatest, getSeriesRefs } from '@/lib/queries';

export const revalidate = 300;
export const metadata = { title: 'Markets · GLOVIZ' };

export default async function Markets() {
  const [all, latest] = await Promise.all([getSeriesRefs('fred:', 30), getLatest('fred:')]);
  const attribution = 'Source: Federal Reserve Bank of St. Louis (FRED)';
  return (
    <DomainPage
      pageKey="gloviz-markets"
      charts={5}
      kicker="Markets · FRED · daily"
      title="Rates, oil," accent="and fear."
      icon="finance"
      lead="Eighteen daily series from the St. Louis Fed: the Treasury curve, crude and gas prices, the S&P 500, the VIX, credit spreads and the US macro record back to the 1950s. Daily datetime axes, so the technical indicators are live: SMA, EMA, Bollinger, RSI and MACD."
      kpis={[
        { label: 'Series from FRED', value: String(latest.length) },
        { label: 'Longest record', value: 'Since 1954' },
        { label: 'Cadence', value: 'Daily' },
        { label: 'Indicators', value: 'SMA · RSI · MACD' },
      ]}
    >
      <OrbitChart
        chartId="mkt-rates"
        title="US Treasury yields and the curve"
        subtitle="FRED · daily · % · indicators open"
        unit="%"
        iconHtml={ICONS.finance}
        attribution={attribution}
        series={all.refs.slice(0, 4)}
        type="line"
        initialTool="indicators"
        live
        note="DGS10 and DGS2 are constant-maturity Treasury yields; T10Y2Y is their spread. A negative spread has preceded most US recessions."
        height={420}
      />

      <OrbitChart
        chartId="mkt-energy"
        title="Crude oil and natural gas"
        subtitle="FRED · daily · anomaly detection open"
        unit="US$"
        iconHtml={ICONS.zap}
        attribution={attribution}
        series={all.refs.slice(4, 7)}
        type="spline"
        initialTool="anomaly"
        live
        height={400}
      />

      <OrbitChart
        chartId="mkt-equity"
        title="Equities and volatility"
        subtitle="FRED · daily · index · derived series open"
        unit="index"
        iconHtml={ICONS.correlations}
        attribution={attribution}
        series={all.refs.slice(7, 11)}
        type="line"
        initialTool="derived"
        note="Try a ratio of NASDAQ to S&P 500 in Derived Series, or a moving average of the VIX."
        live
        height={400}
      />

      <OrbitChart
        chartId="mkt-credit"
        title="Credit spreads"
        subtitle="FRED · daily · percentage points · control limits open"
        unit="% points"
        iconHtml={ICONS.anomaly}
        attribution={attribution}
        series={all.refs.slice(11, 13)}
        type="area"
        initialTool="control-limits"
        extraOptions={{ plotOptions: { area: { fillOpacity: 0.18 } } }}
        live
        height={360}
      />

      <OrbitChart
        chartId="mkt-macro"
        title="The US macro record"
        subtitle="FRED · monthly and quarterly · forecast open"
        iconHtml={ICONS.economy}
        attribution={attribution}
        series={all.refs.slice(13)}
        type="line"
        initialTool="forecast"
        note="Unemployment, CPI, real GDP, payrolls, housing starts and consumer sentiment on one axis: the shape matters more than the level."
        height={420}
      />
    </DomainPage>
  );
}
