/**
 * Security Headers Configuration
 * Provides production-ready security headers for the Audit Shield Dashboard
 */

export interface SecurityHeadersConfig {
  [key: string]: string;
}

/**
 * Get security headers configuration
 * These headers help protect against common web vulnerabilities
 */
export function getSecurityHeaders(): SecurityHeadersConfig {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' cdnjs.cloudflare.com esm.sh",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://api.stripe.com https://*.supabase.co",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");

  return {
    "Content-Security-Policy": cspDirectives,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

/**
 * Generate meta tags for security headers
 * Useful for including in HTML head when server headers aren't available
 */
export function getSecurityMetaTags(): string {
  const headers = getSecurityHeaders();
  const csp = headers["Content-Security-Policy"];

  return `<meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}" />`;
}

/**
 * Helper function to escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Security headers middleware for Express/Connect-style servers
 * Usage: app.use(securityHeadersMiddleware);
 */
export function securityHeadersMiddleware(
  _req: unknown,
  res: { setHeader: (key: string, value: string) => void },
  next: () => void
): void {
  const headers = getSecurityHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
}

/**
 * Vite plugin configuration for security headers
 * Can be used in vite.config.ts for development server
 */
export function getViteSecurityConfig(): {
  headers: { [key: string]: string };
} {
  return {
    headers: getSecurityHeaders(),
  };
}

/**
 * Generate header configuration for deployment platforms
 * Example: Vercel, Netlify, etc.
 */
export function getDeploymentHeadersConfig(): Array<{
  key: string;
  value: string;
}> {
  const headers = getSecurityHeaders();
  return Object.entries(headers).map(([key, value]) => ({
    key,
    value,
  }));
}

/**
 * Type definitions for environment-specific security header configuration
 */
export interface EnvironmentSecurityConfig {
  production: SecurityHeadersConfig;
  development: SecurityHeadersConfig;
  staging: SecurityHeadersConfig;
}

/**
 * Get environment-specific security headers
 * Development may have slightly relaxed CSP for tools
 */
export function getEnvironmentSecurityHeaders(
  env: "production" | "development" | "staging" = "production"
): SecurityHeadersConfig {
  const baseHeaders = getSecurityHeaders();

  if (env === "development") {
    // In development, allow localhost for WebSocket connections (HMR)
    const devCsp = [
      "default-src 'self' localhost:* ws://localhost:*",
      "script-src 'self' 'unsafe-eval' localhost:* cdnjs.cloudflare.com esm.sh",
      "style-src 'self' 'unsafe-inline' localhost:*",
      "img-src 'self' data: blob: localhost:*",
      "connect-src 'self' localhost:* ws://localhost:* https://api.stripe.com https://*.supabase.co",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; ");

    return {
      ...baseHeaders,
      "Content-Security-Policy": devCsp,
    };
  }

  return baseHeaders;
}

/**
 * Export all configurations as default
 */
export default {
  getSecurityHeaders,
  getSecurityMetaTags,
  securityHeadersMiddleware,
  getViteSecurityConfig,
  getDeploymentHeadersConfig,
  getEnvironmentSecurityHeaders,
};
