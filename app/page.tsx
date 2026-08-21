import Link from 'next/link';
import OrbitChart from '@/components/OrbitChart';
import { HERO_MAP_SVG, CTA_MAP_SVG } from '@/lib/artwork';
import { getKpis, getSeriesGroups, getSources } from '@/lib/queries';

export const revalidate = 300;

const ALL_SOURCES = [
  'World Bank', 'FRED', 'ENTSO-E', 'Eurostat', 'Open-Meteo', 'USGS', 'OpenAQ',
  'OECD', 'IMF', 'ECB', 'WHO', 'Our World in Data', 'OpenSky', 'NASA POWER',
  'GBIF', 'data.europa.eu',
];
const NAME_MAP: Record<string, string> = {
  'World Bank Open Data': 'World Bank',
  'ENTSO-E Transparency Platform': 'ENTSO-E',
  'European Central Bank': 'ECB',
  'USGS Earthquake Hazards Program': 'USGS',
};

export default async function Home() {
  const [kpis, groups, sources] = await Promise.all([
    getKpis(), getSeriesGroups(), getSources(),
  ]);
  const integrated = new Set(sources.map((s) => NAME_MAP[s.name] ?? s.name));
  const hero = groups.find((g) => g.key === 'power') ?? groups.find((g) => g.key === 'temperature');
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);

  return (
    <main>
      <section className="wrap hero">
        <div>
          <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="dot" /> Live open data observatory
          </div>
          <h1 style={{ marginTop: 18 }}>The world&apos;s data, <em>live.</em></h1>
          <p className="lede">
            Economy, energy, climate, health and transport for 190+ countries: streamed from
            the world&apos;s best open APIs and analyzed in the chart with Highcharts Orbit.
            No logins, no exports.
          </p>
          <div className="hactions">
            <Link href="/dashboard" className="btn amber">Explore the data</Link>
            <a className="link" href="#orbit">
              See how Orbit works{' '}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </a>
          </div>
        </div>
        <div className="heromap" dangerouslySetInnerHTML={{ __html: HERO_MAP_SVG }} />
      </section>

      <div className="wrap">
        <div className="kpis">
          <div className="kpi" data-orbit-context="Integrated APIs">
            <div className="num">{kpis.sources}</div>
            <div className="lbl">Global &amp; regional APIs</div>
          </div>
          <div className="kpi" data-orbit-context="Live time series">
            <div className="num">{kpis.series}</div>
            <div className="lbl">Live time series</div>
          </div>
          <div className="kpi" data-orbit-context="Observations stored">
            <div className="num">{fmt(kpis.observations)}</div>
            <div className="lbl">Observations</div>
          </div>
          <div className="kpi" data-orbit-context="Refresh cadence">
            <div className="num">24/7 <span className="dot" /></div>
            <div className="lbl">Hourly ingestion</div>
          </div>
        </div>
      </div>

      {hero && (
        <section className="wrap sec">
          <OrbitChart
            chartId="hero-chart"
            title={hero.title}
            subtitle={hero.subtitle}
            unit={hero.unit}
            series={hero.series}
            attribution={`Source: ${hero.attribution}`}
            height={380}
          />
        </section>
      )}

      <section className="wrap sec" id="domains">
        <div className="shead">
          <div>
            <div className="kicker">Explore by domain</div>
            <h2 style={{ marginTop: 12 }}>One planet, <em>six lenses</em></h2>
            <p>Every dashboard streams straight from the source. Pick a domain, pick a region: Orbit&apos;s tools work the same everywhere.</p>
          </div>
          <Link className="link" href="/dashboard">
            All dashboards{' '}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </Link>
        </div>
        <div className="grid3">
          {[
            { name: 'Economy', freq: 'Annual', live: false, desc: 'GDP, population and 16,000 indicators for every country in the World Bank catalog.', tags: ['World Bank', 'FRED', 'OECD'] },
            { name: 'Energy', freq: 'Hourly', live: true, desc: 'Prices, generation mix and cross-border flows for ~35 European countries, hour by hour.', tags: ['ENTSO-E', 'Eurostat'] },
            { name: 'Climate', freq: 'Hourly', live: true, desc: 'Hourly conditions, forecasts and decades of climate history for any coordinate on Earth.', tags: ['Open-Meteo', 'NASA POWER'] },
            { name: 'Environment', freq: 'Real-time', live: true, desc: 'Every M4.5+ earthquake on the planet, minutes after it happens, plus air quality to come.', tags: ['USGS', 'OpenAQ'] },
            { name: 'Health', freq: 'Annual', live: false, desc: '2,000+ WHO indicators and harmonized long-run health series for every country.', tags: ['WHO GHO', 'OWID'] },
            { name: 'Finance', freq: 'Daily', live: true, desc: 'Daily FX reference rates from the ECB: and every aircraft in the sky, live.', tags: ['ECB', 'OpenSky'] },
          ].map((d) => (
            <Link key={d.name} className="card dcard" href="/dashboard">
              <div className="dtop">
                <h3>{d.name}</h3>
                <span className="freq">{d.live && <span className="dot" />}{d.freq}</span>
              </div>
              <p>{d.desc}</p>
              <div className="dtags">
                {d.tags.map((t) => (
                  <span key={t} className={integrated.has(t) ? 'pill on' : 'pill'}>{t}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap sec" id="orbit">
        <div className="kicker">Powered by Highcharts Orbit</div>
        <h2 style={{ marginTop: 12 }}>Every chart is an <em>analyst</em></h2>
        <div className="orbit">
          <div style={{ alignSelf: 'center' }}>
            <h3 style={{ fontSize: 24 }}>Don&apos;t just look at the data: interrogate it.</h3>
            <p className="muted" style={{ marginTop: 16, fontSize: 14, maxWidth: '40ch' }}>
              Orbit puts heavy-duty analysis tools inside every chart on this site. Most run
              entirely in the browser, so nothing leaves your environment.
            </p>
            <div className="hactions" style={{ marginTop: 24 }}>
              <Link href="/dashboard" className="btn amber">Try it on live data</Link>
              <a href="https://www.highcharts.com/products/orbit/" className="btn">What is Orbit?</a>
            </div>
          </div>
          <div className="ofeats">
            {[
              ['Anomaly Detection', 'Spikes and drops flagged directly on the chart, as they happen.'],
              ['Forecast', 'Project any series forward, with a fit score for every projection.'],
              ['Correlations', 'Temperature in Madrid against FX in Frankfurt: measured, not guessed.'],
              ['AI Insights', 'A ready-to-share brief on what your chart actually means.'],
            ].map(([b, p]) => (
              <div key={b} className="ofeat">
                <div><b>{b}</b><p>{p}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap sec" id="sources">
        <div className="shead">
          <div>
            <div className="kicker">Sixteen sources, zero scraping</div>
            <h2 style={{ marginTop: 12 }}>Built on the world&apos;s <em>best open APIs</em></h2>
            <p>Global and regional institutions only: one integration per source covers every country it serves. Lit pills are live in the database today.</p>
          </div>
        </div>
        <div className="srcs">
          {ALL_SOURCES.map((s) => (
            <span key={s} className={integrated.has(s) ? 'pill on' : 'pill'}>{s}</span>
          ))}
        </div>
        <div className="note">
          <p><strong>Open by design.</strong> Every dataset keeps its original licence: CC BY, public domain or equivalent: with source attribution rendered in every chart footer, generated from the same metadata that drives the charts.</p>
        </div>
      </section>

      <section className="wrap">
        <div className="cta">
          <div className="bg" dangerouslySetInnerHTML={{ __html: CTA_MAP_SVG }} />
          <div className="kicker">gloviz.app</div>
          <h2 style={{ marginTop: 14 }}>Start with <em>one chart.</em></h2>
          <p className="muted" style={{ margin: '16px auto 26px', maxWidth: '44ch' }}>
            Open the dashboard and put Orbit&apos;s anomaly detection on a live series.
          </p>
          <div className="hactions" style={{ justifyContent: 'center' }}>
            <Link href="/dashboard" className="btn amber">Open the app</Link>
            <Link href="/status" className="btn">API status</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
