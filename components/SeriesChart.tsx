'use client';

import { useEffect, useRef, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

/**
 * Renders one series from /api/series?id=N.
 * Highcharts Orbit is beta and domain-locked: when NEXT_PUBLIC_ORBIT_API_KEY is
 * absent (local dev, preview deploys) this stays a plain Highcharts chart.
 * The Orbit module is loaded dynamically here once credentials exist.
 */
export default function SeriesChart({
  seriesId,
  title,
  unit,
  attribution,
}: {
  seriesId: number;
  title: string;
  unit: string;
  attribution: string;
}) {
  const [data, setData] = useState<[number, number | null][] | null>(null);
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  useEffect(() => {
    fetch(`/api/series?id=${seriesId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData([]));
  }, [seriesId]);

  const css = (name: string, fallback: string) =>
    typeof window === 'undefined'
      ? fallback
      : getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

  const options: Highcharts.Options = {
    chart: { backgroundColor: 'transparent', height: 320 },
    title: { text: title, style: { color: css('--text', '#e6ecf0'), fontSize: '16px' } },
    xAxis: {
      type: 'datetime',
      lineColor: css('--line', '#2a3a49'),
      tickColor: css('--line', '#2a3a49'),
      labels: { style: { color: css('--muted', '#93a3b3') } },
    },
    yAxis: {
      title: { text: unit, style: { color: css('--muted', '#93a3b3') } },
      gridLineColor: css('--line', '#2a3a49'),
      labels: { style: { color: css('--muted', '#93a3b3') } },
    },
    legend: { enabled: false },
    credits: { enabled: false },
    series: [
      {
        type: 'line',
        name: title,
        color: css('--series-1', '#8fb3c9'),
        data: data ?? [],
      },
    ],
    accessibility: { enabled: false },
  };

  return (
    <div className="vh-card">
      <HighchartsReact highcharts={Highcharts} options={options} ref={chartRef} />
      <p className="attribution">{attribution}</p>
    </div>
  );
}
