'use client';

import { useEffect } from 'react';
import { ensureHighcharts, orbitReady } from '@/lib/loadHighcharts';

/**
 * Starts Orbit page mode once the page's charts exist. Page Mode is what links
 * the charts: filters, Compare, linked highlighting and dashboard-wide AI.
 */
export default function OrbitPageMode({
  pageKey, expectedCharts = 1,
}: { pageKey: string; expectedCharts?: number }) {
  useEffect(() => {
    let page: any;
    let cancelled = false;
    let tries = 0;

    (async () => {
      await ensureHighcharts();
      const start = () => {
        if (cancelled) return;
        const H = (window as any).Highcharts;
        const ready = (H?.charts ?? []).filter(Boolean).length;
        tries += 1;
        if (!orbitReady()) {
          if (tries < 40) return setTimeout(start, 250);
          console.warn('Orbit module did not attach; page mode unavailable');
          return;
        }
        // Wait for the charts, but never hang: start anyway after ~8s.
        if (ready < expectedCharts && tries < 32) return setTimeout(start, 250);
        try {
          page = H.orbitPage({ mode: 'augment', pageKey });
        } catch (err) {
          console.warn('orbitPage failed', err);
        }
      };
      start();
    })();

    return () => {
      cancelled = true;
      try { page?.destroy(); } catch { /* leaving the page */ }
    };
  }, [pageKey, expectedCharts]);

  return null;
}
