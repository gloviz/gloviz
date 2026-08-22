'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { MetricOption } from '@/lib/queries';

/**
 * Site-wide series search: Ctrl-K / Cmd-K opens it, typing filters the 400
 * longest series, Enter opens the explorer with the pick. Same idea as
 * Orbit's page-mode palette, one level up.
 */
export default function SeriesSearch({ options }: { options: MetricOption[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        // Orbit's page palette also listens for Cmd-K, but only inside a page
        // session; stop the event so only one palette opens.
        e.preventDefault();
        e.stopPropagation();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  useEffect(() => { if (open) inputRef.current?.focus(); setCursor(0); }, [open, query]);

  const hits = query.length < 2 ? [] : options
    .filter((o) => `${o.label} ${o.source} ${o.domain}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 9);

  const go = (o: MetricOption) => {
    setOpen(false);
    setQuery('');
    router.push(`/explore?x=${o.id}`);
  };

  if (!open) {
    return (
      <button className="searchbtn" onClick={() => setOpen(true)} aria-label="Search all series">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span className="searchlabel">Search for data</span>
      </button>
    );
  }

  return (
    <div className="searchveil" onClick={() => setOpen(false)}>
      <div className="searchbox" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={query}
          placeholder="Search 400 series: brent, pm2.5 delhi, life expectancy ..."
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setCursor((c) => Math.min(c + 1, hits.length - 1));
            if (e.key === 'ArrowUp') setCursor((c) => Math.max(c - 1, 0));
            if (e.key === 'Enter' && hits[cursor]) go(hits[cursor]);
          }}
          aria-label="Search series"
        />
        <div className="searchhits">
          {hits.map((o, i) => (
            <button key={o.id} className={i === cursor ? 'on' : ''} onClick={() => go(o)}>
              <strong>{o.label}</strong>
              <small>{o.source} · {o.domain} · {o.frequency}</small>
            </button>
          ))}
          {query.length >= 2 && hits.length === 0 && (
            <p className="muted" style={{ padding: 12, fontSize: 12 }}>Nothing matches.</p>
          )}
        </div>
      </div>
    </div>
  );
}
