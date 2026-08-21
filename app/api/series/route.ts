import { NextRequest, NextResponse } from 'next/server';
import { readClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'id (numeric) is required' }, { status: 400 });
  }
  const db = readClient();
  const { data, error } = await db
    .from('observations')
    .select('ts, value')
    .eq('series_id', Number(id))
    .order('ts')
    .limit(50000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Highcharts-shaped [timestamp, value] pairs; no client transformation code.
  const points = (data ?? []).map((o) => [new Date(o.ts).getTime(), o.value]);
  return NextResponse.json(points, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
