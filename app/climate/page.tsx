import DomainPage from '@/components/DomainPage';
import OrbitChart from '@/components/OrbitChart';
import { ICONS } from '@/lib/icons';
import { getLatest, getSeriesRefs } from '@/lib/queries';
import { polarSeries, columnSeries } from '@/lib/charts';

export const revalidate = 300;

export default async function Climate() {
  const [temp, wind, humidity, pressure, windNow, tempNow] = await Promise.all([
    getSeriesRefs('temperature_2m:', 14),
    getSeriesRefs('wind_speed_10m:', 14),
    getSeriesRefs('relative_humidity_2m:', 10),
    getSeriesRefs('surface_pressure:', 10),
    getLatest('wind_speed_10m:'),
    getLatest('temperature_2m:'),
  ]);
  const attribution = 'Weather data by Open-Meteo.com';

  return (
    <DomainPage
      kicker="Climate · Open-Meteo · hourly, UTC"
      title="Thirty cities," accent="hour by hour."
      icon="climate"
      lead="Temperature, wind, humidity and pressure for 30 cities worldwide, refreshed hourly with a three-day forecast attached. This is what Orbit's forecast and anomaly tools were built for."
      kpis={[
        { label: 'Warmest right now', value: `${tempNow[0]?.name ?? ''} ${tempNow[0]?.value.toFixed(1) ?? ''}°C` },
        { label: 'Coldest right now', value: `${tempNow.at(-1)?.name ?? ''} ${tempNow.at(-1)?.value.toFixed(1) ?? ''}°C` },
        { label: 'Windiest', value: `${windNow[0]?.name ?? ''} ${windNow[0]?.value.toFixed(0) ?? ''} km/h` },
        { label: 'Cities tracked', value: String(tempNow.length) },
      ]}
    >
      <OrbitChart
        chartId="cli-temp"
        title="Temperature"
        subtitle="Open-Meteo · hourly · °C · forecast tool open"
        unit="°C"
        iconHtml={ICONS.climate}
        attribution={attribution}
        series={temp.refs}
        type="spline"
        initialTool="forecast"
        live
        note="Hourly 2 m temperature in UTC. The last three days of each line are Open-Meteo's own forecast."
        height={420}
      />

      <OrbitChart
        chartId="cli-windrose"
        title="Wind speed around the world"
        subtitle="Open-Meteo · latest hour · km/h · polar view"
        unit="km/h"
        iconHtml={ICONS.environment}
        attribution={attribution}
        tools={['summary', 'kpi', 'distribution', 'contribution', 'insights', 'narrate', 'ai', 'export', 'fullscreen']}
        height={420}
        {...polarSeries('Wind speed', windNow, 16)}
      />

      <OrbitChart
        chartId="cli-wind"
        title="Wind speed over time"
        subtitle="Open-Meteo · hourly · km/h · control limits open"
        unit="km/h"
        iconHtml={ICONS.anomaly}
        attribution={attribution}
        series={wind.refs}
        type="line"
        initialTool="control-limits"
        live
        height={380}
      />

      <OrbitChart
        chartId="cli-humidity"
        title="Relative humidity"
        subtitle="Open-Meteo · hourly · % · correlate with temperature"
        unit="%"
        iconHtml={ICONS.correlations}
        attribution={attribution}
        series={humidity.refs}
        type="areaspline"
        initialTool="correlations"
        extraOptions={{ plotOptions: { areaspline: { fillOpacity: 0.12, lineWidth: 1.5 } } }}
        live
        height={380}
      />

      <OrbitChart
        chartId="cli-temp-now"
        title="Temperature right now, ranked"
        subtitle="Open-Meteo · latest hour · °C"
        unit="°C"
        iconHtml={ICONS.summary}
        attribution={attribution}
        tools={['summary', 'kpi', 'distribution', 'insights', 'ai', 'export', 'annotate', 'fullscreen']}
        height={340}
        {...columnSeries('Temperature', tempNow, 30)}
      />

      <OrbitChart
        chartId="cli-pressure"
        title="Surface pressure"
        subtitle="Open-Meteo · hourly · hPa · anomaly detection open"
        unit="hPa"
        iconHtml={ICONS.forecast}
        attribution={attribution}
        series={pressure.refs}
        type="line"
        initialTool="anomaly"
        note="Sharp drops in surface pressure mark passing storm systems."
        live
        height={360}
      />
    </DomainPage>
  );
}
