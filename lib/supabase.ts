import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function readClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** Service-role client. Ingestion only; throws in a browser context. */
export function writeClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('writeClient() must never run in the browser');
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false },
  });
}
