import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "npm:zod@3.23.8";
import { zodToJsonSchema } from "npm:zod-to-json-schema@3.23.5";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { createAdminClient, authenticateUser } from "../_shared/supabase.ts";
import { enforceRateLimit } from "../_shared/rate-limiter.ts";
import { callAI, getModelConfig, logAIResponseUsage, AIRateLimitError, AICreditsError } from "../_shared/ai.ts";

// ── Zod schema for structured output ──────────────────
const TransactionItemSchema = z.object({
  date: z.string().describe("ISO date YYYY-MM-DD"),
  description: z.string().describe("Transaction description from the statement"),
  amount: z.number().describe("Positive absolute value of the transaction"),
  category: z.string().describe("IRS Schedule C category"),
  is_deductible: z.boolean().describe("Whether this expense is tax-deductible"),
});

const TransactionsResponseSchema = z.object({
  transactions: z.array(TransactionItemSchema),
});

// Convert Zod → JSON Schema and wrap for OpenAI Structured Outputs
const rawJsonSchema = zodToJsonSchema(TransactionsResponseSchema, {
  target: "openAi",
  $refStrategy: "none",
});

const TRANSACTION_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "transactions",
    strict: true,
    schema: rawJsonSchema,
  },
};

const SYSTEM_PROMPT = `You are a Master CPA specializing in IRS Schedule C deductions for US small-business owners and self-employed individuals.

You will receive raw transaction text extracted from a bank or credit-card statement (CSV rows or extracted PDF text).

Your task:
1. Parse every transaction into a structured object.
2. Categorize each into EXACTLY one of these IRS Schedule C categories or special labels:
   - Advertising
   - Car & Truck Expenses
   - Commissions & Fees
   - Contract Labor
   - Depreciation
   - Employee Benefits
   - Insurance
   - Interest (Mortgage/Other)
   - Legal & Professional Services
   - Office Expenses
   - Rent or Lease
   - Repairs & Maintenance
   - Supplies
   - Taxes & Licenses
   - Travel
   - Meals (50% deductible)
   - Utilities
   - Wages
   - Other Expenses
   - Income          (for deposits, refunds, payments received)
   - Personal        (non-deductible personal spending)

3. Set is_deductible = true for legitimate business expenses, false for Income and Personal items.
4. For the "date" field, use ISO format YYYY-MM-DD. If only month/year is available, use the first of the month.
5. For the "amount" field, always return a positive number (absolute value).

## Few-Shot Examples

Below are tricky real-world transactions and their correct classifications. Use these as guidance:

Example 1 — Food delivery (business meal):
  Input:  "01/15/2025  UBER EATS  $34.50"
  Output: { "date": "2025-01-15", "description": "UBER EATS", "amount": 34.50, "category": "Meals", "is_deductible": true }
  Reasoning: Food delivery services are meal expenses, potentially deductible at 50% when business-related.

Example 2 — Rideshare for business travel:
  Input:  "01/18/2025  UBER TRIP  $22.00"
  Output: { "date": "2025-01-18", "description": "UBER TRIP", "amount": 22.00, "category": "Travel", "is_deductible": true }
  Reasoning: Rideshare trips are transportation/travel, not meals. Deductible when used for business purposes.

Example 3 — Personal entertainment subscription:
  Input:  "01/20/2025  NETFLIX.COM  $15.99"
  Output: { "date": "2025-01-20", "description": "NETFLIX.COM", "amount": 15.99, "category": "Personal", "is_deductible": false }
  Reasoning: Streaming entertainment is personal spending with no business purpose.

Apply this same careful reasoning to every transaction. When in doubt between two categories, choose the one most favorable to the taxpayer while remaining defensible under IRS guidelines.`;

serve(async (req: Request) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createAdminClient();
    const user = await authenticateUser(req, supabaseAdmin);

    const rl = await enforceRateLimit(supabaseAdmin, user.id, "analyze-statement", 5, 60_000);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return new Response(JSON.stringify({ error: "No file uploaded." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File exceeds 10 MB limit." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith(".csv") || file.type === "text/csv";
    const isPDF = fileName.endsWith(".pdf") || file.type === "application/pdf";

    if (!isCSV && !isPDF) {
      return new Response(JSON.stringify({ error: "Unsupported file type. Please upload a CSV or PDF." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modelConfig = await getModelConfig(supabaseAdmin, "analyze-statement");

    // ── Extract text or build vision payload ──────────
    let extractedText = "";

    if (isCSV) {
      extractedText = await file.text();
    } else {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      extractedText = extractTextFromPDF(bytes);

      if (extractedText.trim().length < 50) {
        // Scanned PDF → send as base64 to vision model with structured output
        const base64 = uint8ArrayToBase64(bytes);
        const aiResponse = await callAI({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: "Extract and categorize every transaction from this bank/credit-card statement PDF." },
                { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
              ],
            },
          ],
          model: modelConfig.modelId,
          maxTokens: modelConfig.maxTokens,
          temperature: 0.1,
          response_format: TRANSACTION_SCHEMA,
          timeoutMs: 60_000,
        });

        await logAIResponseUsage(supabaseAdmin, aiResponse, "analyze-statement", {
          profileId: null, resourceType: "expense_statement", modelId: modelConfig.modelId,
        });

        const parsed = JSON.parse(aiResponse.content || '{"transactions":[]}');
        return new Response(JSON.stringify({ transactions: parsed.transactions }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Send extracted text to AI with structured output ──
    const truncated = extractedText.substring(0, 100_000);

    const aiResponse = await callAI({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here are the raw transaction lines from a bank/credit-card statement. Categorize each one.\n\n${truncated}`,
        },
      ],
      model: modelConfig.modelId,
      maxTokens: modelConfig.maxTokens,
      temperature: 0.1,
      response_format: TRANSACTION_SCHEMA,
      timeoutMs: 60_000,
    });

    await logAIResponseUsage(supabaseAdmin, aiResponse, "analyze-statement", {
      profileId: null, resourceType: "expense_statement", modelId: modelConfig.modelId,
    });

    const parsed = JSON.parse(aiResponse.content || '{"transactions":[]}');

    return new Response(JSON.stringify({ transactions: parsed.transactions }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-statement error:", err instanceof Error ? err.message : String(err));

    if (err instanceof AIRateLimitError) {
      return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (err instanceof AICreditsError) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (err instanceof Error && err.message.includes("Authentication")) {
      return new Response(JSON.stringify({ error: "Authentication required." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Failed to analyze statement. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Helpers ────────────────────────────────────────────

function extractTextFromPDF(bytes: Uint8Array): string {
  const decoder = new TextDecoder("latin1");
  const raw = decoder.decode(bytes);
  const textChunks: string[] = [];
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textChunks.push(tjMatch[1]);
    }
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/gi;
    let arrMatch;
    while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = arrMatch[1];
      const parts = inner.match(/\(([^)]*)\)/g);
      if (parts) {
        textChunks.push(parts.map((p) => p.slice(1, -1)).join(""));
      }
    }
  }
  return textChunks.join("\n");
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let result = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    result += String.fromCharCode(...slice);
  }
  return btoa(result);
}
