import Link from 'next/link';
import { ICONS } from '@/lib/icons';
import { getLiveStories } from '@/lib/queries';

export const revalidate = 300;
export const metadata = { title: 'Stories · GLOVIZ' };

export default async function Stories() {
  const live = await getLiveStories();
  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="dot" /> Written from live data, updated every five minutes
      </div>
      <h2 style={{ marginTop: 12 }}>Stories <em>in the data</em></h2>
      <p className="muted" style={{ maxWidth: '60ch', marginTop: 12 }}>
        Each headline and opening paragraph below is generated from the last 24
        hours of measurements, not written in advance. Open one and the charts
        are live too, with a specific Orbit tool already running.
      </p>
      <div className="grid3" style={{ marginTop: 28 }}>
        {live.map((s) => (
          <Link key={s.slug} className="card dcard" href={`/stories/${s.slug}`}>
            <div className="dtop">
              <span className="chip" dangerouslySetInnerHTML={{ __html: ICONS[s.icon] }} />
              <h3>{s.title} {s.accent}</h3>
              <span className="freq"><span className="dot" />Live</span>
            </div>
            <p>{s.headline}</p>
            <div className="dtags"><span className="pill on">{s.domain}</span></div>
          </Link>
        ))}
      </div>
    </main>
  );
}
