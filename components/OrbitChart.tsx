'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    Highcharts: any;
  }
}

export interface SeriesRef {
  id: number;
  name: string;
}

/**
 * Renders series from /api/series?id=N in one Highcharts chart with the full
 * Orbit toolbar (docs: orbit.highsoftlabs.com). Orbit must not be replaced
 * with plain Highcharts; every chart on GLOVIZ carries the toolbar.
 */
export default function OrbitChart({
  chartId,
  title,
  subtitle,
  unit,
  series,
  attribution,
  type = 'line',
  height = 360,
  initialTool,
  menuVisibility = 'always',
}: {
  chartId: string;
  title: string;
  subtitle?: string;
  unit: string;
  series: SeriesRef[];
  attribution: string;
  type?: string;
  height?: number;
  initialTool?: string;
  menuVisibility?: 'always' | 'auto' | 'compact';
}) {
  const destroyed = useRef(false);

  useEffect(() => {
    destroyed.current = false;
    let chart: any;
    (async () => {
      const data: [number, number | null][][] = await Promise.all(
        series.map((s) =>
          fetch(`/api/series?id=${s.id}`).then((r) => (r.ok ? r.json() : [])),
        ),
      );
      if (destroyed.current || !window.Highcharts) return;
      const css = (name: string, fallback: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
      const palette = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => css(`--s${i}`, '#8fb3c9'));
      chart = window.Highcharts.chart(chartId, {
        orbit: { enabled: true, id: chartId, menuVisibility, ...(initialTool ? { initialTool } : {}) },
        chart: { type, backgroundColor: 'transparent', height, styledMode: false },
        colors: palette,
        title: { text: title, align: 'left', style: { color: css('--text', '#e6ecf0'), fontFamily: 'Manrope', fontWeight: '600', fontSize: '15px', letterSpacing: '-.02em' } },
        subtitle: subtitle ? { text: subtitle, align: 'left', style: { color: css('--muted', '#93a3b3'), fontSize: '11px' } } : undefined,
        xAxis: {
          type: 'datetime',
          lineColor: css('--line', '#2a3a49'),
          tickColor: css('--line', '#2a3a49'),
          labels: { style: { color: css('--muted', '#93a3b3'), fontSize: '10px' } },
        },
        yAxis: {
          title: { text: unit, style: { color: css('--muted', '#93a3b3') } },
          gridLineColor: css('--line', '#2a3a49'),
          labels: { style: { color: css('--muted', '#93a3b3'), fontSize: '10px' } },
        },
        legend: {
          itemStyle: { color: css('--muted', '#93a3b3'), fontWeight: '500', fontSize: '11px' },
          itemHoverStyle: { color: css('--text', '#e6ecf0') },
        },
        tooltip: { shared: true, backgroundColor: css('--raised', '#20303e'), style: { color: css('--text', '#e6ecf0') }, borderColor: css('--line-strong', '#3d5164') },
        credits: { enabled: false },
        series: series.map((s, i) => ({ type, name: s.name, data: data[i] ?? [] })),
      });
    })();
    const recolor = () => {
      if (!chart) return;
      const css = (name: string, fallback: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
      chart.update({
        colors: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => css(`--s${i}`, '#8fb3c9')),
        title: { style: { color: css('--text', '#e6ecf0') } },
        subtitle: { style: { color: css('--muted', '#93a3b3') } },
        xAxis: { lineColor: css('--line', '#2a3a49'), tickColor: css('--line', '#2a3a49'), labels: { style: { color: css('--muted', '#93a3b3') } } },
        yAxis: { gridLineColor: css('--line', '#2a3a49'), title: { style: { color: css('--muted', '#93a3b3') } }, labels: { style: { color: css('--muted', '#93a3b3') } } },
        legend: { itemStyle: { color: css('--muted', '#93a3b3') }, itemHoverStyle: { color: css('--text', '#e6ecf0') } },
        tooltip: { backgroundColor: css('--raised', '#20303e'), style: { color: css('--text', '#e6ecf0') }, borderColor: css('--line-strong', '#3d5164') },
      }, true, false, false);
    };
    window.addEventListener('gloviz:theme', recolor);
    return () => {
      destroyed.current = true;
      window.removeEventListener('gloviz:theme', recolor);
      try { chart?.destroy(); } catch { /* orbit wraps the chart; ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartId]);

  return (
    <div className="card chartwrap">
      <div id={chartId} style={{ minHeight: height }} />
      <div className="cfoot"><span>{attribution}</span></div>
    </div>
  );
}
