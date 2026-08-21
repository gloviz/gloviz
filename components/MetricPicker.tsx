'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { MetricOption } from '@/lib/queries';

/** Two searchable metric pickers that drive /explore?x=..&y=.. */
export default function MetricPicker({
  options, x, y,
}: { options: MetricOption[]; x: number; y: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [openSide, setOpenSide] = useState<'x' | 'y' | null>(null);
  const [query, setQuery] = useState('');

  const pick = (side: 'x' | 'y', id: number) => {
    const next = new URLSearchParams(params.toString());
    next.set(side, String(id));
    router.push(`/explore?${next.toString()}`, { scroll: false });
    setOpenSide(null);
    setQuery('');
  };

  const list = useMemo(() => {
    const q = query.toLowerCase();
    return options
      .filter((o) => !q || `${o.label} ${o.source} ${o.domain}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [options, query]);

  const label = (id: number) => options.find((o) => o.id === id)?.label ?? 'Pick a metric';
  const sub = (id: number) => {
    const o = options.find((s) => s.id === id);
    return o ? `${o.source} · ${o.frequency} · ${o.points.toLocaleString('en')} points` : '';
  };

  const side = (which: 'x' | 'y', id: number, colour: string) => (
    <div className="mpick">
      <span className="lbl" style={{ color: colour }}>{which === 'x' ? 'Horizontal' : 'Vertical'}</span>
      <button className="mpickbtn" onClick={() => setOpenSide(openSide === which ? null : which)}>
        <strong>{label(id)}</strong>
        <small>{sub(id)}</small>
      </button>
      {openSide === which && (
        <div className="mpicklist">
          <input
            autoFocus
            value={query}
            placeholder="Search 400 series"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search metrics"
          />
          <div className="mpickscroll">
            {list.map((o) => (
              <button key={o.id} onClick={() => pick(which, o.id)}>
                <strong>{o.label}</strong>
                <small>{o.source} · {o.domain} · {o.unit}</small>
              </button>
            ))}
            {list.length === 0 && <p className="muted" style={{ padding: 12, fontSize: 12 }}>Nothing matches.</p>}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mpickrow">
      {side('x', x, 'var(--s1)')}
      <button
        className="btn"
        onClick={() => {
          const next = new URLSearchParams(params.toString());
          next.set('x', String(y)); next.set('y', String(x));
          router.push(`/explore?${next.toString()}`, { scroll: false });
        }}
      >Swap</button>
      {side('y', y, 'var(--s2)')}
    </div>
  );
}
