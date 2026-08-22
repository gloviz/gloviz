import { notFound } from 'next/navigation';
import Link from 'next/link';
import DomainPage from '@/components/DomainPage';
import OrbitChart from '@/components/OrbitChart';
import { ICONS } from '@/lib/icons';
import InsightCard from '@/components/InsightCard';
import { getInsightsForSeries, getLiveStories, getSeriesRefs } from '@/lib/queries';

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getLiveStories()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = (await getLiveStories()).find((s) => s.slug === slug);
  return story ? { title: `${story.title} ${story.accent} · GLOVIZ`, description: story.headline } : {};
}

export default async function LiveStory({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = (await getLiveStories()).find((s) => s.slug === slug);
  if (!story) notFound();

  // Stories are about the window named in the kicker, so the charts open there.
  const hours = story.kicker.includes('72') ? 72 : 24;
  const from = Date.now() - hours * 3_600_000;

  const charts = await Promise.all(
    story.charts.map(async (c) => ({ ...c, refs: (await getSeriesRefs(c.prefix, c.limit)).refs,
      meta: await getSeriesRefs(c.prefix, 1) })),
  );
  const insights = await getInsightsForSeries(
    charts.flatMap((c) => c.refs.map((r) => r.id)), 2,
  );

  return (
    <DomainPage
      pageKey={`gloviz-live-${slug}`}
      charts={charts.length}
      kicker={story.kicker}
      title={story.title}
      accent={story.accent}
      icon={story.icon}
      lead={story.lead}
      kpis={[{ label: 'Right now', value: story.headline }]}
    >
      {charts.map((c, i) => (
        <OrbitChart
          key={c.prefix}
          chartId={`live-${slug}-${i}`}
          title={c.title}
          subtitle={c.subtitle}
          unit={c.meta.unit}
          iconHtml={ICONS[story.icon]}
          attribution={`Source: ${c.meta.attribution}`}
          series={c.refs}
          type={c.type}
          initialTool={c.tool}
          live
          note={c.note}
          // Sub-daily series are read from the story's window; daily and annual
          // aggregates would vanish inside 24 hours, so they read normally.
          fromMs={
            ['hourly', 'minute', '5 minutes', '30 minutes'].includes(c.meta.frequency)
              ? from
              : undefined
          }
          extraOptions={{
            ...(c.type === 'areaspline'
              ? { plotOptions: { areaspline: { stacking: 'normal', fillOpacity: 0.35, lineWidth: 1 } } }
              : {}),
            ...(c.prefix === 'quakes:energy' ? { yAxis: { type: 'logarithmic' } } : {}),
          }}
          height={400}
        />
      ))}
      {insights.map((i) => <InsightCard key={`${i.seriesId}-${i.createdAt}`} insight={i} />)}
      <p className="muted" style={{ fontSize: 12 }}>
        This page is written from the data: the headline and the opening
        paragraph are generated from the last {hours} hours of measurements,
        every five minutes. <Link href="/stories">All stories</Link>.
      </p>
    </DomainPage>
  );
}
