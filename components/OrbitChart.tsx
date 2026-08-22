'use client';

import { useEffect, useRef } from 'react';
import { applyGlovizTheme, ensureHighcharts } from '@/lib/loadHighcharts';

declare global {
  interface Window { Highcharts: any }
}

export interface SeriesRef { id: number; name: string }

/** Everything the installation offers, with sharing switched on. */
const DEFAULT_TOOLS = [
  'summary', 'distribution', 'kpi', 'contribution', 'correlations',
  'anomaly', 'control-limits', 'forecast', 'trendline', 'indicators',
  'insights', 'narrate', 'ai', 'altviz', 'filter', 'derived',
  'grid', 'history', 'fullscreen', 'export', 'annotate', 'share',
];

export interface OrbitChartProps {
  chartId: string;
  title: string;
  subtitle?: string;
  unit?: string;
  attribution?: string;
  height?: number;
  iconHtml?: string;
  live?: boolean;
  /** Time-series mode: fetched client-side from /api/series. */
  series?: SeriesRef[];
  /** Static mode: series arrays passed straight through to Highcharts. */
  staticSeries?: any[];
  /** Highcharts chart type for fetched series. */
  type?: string;
  /** Orbit tool whitelist and the tool to open on load. */
  tools?: string[];
  initialTool?: string;
  menuVisibility?: 'always' | 'auto' | 'compact';
  /** Anything else merged into the Highcharts config (axes, plotOptions, ...). */
  extraOptions?: any;
  /** Extra context handed to the Orbit AI tools for this chart. */
  note?: string;
  /** Only read observations newer than this epoch ms (stories about today). */
  fromMs?: number;
  /** Index every fetched series to 100 at its first value, so series with
   *  wildly different magnitudes (yen and dollars) share one axis. */
  rebase?: boolean;
}

/**
 * Every chart in GLOVIZ is an Orbit chart: `orbit: { enabled: true }` with a
 * tool set chosen per chart. Plain Highcharts is never shipped.
 */
export default function OrbitChart({
  chartId, title, subtitle, unit, attribution, height = 360, iconHtml, live,
  series, staticSeries, type = 'line', tools, initialTool,
  menuVisibility = 'always', extraOptions, note, fromMs, rebase,
}: OrbitChartProps) {
  const destroyed = useRef(false);
  // The chart is created once per effect run, so the effect has to depend on
  // the data it draws. Watching only chartId meant that adding a country on
  // /compare updated the URL and the chips but never the chart.
  const seriesKey = (series ?? []).map((s) => s.id).join(',');
  const staticKey = staticSeries ? JSON.stringify(staticSeries).length : 0;

  useEffect(() => {
    destroyed.current = false;
    let chart: any;
    const css = (name: string, fallback: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

    const theme = () => ({
      colors: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => css(`--s${i}`, '#8fb3c9')),
      chart: {
        backgroundColor: 'transparent',
        height,
        style: { fontFamily: '"DM Sans", sans-serif', color: css('--text', '#e6ecf0') },
        plotBorderColor: css('--line', '#2a3a49'),
        resetZoomButton: {
          theme: {
            fill: css('--surface2', '#18242f'),
            stroke: css('--line-strong', '#3d5164'),
            style: { color: css('--text', '#e6ecf0') },
            r: 8,
          },
        },
      },
      xAxis: {
        lineColor: css('--line', '#2a3a49'), tickColor: css('--line', '#2a3a49'),
        labels: { style: { color: css('--muted', '#93a3b3'), fontSize: '10px' } },
        title: { style: { color: css('--muted', '#93a3b3') } },
      },
      yAxis: {
        gridLineColor: css('--line', '#2a3a49'),
        lineColor: css('--line', '#2a3a49'),
        tickColor: css('--line', '#2a3a49'),
        labels: { style: { color: css('--muted', '#93a3b3'), fontSize: '10px' } },
        title: { text: unit, style: { color: css('--muted', '#93a3b3') } },
        stackLabels: { style: { color: css('--muted', '#93a3b3'), textOutline: 'none' } },
      },
      legend: {
        itemStyle: { color: css('--muted', '#93a3b3'), fontWeight: '500', fontSize: '11px' },
        itemHoverStyle: { color: css('--text', '#e6ecf0') },
      },
      tooltip: {
        backgroundColor: css('--raised', '#20303e'),
        borderColor: css('--line-strong', '#3d5164'),
        style: { color: css('--text', '#e6ecf0') },
      },
      loading: {
        style: { backgroundColor: css('--surface', '#111a24') },
        labelStyle: { color: css('--muted', '#93a3b3') },
      },
      noData: { style: { color: css('--muted', '#93a3b3'), fontWeight: '500', fontSize: '13px' } },
      plotOptions: {
        series: {
          animation: { duration: 400 },
          marker: { enabled: false, lineColor: css('--surface', '#111a24') },
          states: { inactive: { opacity: 0.25 } },
          dataLabels: { color: css('--text', '#e6ecf0'), style: { textOutline: 'none' } },
        },
        map: { nullColor: css('--surface2', '#18242f') },
        treemap: { dataLabels: { style: { color: css('--text', '#e6ecf0'), textOutline: 'none' } } },
      },
      credits: { enabled: false },
      accessibility: { enabled: true },
    });

    (async () => {
      const H = await ensureHighcharts();
      let resolved: any[] = staticSeries ?? [];
      if (series?.length) {
        const q = fromMs ? `&from=${Math.round(fromMs)}` : '';
        const data = await Promise.all(
          series.map((s) => fetch(`/api/series?id=${s.id}${q}`).then((r) => (r.ok ? r.json() : []))),
        );
        resolved = series.map((s, i) => {
          let points: [number, number | null][] = data[i] ?? [];
          if (rebase) {
            const base = points.find((p) => p[1] !== null && p[1] !== 0)?.[1];
            if (base) {
              points = points.map((p) => [
                p[0], p[1] === null ? null : Math.round((p[1] / base) * 10000) / 100,
              ]);
            }
          }
          return { type, name: s.name, data: points };
        });
      }
      if (destroyed.current || !H) return;
      const base = theme();
      const merged = H.merge(base, {
        orbit: {
          enabled: true,
          id: chartId,
          menuVisibility,
          // 'share' is off by default and has to be whitelisted explicitly.
          tools: tools ?? DEFAULT_TOOLS,
          ...(initialTool ? { initialTool } : {}),
          ...(note ? { llmContext: { text: [note] } } : {}),
        },
        chart: { type },
        series: resolved,
      }, extraOptions ?? {});
      // title.text defaults to "Chart title"
      // (api.highcharts.com/highcharts/title.text). The docs say to disable it
      // with undefined, but Highcharts.merge drops undefined keys, so the
      // default survived. null clears it, verified on the rendered page.
      // The card header carries the real title anyway.
      if (!extraOptions?.title) merged.title = { text: null };
      chart = H.chart(chartId, merged);
    })();

    const recolor = () => {
      // Orbit can rebuild the chart under us; ask Highcharts for the live
      // instance by container id rather than trusting the closure.
      const H = (window as any).Highcharts;
      applyGlovizTheme();
      const live = (H?.charts ?? []).find(
        (c: any) => c && c.renderTo && c.renderTo.id === chartId,
      ) ?? chart;
      try {
        const palette = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => css(`--s${i}`, '#8fb3c9'));
        live?.update(theme(), false, false, false);
        live?.series?.forEach((s: any, i: number) => {
          if (!s.options?.colorByPoint) s.update({ color: palette[i % palette.length] }, false);
        });
        live?.redraw();
      } catch { /* mid-rebuild */ }
    };
    window.addEventListener('gloviz:theme', recolor);
    return () => {
      destroyed.current = true;
      window.removeEventListener('gloviz:theme', recolor);
      try { chart?.destroy(); } catch { /* orbit wraps the chart; ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartId, fromMs, seriesKey, staticKey, type, rebase]);

  return (
    <div className="card chartwrap">
      <div className="ch">
        {iconHtml && <span className="chip" dangerouslySetInnerHTML={{ __html: iconHtml }} />}
        <div>
          <b>{title}</b>
          {subtitle && <small>{subtitle}</small>}
        </div>
        {live && <span className="live"><span className="dot" /> Live</span>}
      </div>
      <div id={chartId} style={{ minHeight: height, marginTop: 8 }} />
      {attribution && <div className="cfoot"><span>{attribution}</span></div>}
    </div>
  );
}
