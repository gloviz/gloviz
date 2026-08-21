'use client';

import { useEffect, useState } from 'react';

const WINDOWS = [
  { id: '7d', label: '7 days', ms: 7 * 86_400_000 },
  { id: '30d', label: '30 days', ms: 30 * 86_400_000 },
  { id: '1y', label: '1 year', ms: 365 * 86_400_000 },
  { id: 'all', label: 'All', ms: 0 },
];

/**
 * Sets the x-axis extremes on every chart on the page at once, and keeps the
 * choice in the URL hash so a view is shareable. Orbit's own filters keep
 * working on top: this only moves the visible range.
 */
export default function TimeWindow({ storageKey }: { storageKey: string }) {
  const [active, setActive] = useState<string>('all');

  const apply = (id: string, push = true) => {
    setActive(id);
    const w = WINDOWS.find((x) => x.id === id)!;
    const H = (window as any).Highcharts;
    for (const chart of (H?.charts ?? []).filter(Boolean)) {
      const axis = chart.xAxis?.[0];
      if (!axis || axis.options?.type !== 'datetime') continue;
      try {
        if (w.ms === 0) axis.setExtremes(null, null, true, false);
        else {
          const max = axis.dataMax ?? Date.now();
          axis.setExtremes(max - w.ms, max, true, false);
        }
      } catch { /* chart mid-rebuild */ }
    }
    if (push) {
      const url = new URL(window.location.href);
      if (id === 'all') url.searchParams.delete('range');
      else url.searchParams.set('range', id);
      window.history.replaceState({}, '', url);
    }
  };

  useEffect(() => {
    const wanted = new URL(window.location.href).searchParams.get('range')
      ?? localStorage.getItem(`gloviz-range-${storageKey}`)
      ?? 'all';
    if (!WINDOWS.some((w) => w.id === wanted)) return;
    setActive(wanted);
    if (wanted === 'all') return;
    // Charts appear asynchronously; keep trying briefly, then stop.
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      const n = ((window as any).Highcharts?.charts ?? []).filter(Boolean).length;
      if (n > 0 || tries > 30) { clearInterval(t); if (n > 0) apply(wanted, false); }
    }, 300);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(`gloviz-range-${storageKey}`, active);
  }, [active, storageKey]);

  return (
    <div className="timewin" role="group" aria-label="Time window">
      {WINDOWS.map((w) => (
        <button
          key={w.id}
          aria-pressed={active === w.id}
          onClick={() => apply(w.id)}
        >{w.label}</button>
      ))}
    </div>
  );
}
