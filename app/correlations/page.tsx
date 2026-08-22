import type { CSSProperties } from 'react';
import Link from 'next/link';
import OrbitChart from '@/components/OrbitChart';
import OrbitPageMode from '@/components/OrbitPageMode';
import { ICONS } from '@/lib/icons';
import { getCorrelationBoard } from '@/lib/queries';

export const revalidate = 300;
export const metadata = {
  title: 'Correlations · GLOVIZ',
  description: 'What really moves together, what only looks like it, and how to tell the difference.',
};

/** Shared row grid for the two lists; a plain div layout on purpose, because
 *  Orbit page mode converts real <table> elements into a Highcharts Grid and
 *  strips the strength bars. */
const ROW: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.6fr 1.3fr 0.6fr 1.2fr 44px',
  gap: 12,
  alignItems: 'center',
  padding: '10px 0',
  borderTop: '1px solid var(--line)',
};

/** Plain-language strength label for a correlation value. */
function words(v: number) {
  const a = Math.abs(v);
  const s = a >= 0.85 ? 'Very strong' : a >= 0.7 ? 'Strong' : a >= 0.55 ? 'Clear' : 'Moderate';
  return `${s}, ${v >= 0 ? 'same direction' : 'opposite directions'}`;
}

/** A horizontal strength bar: filled share = |value| on the -1..1 scale. */
function Bar({ v, color }: { v: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface2)' }}>
        <div style={{ width: `${Math.round(Math.abs(v) * 100)}%`, height: 6, borderRadius: 3, background: color }} />
      </div>
      <small className="muted" style={{ fontVariantNumeric: 'tabular-nums', minWidth: 42, textAlign: 'right' }}>{v}</small>
    </div>
  );
}

const STEPS = [
  {
    n: '1', t: 'Line them up',
    d: 'Every night we take each pair of series measured on the same rhythm, hourly with hourly, daily with daily, and line them up point by point.',
  },
  {
    n: '2', t: 'Ignore the long trend',
    d: 'Two things that both grow for years will always look related. So we also compare only the day-to-day changes: on the days one went up, did the other go up too?',
  },
  {
    n: '3', t: 'Keep what survives',
    d: 'Pairs whose daily changes agree across at least 30 shared days pass. Pairs that only match in the long lines land in the coincidence list below, on purpose.',
  },
];

export default async function Correlations() {
  const { credible, spurious } = await getCorrelationBoard();

  // A few examples with different flavours: the strongest pair, the strongest
  // mirror-image (negative) pair, and the strongest pair confirmed by two
  // independent sources.
  const examples: typeof credible = [];
  const add = (c?: (typeof credible)[number]) => {
    if (c && !examples.some((e) => e.a.id === c.a.id && e.b.id === c.b.id)) examples.push(c);
  };
  add(credible[0]);
  add(credible.find((c) => c.rDiff < 0));
  add(credible.find((c) => c.crossSource));
  const fake = spurious[0];
  const chartCount = examples.length + (fake ? 1 : 0);

  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="dot" /> Checked again every night, across every pair we track
      </div>
      <h2 style={{ marginTop: 12 }}>What moves together, <em>and what just looks like it</em></h2>
      <p className="muted" style={{ maxWidth: '64ch', marginTop: 12 }}>
        When two lines rise together for years it is tempting to see a
        connection. Often there is none: almost everything that grows looks
        related to everything else that grows. So GLOVIZ runs one extra check
        on every pair, and sorts the results into real links and lucky ones.
      </p>

      <section style={{ marginTop: 26 }}>
        <div className="kicker">How the test works</div>
        <div className="grid3" style={{ marginTop: 14 }}>
          {STEPS.map((s) => (
            <div className="card" key={s.n}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ color: 'var(--amber)', fontWeight: 800, fontSize: 22 }}>{s.n}</span>
                <b>{s.t}</b>
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {examples.length > 0 && (
        <section style={{ marginTop: 30 }}>
          <div className="kicker">See it for yourself</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6, maxWidth: '60ch' }}>
            Each chart shows a pair that passed. One line per axis, so
            differently sized things can share a picture. Watch the wiggles,
            not the levels: they move together, or in mirror image.
          </p>
          {examples.map((c, i) => (
            <OrbitChart
              key={`${c.a.id}-${c.b.id}`}
              chartId={`corr-ex-${i}`}
              title={`${c.a.title} and ${c.b.title}`}
              subtitle={`${words(c.rDiff)} · agreed across ${c.overlap} shared days`}
              iconHtml={ICONS.correlations}
              attribution="Both series from the GLOVIZ database"
              series={[{ id: c.a.id, name: c.a.title }, { id: c.b.id, name: c.b.title }]}
              type="spline"
              initialTool={i === 0 ? 'correlations' : undefined}
              note={`Correlation of levels ${c.r}; correlation of day-to-day changes ${c.rDiff} over ${c.overlap} shared days. The day-to-day number is the one that makes this pair credible.`}
              dualAxis={['', '']}
              height={i === 0 ? 420 : 340}
            />
          ))}
        </section>
      )}

      <section style={{ marginTop: 30 }}>
        <div className="kicker">Passed: these move together day by day</div>
        <div className="card" style={{ marginTop: 14, overflowX: 'auto' }}>
          <div style={{ minWidth: 720 }}>
            <div style={{ ...ROW, borderTop: 'none', paddingTop: 0 }} className="kicker">
              <span>Pair</span><span>Day-to-day agreement</span><span>Shared days</span><span>Extra evidence</span><span></span>
            </div>
            {credible.map((c) => (
              <div key={`${c.a.id}-${c.b.id}`} style={ROW}>
                <span style={{ fontSize: 13 }}>{c.a.title} × {c.b.title}</span>
                <span>
                  <Bar v={c.rDiff} color="var(--s3)" />
                  <small className="muted">{words(c.rDiff)}</small>
                </span>
                <span style={{ fontSize: 13 }}>{c.overlap}</span>
                <span>
                  {c.geoMatch && <span className="pill on" style={{ marginRight: 4 }}>same place</span>}
                  {c.crossSource && <span className="pill">two independent sources</span>}
                </span>
                <Link className="link" href={`/explore?x=${c.a.id}&y=${c.b.id}`} style={{ fontSize: 10 }}>Open</Link>
              </div>
            ))}
            {credible.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Nothing qualifies yet; the nightly job is still filling the list.</p>}
          </div>
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <div className="kicker">Failed: they only share a trend</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 6, maxWidth: '62ch' }}>
          These pairs look impressively connected, until you check the daily
          movements and find nothing there. They just drifted in the same
          direction over the same years. We show them because recognising this
          pattern is the most useful statistics lesson there is.
        </p>
        {fake && (
          <OrbitChart
            chartId="corr-fake"
            title={`${fake.a.title} and ${fake.b.title}`}
            subtitle={`Looks connected, is not · long-line match ${fake.r}, day-to-day match only ${fake.rDiff}`}
            iconHtml={ICONS.anomaly}
            attribution="Both series from the GLOVIZ database"
            series={[{ id: fake.a.id, name: fake.a.title }, { id: fake.b.id, name: fake.b.title }]}
            type="spline"
            note={`A deliberately spurious example. Levels correlate at ${fake.r}, but day-to-day changes only at ${fake.rDiff}, so the apparent link is two unrelated trends sharing a time period.`}
            dualAxis={['', '']}
            height={340}
          />
        )}
        <div className="card" style={{ marginTop: 14, overflowX: 'auto' }}>
          <div style={{ minWidth: 720 }}>
            <div style={{ ...ROW, borderTop: 'none', paddingTop: 0 }} className="kicker">
              <span>Pair</span><span>Looks connected</span><span>Day-to-day test</span><span>Shared days</span><span></span>
            </div>
            {spurious.map((c) => (
              <div key={`${c.a.id}-${c.b.id}`} style={ROW}>
                <span style={{ fontSize: 13 }}>{c.a.title} × {c.b.title}</span>
                <Bar v={c.r} color="var(--s4)" />
                <span>
                  <Bar v={c.rDiff} color="var(--faint)" />
                  <small className="muted">fails</small>
                </span>
                <span style={{ fontSize: 13 }}>{c.overlap}</span>
                <Link className="link" href={`/explore?x=${c.a.id}&y=${c.b.id}`} style={{ fontSize: 10 }}>Open</Link>
              </div>
            ))}
            {spurious.length === 0 && <p className="muted" style={{ fontSize: 13 }}>None flagged right now.</p>}
          </div>
        </div>
      </section>

      <OrbitPageMode pageKey="gloviz-correlations" expectedCharts={chartCount} />
    </main>
  );
}
