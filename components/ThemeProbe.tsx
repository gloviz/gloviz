'use client';

import { useEffect, useState } from 'react';
import { ensureHighcharts } from '@/lib/loadHighcharts';

/**
 * Measures the rendered page rather than reasoning about it. Everything here is
 * read from the live DOM and from Highcharts after Orbit has loaded, so the
 * output is evidence, not inference.
 */
export default function ThemeProbe() {
  const [report, setReport] = useState('Measuring...');

  const measure = () => {
    const H = (window as any).Highcharts;
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const v = (n: string) => cs.getPropertyValue(n).trim() || '(unset)';
    const lines: string[] = [];
    const push = (k: string, val: unknown) => lines.push(`${k}: ${String(val)}`);

    push('theme attribute', root.getAttribute('data-theme'));
    push('prefers-color-scheme dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
    push('html classes', root.className || '(none)');

    lines.push('', '--- CSS variables as computed ---');
    for (const n of ['--bg', '--surface', '--surface2', '--text', '--muted', '--amber',
                     '--s1', '--s2', '--s3',
                     '--highcharts-background-color', '--highcharts-neutral-color-80',
                     '--highcharts-color-0', '--highcharts-color-1',
                     '--orbit-surface', '--orbit-text', '--orbit-border']) {
      push(n, v(n));
    }

    lines.push('', '--- Orbit injected styles ---');
    const injected = Array.from(document.querySelectorAll('style[data-orbit-templates], style[id^="orbit-"]'));
    push('injected style tags', injected.length);
    injected.forEach((el, i) => {
      push(`  [${i}] id`, (el as HTMLElement).id);
      push(`  [${i}] first 400 chars`, (el.textContent ?? '').replace(/\s+/g, ' ').slice(0, 400));
    });

    lines.push('', '--- Highcharts global options ---');
    if (H?.getOptions) {
      const o = H.getOptions();
      push('colors', JSON.stringify(o.colors));
      push('chart.styledMode', o.chart?.styledMode);
      push('chart.backgroundColor', JSON.stringify(o.chart?.backgroundColor));
      push('version', H.version);
      push('orbit present', Boolean(H.orbit));
      push('orbitPage present', Boolean(H.orbitPage));
    } else {
      push('Highcharts', 'NOT LOADED');
    }

    lines.push('', '--- The probe chart as rendered ---');
    const chart = (H?.charts ?? []).filter(Boolean)
      .find((c: any) => c.renderTo?.id === 'probe-chart');
    if (chart) {
      push('chart.options.chart.backgroundColor', JSON.stringify(chart.options.chart?.backgroundColor));
      push('series[0] colour resolved', chart.series?.[0]?.color);
      const container = chart.container as HTMLElement;
      const ccs = getComputedStyle(container);
      push('container background-color', ccs.backgroundColor);
      push('container color', ccs.color);
      let el: HTMLElement | null = container;
      const chain: string[] = [];
      for (let i = 0; i < 5 && el; i++) {
        const s = getComputedStyle(el);
        chain.push(`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ').join('.') : ''} bg=${s.backgroundColor} color=${s.color}`);
        el = el.parentElement;
      }
      push('ancestor chain', '\n  ' + chain.join('\n  '));
    } else {
      push('probe chart', 'NOT CREATED');
    }

    lines.push('', '--- Orbit UI elements on the page ---');
    const orbitEls = Array.from(document.querySelectorAll('.orbit-ui, [class*="orbit-"]')).slice(0, 6);
    push('matched elements', orbitEls.length);
    orbitEls.forEach((el, i) => {
      const s = getComputedStyle(el as HTMLElement);
      push(`  [${i}] ${(el as HTMLElement).className}`.slice(0, 80),
        `bg=${s.backgroundColor} color=${s.color} border=${s.borderColor}`);
    });

    setReport(lines.join('\n'));
  };

  useEffect(() => {
    let chart: any;
    (async () => {
      const H = await ensureHighcharts();
      if (!H) return setReport('Highcharts failed to load.');
      chart = H.chart('probe-chart', {
        orbit: { enabled: true, id: 'probe-chart' },
        chart: { height: 260 },
        title: { text: 'Probe' },
        series: [
          { type: 'line', name: 'A', data: [1, 3, 2, 5, 4, 6] },
          { type: 'line', name: 'B', data: [4, 2, 5, 3, 6, 4] },
        ],
      });
      setTimeout(measure, 1500);
    })();
    const onTheme = () => setTimeout(measure, 400);
    window.addEventListener('gloviz:theme', onTheme);
    return () => {
      window.removeEventListener('gloviz:theme', onTheme);
      try { chart?.destroy(); } catch { /* orbit owns it */ }
    };
  }, []);

  return (
    <>
      <div className="card" style={{ marginTop: 20 }}>
        <div id="probe-chart" style={{ minHeight: 260 }} />
      </div>
      <div className="pagetools">
        <button className="btn amber" onClick={() => { navigator.clipboard.writeText(report); }}>
          Copy report
        </button>
        <button className="btn" onClick={measure}>Measure again</button>
        <span className="muted" style={{ fontSize: 12 }}>
          Flip the theme in the header, then measure again to capture both.
        </span>
      </div>
      <pre style={{
        marginTop: 16, padding: 18, borderRadius: 14, background: 'var(--surface)',
        border: '1px solid var(--line)', color: 'var(--text)', fontSize: 12,
        lineHeight: 1.55, overflowX: 'auto', whiteSpace: 'pre-wrap',
      }}>{report}</pre>
    </>
  );
}
