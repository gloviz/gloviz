import { Point } from './queries';

/** Ranked column series from latest values. */
export function columnSeries(name: string, points: Point[], take = 20) {
  const top = points.slice(0, take);
  return {
    staticSeries: [{
      type: 'column',
      name,
      data: top.map((p) => ({ name: p.code, y: Math.round(p.value * 100) / 100 })),
      colorByPoint: true,
    }],
    extraOptions: {
      xAxis: { type: 'category' },
      legend: { enabled: false },
      plotOptions: { column: { borderRadius: 3, borderWidth: 0 } },
    },
  };
}

/** Bubble/scatter of two metrics, optionally sized by a third. */
export function scatterSeries(
  name: string,
  points: { code: string; x: number; y: number; z?: number }[],
  xTitle: string,
  yTitle: string,
) {
  const sized = points.some((p) => p.z !== undefined);
  return {
    staticSeries: [{
      type: sized ? 'bubble' : 'scatter',
      name,
      data: points.map((p) => ({
        name: p.code,
        x: Math.round(p.x * 100) / 100,
        y: Math.round(p.y * 100) / 100,
        ...(p.z !== undefined ? { z: p.z } : {}),
      })),
      colorByPoint: true,
    }],
    extraOptions: {
      xAxis: { title: { text: xTitle }, gridLineWidth: 1 },
      yAxis: { title: { text: yTitle } },
      legend: { enabled: false },
      plotOptions: {
        series: { marker: { enabled: true, radius: 5 }, dataLabels: { enabled: true, format: '{point.name}', style: { fontSize: '9px', textOutline: 'none' } } },
        bubble: { minSize: 8, maxSize: 44 },
      },
      tooltip: { pointFormat: `${xTitle}: <b>{point.x}</b><br/>${yTitle}: <b>{point.y}</b>` },
    },
  };
}

/** Treemap of shares. */
export function treemapSeries(name: string, points: Point[], take = 24) {
  return {
    staticSeries: [{
      type: 'treemap',
      layoutAlgorithm: 'squarified',
      name,
      data: points.slice(0, take).map((p) => ({ name: p.code, value: p.value })),
    }],
    extraOptions: {
      legend: { enabled: false },
      xAxis: { visible: false },
      yAxis: { visible: false },
      tooltip: { pointFormat: '{point.name}: <b>{point.value:,.0f}</b>' },
    },
  };
}

/** Dumbbell of two snapshots per geography (e.g. life expectancy vs healthy). */
export function dumbbellSeries(
  name: string, a: Point[], b: Point[], take = 18,
) {
  const bBy = new Map(b.map((p) => [p.code, p.value]));
  const data = a
    .filter((p) => bBy.has(p.code))
    .slice(0, take)
    .map((p) => ({
      name: p.code,
      low: Math.round(bBy.get(p.code)! * 10) / 10,
      high: Math.round(p.value * 10) / 10,
    }));
  return {
    staticSeries: [{ type: 'dumbbell', name, data }],
    extraOptions: {
      chart: { inverted: true },
      xAxis: { type: 'category' },
      legend: { enabled: false },
    },
  };
}

/** Polar wind rose: mean value per city, drawn around the circle. */
export function polarSeries(name: string, points: Point[], take = 16) {
  const top = points.slice(0, take);
  return {
    staticSeries: [{
      type: 'column',
      name,
      data: top.map((p) => ({ name: p.name, y: Math.round(p.value * 10) / 10 })),
      colorByPoint: true,
    }],
    extraOptions: {
      chart: { polar: true },
      xAxis: { type: 'category', tickmarkPlacement: 'on', lineWidth: 0,
               labels: { style: { fontSize: '9px' } } },
      yAxis: { gridLineInterpolation: 'polygon', lineWidth: 0, min: 0 },
      legend: { enabled: false },
      plotOptions: { series: { pointPadding: 0, groupPadding: 0 } },
    },
  };
}
