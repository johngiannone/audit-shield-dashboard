import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { callAI } from "../_shared/ai.ts";
import { enforceRateLimit, getUserIdFromRequest } from "../_shared/rate-limiter.ts";

interface TransactionCode {
  code: string;
  description: string;
  severity: string;
  category: string;
  explanation: string;
  recommended_action: string;
}

interface TimelineEntry {
  code: string;
  date: string;
  description: string;
  severity: string;
  category: string;
  explanation: string;
  recommendedAction: string;
}

interface DecodeResult {
  timeline: TimelineEntry[];
  statusSummary: {
    status: string;
    riskLevel: "critical" | "high" | "medium" | "low" | "clear";
    criticalCodes: string[];
    highCodes: string[];
    message: string;
  };
  rawExtractedCodes: { code: string; date: string }[];
}

// Extract text from PDF using basic parsing
async function extractTextFromPDF(pdfBase64: string): Promise<string> {
  const binaryString = atob(pdfBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const text = decoder.decode(bytes);

  const streamRegex = /stream\s*([\s\S]*?)\s*endstream/gi;
  let extractedText = "";
  let match;

  while ((match = streamRegex.exec(text)) !== null) {
    const content = match[1];
    const textRegex = /\(([^)]*)\)\s*Tj|\[([^\]]*)\]\s*TJ/g;
    let textMatch;
    while ((textMatch = textRegex.exec(content)) !== null) {
      const extracted = textMatch[1] || textMatch[2] || "";
      extractedText += extracted.replace(/\\/g, "") + " ";
    }
  }

  const plainTextRegex = /BT\s*([\s\S]*?)\s*ET/gi;
  while ((match = plainTextRegex.exec(text)) !== null) {
    extractedText += match[1] + " ";
  }

  if (extractedText.length < 100) {
    extractedText = text.replace(/[^\x20-\x7E\n\r]/g, " ").replace(/\s+/g, " ");
  }

  return extractedText;
}

// Use AI to extract transaction codes if regex fails
async function extractCodesWithAI(text: string): Promise<{ code: string; date: string }[]> {
  try {
    const aiResponse = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are an IRS transcript parser. Extract all 3-digit transaction codes and their associated dates from IRS Account Transcripts.

IRS transcripts have a format like:
CODE  EXPLANATION                        DATE
150   Tax return filed                   04-15-2024
806   W-2 or 1099 withholding            04-15-2024

Return ONLY a JSON array of objects with "code" and "date" fields. Example:
[{"code": "150", "date": "04-15-2024"}, {"code": "806", "date": "04-15-2024"}]

If you cannot find any codes, return an empty array: []`,
        },
        {
          role: "user",
          content: `Extract all IRS transaction codes and dates from this transcript text:\n\n${text.substring(0, 10000)}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_codes",
            description: "Extract IRS transaction codes and dates",
            parameters: {
              type: "object",
              properties: {
                codes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      code: { type: "string" },
                      date: { type: "string" },
                    },
                    required: ["code", "date"],
                  },
                },
              },
              required: ["codes"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_codes" } },
      timeoutMs: 30000,
    });

    const toolCall = aiResponse.toolCalls?.[0] as { function?: { arguments?: string } } | undefined;

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return parsed.codes || [];
    }

    return [];
  } catch (error) {
    console.error("AI extraction error:", error);
    return [];
  }
}

// Extract codes using regex patterns
function extractCodesWithRegex(text: string): { code: string; date: string }[] {
  const results: { code: string; date: string }[] = [];

  const pattern1 = /\b(\d{3})\s+[A-Za-z].*?(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/g;
  let match1: RegExpExecArray | null;
  while ((match1 = pattern1.exec(text)) !== null) {
    results.push({ code: match1[1], date: match1[2] });
  }

  const pattern2 = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s+(\d{3})\b/g;
  let match2: RegExpExecArray | null;
  while ((match2 = pattern2.exec(text)) !== null) {
    results.push({ code: match2[2], date: match2[1] });
  }

  const commonCodes = [
    "150", "290", "291", "300", "301", "420", "421", "424", "570", "571",
    "766", "768", "806", "810", "811", "826", "841", "846", "898", "914",
    "922", "971", "976", "977", "170", "276", "196",
  ];
  const pattern3 = new RegExp(`\\b(${commonCodes.join("|")})\\b`, "g");
  let match3: RegExpExecArray | null;
  while ((match3 = pattern3.exec(text)) !== null) {
    const codeVal = match3[1];
    if (!results.find((r) => r.code === codeVal)) {
      results.push({ code: codeVal, date: "Unknown" });
    }
  }

  return results;
}

serve(async (req) => {
  const corsPreflightResponse = handleCorsPreflightIfNeeded(req);
  if (corsPreflightResponse) return corsPreflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = createAdminClient();

    // ── Rate Limiting ────────────────────────────────────────
    const userId = await getUserIdFromRequest(req, supabase);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rateLimit = await enforceRateLimit(supabase, userId, "decode-transcript");
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a moment before trying again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }

    const { pdfBase64, fileName } = await req.json();

    // Extract text from PDF
    console.log("Extracting text from PDF...");
    const extractedText = await extractTextFromPDF(pdfBase64);
    console.log("Extracted text length:", extractedText.length);

    // Try regex extraction first
    let extractedCodes = extractCodesWithRegex(extractedText);
    console.log("Regex extracted codes:", extractedCodes.length);

    // If regex didn't find much, try AI
    if (extractedCodes.length < 3) {
      console.log("Trying AI extraction...");
      const aiCodes = await extractCodesWithAI(extractedText);
      if (aiCodes.length > extractedCodes.length) {
        extractedCodes = aiCodes;
      }
    }

    console.log("Total codes found:", extractedCodes.length);

    // Fetch transaction code definitions from database
    const { data: codeDefinitions, error: dbError } = await supabase
      .from("irs_transaction_codes")
      .select("*");

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to fetch transaction code definitions");
    }

    // Create a map for quick lookup
    const codeMap = new Map<string, TransactionCode>();
    for (const def of codeDefinitions || []) {
      codeMap.set(def.code, def);
    }

    // Build timeline with matched codes
    const timeline: TimelineEntry[] = [];
    const criticalCodes: string[] = [];
    const highCodes: string[] = [];

    for (const extracted of extractedCodes) {
      const definition = codeMap.get(extracted.code);

      if (definition) {
        timeline.push({
          code: extracted.code,
          date: extracted.date,
          description: definition.description,
          severity: definition.severity,
          category: definition.category || "unknown",
          explanation: definition.explanation || "",
          recommendedAction: definition.recommended_action || "",
        });

        if (definition.severity === "critical") {
          criticalCodes.push(extracted.code);
        } else if (definition.severity === "high") {
          highCodes.push(extracted.code);
        }
      } else {
        timeline.push({
          code: extracted.code,
          date: extracted.date,
          description: "Unknown Transaction Code",
          severity: "unknown",
          category: "unknown",
          explanation: "This code was not found in our database.",
          recommendedAction: "Research this code or consult a tax professional.",
        });
      }
    }

    // Sort timeline: critical first, then high, then by date
    const severityOrder: Record<string, number> = {
      critical: 0, high: 1, medium: 2, low: 3, routine: 4, unknown: 5,
    };
    timeline.sort((a, b) => {
      const severityDiff = (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
      if (severityDiff !== 0) return severityDiff;
      return a.date.localeCompare(b.date);
    });

    // Determine overall status
    let riskLevel: "critical" | "high" | "medium" | "low" | "clear" = "clear";
    let status = "No Issues Detected";
    let message = "Your transcript appears clear with no concerning activity.";

    if (criticalCodes.length > 0) {
      riskLevel = "critical";
      if (criticalCodes.includes("420") || criticalCodes.includes("424")) {
        status = "AUDIT RISK DETECTED";
        message = `Critical audit-related codes found (${criticalCodes.join(", ")}). Your return may be under examination.`;
      } else if (criticalCodes.includes("922")) {
        status = "CRIMINAL INVESTIGATION";
        message = "Code 922 indicates criminal investigation involvement. Seek legal counsel immediately.";
      } else {
        status = "CRITICAL ACTIVITY DETECTED";
        message = `Critical codes found: ${criticalCodes.join(", ")}. Immediate attention required.`;
      }
    } else if (highCodes.length > 0) {
      riskLevel = "high";
      status = "Action Required";
      if (highCodes.includes("570") || highCodes.includes("810")) {
        message = "Your account has a hold or freeze. Check for IRS notices.";
      } else if (highCodes.includes("971")) {
        message = "The IRS has issued a notice. Check your mail for correspondence.";
      } else if (highCodes.includes("976")) {
        message = "Possible identity theft detected. Contact IRS Identity Protection.";
      } else {
        message = `High-priority codes found: ${highCodes.join(", ")}. Review recommended.`;
      }
    } else if (timeline.some((t) => t.severity === "medium")) {
      riskLevel = "medium";
      status = "Review Recommended";
      message = "Some items may require your attention. Review the timeline below.";
    } else if (timeline.length > 0) {
      riskLevel = "low";
      status = "Normal Activity";
      message = "Standard processing codes found. No immediate concerns.";
    }

    const result: DecodeResult = {
      timeline,
      statusSummary: {
        status,
        riskLevel,
        criticalCodes,
        highCodes,
        message,
      },
      rawExtractedCodes: extractedCodes,
    };

    console.log("Decode complete. Status:", status, "Risk:", riskLevel);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error decoding transcript:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to decode transcript";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
