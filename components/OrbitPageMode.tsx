'use client';

import { useEffect } from 'react';

/** Starts Orbit page mode once the dashboard's charts exist (docs: Page Mode). */
export default function OrbitPageMode() {
  useEffect(() => {
    let page: any;
    const t = setInterval(() => {
      const hc = (window as any).Highcharts;
      if (hc?.orbitPage && hc.charts?.some((c: any) => c)) {
        clearInterval(t);
        page = hc.orbitPage({ mode: 'augment', pageKey: 'gloviz-dashboard' });
      }
    }, 400);
    return () => {
      clearInterval(t);
      try { page?.destroy(); } catch { /* leaving the page */ }
    };
  }, []);
  return null;
}
