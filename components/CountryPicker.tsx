'use client';

import { useRouter, useSearchParams } from 'next/navigation';

/** Two selects that drive /compare?a=NOR&b=SWE. */
export default function CountryPicker({
  geos, a, b,
}: { geos: { code: string; count: number }[]; a: string; b: string }) {
  const router = useRouter();
  const params = useSearchParams();

  const go = (key: 'a' | 'b', value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.push(`/compare?${next.toString()}`);
  };

  return (
    <div className="picker">
      <label>
        <span className="lbl">First</span>
        <select value={a} onChange={(e) => go('a', e.target.value)}>
          {geos.map((g) => <option key={g.code} value={g.code}>{g.code} ({g.count})</option>)}
        </select>
      </label>
      <button
        className="btn"
        onClick={() => router.push(`/compare?a=${b}&b=${a}`)}
        aria-label="Swap the two countries"
      >Swap</button>
      <label>
        <span className="lbl">Second</span>
        <select value={b} onChange={(e) => go('b', e.target.value)}>
          {geos.map((g) => <option key={g.code} value={g.code}>{g.code} ({g.count})</option>)}
        </select>
      </label>
    </div>
  );
}
