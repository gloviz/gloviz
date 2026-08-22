import { writeClient } from '../lib/supabase';

/**
 * AI context generation. Strict division of labour:
 *
 * - This script computes the FACTS from the database: current value, full-range
 *   percentile, "highest/lowest since", change over the window. Deterministic,
 *   verifiable, stored in `insights.facts`.
 * - Claude writes the NARRATIVE around exactly those facts: what typically
 *   drives the series, historical parallels, what to watch. It is instructed
 *   not to add numbers of its own, and the output is labelled as AI
 *   interpretation in the UI.
 *
 * Runs in GitHub Actions after the nightly insights job. Skips itself with a
 * warning when ANTHROPIC_API_KEY is missing, like the ENTSO-E adapter does.
 */

const db = writeClient();
const MODEL = 'claude-sonnet-5';
const MAX_ITEMS = 8;

interface Fact {
  seriesId: number;
  kind: 'record' | 'extreme';
  title: string;
  unit: string;
  source: string;
  domain: string;
  current: number;
  percentile: number;
  min: number;
  max: number;
  sinceLabel: string;
  points: number;
}

async function computeFacts(): Promise<Fact[]> {
  const { data: recs } = await db
    .from('records')
    .select('series_id, kind, value, ts, series(title, unit, domain, sources(name))')
    .order('detected_at', { ascending: false })
    .limit(MAX_ITEMS * 2);

  const out: Fact[] = [];
  for (const r of ((recs ?? []) as any[]).slice(0, MAX_ITEMS)) {
    const { data: obs } = await db
      .from('observations')
      .select('ts, value')
      .eq('series_id', r.series_id)
      .not('value', 'is', null)
      .order('ts', { ascending: false })
      .limit(5000);
    const values = ((obs ?? []) as any[]).map((o) => Number(o.value));
    if (values.length < 30) continue;
    const current = values[0];
    const below = values.filter((v) => v < current).length;
    const percentile = Math.round((below / values.length) * 100);
    // How far back do you have to go to find a more extreme value?
    let since = '';
    const rows = (obs ?? []) as any[];
    for (let i = 1; i < rows.length; i++) {
      const v = Number(rows[i].value);
      if ((r.kind === 'high' && v > current) || (r.kind === 'low' && v < current)) {
        since = rows[i].ts.slice(0, 10);
        break;
      }
    }
    out.push({
      seriesId: r.series_id,
      kind: 'record',
      title: r.series?.title ?? '',
      unit: r.series?.unit ?? '',
      source: r.series?.sources?.name ?? '',
      domain: r.series?.domain ?? '',
      current: Math.round(current * 100) / 100,
      percentile,
      min: Math.round(Math.min(...values) * 100) / 100,
      max: Math.round(Math.max(...values) * 100) / 100,
      sinceLabel: since
        ? `most extreme since ${since}`
        : `most extreme in the ${values.length} observations on record`,
      points: values.length,
    });
  }
  return out;
}

async function askClaude(fact: Fact, apiKey: string): Promise<{ headline: string; body: string } | null> {
  const prompt = `You annotate a live open-data observatory. Here are verified facts about one data series, computed from the database:

Series: ${fact.title}
Source: ${fact.source} (domain: ${fact.domain})
Unit: ${fact.unit}
Current value: ${fact.current}
Percentile within all ${fact.points} recorded observations: ${fact.percentile}
Recorded range: ${fact.min} to ${fact.max}
Status: ${fact.sinceLabel}

Write for a curious general reader, in English:
1. HEADLINE: one line, max 70 characters, concrete, no hype.
2. BODY: ONE paragraph, maximum 45 words. Say what typically drives this series and what this level has historically meant. Every word must earn its place; no scene-setting, no "it's worth noting".

Rules: never invent numbers beyond the facts above; if causes are uncertain, say so in three words, not a sentence; no investment advice; no exclamation marks.

Answer as minified single-line JSON, with \\n\\n inside the body string separating the paragraphs: {"headline": "...", "body": "..."}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    console.warn(`anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  const body = await res.json();
  // The first content block is not always text (thinking blocks come first on
  // newer models), and the text often arrives fenced in ```json. Find the text
  // block, then slice the JSON out of whatever surrounds it.
  const text: string = (body?.content ?? [])
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.text ?? '')
    .join('\n');
  const raw = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  for (const candidate of [raw, raw.replace(/\r?\n/g, '\\n')]) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed.headline && parsed.body) {
        return { headline: parsed.headline, body: parsed.body.replace(/\\n/g, '\n') };
      }
    } catch { /* try the next form */ }
  }
  console.warn('unparseable model output:', text.slice(0, 120));
  return null;
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('ai-context: skipped, missing env ANTHROPIC_API_KEY');
    return;
  }
  const facts = await computeFacts();
  console.log('facts computed:', facts.length);

  // Do not regenerate what is still fresh: one insight per series per day.
  const { data: fresh } = await db
    .from('insights')
    .select('series_id')
    .gte('created_at', new Date(Date.now() - 20 * 3_600_000).toISOString());
  const done = new Set(((fresh ?? []) as any[]).map((r) => r.series_id));

  let written = 0;
  for (const f of facts) {
    if (done.has(f.seriesId)) continue;
    const answer = await askClaude(f, apiKey);
    if (!answer) continue;
    const { error } = await db.from('insights').insert({
      series_id: f.seriesId,
      kind: f.kind,
      headline: answer.headline.slice(0, 120),
      body: answer.body,
      facts: f,
      model: MODEL,
    });
    if (!error) written++;
  }
  // Retention: insights older than 14 days serve no one.
  await db.from('insights').delete()
    .lt('created_at', new Date(Date.now() - 14 * 86_400_000).toISOString());
  console.log('insights written:', written);
}

main();
