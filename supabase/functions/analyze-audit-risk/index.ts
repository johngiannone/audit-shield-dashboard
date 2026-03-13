/**
 * Audit Risk Analysis - Main Orchestrator
 *
 * Pipeline: Extract → Enrich → Score → Respond
 *
 * This function coordinates the full risk analysis by delegating to focused modules:
 *   - extract.ts: Download PDF and extract structured data via AI
 *   - enrich.ts:  Fetch benchmarks, geo risk, lifestyle data, charity validation
 *   - score.ts:   Evaluate risk flags and calculate the overall score
 *   - types.ts:   Shared type definitions
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { validateFilePath } from "../_shared/security.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { AIRateLimitError, AICreditsError } from "../_shared/ai.ts";
import { enforceRateLimit, getUserIdFromRequest } from "../_shared/rate-limiter.ts";

import type { AnalysisInput, RiskAssessment } from "./types.ts";
import { downloadAndConvert, extractDataFromPDF, cleanupTempFile } from "./extract.ts";
import { enrichExtractedData } from "./enrich.ts";
import { evaluateRisks } from "./score.ts";

serve(async (req) => {
  const corsPreflightResponse = handleCorsPreflightIfNeeded(req);
  if (corsPreflightResponse) return corsPreflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = createAdminClient();

    // ── Rate Limiting ────────────────────────────────────────
    const userId = await getUserIdFromRequest(req, supabase);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateLimit = await enforceRateLimit(supabase, userId, "analyze-audit-risk");
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a moment before trying again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }

    const input: AnalysisInput = await req.json();
    const { filePath } = input;

    if (!filePath) {
      throw new Error("filePath is required");
    }

    // Validate file path to prevent path traversal
    const pathValidation = validateFilePath(filePath);
    if (!pathValidation.valid) {
      return new Response(JSON.stringify({ error: pathValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const returnType = input.formType || "1040";
    console.log(`Analyzing ${returnType} return...`);
    console.log("File path:", filePath, "Type:", input.fileType);

    // ── Step A: Extract ──────────────────────────────────────
    console.log("Step A: Downloading and extracting data from PDF...");
    const pdfBase64 = await downloadAndConvert(supabase, filePath);
    const extractedData = await extractDataFromPDF(pdfBase64, returnType);

    // ── Step B: Enrich ───────────────────────────────────────
    const enrichment = await enrichExtractedData(
      supabase,
      extractedData,
      input.manualHousingCost
    );

    // ── Step C & D: Score ────────────────────────────────────
    const { score, flags, userProfitMargin } = evaluateRisks(
      extractedData,
      enrichment,
      input
    );

    // ── Build Response ───────────────────────────────────────
    const assessment: RiskAssessment = {
      score,
      flags,
      extractedData,
      benchmarks: enrichment.benchmarks,
      industryBenchmark:
        enrichment.industryBenchmark && userProfitMargin !== null
          ? {
              industryName: enrichment.industryBenchmark.industryName,
              avgProfitMargin: enrichment.industryBenchmark.avgProfitMargin,
              userProfitMargin,
            }
          : null,
      geoRisk: enrichment.geoRisk,
      lifestyleData: enrichment.lifestyleData,
      charityValidations: enrichment.charityValidations,
      neighborhoodData: enrichment.neighborhoodData,
    };

    console.log("Final risk assessment - Score:", assessment.score, "Flags:", flags.length);

    // ── Cleanup ──────────────────────────────────────────────
    await cleanupTempFile(supabase, filePath);

    return new Response(JSON.stringify(assessment), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(
      "Error in analyze-audit-risk:",
      error instanceof Error ? error.message : String(error)
    );

    if (error instanceof AIRateLimitError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (error instanceof AICreditsError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
