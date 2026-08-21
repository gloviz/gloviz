import { Adapter, FetchWindow, SeriesPayload } from './types';
import { fetchWithRetry } from '../fetchWithRetry';
import { parseSdmxCsv, sdmxPeriodToIso } from '../parsers/sdmx';

/**
 * IMF, through the SDMX 3.0 service.
 *
 * Two things cost an afternoon and are worth writing down:
 * 1. The old `dataservices.imf.org` host is gone and IFS is no longer a
 *    dataflow. The current flows are CPI (IMF.STA) and WEO (IMF.RES), and the
 *    version is mandatory in the path.
 * 2. The JSON responses either 500 or come back with every observation null.
 *    **SDMX-CSV 2.0 is the format that actually returns numbers**, requested
 *    with Accept: application/vnd.sdmx.data+csv;version=2.0.
 */

const CPI_COUNTRIES = [
  'NOR','SWE','DNK','FIN','DEU','FRA','ESP','ITA','GBR','NLD','POL','CHE','TUR',
  'USA','CAN','MEX','BRA','ARG','CHL','JPN','KOR','IND','IDN','AUS','ZAF','SAU','NGA','EGY',
];

/** WEO indicator code -> how we present it. */
const WEO_INDICATORS: Record<string, { title: string; unit: string; domain: string }> = {
  NGDP_RPCH: { title: 'GDP growth, IMF forecast', unit: '% annual', domain: 'economy' },
  PCPIPCH: { title: 'Inflation, IMF forecast', unit: '% annual', domain: 'economy' },
  GGXWDG_NGDP: { title: 'Government debt', unit: '% of GDP', domain: 'economy' },
  BCA_NGDPD: { title: 'Current account balance', unit: '% of GDP', domain: 'economy' },
  LUR: { title: 'Unemployment rate, IMF', unit: '% of labour force', domain: 'economy' },
};

const BASE = 'https://api.imf.org/external/sdmx/3.0/data/dataflow';
const CSV = { Accept: 'application/vnd.sdmx.data+csv;version=2.0' };

function toSeries(
  points: { country: string; ts: string; value: number | null }[],
  externalId: (c: string) => string,
  title: (c: string) => string,
  unit: string, domain: string, frequency: string, metadata: Record<string, unknown>,
): SeriesPayload[] {
  const byCountry = new Map<string, { ts: string; value: number | null }[]>();
  for (const p of points) {
    if (!byCountry.has(p.country)) byCountry.set(p.country, []);
    byCountry.get(p.country)!.push({ ts: p.ts, value: p.value });
  }
  const out: SeriesPayload[] = [];
  for (const [country, observations] of byCountry) {
    if (observations.length < 2) continue;
    out.push({
      externalId: externalId(country),
      title: title(country),
      domain,
      geoCode: country,
      unit,
      frequency,
      metadata: { ...metadata, country },
      observations: observations.sort((a, b) => a.ts.localeCompare(b.ts)),
    });
  }
  return out;
}

export const imf: Adapter = {
  sourceId: 'imf',
  job: 'imf:indicators',
  async fetch(_window: FetchWindow): Promise<SeriesPayload[]> {
    const out: SeriesPayload[] = [];

    // 1. Consumer prices, monthly index and year-on-year rate.
    for (const [transform, label, unit] of [
      ['IX', 'Consumer price index', 'index'],
      ['YOY_PCH_PA_PT', 'Inflation, CPI annual rate', '% annual'],
    ] as const) {
      const key = `${CPI_COUNTRIES.join('+')}.CPI._T.${transform}.M`;
      try {
        const res = await fetchWithRetry(
          `${BASE}/IMF.STA/CPI/5.0.0/${key}?c%5BTIME_PERIOD%5D=ge:2010-01`,
          { headers: CSV },
        );
        const points = parseSdmxCsv(await res.text())
          .map((p) => ({
            country: p.dims.COUNTRY,
            ts: sdmxPeriodToIso(p.dims.TIME_PERIOD ?? '') ?? '',
            value: p.value,
          }))
          .filter((p) => p.country && p.ts);
        out.push(...toSeries(
          points,
          (c) => `imf:cpi:${transform}:${c}`,
          (c) => `${label} ${c}`,
          unit, 'economy', 'monthly', { flow: 'CPI', transform },
        ));
      } catch (err) {
        console.warn(`imf cpi ${transform}: ${(err as Error).message.slice(0, 140)}`);
      }
    }

    // 2. World Economic Outlook: the only global dataset here that carries a
    //    published forecast, so the lines run past today on purpose.
    try {
      const res = await fetchWithRetry(
        `${BASE}/IMF.RES/WEO/9.0.0/*?c%5BTIME_PERIOD%5D=ge:1990`,
        { headers: CSV },
      );
      const wanted = new Set(Object.keys(WEO_INDICATORS));
      const rows = parseSdmxCsv(await res.text()).filter(
        (p) => wanted.has(p.dims.INDICATOR) && CPI_COUNTRIES.includes(p.dims.COUNTRY),
      );
      for (const code of wanted) {
        const meta = WEO_INDICATORS[code];
        const points = rows
          .filter((p) => p.dims.INDICATOR === code)
          .map((p) => ({
            country: p.dims.COUNTRY,
            ts: sdmxPeriodToIso(p.dims.TIME_PERIOD ?? '') ?? '',
            value: p.value,
          }))
          .filter((p) => p.country && p.ts);
        out.push(...toSeries(
          points,
          (c) => `imf:weo:${code}:${c}`,
          (c) => `${meta.title} ${c}`,
          meta.unit, meta.domain, 'annual', { flow: 'WEO', indicator: code },
        ));
      }
    } catch (err) {
      console.warn(`imf weo: ${(err as Error).message.slice(0, 140)}`);
    }

    return out;
  },
};
