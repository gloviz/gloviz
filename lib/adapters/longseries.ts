import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';

/**
 * Four iconic long series, one adapter file, one Adapter per source.
 * All formats verified against the live files on 2026-08-22:
 *
 * - NOAA GML Mauna Loa CO2 (monthly, 1958+): whitespace-separated text,
 *   comment lines start with '#', columns: year month decimal-date average
 *   deseasonalized ndays stdev uncertainty. Missing markers are negative
 *   (-9.99 / -0.99) in the stat columns; 'average' itself is real.
 * - NASA GISTEMP v4 global land-ocean anomaly (monthly, 1880+): CSV with a
 *   title line, then Year,Jan..Dec,...; values like -.19; '***' = missing.
 * - NSIDC Sea Ice Index v4 northern daily extent (1978+): CSV, columns
 *   Year, Month, Day, Extent, Missing, Source; header spans two lines.
 * - SILSO monthly mean sunspot number (1749+): semicolon-separated,
 *   columns year;month;decimal-date;value;stdev;nobs;provisional; value -1
 *   means missing.
 */

function payload(
  externalId: string, title: string, domain: string, unit: string,
  frequency: string, observations: { ts: string; value: number | null }[],
): SeriesPayload {
  return { externalId, title, domain, geoCode: 'WLD', unit, frequency, observations };
}

export const noaaCo2: Adapter = {
  sourceId: 'noaa-gml',
  job: 'noaa-gml:co2',
  async fetch(_w: FetchWindow): Promise<SeriesPayload[]> {
    const res = await fetchWithRetry('https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.txt',
      { headers: { 'User-Agent': 'gloviz.app data ingest (askill.solheim@highsoft.com)' } });
    const obs: { ts: string; value: number | null }[] = [];
    for (const line of (await res.text()).split('\n')) {
      if (line.startsWith('#') || !line.trim()) continue;
      const c = line.trim().split(/\s+/);
      const year = Number(c[0]); const month = Number(c[1]); const avg = Number(c[3]);
      if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isFinite(avg)) continue;
      obs.push({ ts: `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`, value: avg });
    }
    return [payload('noaa:co2-mauna-loa', 'Atmospheric CO2, Mauna Loa (Keeling curve)',
      'climate', 'ppm', 'monthly', obs)];
  },
};

export const nasaGistemp: Adapter = {
  sourceId: 'nasa-gistemp',
  job: 'nasa-gistemp:global',
  async fetch(_w: FetchWindow): Promise<SeriesPayload[]> {
    const res = await fetchWithRetry('https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv',
      { headers: { 'User-Agent': 'gloviz.app data ingest (askill.solheim@highsoft.com)' } });
    const lines = (await res.text()).split('\n');
    const obs: { ts: string; value: number | null }[] = [];
    for (const line of lines) {
      const c = line.split(',');
      const year = Number(c[0]);
      if (!Number.isInteger(year) || year < 1800) continue; // skips both header lines
      for (let m = 1; m <= 12; m++) {
        const v = Number(c[m]);
        if (!Number.isFinite(v)) continue; // '***'
        obs.push({ ts: `${year}-${String(m).padStart(2, '0')}-01T00:00:00Z`, value: v });
      }
    }
    return [payload('gistemp:global-anomaly', 'Global temperature anomaly (vs 1951-1980)',
      'climate', '°C anomaly', 'monthly', obs)];
  },
};

export const nsidcSeaIce: Adapter = {
  sourceId: 'nsidc',
  job: 'nsidc:extent',
  async fetch(_w: FetchWindow): Promise<SeriesPayload[]> {
    const res = await fetchWithRetry(
      'https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv');
    const obs: { ts: string; value: number | null }[] = [];
    for (const line of (await res.text()).split('\n')) {
      const c = line.split(',').map((x) => x.trim());
      const year = Number(c[0]); const month = Number(c[1]); const day = Number(c[2]);
      const extent = Number(c[3]);
      if (!Number.isInteger(year) || year < 1900 || !Number.isFinite(extent)) continue;
      obs.push({
        ts: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00Z`,
        value: extent,
      });
    }
    return [payload('nsidc:arctic-extent', 'Arctic sea ice extent',
      'climate', 'million km²', 'daily', obs)];
  },
};

export const silsoSunspots: Adapter = {
  sourceId: 'silso',
  job: 'silso:sunspots',
  async fetch(_w: FetchWindow): Promise<SeriesPayload[]> {
    const res = await fetchWithRetry('https://www.sidc.be/SILSO/DATA/SN_m_tot_V2.0.csv');
    const obs: { ts: string; value: number | null }[] = [];
    for (const line of (await res.text()).split('\n')) {
      const c = line.split(';').map((x) => x.trim());
      const year = Number(c[0]); const month = Number(c[1]); const v = Number(c[3]);
      if (!Number.isInteger(year) || !Number.isInteger(month)) continue;
      obs.push({
        ts: `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`,
        value: v < 0 ? null : v, // -1 marks missing
      });
    }
    return [payload('silso:sunspots-monthly', 'Sunspot number, monthly mean',
      'environment', 'sunspot number', 'monthly', obs)];
  },
};
