import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../rate-limiter.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test({
  name: "enforceRateLimit allows up to maxRequests then blocks",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const testUserId = `test-user-${crypto.randomUUID()}`;
    const testEndpoint = `test-endpoint-${Date.now()}`;
    const maxRequests = 3;

    // First 3 requests should be allowed
    for (let i = 0; i < maxRequests; i++) {
      const result = await enforceRateLimit(supabase, testUserId, testEndpoint, maxRequests, 60_000);
      assertEquals(result.allowed, true, `Request ${i + 1} should be allowed`);
    }

    // 4th request should be blocked
    const blocked = await enforceRateLimit(supabase, testUserId, testEndpoint, maxRequests, 60_000);
    assertEquals(blocked.allowed, false, "Request beyond limit should be blocked");
    assertEquals(blocked.remaining, 0);
    assert(blocked.retryAfterMs !== undefined, "Should include retryAfterMs");

    // Cleanup test data
    await supabase.from("rate_limits").delete().eq("key", testUserId);
  },
});

Deno.test({
  name: "enforceRateLimit allows requests for different endpoints independently",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const testUserId = `test-user-${crypto.randomUUID()}`;
    const endpointA = `endpoint-a-${Date.now()}`;
    const endpointB = `endpoint-b-${Date.now()}`;

    // Use up limit on endpoint A
    for (let i = 0; i < 2; i++) {
      await enforceRateLimit(supabase, testUserId, endpointA, 2, 60_000);
    }
    const blockedA = await enforceRateLimit(supabase, testUserId, endpointA, 2, 60_000);
    assertEquals(blockedA.allowed, false, "Endpoint A should be blocked");

    // Endpoint B should still be allowed
    const allowedB = await enforceRateLimit(supabase, testUserId, endpointB, 2, 60_000);
    assertEquals(allowedB.allowed, true, "Endpoint B should still be allowed");

    // Cleanup
    await supabase.from("rate_limits").delete().eq("key", testUserId);
  },
});
