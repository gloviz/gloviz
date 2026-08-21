import Link from 'next/link';
import OrbitPageMode from '@/components/OrbitPageMode';
import RankingRace from '@/components/RankingRace';
import { ICONS } from '@/lib/icons';
import { getRankingFrames } from '@/lib/queries';

export const revalidate = 300;
export const metadata = { title: 'The ranking race · GLOVIZ' };

const METRICS: Record<string, { prefix: string; label: string; icon: string; blurb: string }> = {
  gdp: { prefix: 'NY.GDP.PCAP.CD:', label: 'GDP per capita', icon: 'economy',
         blurb: 'Current US dollars. Oil, finance and a strong currency move a country up this list faster than growth does.' },
  co2: { prefix: 'co-emissions-per-capita:', label: 'CO2 per capita', icon: 'environment',
         blurb: 'Tonnes per person. The ranking has been reshuffled twice: once by industrialisation, once by gas replacing coal.' },
  life: { prefix: 'SP.DYN.LE00.IN:', label: 'Life expectancy', icon: 'health',
          blurb: 'Years at birth. Watch 2020 and 2021: almost every country falls at once, for the first time since the war.' },
  pop: { prefix: 'SP.POP.TOTL:', label: 'Population', icon: 'economy',
         blurb: 'The slowest ranking in the set, and the one where a single change of order is a demographic era.' },
  renew: { prefix: 'share-electricity-renewables:', label: 'Renewable electricity', icon: 'zap',
           blurb: 'Percent of generation. Hydro countries start at the top; the interesting movement is everyone else catching up.' },
};

export default async function Race({
  searchParams,
}: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const key = sp.m && METRICS[sp.m] ? sp.m : 'gdp';
  const metric = METRICS[key];
  const frames = await getRankingFrames(metric.prefix);

  return (
    <main className="wrap" style={{ paddingTop: 42, paddingBottom: 40 }}>
      <div className="kicker" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="dot" /> Rankings move slowly, and then all at once
      </div>
      <h2 style={{ marginTop: 12 }}>The ranking <em>race</em></h2>
      <p className="muted" style={{ maxWidth: '62ch', marginTop: 12 }}>{metric.blurb}</p>

      <div className="chiprow" style={{ margin: '20px 0 10px' }}>
        {Object.entries(METRICS).map(([k, m]) => (
          <Link
            key={k}
            href={`/race?m=${k}`}
            className={k === key ? 'chipsel' : 'chipopt'}
            style={k === key ? { borderColor: 'var(--amber)' } : undefined}
          >
            {k === key && <i style={{ background: 'var(--amber)' }} />}
            {m.label}
          </Link>
        ))}
      </div>

      {frames.years.length > 0 ? (
        <RankingRace
          chartId={`race-${key}`}
          title={`${metric.label}, top 15`}
          unit={frames.unit}
          years={frames.years}
          byYear={frames.byYear}
          attribution={`Source: ${frames.attribution}`}
          iconHtml={ICONS[metric.icon]}
        />
      ) : (
        <p className="muted" style={{ marginTop: 20 }}>
          Not enough countries reported this metric to build a ranking.
        </p>
      )}

      <OrbitPageMode pageKey={`gloviz-race-${key}`} expectedCharts={1} />
    </main>
  );
}
