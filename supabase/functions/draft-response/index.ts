import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { sanitizeForPrompt, sanitizeShortField } from "../_shared/security.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import {
  callAI,
  getModelConfig,
  logAIResponseUsage,
  AIRateLimitError,
  AICreditsError,
} from "../_shared/ai.ts";

serve(async (req) => {
  const corsPreflightResponse = handleCorsPreflightIfNeeded(req);
  if (corsPreflightResponse) return corsPreflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { noticeType, taxYear, clientName, summary, agency, caseId, profileId } = await req.json();

    const supabase = createAdminClient();

    // Fetch AI model configuration for response_drafting task
    const { modelId, maxTokens } = await getModelConfig(supabase, "response_drafting");
    console.log(`Drafting response for: ${noticeType}, using model: ${modelId}`);

    const systemPrompt = `You are an expert Enrolled Agent with extensive experience responding to IRS and state tax agency notices. Your responses are professional, formal, and follow proper IRS correspondence format.

When writing response letters:
1. Use proper formal letter format with date placeholders
2. Reference the specific notice type and tax year
3. Present facts clearly and concisely
4. Request penalty abatement when applicable, citing reasonable cause
5. Include appropriate closing with signature block
6. Use professional, respectful tone throughout`;

    const safeAgency = sanitizeShortField(agency, 50) || "the IRS";
    const safeNoticeType = sanitizeShortField(noticeType, 50);
    const safeClientName = sanitizeShortField(clientName, 100) || "[Client Name]";
    const safeSummary = sanitizeForPrompt(summary, 2000) || "No summary provided - please add relevant case details.";
    const safeTaxYear = sanitizeShortField(String(taxYear || ""), 10);

    const userPrompt = `Write a formal response letter to ${safeAgency} regarding Notice ${safeNoticeType} for Tax Year ${safeTaxYear}.

Client Name: ${safeClientName}

Case Summary/Situation:
${safeSummary}

Please draft a comprehensive response letter that:
1. Acknowledges receipt of the notice
2. Addresses the specific issues raised
3. Requests penalty abatement if applicable, citing reasonable cause
4. Provides a clear timeline of events if relevant
5. Requests specific relief or action

Output the letter in Markdown format with proper formatting.`;

    const aiResponse = await callAI({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokens,
      timeoutMs: 30000,
    });

    // Log AI usage
    await logAIResponseUsage(supabase, aiResponse, "response_drafting", {
      modelId,
      profileId: profileId || null,
      resourceType: "case",
      resourceId: caseId || null,
      metadata: {
        notice_type: noticeType,
        tax_year: taxYear,
        agency: agency,
        max_tokens_configured: maxTokens,
      },
    });

    if (!aiResponse.content) {
      throw new Error("No response generated from AI");
    }

    console.log("Successfully generated response draft");

    return new Response(
      JSON.stringify({ draft: aiResponse.content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in draft-response function:", error);

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

    const errorMessage = error instanceof Error ? error.message : "Failed to generate response draft";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
