import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchWithTimeout } from "./security.ts";

/**
 * Shared AI utilities for edge functions.
 * Centralizes model configuration, pricing, usage logging, and API calls.
 */

// ============================================================
// MODEL PRICING
// ============================================================

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "google/gemini-2.5-pro": { input: 1.25, output: 5.00 },
};

/**
 * Calculate estimated cost for a model invocation.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] || { input: 0.075, output: 0.30 };
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

// ============================================================
// MODEL CONFIGURATION
// ============================================================

/** Map legacy/OpenRouter model IDs to Lovable AI (Gemini) model IDs */
const MODEL_MAP: Record<string, string> = {
  "google/gemini-flash-1.5": "google/gemini-2.5-flash",
  "google/gemini-pro-1.5": "google/gemini-2.5-pro",
  "anthropic/claude-3.5-sonnet": "google/gemini-2.5-flash",
};

const DEFAULT_MODEL = "google/gemini-2.5-flash";

export interface AIModelConfig {
  modelId: string;
  maxTokens: number;
  temperature?: number;
}

/**
 * Fetch AI model configuration for a given task from the database.
 * Falls back to defaults if the config table is unavailable.
 */
export async function getModelConfig(
  supabase: SupabaseClient,
  taskName: string
): Promise<AIModelConfig> {
  try {
    const { data: modelConfig, error } = await supabase
      .from("ai_model_config")
      .select("*")
      .eq("task_name", taskName)
      .eq("is_active", true)
      .single();

    if (error) {
      console.warn(`Could not fetch model config for '${taskName}', using defaults:`, error.message);
      return { modelId: DEFAULT_MODEL, maxTokens: 8192 };
    }

    const configModelId = modelConfig?.model_id || DEFAULT_MODEL;
    const modelId = MODEL_MAP[configModelId] || configModelId;

    return {
      modelId: modelId || DEFAULT_MODEL,
      maxTokens: modelConfig?.max_tokens || 8192,
      temperature: modelConfig?.temperature ?? undefined,
    };
  } catch (err) {
    console.warn(`Error fetching model config for '${taskName}':`, err);
    return { modelId: DEFAULT_MODEL, maxTokens: 8192 };
  }
}

// ============================================================
// AI API CALL
// ============================================================

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface AICallOptions {
  messages: AIMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: unknown;
  timeoutMs?: number;
}

export interface AIResponse {
  content: string | null;
  toolCalls: unknown[] | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  rawResponse: unknown;
}

/**
 * Call the Lovable AI gateway with standardized error handling.
 * Returns parsed response with token usage and cost.
 */
export async function callAI(options: AICallOptions): Promise<AIResponse> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const model = options.model || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs || 30000;

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
  };

  if (options.maxTokens) body.max_tokens = options.maxTokens;
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;
  if (options.response_format) body.response_format = options.response_format;

  const response = await fetchWithTimeout(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    timeoutMs
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI API error: ${response.status} - ${errorText}`);

    if (response.status === 429) {
      throw new AIRateLimitError("Rate limit exceeded. Please try again in a moment.");
    }
    if (response.status === 402) {
      throw new AICreditsError("AI usage limit reached. Please add credits to continue.");
    }

    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content || null;
  const toolCalls = choice?.message?.tool_calls || null;

  const inputTokens = data.usage?.prompt_tokens || 0;
  const outputTokens = data.usage?.completion_tokens || 0;
  const totalTokens = data.usage?.total_tokens || inputTokens + outputTokens;
  const estimatedCost = calculateCost(model, inputTokens, outputTokens);

  console.log(`Token usage - input: ${inputTokens}, output: ${outputTokens}, cost: $${estimatedCost.toFixed(6)}`);

  return {
    content,
    toolCalls,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
    rawResponse: data,
  };
}

// ============================================================
// CUSTOM ERROR TYPES
// ============================================================

export class AIRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIRateLimitError";
  }
}

export class AICreditsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AICreditsError";
  }
}

// ============================================================
// TOKEN USAGE LOGGING
// ============================================================

export interface UsageLogEntry {
  taskName: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  profileId?: string | null;
  resourceType?: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Log AI usage to the ai_usage_logs table.
 * Non-blocking - errors are logged but don't fail the request.
 */
export async function logAIUsage(
  supabase: SupabaseClient,
  entry: UsageLogEntry
): Promise<void> {
  try {
    const { error } = await supabase.from("ai_usage_logs").insert({
      task_name: entry.taskName,
      model_id: entry.modelId,
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      total_tokens: entry.totalTokens,
      estimated_cost: entry.estimatedCost,
      profile_id: entry.profileId || null,
      resource_type: entry.resourceType || null,
      resource_id: entry.resourceId || null,
      metadata: entry.metadata || null,
    });

    if (error) {
      console.warn("Failed to log AI usage:", error.message);
    }
  } catch (err) {
    console.warn("Error logging AI usage:", err);
  }
}

/**
 * Convenience: log usage from an AIResponse directly.
 */
export async function logAIResponseUsage(
  supabase: SupabaseClient,
  aiResponse: AIResponse,
  taskName: string,
  opts?: {
    profileId?: string | null;
    resourceType?: string;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
    modelId?: string;
  }
): Promise<void> {
  await logAIUsage(supabase, {
    taskName,
    modelId: opts?.modelId || DEFAULT_MODEL,
    inputTokens: aiResponse.inputTokens,
    outputTokens: aiResponse.outputTokens,
    totalTokens: aiResponse.totalTokens,
    estimatedCost: aiResponse.estimatedCost,
    profileId: opts?.profileId,
    resourceType: opts?.resourceType,
    resourceId: opts?.resourceId,
    metadata: opts?.metadata,
  });
}

/**
 * Extract JSON from an AI response that may contain markdown or extra text.
 */
export function parseJSONFromAIResponse(content: string): unknown {
  // Strip markdown code fences if present
  let cleaned = content.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Extract balanced JSON structure starting from first [ or {
    const extracted = extractBalancedJSON(cleaned);
    if (extracted) {
      try {
        return JSON.parse(extracted);
      } catch {
        // Try fixing trailing commas
        const fixed = extracted
          .replace(/,\s*\]/g, "]")
          .replace(/,\s*\}/g, "}");
        try {
          return JSON.parse(fixed);
        } catch { /* fall through */ }
      }
    }

    throw new Error("Failed to parse AI response as JSON");
  }
}

/**
 * Extract a balanced JSON structure (array or object) from a string
 * by counting bracket depth, avoiding greedy regex issues.
 */
function extractBalancedJSON(text: string): string | null {
  const startIdx = text.search(/[\[{]/);
  if (startIdx === -1) return null;

  const open = text[startIdx];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.substring(startIdx, i + 1);
    }
  }
  return null;
}
