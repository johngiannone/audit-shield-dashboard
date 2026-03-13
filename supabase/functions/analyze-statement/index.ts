import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { createAdminClient, authenticateUser } from "../_shared/supabase.ts";
import { enforceRateLimit } from "../_shared/rate-limiter.ts";
import { callAI, getModelConfig, logAIResponseUsage, AIRateLimitError, AICreditsError } from "../_shared/ai.ts";

// ── JSON Schema for structured output ──────────────────
const TRANSACTION_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "transactions",
    strict: true,
    schema: {
      type: "object",
      properties: {
        transactions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "ISO date YYYY-MM-DD" },
              description: { type: "string" },
              amount: { type: "number", description: "Positive absolute value" },
              category: { type: "string", description: "IRS Schedule C category" },
              is_deductible: { type: "boolean" },
            },
            required: ["date", "description", "amount", "category", "is_deductible"],
            additionalProperties: false,
          },
        },
      },
      required: ["transactions"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `You are an expert CPA specializing in US small-business tax returns.

You will receive raw transaction text extracted from a bank or credit-card statement (CSV rows or extracted PDF text).

Your task:
1. Parse every transaction into a structured object.
2. Categorize each into one of these IRS Schedule C categories or special labels:
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
5. For the "amount" field, always return a positive number (absolute value).`;

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
