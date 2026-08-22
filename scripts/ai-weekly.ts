import { writeClient } from '../lib/supabase';

/**
 * Weekly wrap: one short AI summary of the week's stored insights and records.
 * Runs Sundays after the nightly job. Facts in, narrative out, same contract
 * as ai-context.ts.
 */

const db = writeClient();
const MODEL = 'claude-sonnet-5';

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.warn('ai-weekly: skipped, missing env ANTHROPIC_API_KEY'); return; }

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [{ data: ins }, { data: recs }] = await Promise.all([
    db.from('insights').select('headline, facts').neq('kind', 'weekly').gte('created_at', since).limit(30),
    db.from('records').select('kind, value, series(title, unit)').gte('detected_at', since).limit(30),
  ]);
  const facts = {
    week_ending: new Date().toISOString().slice(0, 10),
    insight_headlines: ((ins ?? []) as any[]).map((i) => i.headline),
    records: ((recs ?? []) as any[]).map((r) => `${r.series?.title}: 90-day ${r.kind} at ${r.value} ${r.series?.unit}`),
  };
  if (!facts.insight_headlines.length && !facts.records.length) {
    console.log('nothing to summarise'); return;
  }

  const prompt = `These are the verified data events GLOVIZ recorded this week:

${JSON.stringify(facts, null, 1)}

Write "the week in data" for a general reader, in English:
1. HEADLINE: max 70 characters.
2. BODY: maximum 80 words total, as 3 short sentences at most. Pick the two or three events that mattered, connect them if a connection is real, and skip the rest. No throat-clearing.

Rules: only the facts above; no invented numbers; no exclamation marks.
Answer as minified single-line JSON: {"headline": "...", "body": "..."}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) { console.warn(`anthropic ${res.status}`); return; }
  const body = await res.json();
  const text: string = (body?.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text ?? '').join('\n');
  const raw = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  let parsed: any = null;
  for (const cand of [raw, raw.replace(/\r?\n/g, '\\n')]) {
    try { const p = JSON.parse(cand); if (p.headline && p.body) { parsed = p; break; } } catch { /* next */ }
  }
  if (!parsed) { console.warn('unparseable weekly output'); return; }
  const { error } = await db.from('insights').insert({
    series_id: null, kind: 'weekly',
    headline: parsed.headline.slice(0, 120), body: parsed.body, facts, model: MODEL,
  });
  console.log(error ? `weekly failed: ${error.message}` : 'weekly written');
}

main();
