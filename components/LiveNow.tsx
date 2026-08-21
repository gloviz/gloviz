'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { LiveItem } from '@/lib/queries';

/** Rotating "happening now" card, sitting over the dotted globe in the hero. */
export default function LiveNow({ items }: { items: LiveItem[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), 4200);
    return () => clearInterval(t);
  }, [paused, items.length]);

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (m.matches) setPaused(true);
  }, []);

  if (!items.length) return null;
  const item = items[i];

  return (
    <div
      className="livecard"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="polite"
    >
      <div className="livehead">
        <span className="dot" /> Happening now
        <span className="livecount">{i + 1}/{items.length}</span>
      </div>
      <Link href={item.href} key={item.kicker} className="liveitem">
        <span className="livekicker">{item.kicker}</span>
        <strong className="liveheadline">{item.headline}</strong>
        <span className="livedetail">{item.detail}</span>
      </Link>
      <div className="livedots">
        {items.map((it, n) => (
          <button
            key={it.kicker}
            aria-label={it.kicker}
            className={n === i ? 'on' : ''}
            onClick={() => { setI(n); setPaused(true); }}
          />
        ))}
      </div>
    </div>
  );
}
