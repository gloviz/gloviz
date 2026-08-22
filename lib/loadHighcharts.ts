'use client';

/**
 * Orbit must load AFTER Highcharts core and every Highcharts module, or it
 * fails silently. next/script does not guarantee that order, so the scripts are
 * injected sequentially here and every chart awaits this one promise.
 */

const ORBIT_KEY =
  process.env.NEXT_PUBLIC_ORBIT_API_KEY ?? '5150599f-09f3-4b54-a398-e60cb01da393';

const SCRIPTS = [
  'https://code.highcharts.com/highcharts.js',
  'https://code.highcharts.com/highcharts-more.js',
  'https://code.highcharts.com/modules/stock.js',
  'https://code.highcharts.com/modules/map.js',
  'https://code.highcharts.com/modules/treemap.js',
  'https://code.highcharts.com/modules/heatmap.js',
  'https://code.highcharts.com/modules/dumbbell.js',
  'https://code.highcharts.com/indicators/indicators-all.js',
  'https://code.highcharts.com/modules/annotations.js',
  'https://code.highcharts.com/modules/exporting.js',
  'https://code.highcharts.com/modules/export-data.js',
  'https://code.highcharts.com/modules/accessibility.js',
  // Grid Lite gives Orbit its 'grid' tool and makes tables page-mode content.
  // code.highcharts.com does not serve the Grid build, jsDelivr does.
  'https://cdn.jsdelivr.net/npm/@highcharts/grid-lite/grid-lite.js',
  `https://orbit.highsoftlabs.com/module/${ORBIT_KEY}/orbit.js`,
];

const STYLES = ['https://cdn.jsdelivr.net/npm/@highcharts/grid-lite/css/grid.css'];

function loadStyle(href: string): void {
  if (document.querySelector(`link[data-hc="${href}"]`)) return;
  const el = document.createElement('link');
  el.rel = 'stylesheet';
  el.href = href;
  el.dataset.hc = href;
  document.head.appendChild(el);
}

function loadOne(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-hc="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(src)));
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    el.dataset.hc = src;
    el.addEventListener('load', () => { el.dataset.loaded = '1'; resolve(); });
    el.addEventListener('error', () => reject(new Error(`failed to load ${src}`)));
    document.head.appendChild(el);
  });
}

let promise: Promise<any> | null = null;

/** Resolves with Highcharts once core, modules and Orbit are all loaded. */
export function ensureHighcharts(): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!promise) {
    promise = (async () => {
      STYLES.forEach(loadStyle);
      for (const src of SCRIPTS) {
        try {
          await loadOne(src);
        } catch (err) {
          // A missing optional module must not stop the chart from rendering.
          console.warn(err);
        }
      }
      applyGlovizTheme();
      if (typeof window !== 'undefined') {
        window.addEventListener('gloviz:theme', applyGlovizTheme);
      }
      return (window as any).Highcharts;
    })();
  }
  return promise;
}

/**
 * Orbit applies the organisation's Branding and Defaults through
 * `Highcharts.setOptions`, which can replace the colour palette and switch on
 * styled mode. GLOVIZ owns its palette, so re-assert it after Orbit has loaded
 * and on every theme change.
 */
export function applyGlovizTheme(): void {
  const H = (window as any).Highcharts;
  if (!H?.setOptions) return;
  const css = (n: string, f: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
  H.setOptions({
    colors: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => css(`--s${i}`, '#8fb3c9')),
    chart: {
      styledMode: false,
      backgroundColor: 'transparent',
      style: { fontFamily: '"DM Sans", system-ui, sans-serif' },
    },
    credits: { enabled: false },
  });
}

/** True once Orbit attached itself to Highcharts. */
export function orbitReady(): boolean {
  const H = (window as any).Highcharts;
  return Boolean(H?.orbit && H?.orbitPage);
}
