import DomainPage from '@/components/DomainPage';
import OrbitChart from '@/components/OrbitChart';
import { ICONS } from '@/lib/icons';
import { getLatest, getSeriesRefs } from '@/lib/queries';

export const revalidate = 300;
export const metadata = { title: 'Transport · GLOVIZ' };

export default async function Transport() {
  const [counts, altitude, speed, latest] = await Promise.all([
    getSeriesRefs('opensky:count:', 6),
    getSeriesRefs('opensky:altitude:', 6),
    getSeriesRefs('opensky:speed:', 6),
    getLatest('opensky:count:'),
  ]);
  const attribution = 'Source: The OpenSky Network (non-commercial use)';
  const total = latest.reduce((a, p) => a + p.value, 0);

  return (
    <DomainPage
      pageKey="gloviz-transport"
      charts={3}
      kicker="Transport · OpenSky · hourly snapshots"
      title="Everything" accent="in the air."
      icon="forecast"
      lead="Every hour GLOVIZ counts the aircraft transmitting ADS-B over four regions and records how high and how fast they are flying. Each run appends one point, so the daily rhythm of air traffic builds itself: the morning bank, the transatlantic wave, the overnight lull."
      kpis={[
        { label: 'Airborne, last snapshot', value: total ? total.toLocaleString('en') : 'n/a' },
        { label: 'Busiest region', value: `${latest[0]?.name ?? 'n/a'}` },
        { label: 'Regions watched', value: String(latest.length) },
        { label: 'Cadence', value: 'Hourly' },
      ]}
    >
      <OrbitChart
        chartId="tra-count"
        title="Aircraft airborne"
        subtitle="OpenSky · hourly snapshot · count · anomaly detection open"
        unit="aircraft"
        iconHtml={ICONS.forecast}
        attribution={attribution}
        series={counts.refs}
        type="line"
        initialTool="anomaly"
        live
        note="A snapshot count of aircraft transmitting ADS-B, excluding those on the ground. Coverage depends on volunteer receivers, so the level is a lower bound; the shape over the day is the signal."
        height={420}
      />

      <OrbitChart
        chartId="tra-altitude"
        title="Mean cruising altitude"
        subtitle="OpenSky · hourly · metres · control limits open"
        unit="metres"
        iconHtml={ICONS.climate}
        attribution={attribution}
        series={altitude.refs}
        type="spline"
        initialTool="control-limits"
        live
        height={380}
      />

      <OrbitChart
        chartId="tra-speed"
        title="Mean ground speed"
        subtitle="OpenSky · hourly · m/s · correlate with altitude"
        unit="m/s"
        iconHtml={ICONS.correlations}
        attribution={attribution}
        series={speed.refs}
        type="line"
        initialTool="correlations"
        live
        height={360}
      />
    </DomainPage>
  );
}
