import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/**
 * FRED (Federal Reserve Bank of St Louis): 840k series, most of them daily.
 * The best open economic API there is, and the one that makes Orbit's technical
 * indicators meaningful. Key is free and issued instantly.
 */

const SERIES: { id: string; title: string; unit: string; domain: string; geo: string }[] = [
  { id: 'DGS10', title: 'US 10-year Treasury yield', unit: '%', domain: 'finance', geo: 'US' },
  { id: 'DGS2', title: 'US 2-year Treasury yield', unit: '%', domain: 'finance', geo: 'US' },
  { id: 'T10Y2Y', title: 'US yield curve (10y minus 2y)', unit: '% points', domain: 'finance', geo: 'US' },
  { id: 'DFF', title: 'US federal funds rate', unit: '%', domain: 'finance', geo: 'US' },
  { id: 'DCOILBRENTEU', title: 'Brent crude oil price', unit: 'US$/barrel', domain: 'energy', geo: 'WORLD' },
  { id: 'DCOILWTICO', title: 'WTI crude oil price', unit: 'US$/barrel', domain: 'energy', geo: 'US' },
  { id: 'DHHNGSP', title: 'Henry Hub natural gas price', unit: 'US$/MMBtu', domain: 'energy', geo: 'US' },
  { id: 'VIXCLS', title: 'VIX volatility index', unit: 'index', domain: 'finance', geo: 'US' },
  { id: 'SP500', title: 'S&P 500 index', unit: 'index', domain: 'finance', geo: 'US' },
  { id: 'NASDAQCOM', title: 'NASDAQ Composite index', unit: 'index', domain: 'finance', geo: 'US' },
  { id: 'DEXUSEU', title: 'US dollars per euro', unit: 'USD/EUR', domain: 'finance', geo: 'US' },
  { id: 'BAMLH0A0HYM2', title: 'US high-yield credit spread', unit: '% points', domain: 'finance', geo: 'US' },
  { id: 'UNRATE', title: 'US unemployment rate', unit: '%', domain: 'economy', geo: 'US' },
  { id: 'CPIAUCSL', title: 'US consumer price index', unit: 'index 1982-84=100', domain: 'economy', geo: 'US' },
  { id: 'GDPC1', title: 'US real GDP', unit: 'bn chained 2017 US$', domain: 'economy', geo: 'US' },
  { id: 'PAYEMS', title: 'US nonfarm payrolls', unit: 'thousands', domain: 'economy', geo: 'US' },
  { id: 'HOUST', title: 'US housing starts', unit: 'thousands of units', domain: 'economy', geo: 'US' },
  { id: 'UMCSENT', title: 'US consumer sentiment', unit: 'index 1966=100', domain: 'economy', geo: 'US' },
];

export const fredSeries: Adapter = {
  sourceId: 'fred',
  job: 'fred:series',
  requiredEnv: ['FRED_API_KEY'],
  async fetch(window: FetchWindow): Promise<SeriesPayload[]> {
    const key = process.env.FRED_API_KEY!;
    // FRED revises history, so always re-read a long window; the composite PK
    // makes the overwrite free.
    const start = new Date(Math.min(window.start.getTime(), Date.now() - 5 * 365 * 86_400_000));
    const out: SeriesPayload[] = [];
    for (const s of SERIES) {
      const url =
        'https://api.stlouisfed.org/fred/series/observations' +
        `?series_id=${s.id}&api_key=${key}&file_type=json` +
        `&observation_start=${start.toISOString().slice(0, 10)}`;
      const res = await fetchWithRetry(url);
      const body = await res.json();
      const observations = (body.observations ?? [])
        .map((o: any) => ({
          ts: `${o.date}T00:00:00Z`,
          // FRED writes '.' for a missing value (holidays, unpublished days).
          value: o.value === '.' ? null : Number(o.value),
        }))
        .filter((o: any) => o.value === null || Number.isFinite(o.value));
      if (!observations.length) continue;
      out.push({
        externalId: `fred:${s.id}`,
        title: s.title,
        domain: s.domain,
        geoCode: s.geo,
        unit: s.unit,
        frequency: 'daily',
        metadata: { fredSeriesId: s.id },
        observations,
      });
    }
    return out;
  },
};
