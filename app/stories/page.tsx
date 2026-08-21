import Link from 'next/link';
import { ICONS } from '@/lib/icons';

export const metadata = { title: 'Stories · GLOVIZ' };

const STORIES = [
  {
    slug: 'heat-and-power',
    icon: 'climate',
    kicker: 'Climate meets energy',
    title: 'Heat and power',
    lead: 'Temperature in eight cities against the solar irradiance falling on them, with correlations open from the first paint.',
  },
  {
    slug: 'the-pandemic-dip',
    icon: 'health',
    kicker: 'Health',
    title: 'The pandemic dip',
    lead: 'Life expectancy fell in 2020 and 2021 in almost every country tracked here. The anomaly detector finds it without being told where to look.',
  },
  {
    slug: 'quake-week',
    icon: 'environment',
    kicker: 'Environment',
    title: 'A week of earthquakes',
    lead: 'Every M4.0+ event on Earth, per day, with the energy that came with it on a log scale. Control limits show when the planet is out of its usual range.',
  },
];

export default function Stories() {
  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="kicker">Curated</div>
      <h2 style={{ marginTop: 12 }}>Stories <em>in the data</em></h2>
      <p className="muted" style={{ maxWidth: '58ch', marginTop: 12 }}>
        Each story opens with a specific Orbit tool already running on a specific
        question. Everything stays live: the charts read the same database the
        rest of the site does.
      </p>
      <div className="grid3" style={{ marginTop: 28 }}>
        {STORIES.map((s) => (
          <Link key={s.slug} className="card dcard" href={`/stories/${s.slug}`}>
            <div className="dtop">
              <span className="chip" dangerouslySetInnerHTML={{ __html: ICONS[s.icon] }} />
              <h3>{s.title}</h3>
            </div>
            <p>{s.lead}</p>
            <div className="dtags"><span className="pill on">{s.kicker}</span></div>
          </Link>
        ))}
      </div>
    </main>
  );
}
