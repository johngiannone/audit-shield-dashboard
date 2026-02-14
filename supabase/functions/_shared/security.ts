import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Shared security utilities for edge functions.
 * Provides rate limiting, input sanitization, and file validation.
 */

// ============================================================
// RATE LIMITING (using Supabase table as storage)
// ============================================================

interface RateLimitConfig {
  maxRequests: number; // Max requests allowed
  windowMs: number; // Time window in milliseconds
}

/**
 * Check rate limit for a given key (e.g., user ID or IP).
 * Uses a database table `rate_limits` to track request counts.
 * Returns { allowed: boolean, remaining: number }.
 */
export async function checkRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  try {
    // Clean up old entries and count recent requests
    const { count, error } = await supabaseAdmin
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("key", key)
      .gte("created_at", windowStart.toISOString());

    if (error) {
      console.warn("Rate limit check failed, allowing request:", error.message);
      return { allowed: true, remaining: config.maxRequests };
    }

    const currentCount = count || 0;
    const allowed = currentCount < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount - 1);

    if (allowed) {
      // Record this request
      await supabaseAdmin.from("rate_limits").insert({
        key,
        created_at: now.toISOString(),
      });
    }

    return { allowed, remaining };
  } catch (err) {
    console.warn("Rate limit error, allowing request:", err);
    return { allowed: true, remaining: config.maxRequests };
  }
}

// ============================================================
// INPUT SANITIZATION (for prompt injection defense)
// ============================================================

/**
 * Sanitize user input before including it in LLM prompts.
 * Removes control characters, prompt injection markers, and truncates to maxLength.
 */
export function sanitizeForPrompt(
  input: string | null | undefined,
  maxLength: number = 500
): string {
  if (!input) return "";

  return (
    input
      // Remove common prompt injection patterns
      .replace(/\[SYSTEM\s*(OVERRIDE|MESSAGE|PROMPT)\]/gi, "")
      .replace(/\[IGNORE\s*PREVIOUS\s*INSTRUCTIONS?\]/gi, "")
      .replace(/\[ADMIN\]/gi, "")
      .replace(/\[ASSISTANT\]/gi, "")
      // Remove markdown injection attempts
      .replace(/```[\s\S]*?```/g, "")
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Collapse excessive whitespace
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s{10,}/g, " ")
      // Truncate to max length
      .substring(0, maxLength)
      .trim()
  );
}

/**
 * Sanitize a short field (name, ID, etc.) - more aggressive truncation.
 */
export function sanitizeShortField(
  input: string | null | undefined,
  maxLength: number = 100
): string {
  if (!input) return "";
  return input
    .replace(/[\n\r]/g, " ")
    .replace(/[\[\]{}]/g, "")
    .replace(/[<>]/g, "")
    .substring(0, maxLength)
    .trim();
}

// ============================================================
// FILE VALIDATION
// ============================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

// PDF magic bytes: %PDF
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46];

// PNG magic bytes
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

// JPEG magic bytes
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an uploaded file for size, MIME type, and magic bytes.
 */
export function validateUploadedFile(
  file: File,
  arrayBuffer: ArrayBuffer
): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 10MB limit.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty." };
  }

  // Check MIME type
  let mediaType = file.type;
  if (!mediaType || mediaType === "application/octet-stream") {
    const ext = file.name.toLowerCase().split(".").pop();
    const extMap: Record<string, string> = {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
    };
    mediaType = extMap[ext || ""] || "";
  }

  if (!ALLOWED_MIME_TYPES.includes(mediaType)) {
    return {
      valid: false,
      error: "Unsupported file type. Please upload a PDF or image (PNG, JPG, GIF, WebP).",
    };
  }

  // Validate magic bytes
  const header = new Uint8Array(arrayBuffer.slice(0, 8));

  if (mediaType === "application/pdf") {
    const isPdf = PDF_MAGIC.every((byte, i) => header[i] === byte);
    if (!isPdf) {
      return {
        valid: false,
        error: "File does not appear to be a valid PDF (invalid header).",
      };
    }
  } else if (mediaType === "image/png") {
    const isPng = PNG_MAGIC.every((byte, i) => header[i] === byte);
    if (!isPng) {
      return {
        valid: false,
        error: "File does not appear to be a valid PNG image.",
      };
    }
  } else if (mediaType === "image/jpeg") {
    const isJpeg = JPEG_MAGIC.every((byte, i) => header[i] === byte);
    if (!isJpeg) {
      return {
        valid: false,
        error: "File does not appear to be a valid JPEG image.",
      };
    }
  }

  return { valid: true };
}

// ============================================================
// PATH TRAVERSAL PROTECTION
// ============================================================

/**
 * Validate a file path to prevent path traversal attacks.
 * Ensures the path doesn't contain ../ or other escape sequences.
 */
export function validateFilePath(filePath: string): FileValidationResult {
  if (!filePath) {
    return { valid: false, error: "File path is required." };
  }

  // Block path traversal
  if (
    filePath.includes("..") ||
    filePath.includes("~") ||
    filePath.startsWith("/") ||
    filePath.includes("\\")
  ) {
    return { valid: false, error: "Invalid file path." };
  }

  // Only allow alphanumeric, hyphens, underscores, dots, and forward slashes
  const safePathRegex = /^[a-zA-Z0-9_\-./]+$/;
  if (!safePathRegex.test(filePath)) {
    return { valid: false, error: "File path contains invalid characters." };
  }

  return { valid: true };
}

// ============================================================
// FETCH WITH TIMEOUT
// ============================================================

/**
 * Wrapper around fetch() that adds a timeout via AbortController.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Request timed out after ${timeoutMs / 1000} seconds`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
