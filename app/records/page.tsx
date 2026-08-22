import type { CSSProperties } from 'react';
import OrbitChart from '@/components/OrbitChart';
import OrbitPageMode from '@/components/OrbitPageMode';
import { ICONS } from '@/lib/icons';
import {
  doyLabel, getAllTimeRecords, getClimatology, getSeriesPoints,
  getTodayVsNormal,
} from '@/lib/queries';

export const revalidate = 300;
export const metadata = {
  title: 'Records · GLOVIZ',
  description: 'Today against 85 years of weather, and the records that still stand.',
};

const ROW: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.1fr 0.7fr 1.6fr 1.2fr',
  gap: 12, alignItems: 'center', padding: '9px 0',
  borderTop: '1px solid var(--line)',
};

/** 0-100 percentile marker on a p10/p50/p90 band. */
function PercentileBar({ p }: { p: number }) {
  return (
    <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'var(--surface2)' }}>
      <div style={{ position: 'absolute', left: '10%', right: '10%', top: 0, bottom: 0, background: 'var(--raised)', borderRadius: 4 }} />
      <div style={{
        position: 'absolute', top: -2, bottom: -2, width: 4, borderRadius: 2,
        left: `calc(${p}% - 2px)`,
        background: p >= 90 ? 'var(--s4)' : p <= 10 ? 'var(--s7)' : 'var(--amber)',
      }} />
    </div>
  );
}

export default async function Records() {
  const [today, records] = await Promise.all([getTodayVsNormal(), getAllTimeRecords()]);

  // Band chart: this year against the 1940+ envelope for the most
  // exceptional city right now (falls back to the first with data).
  const star = today.find((t) => t.percentile !== null) ?? today[0];
  let band: any[] | null = null;
  let bandCity = '';
  if (star) {
    bandCity = star.city;
    const clim = await getClimatology(star.seriesId);
    if (clim.length) {
      const year = new Date().getUTCFullYear();
      const ms = (doy: number) => Date.UTC(year, 0, doy);
      const thisYear = await getSeriesPoints(star.seriesId, Date.UTC(year, 0, 1));
      band = [
        {
          type: 'arearange', name: 'Normal band (p10 to p90, 1940+)',
          data: clim.filter((c) => c.p10 !== null && c.p90 !== null)
            .map((c) => [ms(c.doy), c.p10, c.p90]),
          color: 'var(--s7)', fillOpacity: 0.18, lineWidth: 0, zIndex: 0,
          marker: { enabled: false }, enableMouseTracking: false,
        },
        {
          type: 'spline', name: 'Median day (1940+)',
          data: clim.filter((c) => c.p50 !== null).map((c) => [ms(c.doy), c.p50]),
          dashStyle: 'ShortDash', lineWidth: 1.5, zIndex: 1, color: 'var(--muted)',
        },
        {
          type: 'spline', name: `${year}, daily mean`,
          data: thisYear, lineWidth: 2.5, zIndex: 2, color: 'var(--amber)',
        },
      ];
    }
  }

  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="dot" /> Every day since 1940, recomputed nightly
      </div>
      <h2 style={{ marginTop: 12 }}>Today, <em>against the record books</em></h2>
      <p className="muted" style={{ maxWidth: '64ch', marginTop: 12 }}>
        Every city temperature below is compared with the same calendar day in
        every year back to 1940 (ERA5 reanalysis). Percentile 97 means: only 3
        percent of all these days were warmer. That is what "unusually warm"
        actually means.
      </p>

      {band && (
        <OrbitChart
          chartId="rec-band"
          title={`${bandCity}: this year against 85 years of normal`}
          subtitle="Band = the middle 80 percent of all years since 1940 · dashed = median · amber = this year"
          unit="°C"
          iconHtml={ICONS.forecast}
          attribution="Source: Open-Meteo / Copernicus ERA5"
          tools={['summary', 'anomaly', 'insights', 'narrate', 'ai', 'export', 'annotate', 'fullscreen', 'share']}
          staticSeries={band}
          extraOptions={{ xAxis: { type: 'datetime' } }}
          note="Amber is the current year's daily mean temperature; the band holds the 10th to 90th percentile of 1940-onward history for each calendar day; days outside the band are genuinely unusual."
          height={430}
        />
      )}

      <section style={{ marginTop: 30 }}>
        <div className="kicker">Right now, ranked by how unusual today is</div>
        <div className="card" style={{ marginTop: 14, overflowX: 'auto' }}>
          <div style={{ minWidth: 660 }}>
            <div style={{ ...ROW, borderTop: 'none', paddingTop: 0 }} className="kicker">
              <span>City</span><span>Today, mean so far</span><span>Percentile for this date, 1940+</span><span>Normal span (p10 to p90)</span>
            </div>
            {today.filter((t) => t.percentile !== null).map((t) => (
              <div key={t.seriesId} style={ROW}>
                <span style={{ fontSize: 13 }}>{t.city}</span>
                <b style={{ fontSize: 14 }}>{t.live?.toFixed(1)}°</b>
                <span>
                  <PercentileBar p={t.percentile!} />
                  <small className="muted">
                    {t.percentile! >= 90 ? `warmer than ${t.percentile} % of every ${doyLabel(t.clim!.doy)} since 1940`
                      : t.percentile! <= 10 ? `colder than ${100 - t.percentile!} % of every ${doyLabel(t.clim!.doy)} since 1940`
                      : `percentile ${t.percentile}`}
                  </small>
                </span>
                <small className="muted">
                  {t.clim!.p10?.toFixed(1)}° to {t.clim!.p90?.toFixed(1)}°
                </small>
              </div>
            ))}
            {today.every((t) => t.percentile === null) && (
              <p className="muted" style={{ fontSize: 13 }}>
                The climatology is still being computed; check back after the nightly job.
              </p>
            )}
          </div>
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <div className="kicker">The records that still stand (daily mean, since 1940)</div>
        <div className="card" style={{ marginTop: 14, overflowX: 'auto' }}>
          <div style={{ minWidth: 660 }}>
            <div style={{ ...ROW, gridTemplateColumns: '1.1fr 1.6fr 1.6fr', borderTop: 'none', paddingTop: 0 }} className="kicker">
              <span>City</span><span>Hottest day</span><span>Coldest day</span>
            </div>
            {records.map((r) => (
              <div key={r.seriesId} style={{ ...ROW, gridTemplateColumns: '1.1fr 1.6fr 1.6fr' }}>
                <span style={{ fontSize: 13 }}>{r.city}</span>
                <span style={{ fontSize: 13 }}>
                  <b style={{ color: 'var(--s4)' }}>{r.hottest!.value.toFixed(1)}°</b>
                  <small className="muted"> · {doyLabel(r.hottest!.doy)} {r.hottest!.year}</small>
                </span>
                <span style={{ fontSize: 13 }}>
                  <b style={{ color: 'var(--s7)' }}>{r.coldest!.value.toFixed(1)}°</b>
                  <small className="muted"> · {doyLabel(r.coldest!.doy)} {r.coldest!.year}</small>
                </span>
              </div>
            ))}
            {records.length === 0 && (
              <p className="muted" style={{ fontSize: 13 }}>
                The ERA5 backfill is still loading; records appear once it lands.
              </p>
            )}
          </div>
        </div>
      </section>

      <OrbitPageMode pageKey="gloviz-records" expectedCharts={band ? 1 : 0} />
    </main>
  );
}
