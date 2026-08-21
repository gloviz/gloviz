import DomainPage from '@/components/DomainPage';
import OrbitChart from '@/components/OrbitChart';
import OrbitMap from '@/components/OrbitMap';
import { ICONS } from '@/lib/icons';
import { getLatest, getSeriesRefs } from '@/lib/queries';
import { treemapSeries, columnSeries } from '@/lib/charts';

export const revalidate = 300;

export default async function Environment() {
  const [co2, co2pc, quakeCount, quakeMag, quakeEnergy, quakeRegions, co2Series] =
    await Promise.all([
      getLatest('annual-co2-emissions-per-country:'),
      getLatest('co-emissions-per-capita:'),
      getSeriesRefs('quakes:count:m40', 1),
      getSeriesRefs('quakes:maxmag', 1),
      getSeriesRefs('quakes:energy', 1),
      getSeriesRefs('quakes:count:', 6),
      getSeriesRefs('annual-co2-emissions-per-country:', 12),
    ]);
  const regional = { refs: quakeRegions.refs.filter((r) => !/m40/.test(String(r.name))) };

  return (
    <DomainPage
      pageKey="gloviz-environment"
      charts={8}
      kicker="Environment · USGS, Our World in Data"
      title="The planet," accent="shaking and warming."
      icon="environment"
      lead="Every M4.0+ earthquake on Earth aggregated per day, and the long-run CO2 record per country. Seismicity is the sharpest anomaly-detection demo in the catalogue."
      kpis={[
        { label: 'Largest emitter', value: `${co2[0]?.code ?? ''} ${((co2[0]?.value ?? 0) / 1e9).toFixed(1)} Gt` },
        { label: 'Highest per capita', value: `${co2pc[0]?.code ?? ''} ${co2pc[0]?.value.toFixed(1) ?? ''} t` },
        { label: 'Quake series', value: '6 daily' },
        { label: 'Countries', value: String(co2.length) },
      ]}
    >
      <OrbitMap
        chartId="env-map"
        title="CO2 emissions per capita"
        subtitle="Our World in Data · latest year · tonnes per person"
        unit="t"
        iconHtml={ICONS.environment}
        attribution="Source: Our World in Data"
        data={co2pc.map((p) => ({ code: p.code, name: p.code, value: Math.round(p.value * 10) / 10 }))}
      />

      <OrbitChart
        chartId="env-quakes"
        title="Earthquakes per day, M4.0+"
        subtitle="USGS · daily count · anomaly detection open"
        unit="count"
        iconHtml={ICONS.anomaly}
        attribution="Source: U.S. Geological Survey"
        series={quakeCount.refs}
        type="column"
        initialTool="anomaly"
        live
        note="Daily count of magnitude 4.0 and above worldwide. Aftershock sequences show as multi-day clusters."
        extraOptions={{ plotOptions: { column: { borderWidth: 0, borderRadius: 2 } } }}
        height={340}
      />

      <OrbitChart
        chartId="env-quake-regions"
        title="Where the earthquakes are"
        subtitle="USGS · daily count by region · stacked"
        unit="count"
        iconHtml={ICONS.environment}
        attribution="Source: U.S. Geological Survey"
        series={regional.refs}
        type="areaspline"
        initialTool="contribution"
        extraOptions={{ plotOptions: { areaspline: { stacking: 'normal', fillOpacity: 0.35, lineWidth: 1 } } }}
        live
        height={360}
      />

      <OrbitChart
        chartId="env-quake-energy"
        title="Seismic energy released per day"
        subtitle="USGS · gigajoules, Gutenberg-Richter · log scale"
        unit="GJ"
        iconHtml={ICONS.forecast}
        attribution="Source: U.S. Geological Survey"
        series={quakeEnergy.refs}
        type="area"
        extraOptions={{ yAxis: { type: 'logarithmic' }, plotOptions: { area: { fillOpacity: 0.2 } } }}
        note="Energy is derived from magnitude with log10(E) = 1.5M + 4.8, so one large quake dwarfs a hundred small ones."
        live
        height={340}
      />

      <OrbitChart
        chartId="env-quake-mag"
        title="Strongest earthquake each day"
        subtitle="USGS · magnitude · control limits open"
        unit="magnitude"
        iconHtml={ICONS.summary}
        attribution="Source: U.S. Geological Survey"
        series={quakeMag.refs}
        type="line"
        initialTool="control-limits"
        live
        height={320}
      />

      <OrbitChart
        chartId="env-co2-tree"
        title="CO2 emissions, share of the tracked total"
        subtitle="Our World in Data · latest year · tonnes"
        iconHtml={ICONS.environment}
        attribution="Source: Our World in Data"
        tools={['summary', 'contribution', 'kpi', 'insights', 'narrate', 'ai', 'export', 'fullscreen']}
        height={420}
        {...treemapSeries('CO2 emissions', co2.filter((p) => p.code !== 'WLD'), 26)}
      />

      <OrbitChart
        chartId="env-co2-line"
        title="CO2 emissions, the long run"
        subtitle="Our World in Data · annual · tonnes since 1970"
        unit="tonnes"
        iconHtml={ICONS.forecast}
        attribution="Source: Our World in Data"
        series={co2Series.refs.filter((r) => r.name !== 'WLD')}
        type="spline"
        initialTool="trendline"
        height={400}
      />

      <OrbitChart
        chartId="env-co2pc"
        title="CO2 per capita, ranked"
        subtitle="Our World in Data · latest year · tonnes per person"
        unit="t per person"
        iconHtml={ICONS.summary}
        attribution="Source: Our World in Data"
        tools={['summary', 'kpi', 'distribution', 'insights', 'ai', 'export', 'annotate', 'fullscreen']}
        height={340}
        {...columnSeries('CO2 per capita', co2pc.filter((p) => p.code !== 'WLD'), 26)}
      />
    </DomainPage>
  );
}
