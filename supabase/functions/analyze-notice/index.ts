// Import the safe Base64 encoder from Deno Standard Library
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('No file provided');
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Convert file to base64 safely using Deno's standard library
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
      } else if (file.name.toLowerCase().endsWith('.gif')) {
        mediaType = 'image/gif';
      } else if (file.name.toLowerCase().endsWith('.webp')) {
        mediaType = 'image/webp';
      }
    }

    // Validate supported file types (Gemini supports PDFs and images)
    const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!supportedTypes.includes(mediaType)) {
      console.error(`Unsupported file type: ${mediaType}`);
      return new Response(
        JSON.stringify({ error: 'Unsupported file type. Please upload a PDF or image (PNG, JPG, GIF, WebP).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending to Lovable AI (Gemini) with media type: ${mediaType}`);

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

    const userContent = [
      {
        type: "text",
        text: "Please analyze this tax notice document and extract the required information. Return ONLY valid JSON."
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
      console.error(`Lovable AI API error: ${response.status} - ${errorText}`);
      
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
    console.log('Lovable AI response received');
    
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in response:', JSON.stringify(data));
      throw new Error('No content in AI response');
    }

    console.log('Raw AI response:', content);

    // Parse the JSON from the response
    let analysisResult;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new Error('Failed to parse AI analysis result');
    }

    console.log('Parsed analysis result:', JSON.stringify(analysisResult));

    return new Response(
      JSON.stringify({ analysis: analysisResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-notice function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});