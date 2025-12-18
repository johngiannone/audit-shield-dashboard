import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { noticeType, taxYear, clientName, summary, agency } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Drafting response for:", { noticeType, taxYear, clientName, agency });

    const systemPrompt = `You are an expert Enrolled Agent with extensive experience responding to IRS and state tax agency notices. Your responses are professional, formal, and follow proper IRS correspondence format.

When writing response letters:
1. Use proper formal letter format with date placeholders
2. Reference the specific notice type and tax year
3. Present facts clearly and concisely
4. Request penalty abatement when applicable, citing reasonable cause
5. Include appropriate closing with signature block
6. Use professional, respectful tone throughout`;

    const userPrompt = `Write a formal response letter to ${agency || 'the IRS'} regarding Notice ${noticeType} for Tax Year ${taxYear}.

Client Name: ${clientName || '[Client Name]'}

Case Summary/Situation:
${summary || 'No summary provided - please add relevant case details.'}

Please draft a comprehensive response letter that:
1. Acknowledges receipt of the notice
2. Addresses the specific issues raised
3. Requests penalty abatement if applicable, citing reasonable cause
4. Provides a clear timeline of events if relevant
5. Requests specific relief or action

Output the letter in Markdown format with proper formatting.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const draftedResponse = data.choices?.[0]?.message?.content;

    if (!draftedResponse) {
      throw new Error("No response generated from AI");
    }

    console.log("Successfully generated response draft");

    return new Response(
      JSON.stringify({ draft: draftedResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in draft-response function:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate response draft";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
