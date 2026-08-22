import { writeClient } from '../lib/supabase';

/** Nightly retention sweep, sub-daily series only (hourly and finer).
 *  Daily, monthly and annual history is never pruned; see migration 0015. */
async function main(): Promise<void> {
  const db = writeClient();
  const { data, error } = await db.rpc('prune_observations', { keep: '5 years' });
  if (error) throw error;
  console.log(`pruned ${data ?? 0} sub-daily observations older than 5 years`);
}

main();
