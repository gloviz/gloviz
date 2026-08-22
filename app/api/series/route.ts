import { NextRequest, NextResponse } from 'next/server';
import { readClient } from '@/lib/supabase';

/**
 * Highcharts-shaped [timestamp, value] pairs for one series.
 *
 * PostgREST caps a response at 1000 rows. Reading ascending therefore returns
 * the OLDEST thousand points, which on a fast series means a chart that stops
 * weeks ago. Always read newest first and reverse.
 *
 * ?from=<epoch ms> limits the read to a window, so a story about the last day
 * gets the last day rather than a thousand points from whenever.
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
    .limit(1000);

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
