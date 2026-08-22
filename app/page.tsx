import Link from 'next/link';
import { HERO_MAP_SVG } from '@/lib/artwork';
import LiveNow from '@/components/LiveNow';
import { getKpis, getLiveHighlights, getSources } from '@/lib/queries';
import { ICONS, SPARKS } from '@/lib/icons';

export const revalidate = 300;

const ALL_SOURCES = [
  'World Bank', 'FRED', 'ENTSO-E', 'Eurostat', 'Open-Meteo', 'USGS', 'OpenAQ',
  'OECD', 'IMF', 'ECB', 'WHO', 'Our World in Data', 'OpenSky', 'NASA POWER',
  'GBIF', 'data.europa.eu',
];
const SOURCE_LABEL: Record<string, string> = {
  'FRED, Federal Reserve Bank of St. Louis': 'FRED',
  'The OpenSky Network': 'OpenSky',
  'GBIF, Global Biodiversity Information Facility': 'GBIF',
  'WHO Global Health Observatory': 'WHO',
};
const NAME_MAP: Record<string, string> = {
  'World Bank Open Data': 'World Bank',
  'ENTSO-E Transparency Platform': 'ENTSO-E',
  'European Central Bank': 'ECB',
  'USGS Earthquake Hazards Program': 'USGS',
};

export default async function Home() {
  const [kpis, sources, live] = await Promise.all([
    getKpis(), getSources(), getLiveHighlights(),
  ]);
  const integrated = new Set(sources.map((s) => SOURCE_LABEL[s.name] ?? NAME_MAP[s.name] ?? s.name));
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
            <Link href="/climate" className="btn amber">Explore the data</Link>
            <a className="link" href="#orbit">
              See how Orbit works{' '}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </a>
          </div>
        </div>
        <div className="herostage">
          <div className="heromap" aria-hidden dangerouslySetInnerHTML={{ __html: HERO_MAP_SVG }} />
          <LiveNow items={live} />
        </div>
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
          <div className="kpi" data-orbit-context="Countries and regions covered">
            <div className="num">{kpis.countries}</div>
            <div className="lbl">Countries &amp; regions</div>
          </div>
          <div className="kpi" data-orbit-context="Observations stored">
            <div className="num">{fmt(kpis.observations)}</div>
            <div className="lbl">Observations</div>
          </div>
        </div>
      </div>


      <section className="wrap sec tight" id="play">
        <div className="shead tight">
          <div>
            <div className="kicker">Interactive and curated</div>
            <h2 style={{ marginTop: 10 }}>Ask it <em>yourself</em></h2>
          </div>
          <Link className="link" href="/stories">
            All stories{' '}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </Link>
        </div>
        <div className="tilerow">
          {[
            { href: '/explore', icon: 'correlations', title: 'Any two series', lead: 'Paired on time, correlation computed' },
            { href: '/compare', icon: 'economy', title: 'Up to five countries', lead: 'Every shared metric on one axis' },
            { href: '/race', icon: 'forecast', title: 'Ranking race', lead: 'Drag the year, watch the order change' },
            { href: '/surprise', icon: 'ai', title: 'Surprise me', lead: 'Two unrelated sources, correlated anyway' },
            { href: '/stories/the-heat-right-now', icon: 'climate', title: 'The heat right now', lead: 'Thirty cities, last 24 hours' },
            { href: '/stories/the-ground-is-moving', icon: 'environment', title: 'The ground is moving', lead: 'Every M4+ quake today' },
            { href: '/stories/how-clean-is-the-power', icon: 'zap', title: 'How clean is the power', lead: 'Grid CO2, five minutes apart' },
            { href: '/today', icon: 'summary', title: 'Today', lead: 'Records and extremes, written by the database' },
            { href: '/forecasts', icon: 'forecast', title: 'Who called it?', lead: 'Every forecast, scored against the outcome' },
          ].map((t) => (
            <Link key={t.href} className="tile" href={t.href}>
              <span className="chip" dangerouslySetInnerHTML={{ __html: ICONS[t.icon] }} />
              <span className="tiletext">
                <b>{t.title}</b>
                <small>{t.lead}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap sec" id="domains">
        <div className="shead">
          <div>
            <div className="kicker">Explore by domain</div>
            <h2 style={{ marginTop: 12 }}>One planet, <em>six lenses</em></h2>
            <p>Every dashboard streams straight from the source. Pick a domain, pick a region: Orbit&apos;s tools work the same everywhere.</p>
          </div>
          <Link className="link" href="/compare">
            Compare two countries{' '}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </Link>
        </div>
        <div className="grid3">
          {[
            { name: 'Economy', icon: 'economy', spark: 'economy', freq: 'Annual', live: false, desc: 'GDP, inflation and debt from the World Bank, OECD, Eurostat and the IMF, forecasts included.', tags: ['World Bank', 'OECD', 'Eurostat', 'IMF'] },
            { name: 'Energy', icon: 'zap', spark: 'energy', freq: 'Hourly', live: true, desc: 'Prices, generation mix and cross-border flows for ~35 European countries, hour by hour.', tags: ['ENTSO-E', 'Eurostat'] },
            { name: 'Climate', icon: 'climate', spark: 'climate', freq: 'Hourly', live: true, desc: 'Hourly conditions, forecasts and decades of climate history for any coordinate on Earth.', tags: ['Open-Meteo', 'NASA POWER'] },
            { name: 'Environment', icon: 'environment', spark: 'environment', freq: 'Real-time', live: true, desc: 'Every M4+ earthquake on the planet, plus daily PM2.5 and NO2 in twelve cities.', tags: ['USGS', 'OpenAQ'] },
            { name: 'Health', icon: 'health', spark: 'health', freq: 'Annual', live: false, desc: '2,000+ WHO indicators and harmonized long-run health series for every country.', tags: ['WHO GHO', 'OWID'] },
            { name: 'Finance', icon: 'finance', spark: 'finance', freq: 'Daily', live: true, desc: 'Twenty ECB reference rates against the euro, every working day.', tags: ['ECB'] },
            { name: 'Markets', icon: 'forecast', spark: 'economy', freq: 'Daily', live: true, desc: 'Treasury yields, crude, gas, the S&P 500, the VIX and credit spreads from FRED.', tags: ['FRED'] },
            { name: 'Nature', icon: 'environment', spark: 'health', freq: 'Annual', live: false, desc: 'Three billion species observations from GBIF, counted per country and per kingdom.', tags: ['GBIF'] },
            { name: 'Transport', icon: 'forecast', spark: 'finance', freq: 'Hourly', live: true, desc: 'Aircraft airborne over four regions, counted every hour from ADS-B.', tags: ['OpenSky'] },
          ].map((d) => (
            <Link key={d.name} className="card dcard" href={`/${d.name.toLowerCase()}`}>
              <div className="dtop">
                <span className="chip" dangerouslySetInnerHTML={{ __html: ICONS[d.icon] }} />
                <h3>{d.name}</h3>
                <span className="freq">{d.live && <span className="dot" />}{d.freq}</span>
              </div>
              <p>{d.desc}</p>
              <span className="spark" dangerouslySetInnerHTML={{ __html: SPARKS[d.spark] }} />
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
              <Link href="/finance" className="btn amber">Try it on live data</Link>
              <a href="https://www.highcharts.com/products/orbit/" className="btn">What is Orbit?</a>
            </div>
          </div>
          <div className="ofeats">
            {[
              ['Anomaly Detection', 'Spikes and drops flagged directly on the chart, as they happen.', 'anomaly'],
              ['Forecast', 'Project any series forward, with a fit score for every projection.', 'forecast'],
              ['Correlations', 'Temperature in Madrid against FX in Frankfurt: measured, not guessed.', 'correlations'],
              ['AI Insights', 'A ready-to-share brief on what your chart actually means.', 'ai'],
            ].map(([b, p, ic]) => (
              <div key={b} className="ofeat">
                <span className="oi" dangerouslySetInnerHTML={{ __html: ICONS[ic] }} />
                <div><b>{b}</b><p>{p}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap sec" id="sources">
        <div className="shead">
          <div>
            <div className="kicker">{sources.length} sources live, zero scraping</div>
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
          <span dangerouslySetInnerHTML={{ __html: ICONS.info }} />
          <p><strong>Open by design.</strong> Every dataset keeps its original licence: CC BY, public domain or equivalent: with source attribution rendered in every chart footer, generated from the same metadata that drives the charts.</p>
        </div>
      </section>

          </main>
  );
}
