import { NextRequest, NextResponse } from 'next/server';
import { readClient } from '@/lib/supabase';

/**
 * Highcharts-shaped [timestamp, value] pairs for one series.
 *
 * PostgREST caps a response at `max_rows` (raised to 20000 for this project).
 * Read newest first regardless, so a cap can only ever drop old points, never
 * the recent end: reading ascending once produced charts that stopped weeks ago.
 *
 * ?from=<epoch ms> limits the read to a window, so a story about the last day
 * gets the last day rather than the last N points from whenever.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const from = req.nextUrl.searchParams.get('from');
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'id (numeric) is required' }, { status: 400 });
  }

  const db = readClient();
  let query = db
    .from('observations')
    .select('ts, value')
    .eq('series_id', Number(id))
    .order('ts', { ascending: false })
    .limit(20000);

  if (from && /^\d+$/.test(from)) {
    query = query.gte('ts', new Date(Number(from)).toISOString());
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const points = (data ?? [])
    .map((o) => [new Date(o.ts).getTime(), o.value] as [number, number | null])
    .reverse();

  return NextResponse.json(points, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
  });
}
