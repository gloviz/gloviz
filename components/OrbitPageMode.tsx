'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureHighcharts, orbitReady } from '@/lib/loadHighcharts';

/**
 * Page Mode is what links the charts: filters, Compare, linked highlighting and
 * dashboard-wide AI. Augment mode starts automatically; the button swaps to
 * rebuild mode, which lays the same content out as a draggable dashboard grid.
 */
export default function OrbitPageMode({
  pageKey,
  expectedCharts = 1,
  relationships,
}: {
  pageKey: string;
  expectedCharts?: number;
  relationships?: any;
}) {
  const page = useRef<any>(null);
  const [mode, setMode] = useState<'augment' | 'rebuild' | null>(null);

  const config = useCallback(
    (m: 'augment' | 'rebuild') => ({
      mode: m,
      pageKey,
      // Filters survive a reload and can be shared as a link.
      autofilter: { enabled: true, clickToFilter: true, urlState: true },
      ...(relationships ? { relationships } : {}),
    }),
    [pageKey, relationships],
  );

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    (async () => {
      await ensureHighcharts();
      const start = () => {
        if (cancelled) return;
        const H = (window as any).Highcharts;
        tries += 1;
        if (!orbitReady()) {
          if (tries < 40) return setTimeout(start, 250);
          return console.warn('Orbit did not attach; page mode unavailable');
        }
        const ready = (H.charts ?? []).filter(Boolean).length;
        if (ready < expectedCharts && tries < 32) return setTimeout(start, 250);
        try {
          page.current = H.orbitPage(config('augment'));
          setMode('augment');
        } catch (err) {
          console.warn('orbitPage failed', err);
        }
      };
      start();
    })();
    return () => {
      cancelled = true;
      try { page.current?.destroy(); } catch { /* leaving the page */ }
    };
  }, [pageKey, expectedCharts, config]);

  const swap = () => {
    const H = (window as any).Highcharts;
    if (!H?.orbitPage) return;
    const next = mode === 'rebuild' ? 'augment' : 'rebuild';
    try {
      page.current?.destroy();
      page.current = H.orbitPage(config(next));
      setMode(next);
    } catch (err) {
      console.warn('mode swap failed', err);
    }
  };

  if (!mode) return null;
  return (
    <button className="btn" onClick={swap} style={{ marginTop: 22 }}>
      {mode === 'rebuild' ? 'Back to the page' : 'Rearrange as a dashboard'}
    </button>
  );
}
