import { writeClient } from '../lib/supabase';

/** Nightly retention sweep. The BRIN index on ts makes this cheap. */
async function main(): Promise<void> {
  const db = writeClient();
  const { data, error } = await db.rpc('prune_observations', { keep: '5 years' });
  if (error) throw error;
  console.log(`pruned ${data ?? 0} observations older than 5 years`);
}

main();
