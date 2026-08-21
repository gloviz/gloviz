import DomainPage from '@/components/DomainPage';
import OrbitChart from '@/components/OrbitChart';
import OrbitMap from '@/components/OrbitMap';
import { ICONS } from '@/lib/icons';
import { getLatest, getScatter, getSeriesRefs } from '@/lib/queries';
import { columnSeries, scatterSeries } from '@/lib/charts';

export const revalidate = 300;

export default async function Energy() {
  const [renewShare, useCap, solar, renewSeries, useSeries, mix] = await Promise.all([
    getLatest('share-electricity-renewables:'),
    getLatest('per-capita-energy-use:'),
    getSeriesRefs('ALLSKY_SFC_SW_DWN:', 12),
    getSeriesRefs('share-electricity-renewables:', 14),
    getSeriesRefs('EG.USE.PCAP.KG.OE:', 12),
    getScatter('per-capita-energy-use:', 'share-electricity-renewables:', 'co-emissions-per-capita:'),
  ]);

  return (
    <DomainPage
      pageKey="gloviz-energy"
      charts={6}
      kicker="Energy · OWID, World Bank, NASA POWER"
      title="Watts," accent="where they come from."
      icon="zap"
      lead="Renewable electricity share, energy use per capita and daily solar irradiance. Wired for the day ENTSO-E's hourly European power prices land on top."
      kpis={[
        { label: 'Greenest grid', value: `${renewShare[0]?.code ?? ''} ${renewShare[0]?.value.toFixed(0) ?? ''}%` },
        { label: 'Highest energy use', value: `${useCap[0]?.code ?? ''} ${Math.round((useCap[0]?.value ?? 0) / 1000)}k kWh` },
        { label: 'Countries', value: String(renewShare.length) },
        { label: 'Solar sites', value: String(solar.refs.length) },
      ]}
    >
      <OrbitMap
        chartId="ene-map"
        title="Renewable share of electricity"
        subtitle="Our World in Data · latest year · % of generation"
        unit="%"
        iconHtml={ICONS.zap}
        attribution="Source: Our World in Data"
        data={renewShare.map((p) => ({ code: p.code, name: p.code, value: Math.round(p.value * 10) / 10 }))}
      />

      <OrbitChart
        chartId="ene-renew"
        title="Renewable electricity share over time"
        subtitle="Our World in Data · annual · % · trend line open"
        unit="% of electricity"
        iconHtml={ICONS.forecast}
        attribution="Source: Our World in Data"
        series={renewSeries.refs}
        type="spline"
        initialTool="trendline"
        note="Share of electricity generation from renewables, including hydro."
        height={400}
      />

      <OrbitChart
        chartId="ene-solar"
        title="Solar irradiance"
        subtitle="NASA POWER · daily · kWh/m2/day · seasonality is the point"
        unit="kWh/m2/day"
        iconHtml={ICONS.climate}
        attribution="Source: NASA POWER Project"
        series={solar.refs}
        type="line"
        initialTool="forecast"
        live
        height={400}
      />

      <OrbitChart
        chartId="ene-scatter"
        title="Energy use against renewable share"
        subtitle="OWID · latest year · bubble size is CO2 per capita"
        iconHtml={ICONS.correlations}
        attribution="Source: Our World in Data"
        tools={['summary', 'correlations', 'insights', 'narrate', 'ai', 'export', 'annotate', 'fullscreen']}
        height={420}
        {...scatterSeries('Countries', mix, 'Energy use per capita (kWh)', 'Renewable electricity (%)')}
      />

      <OrbitChart
        chartId="ene-usecap"
        title="Energy use per capita, ranked"
        subtitle="Our World in Data · latest year · kWh per person"
        unit="kWh"
        iconHtml={ICONS.summary}
        attribution="Source: Our World in Data"
        tools={['summary', 'kpi', 'contribution', 'distribution', 'insights', 'ai', 'export', 'fullscreen']}
        initialTool="contribution"
        height={360}
        {...columnSeries('Energy use per capita', useCap, 24)}
      />

      <OrbitChart
        chartId="ene-wb"
        title="Energy use per capita, long run"
        subtitle="World Bank · annual · kg oil equivalent"
        unit="kg oil eq."
        iconHtml={ICONS.economy}
        attribution="Source: World Bank Open Data"
        series={useSeries.refs}
        type="line"
        height={360}
      />
    </DomainPage>
  );
}
