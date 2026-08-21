'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const MAX = 5;

/** Up to five countries, kept in the URL so a comparison is shareable. */
export default function CountryChips({
  geos, selected,
}: { geos: { code: string; count: number }[]; selected: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState('');

  const push = (codes: string[]) => {
    const next = new URLSearchParams(params.toString());
    next.set('c', codes.join(','));
    router.push(`/compare?${next.toString()}`, { scroll: false });
  };

  const toggle = (code: string) => {
    if (selected.includes(code)) {
      if (selected.length > 1) push(selected.filter((c) => c !== code));
    } else if (selected.length < MAX) {
      push([...selected, code]);
    }
  };

  const shown = geos
    .filter((g) => !selected.includes(g.code))
    .filter((g) => g.code.toLowerCase().includes(query.toLowerCase()))
    .slice(0, query ? 24 : 16);

  return (
    <div className="chips">
      <div className="chiprow">
        {selected.map((code, i) => (
          <button
            key={code}
            className="chipsel"
            onClick={() => toggle(code)}
            aria-label={`Remove ${code}`}
            style={{ borderColor: `var(--s${(i % 8) + 1})` }}
          >
            <i style={{ background: `var(--s${(i % 8) + 1})` }} />
            {code}
            <span aria-hidden>×</span>
          </button>
        ))}
        {selected.length < MAX && (
          <input
            className="chipinput"
            value={query}
            placeholder="Add a country"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search for a country to add"
          />
        )}
      </div>
      <div className="chiprow chipopts">
        {shown.map((g) => (
          <button
            key={g.code}
            className="chipopt"
            onClick={() => { toggle(g.code); setQuery(''); }}
            disabled={selected.length >= MAX}
          >
            {g.code} <span className="chipcount">{g.count}</span>
          </button>
        ))}
        {selected.length >= MAX && <span className="muted" style={{ fontSize: 12 }}>Five is the maximum. Remove one to add another.</span>}
      </div>
    </div>
  );
}
