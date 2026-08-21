import DomainPage from '@/components/DomainPage';
import OrbitChart from '@/components/OrbitChart';
import { ICONS } from '@/lib/icons';
import { getLatest, getSeriesRefs } from '@/lib/queries';
import { columnSeries } from '@/lib/charts';

export const revalidate = 300;

export default async function Finance() {
  const [fx, fxNow] = await Promise.all([
    getSeriesRefs('EXR:D.', 20),
    getLatest('EXR:D.'),
  ]);
  const attribution = 'Source: European Central Bank';
  const majors = fx.refs.filter((r) => ['USD', 'GBP', 'CHF', 'JPY', 'NOK', 'SEK'].includes(r.name));
  const emerging = fx.refs.filter((r) => ['TRY', 'BRL', 'ZAR', 'MXN', 'INR', 'PLN'].includes(r.name));

  return (
    <DomainPage
      pageKey="gloviz-finance"
      charts={4}
      kicker="Finance · European Central Bank · daily"
      title="Twenty currencies," accent="one reference."
      icon="finance"
      lead="ECB daily reference rates against the euro. Daily series with a real datetime axis, which is what unlocks Orbit's technical indicators: moving averages, Bollinger bands, RSI and MACD."
      kpis={[
        { label: 'Currencies', value: String(fxNow.length) },
        { label: 'Strongest vs EUR', value: `${fxNow.at(-1)?.name ?? ''}` },
        { label: 'Weakest vs EUR', value: `${fxNow[0]?.name ?? ''}` },
        { label: 'Update', value: 'Daily, CET' },
      ]}
    >
      <OrbitChart
        chartId="fin-majors"
        title="Major currencies per EUR"
        subtitle="ECB · daily · indicators tool available (SMA, Bollinger, RSI, MACD)"
        unit="per EUR"
        iconHtml={ICONS.finance}
        attribution={attribution}
        series={majors}
        type="line"
        initialTool="indicators"
        live
        note="ECB reference rates, published each working day around 16:00 CET. Values are units of the currency per one euro."
        height={420}
      />

      <OrbitChart
        chartId="fin-emerging"
        title="Emerging market currencies per EUR"
        subtitle="ECB · daily · anomaly detection open"
        unit="per EUR"
        iconHtml={ICONS.anomaly}
        attribution={attribution}
        series={emerging}
        type="line"
        initialTool="anomaly"
        live
        height={400}
      />

      <OrbitChart
        chartId="fin-derived"
        title="Build your own series"
        subtitle="ECB · daily · Derived Series is open: try a ratio or a moving average"
        unit="per EUR"
        iconHtml={ICONS.correlations}
        attribution={attribution}
        series={fx.refs.slice(0, 8)}
        type="spline"
        initialTool="derived"
        note="Use Derived Series to compute cross rates: the ratio of two lines here is a currency pair the ECB never published."
        live
        height={400}
      />

      <OrbitChart
        chartId="fin-levels"
        title="Rate levels today"
        subtitle="ECB · latest publication · units per EUR, log scale"
        unit="per EUR"
        iconHtml={ICONS.summary}
        attribution={attribution}
        tools={['summary', 'kpi', 'distribution', 'insights', 'ai', 'export', 'fullscreen']}
        height={340}
        staticSeries={columnSeries('Per EUR', fxNow, 20).staticSeries}
        extraOptions={{ ...columnSeries('Per EUR', fxNow, 20).extraOptions, yAxis: { type: 'logarithmic' } }}
      />
    </DomainPage>
  );
}
