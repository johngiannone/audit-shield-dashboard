import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RiskFlag {
  flag: string;
  severity: 'high' | 'medium' | 'low';
  details: string;
}

interface ExtractedData {
  clientName: string | null;
  taxYear: number | null;
  agi: number | null;
  scheduleCNetProfit: number | null;
  totalItemizedDeductions: number | null;
  charitableContributions: number | null;
  businessIncome: number | null;
  stateCode: string | null;
}

/**
 * Redact Social Security Numbers from text for privacy protection.
 * Matches patterns like: 123-45-6789, 123 45 6789, 123456789
 * Returns the redacted text and count of redactions made.
 */
function redactSSN(text: string): { text: string; count: number } {
  let count = 0;
  
  // Pattern for SSN with dashes: ###-##-####
  const dashPattern = /\b\d{3}-\d{2}-\d{4}\b/g;
  // Pattern for SSN with spaces: ### ## ####
  const spacePattern = /\b\d{3}\s\d{2}\s\d{4}\b/g;
  // Pattern for SSN without separators: ######### (9 consecutive digits)
  const noSeparatorPattern = /\b(?<!\d)\d{9}(?!\d)\b/g;
  
  let redacted = text;
  
  // Count and replace each pattern
  const dashMatches = redacted.match(dashPattern);
  if (dashMatches) count += dashMatches.length;
  redacted = redacted.replace(dashPattern, '[REDACTED-SSN]');
  
  const spaceMatches = redacted.match(spacePattern);
  if (spaceMatches) count += spaceMatches.length;
  redacted = redacted.replace(spacePattern, '[REDACTED-SSN]');
  
  const noSepMatches = redacted.match(noSeparatorPattern);
  if (noSepMatches) count += noSepMatches.length;
  redacted = redacted.replace(noSeparatorPattern, '[REDACTED-SSN]');
  
  return { text: redacted, count };
}

/**
 * Simple redact for individual fields (returns just the string)
 */
function redactSSNSimple(text: string): string {
  return redactSSN(text).text;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();

    if (!jobId) {
      throw new Error('Job ID is required');
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing scan job: ${jobId}`);

    // Fetch the job
    const { data: job, error: jobError } = await supabase
      .from('audit_scan_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      throw new Error('Job not found');
    }

    if (job.status !== 'pending') {
      console.log(`Job ${jobId} is not pending (status: ${job.status})`);
      return new Response(JSON.stringify({ message: 'Job already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update status to processing
    await supabase
      .from('audit_scan_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    // Download the PDF from storage
    console.log(`Downloading file from: ${job.file_path}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('scan-queue')
      .download(job.file_path);

    if (downloadError || !fileData) {
      console.error('Failed to download file:', downloadError);
      await supabase
        .from('audit_scan_jobs')
        .update({ 
          status: 'error', 
          error_message: 'Failed to download file from storage' 
        })
        .eq('id', jobId);
      throw new Error('Failed to download file');
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...uint8Array));

    const systemPrompt = `You are a tax document analyzer. Analyze Form 1040 tax returns and extract data, then identify audit risks.

IMPORTANT PRIVACY RULE: Do NOT extract, include, or reference any Social Security Numbers (SSN) in your response. Ignore any SSN fields completely.

EXTRACTION: Return a JSON object with:
{
  "extractedData": {
    "clientName": <string or null>, // Taxpayer name from the form (first and last name only, NO SSN)
    "taxYear": <number or null>, // Tax year from the form header
    "agi": <number or null>, // Adjusted Gross Income (Line 11)
    "scheduleCNetProfit": <number or null>, // Net Profit from Schedule C Line 31
    "totalItemizedDeductions": <number or null>, // Total from Schedule A
    "charitableContributions": <number or null>, // Charitable gifts from Schedule A
    "businessIncome": <number or null>, // Business Income from Schedule 1/C
    "stateCode": <string or null> // 2-letter state code from address
  },
  "riskFlags": [
    {
      "flag": "Flag Name",
      "severity": "high" | "medium" | "low",
      "details": "Explanation of the risk (DO NOT include any SSN or sensitive identifiers)"
    }
  ],
  "riskScore": <number 0-100> // Overall risk score based on flags
}

RISK ANALYSIS RULES:
1. HIGH RISK - Charity/Income Ratio > 15%: If charitable contributions exceed 15% of AGI
2. HIGH RISK - Hobby Loss Rule: If Schedule C shows loss (negative net profit)
3. MEDIUM RISK - Round Number Anomalies: If key amounts are round numbers (multiples of $1000)
4. HIGH RISK - High Itemized Deductions: If total itemized deductions > 30% of AGI
5. MEDIUM RISK - Low Profit Margin: If Schedule C net profit < 20% of gross receipts
6. HIGH RISK - Housing Cost Mismatch: If detected housing costs > 25% of AGI
7. MEDIUM RISK - Neighborhood Outlier: If income appears significantly below area median

Remember: NO SSN data anywhere in your response.`;

    const userContent = [
      {
        type: 'text',
        text: 'Analyze this Form 1040 tax return PDF and return the JSON analysis.'
      },
      {
        type: 'image_url',
        image_url: {
          url: `data:application/pdf;base64,${base64}`
        }
      }
    ];

    // Helper function to call OpenRouter with a specific model
    async function callOpenRouter(model: string): Promise<Response> {
      console.log(`Calling OpenRouter with model: ${model}`);
      return fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': supabaseUrl,
          'X-Title': 'Return Shield Batch Scan',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          max_tokens: 4096,
          response_format: { type: 'json_object' }, // Force JSON output
        }),
      });
    }

    // Primary model: Gemini Flash 1.5 (cost-effective with large context window)
    console.log('Sending PDF to Gemini Flash 1.5 via OpenRouter...');
    let aiResponse = await callOpenRouter('google/gemini-flash-1.5');

    // Fallback to Claude 3.5 Sonnet if Gemini fails
    if (!aiResponse.ok) {
      const geminiError = await aiResponse.text();
      console.warn('Gemini Flash failed, falling back to Claude 3.5 Sonnet:', aiResponse.status, geminiError);
      
      aiResponse = await callOpenRouter('anthropic/claude-3.5-sonnet');
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenRouter API error (both models failed):', aiResponse.status, errorText);
      
      await supabase
        .from('audit_scan_jobs')
        .update({ 
          status: 'error', 
          error_message: `AI analysis failed: ${aiResponse.status}` 
        })
        .eq('id', jobId);
      
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || '';
    
    // PRIVACY: Redact any SSNs that may have slipped through in the AI response
    const redactionResult = redactSSN(content);
    content = redactionResult.text;
    let totalSSNRedactions = redactionResult.count;
    
    console.log('AI response received (SSNs redacted):', content.substring(0, 200));

    // Parse the AI response
    let result: {
      extractedData: ExtractedData;
      riskFlags: RiskFlag[];
      riskScore: number;
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
        
        // Double-check: redact any SSNs in string fields of the result
        if (result.extractedData.clientName) {
          const nameRedaction = redactSSN(result.extractedData.clientName);
          result.extractedData.clientName = nameRedaction.text;
          totalSSNRedactions += nameRedaction.count;
        }
        result.riskFlags = result.riskFlags.map(flag => {
          const flagRedaction = redactSSN(flag.flag);
          const detailsRedaction = redactSSN(flag.details);
          totalSSNRedactions += flagRedaction.count + detailsRedaction.count;
          return {
            ...flag,
            flag: flagRedaction.text,
            details: detailsRedaction.text,
          };
        });
      } else {
        throw new Error('No JSON found in response');
      }
      
      // Log SSN redaction event if any SSNs were found
      if (totalSSNRedactions > 0) {
        console.log(`SSN redaction: ${totalSSNRedactions} SSN(s) redacted from job ${jobId}`);
        
        await supabase.from('security_logs').insert({
          user_id: null, // System action via service role
          action: 'ssn_redacted',
          resource_type: 'audit_scan_job',
          resource_id: jobId,
          metadata: {
            ssn_count: totalSSNRedactions,
            profile_id: job.profile_id,
            filename: job.original_filename,
          },
        });
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      
      // Default result if parsing fails
      result = {
        extractedData: {
          clientName: null,
          taxYear: null,
          agi: null,
          scheduleCNetProfit: null,
          totalItemizedDeductions: null,
          charitableContributions: null,
          businessIncome: null,
          stateCode: null,
        },
        riskFlags: [{
          flag: 'Analysis Error',
          severity: 'low',
          details: 'Could not fully analyze the document. Manual review recommended.'
        }],
        riskScore: 0,
      };
    }

    // Update the job with results
    const { error: updateError } = await supabase
      .from('audit_scan_jobs')
      .update({
        status: 'completed',
        risk_score: result.riskScore,
        extracted_data: result.extractedData,
        detected_issues: result.riskFlags,
        processed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Failed to update job:', updateError);
      throw new Error('Failed to save results');
    }

    console.log(`Job ${jobId} completed successfully with score: ${result.riskScore}`);

    return new Response(JSON.stringify({
      success: true,
      jobId,
      riskScore: result.riskScore,
      flagCount: result.riskFlags.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-scan-job:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
