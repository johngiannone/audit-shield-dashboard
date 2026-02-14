import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Shared Supabase client factory for edge functions.
 * Eliminates duplicated initialization boilerplate across all functions.
 */

/**
 * Create a Supabase admin client using the service role key.
 * Use this when you need elevated privileges (storage access, user management, etc.)
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client using the anon key (for user-scoped requests).
 * Use this when you want to respect RLS policies.
 */
export function createAnonClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
  }

  return createClient(supabaseUrl, anonKey);
}

/**
 * Authenticate a user from the Authorization header and return their user object.
 * Throws if the header is missing, token is invalid, or user has no email.
 */
export async function authenticateUser(
  req: Request,
  supabase: SupabaseClient
): Promise<{ id: string; email: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("No authorization header provided");
  }

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    throw new Error(`Authentication error: ${error.message}`);
  }

  const user = data.user;
  if (!user?.email) {
    throw new Error("User not authenticated or email not available");
  }

  return { id: user.id, email: user.email };
}
