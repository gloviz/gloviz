'use client';

import { useEffect, useRef, useState } from 'react';
import { ensureHighcharts } from '@/lib/loadHighcharts';

/**
 * World choropleth. Orbit treats a map as its own content kind: the axis-based
 * tools are hidden and the area tools (grid, summary, kpi, contribution, AI)
 * take over. In page mode the map filters the page by area name.
 */
export default function OrbitMap({
  chartId, title, subtitle, unit, attribution, data, height = 460, iconHtml, note,
}: {
  chartId: string;
  title: string;
  subtitle?: string;
  unit: string;
  attribution?: string;
  data: { code: string; name: string; value: number }[];
  height?: number;
  iconHtml?: string;
  note?: string;
}) {
  const [failed, setFailed] = useState(false);
  const destroyed = useRef(false);

  useEffect(() => {
    destroyed.current = false;
    let chart: any;
    const css = (n: string, f: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
    (async () => {
      try {
        const H = await ensureHighcharts();
        const topology = await fetch(
          'https://code.highcharts.com/mapdata/custom/world.topo.json',
        ).then((r) => r.json());
        if (destroyed.current || !H?.mapChart) return;
        chart = H.mapChart(chartId, {
          orbit: { enabled: true, id: chartId, tools: ['grid', 'summary', 'distribution', 'kpi', 'contribution', 'insights', 'narrate', 'ai', 'annotate', 'export', 'fullscreen', 'history', 'share'], ...(note ? { llmContext: { text: [note] } } : {}) },
          chart: { map: topology, backgroundColor: 'transparent', height },
          title: { text: undefined },
          credits: { enabled: false },
          mapNavigation: { enabled: true, buttonOptions: { verticalAlign: 'bottom' } },
          colorAxis: {
            minColor: css('--surface2', '#18242f'),
            maxColor: css('--amber', '#dda765'),
            labels: { style: { color: css('--muted', '#93a3b3') } },
          },
          legend: { itemStyle: { color: css('--muted', '#93a3b3') } },
          tooltip: {
            backgroundColor: css('--raised', '#20303e'),
            style: { color: css('--text', '#e6ecf0') },
            pointFormat: `{point.name}: <b>{point.value}</b> ${unit}`,
          },
          series: [{
            type: 'map',
            name: title,
            joinBy: ['iso-a3', 'code'],
            nullColor: css('--surface', '#111a24'),
            borderColor: css('--line', '#2a3a49'),
            states: { hover: { borderColor: css('--amber', '#dda765') } },
            data,
          }],
        });
      } catch {
        setFailed(true);
      }
    })();
    const recolor = () => {
      if (!chart) return;
      try {
        chart.update({
          colorAxis: {
            minColor: css('--surface2', '#18242f'),
            maxColor: css('--amber', '#dda765'),
            labels: { style: { color: css('--muted', '#93a3b3') } },
          },
          legend: { itemStyle: { color: css('--muted', '#93a3b3') } },
          tooltip: {
            backgroundColor: css('--raised', '#20303e'),
            style: { color: css('--text', '#e6ecf0') },
          },
          series: [{
            nullColor: css('--surface', '#111a24'),
            borderColor: css('--line', '#2a3a49'),
            states: { hover: { borderColor: css('--amber', '#dda765') } },
          }],
        }, true, false, false);
      } catch { /* mid-rebuild */ }
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
      <div className="ch">
        {iconHtml && <span className="chip" dangerouslySetInnerHTML={{ __html: iconHtml }} />}
        <div><b>{title}</b>{subtitle && <small>{subtitle}</small>}</div>
      </div>
      <div id={chartId} style={{ minHeight: height, marginTop: 8 }} />
      {failed && <p className="muted" style={{ fontSize: 12 }}>Map topology unavailable.</p>}
      {attribution && <div className="cfoot"><span>{attribution}</span></div>}
    </div>
  );
}
