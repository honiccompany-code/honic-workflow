import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serverClientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
} as const;

/** Anonymous client (respects RLS). Safe for any server code. */
export function getSupabaseServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, serverClientOptions);
}

/**
 * Service role bypasses RLS. Use only in Server Components / Route Handlers / Server Actions.
 * Never pass this client or SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function getSupabaseServiceRoleClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, serverClientOptions);
}

/** Dashboard / internal reads: prefer service role so RLS does not block anon. */
export function getSupabaseAdminClient() {
  return getSupabaseServiceRoleClient() ?? getSupabaseServerClient();
}

/** True when SUPABASE_SERVICE_ROLE_KEY is set (server-only; bypasses RLS). */
export function hasSupabaseServiceRoleEnv() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}
