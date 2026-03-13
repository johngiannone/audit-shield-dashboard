import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { enforceRateLimit, getUserIdFromRequest } from "../_shared/rate-limiter.ts";

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

    const rateLimit = await enforceRateLimit(supabase, userId, "analyze-penalty-notice");
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a moment before trying again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('No file provided');
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing penalty notice: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Convert file to base64 safely
    const arrayBuffer = await file.arrayBuffer();
    const base64 = encodeBase64(arrayBuffer);
    
    // Determine media type
    let mediaType = file.type;
    if (!mediaType || mediaType === 'application/octet-stream') {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        mediaType = 'application/pdf';
      } else if (file.name.toLowerCase().endsWith('.png')) {
        mediaType = 'image/png';
      } else if (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
        mediaType = 'image/jpeg';
      }
    }

    const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!supportedTypes.includes(mediaType)) {
      console.error(`Unsupported file type: ${mediaType}`);
      return new Response(
        JSON.stringify({ error: 'Unsupported file type. Please upload a PDF or image.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending to AI for penalty notice analysis with media type: ${mediaType}`);

    const systemPrompt = `You are an expert tax penalty notice analyzer. Your job is to extract specific penalty information AND taxpayer identity from IRS federal notices AND California Franchise Tax Board (FTB) state notices.

FIRST: Determine the agency type by looking for these indicators:
- If you see "Franchise Tax Board", "FTB", "State of California", or California-specific form numbers -> agency_type = "State_CA"
- If you see "Internal Revenue Service", "IRS", "Department of Treasury", or federal notice codes (CP14, CP501, etc.) -> agency_type = "IRS"
- Default to "IRS" if unclear

You MUST respond with valid JSON only, no markdown, no explanation. The JSON must have this exact structure:
{
  "agency_type": "IRS" or "State_CA",
  "notice_number": the notice type/code (e.g., "CP14", "CP501" for IRS, or FTB notice numbers),
  "tax_year": the tax year as a number (e.g., 2023),
  "taxpayer_name": the full legal name of the taxpayer shown on the notice,
  "address_line_1": the street address (e.g., "123 Main Street"),
  "address_city": the city name,
  "address_state": the 2-letter state code (e.g., "CA", "NY", "TX"),
  "address_zip": the ZIP code (5 or 9 digits),
  "failure_to_file_penalty": the Failure to File penalty amount as a number (0 if not present),
  "failure_to_pay_penalty": the Failure to Pay penalty amount as a number (0 if not present),
  "other_penalties": total of any other penalties as a number (0 if none),
  "interest_amount": the total interest charged as a number (0 if not shown),
  "total_amount_due": the total amount due as a number,
  "notice_date": the date of the notice in YYYY-MM-DD format,
  "response_due_date": the deadline for response in YYYY-MM-DD format (if mentioned),
  "ssn_last_4": the last 4 digits of SSN if visible (null if not shown)
}

Important instructions:
- FIRST determine if this is an IRS (federal) or FTB (California state) notice
- For FTB notices, look for "Franchise Tax Board" header, FTB logos, or Sacramento CA addresses
- Extract the Taxpayer Name and Mailing Address found in the header/address block
- Look for "Failure to File Penalty" or "Late Filing Penalty" for failure_to_file_penalty
- Look for "Failure to Pay Penalty" or "Late Payment Penalty" for failure_to_pay_penalty  
- Look for "Interest" or "Interest Charged" for interest_amount
- If you cannot determine a numeric field, use 0
- If you cannot determine a text/date field, use null`;

    const userContent = [
      {
        type: "text",
        text: "Please analyze this IRS penalty notice and extract the penalty information. Return ONLY valid JSON."
      },
      {
        type: "image_url",
        image_url: {
          url: `data:${mediaType};base64,${base64}`
        }
      }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API error: ${response.status} - ${errorText}`);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received for penalty notice analysis');
    
    // Log AI usage
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    
    await supabase.from('ai_usage_logs').insert({
      task_name: 'penalty_notice_analysis',
      model_id: 'google/gemini-2.5-flash',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      estimated_cost: (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.30,
      resource_type: 'penalty_notice',
      metadata: {
        filename: file.name,
        file_size: file.size,
      },
    });
    
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in AI response');
      throw new Error('No content in AI response');
    }

    console.log('Raw AI response:', content);

    let analysisResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new Error('Failed to parse penalty notice analysis');
    }

    console.log('Parsed penalty analysis:', JSON.stringify(analysisResult));

    return new Response(
      JSON.stringify({ analysis: analysisResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-penalty-notice:', error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
