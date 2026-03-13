// Import the safe Base64 encoder from Deno Standard Library
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { validateUploadedFile } from "../_shared/security.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import {
  callAI,
  getModelConfig,
  logAIResponseUsage,
  parseJSONFromAIResponse,
  AIRateLimitError,
  AICreditsError,
} from "../_shared/ai.ts";
import { enforceRateLimit, getUserIdFromRequest } from "../_shared/rate-limiter.ts";

serve(async (req) => {
  // Handle CORS preflight requests
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

    const rateLimit = await enforceRateLimit(supabase, userId, "analyze-notice");
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a moment before trying again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }

    // Fetch AI model configuration for ocr_extraction task
    const { modelId } = await getModelConfig(supabase, "ocr_extraction");
    console.log(`Using model for OCR extraction: ${modelId}`);

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.error("No file provided");
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Convert file to base64 safely using Deno's standard library
    const arrayBuffer = await file.arrayBuffer();

    // Validate file size, type, and magic bytes
    const validation = validateUploadedFile(file, arrayBuffer);
    if (!validation.valid) {
      console.error("File validation failed:", validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const base64 = encodeBase64(arrayBuffer);

    // Determine media type
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

    // Validate supported file types (Gemini supports PDFs and images)
    const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!supportedTypes.includes(mediaType)) {
      console.error(`Unsupported file type: ${mediaType}`);
      return new Response(
        JSON.stringify({ error: "Unsupported file type. Please upload a PDF or image (PNG, JPG, GIF, WebP)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending to AI (${modelId}) with media type: ${mediaType}`);

    const systemPrompt = `You are an expert tax document analyzer. Your job is to analyze IRS and state tax notices and extract key information.

You MUST respond with valid JSON only, no markdown, no explanation. The JSON must have this exact structure:
{
  "agency": "IRS" or the state name (e.g., "California", "New York"),
  "notice_type": the notice code or type (e.g., "CP2000", "CP501", "Notice of Deficiency"),
  "tax_year": the tax year as a number (e.g., 2023),
  "client_name_on_notice": the taxpayer name shown on the notice,
  "response_due_date": the deadline/due date for response in YYYY-MM-DD format (look for phrases like "respond by", "due date", "deadline", "must reply by", "within 30 days of this notice dated"),
  "summary": a 3-sentence summary of what this notice is about, what action is required, and any deadlines
}

If you cannot determine a field, use null for that field. For response_due_date, carefully look for any deadline mentioned in the notice - this is critical for compliance.`;

    const aiResponse = await callAI({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this tax notice document and extract the required information. Return ONLY valid JSON.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mediaType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      timeoutMs: 30000,
    });

    // Log AI usage
    await logAIResponseUsage(supabase, aiResponse, "ocr_extraction", {
      modelId,
      resourceType: "notice_analysis",
      metadata: {
        filename: file.name,
        file_size: file.size,
        media_type: mediaType,
      },
    });

    if (!aiResponse.content) {
      console.error("No content in AI response");
      throw new Error("No content in AI response");
    }

    console.log("Raw AI response:", aiResponse.content);

    // Parse the JSON from the response
    const analysisResult = parseJSONFromAIResponse(aiResponse.content);
    console.log("Parsed analysis result:", JSON.stringify(analysisResult));

    return new Response(
      JSON.stringify({ analysis: analysisResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-notice function:", error);

    if (error instanceof AIRateLimitError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (error instanceof AICreditsError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
