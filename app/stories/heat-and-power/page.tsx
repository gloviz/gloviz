import DomainPage from '@/components/DomainPage';
import OrbitChart from '@/components/OrbitChart';
import { ICONS } from '@/lib/icons';
import { getSeriesRefs } from '@/lib/queries';

export const revalidate = 300;
export const metadata = { title: 'Heat and power · GLOVIZ' };

/** Same six cities on both sides, so Orbit relates the two charts by name. */
const CITIES = ['Oslo', 'Berlin', 'Madrid', 'Cairo', 'Sao Paulo', 'Delhi', 'Beijing', 'Sydney'];

export default async function HeatAndPower() {
  const [temp, solar] = await Promise.all([
    getSeriesRefs('temperature_2m:', 30),
    getSeriesRefs('ALLSKY_SFC_SW_DWN:', 24),
  ]);
  const pick = (refs: { id: number; name: string }[]) =>
    refs.filter((r) => CITIES.includes(r.name));

  return (
    <DomainPage
      pageKey="gloviz-story-heat"
      charts={3}
      relationships={{
        dateToleranceMs: 86_400_000,
        links: [
          { a: { content: 'story-temp', field: 'x' }, b: { content: 'story-solar', field: 'x' } },
        ],
      }}
      kicker="Story · Open-Meteo and NASA POWER"
      title="Heat and" accent="power."
      icon="climate"
      lead="Air temperature and the solar energy arriving at the same coordinates. Two different agencies, two different cadences, one shared time axis: hover a day in one chart and the other lights up. Correlations opens on load; try Compare on two cities from the page bar."
    >
      <OrbitChart
        chartId="story-temp"
        title="Air temperature"
        subtitle="Open-Meteo · hourly · °C · correlations open"
        unit="°C"
        iconHtml={ICONS.climate}
        attribution="Weather data by Open-Meteo.com"
        series={pick(temp.refs)}
        type="spline"
        initialTool="correlations"
        live
        note="Hourly 2 m air temperature, UTC. Southern-hemisphere cities run counter to the rest of the set."
        height={420}
      />

      <OrbitChart
        chartId="story-solar"
        title="Solar irradiance at the same places"
        subtitle="NASA POWER · daily · kWh/m2/day · forecast open"
        unit="kWh/m2/day"
        iconHtml={ICONS.zap}
        attribution="Source: NASA POWER Project"
        series={pick(solar.refs)}
        type="areaspline"
        initialTool="forecast"
        extraOptions={{ plotOptions: { areaspline: { fillOpacity: 0.1, lineWidth: 1.6 } } }}
        note="All-sky surface shortwave downward irradiance. The annual cycle is the signal; cloud cover is the noise."
        height={420}
      />

      <OrbitChart
        chartId="story-temp-all"
        title="The full set, thirty cities"
        subtitle="Open-Meteo · hourly · °C · anomaly detection open"
        unit="°C"
        iconHtml={ICONS.anomaly}
        attribution="Weather data by Open-Meteo.com"
        series={temp.refs.slice(0, 14)}
        type="line"
        initialTool="anomaly"
        live
        height={400}
      />
    </DomainPage>
  );
}
