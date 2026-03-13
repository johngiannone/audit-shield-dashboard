import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

/**
 * Check and enforce a per-user, per-endpoint rate limit.
 * Uses the `rate_limits` table as a sliding-window counter.
 *
 * @param supabaseAdmin - Admin/service-role Supabase client
 * @param userId        - The authenticated user's ID (or IP as fallback)
 * @param endpoint      - Logical endpoint name (e.g. "analyze-notice")
 * @param maxRequests   - Max allowed requests in the window (default 5)
 * @param windowMs      - Sliding window duration in ms (default 60 000 = 1 min)
 */
export async function enforceRateLimit(
  supabaseAdmin: SupabaseClient,
  userId: string,
  endpoint: string,
  maxRequests = 5,
  windowMs = 60_000
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  try {
    const { count, error } = await supabaseAdmin
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("key", userId)
      .eq("endpoint", endpoint)
      .gte("created_at", windowStart.toISOString());

    if (error) {
      console.warn("Rate-limit check failed, allowing request:", error.message);
      return { allowed: true, remaining: maxRequests };
    }

    const currentCount = count ?? 0;

    if (currentCount >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: windowMs,
      };
    }

    // Record this request
    await supabaseAdmin.from("rate_limits").insert({
      key: userId,
      endpoint,
      created_at: now.toISOString(),
    });

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - currentCount - 1),
    };
  } catch (err) {
    console.warn("Rate-limit error, allowing request:", err);
    return { allowed: true, remaining: maxRequests };
  }
}

/**
 * Extract the user ID from the request's Authorization header.
 * Returns null if no valid JWT / session is found.
 */
export async function getUserIdFromRequest(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data?.user?.id ?? null;
}
