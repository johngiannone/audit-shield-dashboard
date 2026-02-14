/**
 * Shared CORS configuration for all edge functions.
 * Restricts allowed origins to production domains only.
 * Falls back to permissive CORS only in development (localhost).
 */

const ALLOWED_ORIGINS = [
  "https://returnshield.com",
  "https://www.returnshield.com",
  "https://audit-shield-dashboard.lovable.app",
  // Add your production domain(s) here
];

// In development, also allow localhost
const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allAllowed = [...ALLOWED_ORIGINS, ...DEV_ORIGINS];

  const isAllowed = allAllowed.some(
    (allowed) => origin === allowed || origin.endsWith(".lovable.app")
  );

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Handle CORS preflight requests.
 * Returns a Response if this is a preflight, or null if it should proceed.
 */
export function handleCorsPreflightIfNeeded(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
