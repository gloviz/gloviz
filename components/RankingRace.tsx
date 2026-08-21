'use client';

import { useEffect, useRef, useState } from 'react';
import { ensureHighcharts } from '@/lib/loadHighcharts';

/**
 * Drag the year and the ranking reorders. A bar chart race, but driven by the
 * slider rather than a timer, so the reader controls the pace. Orbit is on the
 * chart, so any single year can be summarised, exported or asked about.
 */
export default function RankingRace({
  chartId, title, unit, years, byYear, attribution, iconHtml,
}: {
  chartId: string;
  title: string;
  unit: string;
  years: number[];
  byYear: Record<number, { code: string; value: number }[]>;
  attribution: string;
  iconHtml?: string;
}) {
  const [year, setYear] = useState(years.at(-1) ?? 0);
  const [playing, setPlaying] = useState(false);
  const chart = useRef<any>(null);

  const css = (n: string, f: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;

  useEffect(() => {
    let destroyed = false;
    (async () => {
      const H = await ensureHighcharts();
      if (destroyed || !H) return;
      chart.current = H.chart(chartId, {
        orbit: {
          enabled: true,
          id: chartId,
          tools: ['summary', 'kpi', 'contribution', 'distribution', 'insights',
                  'narrate', 'ai', 'export', 'annotate', 'fullscreen', 'share'],
        },
        chart: { type: 'bar', height: 520, backgroundColor: 'transparent', animation: { duration: 600 } },
        title: { text: undefined },
        credits: { enabled: false },
        legend: { enabled: false },
        xAxis: {
          type: 'category',
          lineColor: css('--line', '#2a3a49'),
          labels: { style: { color: css('--muted', '#93a3b3'), fontWeight: '600' } },
        },
        yAxis: {
          title: { text: unit, style: { color: css('--muted', '#93a3b3') } },
          gridLineColor: css('--line', '#2a3a49'),
          labels: { style: { color: css('--muted', '#93a3b3') } },
        },
        plotOptions: {
          bar: {
            borderWidth: 0, borderRadius: 3, colorByPoint: true,
            dataLabels: { enabled: true, style: { color: css('--text', '#e6ecf0'), textOutline: 'none', fontWeight: '600' } },
          },
        },
        colors: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => css(`--s${i}`, '#8fb3c9')),
        tooltip: {
          backgroundColor: css('--raised', '#20303e'),
          style: { color: css('--text', '#e6ecf0') },
        },
        series: [{ name: String(year), data: [] }],
      });
      draw(year);
    })();
    return () => { destroyed = true; try { chart.current?.destroy(); } catch { /* orbit owns it */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartId]);

  const draw = (y: number) => {
    const rows = byYear[y] ?? [];
    try {
      chart.current?.series?.[0]?.setData(
        rows.map((r) => ({ name: r.code, y: Math.round(r.value * 100) / 100 })),
        true, { duration: 600 }, true,
      );
      chart.current?.series?.[0]?.update({ name: String(y) }, false);
    } catch { /* mid-rebuild */ }
  };

  useEffect(() => { draw(year); /* eslint-disable-next-line */ }, [year]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setYear((y) => {
        const i = years.indexOf(y);
        if (i >= years.length - 1) { setPlaying(false); return y; }
        return years[i + 1];
      });
    }, 700);
    return () => clearInterval(t);
  }, [playing, years]);

  if (!years.length) return null;

  return (
    <div className="card chartwrap">
      <div className="ch">
        {iconHtml && <span className="chip" dangerouslySetInnerHTML={{ __html: iconHtml }} />}
        <div>
          <b>{title}</b>
          <small>Drag the year, or press play, and the ranking reorders</small>
        </div>
        <span className="live"><span className="raceyear">{year}</span></span>
      </div>

      <div className="racectl">
        <button className="btn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          min={years[0]}
          max={years.at(-1)}
          step={1}
          value={year}
          onChange={(e) => { setPlaying(false); setYear(Number(e.target.value)); }}
          aria-label="Year"
        />
        <span className="muted" style={{ fontSize: 11 }}>{years[0]} to {years.at(-1)}</span>
      </div>

      <div id={chartId} style={{ minHeight: 520, marginTop: 6 }} />
      <div className="cfoot"><span>{attribution}</span></div>
    </div>
  );
}
