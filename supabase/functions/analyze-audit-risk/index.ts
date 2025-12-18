import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedData {
  agi: number | null;
  businessIncome: number | null;
  charitableContributions: number | null;
  totalItemizedDeductions: number | null;
  taxYear: number | null;
  // Schedule C fields
  naicsCode: string | null;
  grossReceipts: number | null;
  netProfit: number | null;
}

interface RiskFlag {
  flag: string;
  severity: 'high' | 'medium' | 'low';
  details: string;
}

interface RiskAssessment {
  score: number;
  flags: RiskFlag[];
  extractedData: ExtractedData;
  benchmarks: {
    avgCharitableDeduction: number | null;
    avgMortgageInterest: number | null;
  } | null;
  industryBenchmark: {
    industryName: string;
    avgProfitMargin: number;
    userProfitMargin: number;
  } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, priorYearLosses } = await req.json();

    if (!pdfBase64) {
      throw new Error('PDF data is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Step A: Extracting data from Form 1040 PDF...');
    
    // Step A: Extract data using Lovable AI (Gemini) - now includes Schedule C fields
    const extractionPrompt = `Analyze this Form 1040 tax return PDF and extract the following information. Return ONLY a JSON object with these exact fields:

{
  "agi": <number or null>, // Adjusted Gross Income (Line 11 on Form 1040)
  "businessIncome": <number or null>, // Business Income/Loss from Schedule 1 or Schedule C (can be negative)
  "charitableContributions": <number or null>, // Charitable Contributions from Schedule A
  "totalItemizedDeductions": <number or null>, // Total Itemized Deductions from Schedule A
  "taxYear": <number or null>, // Tax year from the form header
  "naicsCode": <string or null>, // NAICS code from Schedule C (6-digit code like "541110")
  "grossReceipts": <number or null>, // Gross Receipts from Schedule C Line 1
  "netProfit": <number or null> // Net Profit from Schedule C Line 31 (can be negative)
}

Important:
- Extract exact dollar amounts as numbers (no $ signs or commas)
- If a field is not present or cannot be found, use null
- Business income and net profit can be negative (a loss)
- NAICS code should be a 6-digit string if found
- Only return the JSON object, no other text`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: extractionPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI extraction error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add funds to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Failed to extract data from PDF');
    }

    const aiData = await aiResponse.json();
    const extractionContent = aiData.choices?.[0]?.message?.content || '';
    console.log('AI extraction response:', extractionContent);

    // Parse the extracted JSON
    let extractedData: ExtractedData;
    try {
      // Try to find JSON in the response
      const jsonMatch = extractionContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse extraction:', parseError);
      extractedData = {
        agi: null,
        businessIncome: null,
        charitableContributions: null,
        totalItemizedDeductions: null,
        taxYear: null,
        naicsCode: null,
        grossReceipts: null,
        netProfit: null
      };
    }

    console.log('Extracted data:', extractedData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step B: Fetch IRS benchmarks
    console.log('Step B: Fetching IRS benchmarks...');
    
    let benchmarks = null;
    if (extractedData.agi !== null) {
      const taxYear = extractedData.taxYear || new Date().getFullYear() - 1;
      
      const { data: benchmarkData, error: benchmarkError } = await supabase
        .from('irs_benchmarks')
        .select('*')
        .eq('tax_year', taxYear)
        .lte('income_range_min', extractedData.agi)
        .or(`income_range_max.gte.${extractedData.agi},income_range_max.is.null`)
        .limit(1)
        .single();

      if (!benchmarkError && benchmarkData) {
        benchmarks = {
          avgCharitableDeduction: Number(benchmarkData.avg_charitable_deduction),
          avgMortgageInterest: Number(benchmarkData.avg_mortgage_interest),
        };
        console.log('Found IRS benchmarks:', benchmarks);
      } else {
        console.log('No IRS benchmarks found for AGI:', extractedData.agi);
      }
    }

    // Step B2: Fetch Industry benchmarks if NAICS code is available
    console.log('Step B2: Fetching industry benchmarks...');
    
    let industryBenchmark = null;
    if (extractedData.naicsCode) {
      const { data: industryData, error: industryError } = await supabase
        .from('industry_benchmarks')
        .select('*')
        .eq('naics_code', extractedData.naicsCode)
        .single();

      if (!industryError && industryData) {
        industryBenchmark = {
          industryName: industryData.industry_name,
          avgProfitMargin: Number(industryData.avg_profit_margin),
          avgCogsPercentage: Number(industryData.avg_cogs_percentage),
          highRiskExpenseCategories: industryData.high_risk_expense_categories || []
        };
        console.log('Found industry benchmark:', industryBenchmark);
      } else {
        console.log('No industry benchmark found for NAICS:', extractedData.naicsCode);
      }
    }

    // Step C: Apply risk logic
    console.log('Step C: Analyzing risk flags...');
    
    const flags: RiskFlag[] = [];

    // High Charity/Income Ratio check
    if (extractedData.agi !== null && extractedData.charitableContributions !== null) {
      const charityRatio = extractedData.charitableContributions / extractedData.agi;
      if (charityRatio > 0.15) {
        flags.push({
          flag: 'High Charity/Income Ratio',
          severity: 'high',
          details: `Charitable contributions (${(charityRatio * 100).toFixed(1)}% of AGI) exceed 15% threshold. IRS may scrutinize.`
        });
      } else if (benchmarks && charityRatio > benchmarks.avgCharitableDeduction * 2) {
        flags.push({
          flag: 'Above Average Charitable Deductions',
          severity: 'medium',
          details: `Charitable contributions are more than double the average for your income bracket.`
        });
      }
    }

    // Hobby Loss Risk check
    if (extractedData.businessIncome !== null && extractedData.businessIncome < 0) {
      const yearsWithLosses = priorYearLosses ? priorYearLosses + 1 : 1;
      if (yearsWithLosses >= 3) {
        flags.push({
          flag: 'Hobby Loss Risk',
          severity: 'high',
          details: `Business losses for ${yearsWithLosses} consecutive years may trigger IRS hobby loss rules (3 of 5 year test).`
        });
      } else if (extractedData.businessIncome < -10000) {
        flags.push({
          flag: 'Significant Business Loss',
          severity: 'medium',
          details: `Large business loss of $${Math.abs(extractedData.businessIncome).toLocaleString()} may attract IRS attention.`
        });
      }
    }

    // Round Number Anomaly check
    const checkRoundNumber = (value: number | null, fieldName: string) => {
      if (value !== null && value >= 1000 && value % 1000 === 0) {
        flags.push({
          flag: 'Round Number Anomaly',
          severity: 'medium',
          details: `${fieldName} ($${value.toLocaleString()}) is a round number, which may indicate estimation rather than actual figures.`
        });
      }
    };

    checkRoundNumber(extractedData.charitableContributions, 'Charitable Contributions');
    checkRoundNumber(extractedData.totalItemizedDeductions, 'Total Itemized Deductions');
    checkRoundNumber(extractedData.businessIncome, 'Business Income');

    // Additional checks against benchmarks
    if (extractedData.agi !== null && benchmarks) {
      // Check if total itemized deductions are unusually high
      if (extractedData.totalItemizedDeductions !== null) {
        const expectedMax = extractedData.agi * 0.30;
        if (extractedData.totalItemizedDeductions > expectedMax) {
          flags.push({
            flag: 'High Itemized Deductions',
            severity: 'medium',
            details: `Total itemized deductions exceed 30% of AGI, which is above typical ranges.`
          });
        }
      }
    }

    // NEW: Industry Profitability Analysis
    let userProfitMargin: number | null = null;
    if (extractedData.grossReceipts !== null && extractedData.grossReceipts > 0 && extractedData.netProfit !== null) {
      userProfitMargin = (extractedData.netProfit / extractedData.grossReceipts) * 100;
      console.log('Calculated user profit margin:', userProfitMargin.toFixed(2) + '%');

      if (industryBenchmark) {
        const industryAvg = industryBenchmark.avgProfitMargin;
        const threshold = industryAvg * 0.5; // 50% of industry average

        if (userProfitMargin < threshold) {
          flags.push({
            flag: 'Abnormally Low Profitability for Industry',
            severity: 'high',
            details: `Your profit margin (${userProfitMargin.toFixed(1)}%) is less than 50% of the ${industryBenchmark.industryName} industry average (${industryAvg}%). This suggests potential underreported income or inflated expenses and may trigger IRS scrutiny.`
          });
        } else if (userProfitMargin < industryAvg * 0.75) {
          flags.push({
            flag: 'Below Average Industry Profitability',
            severity: 'medium',
            details: `Your profit margin (${userProfitMargin.toFixed(1)}%) is below the ${industryBenchmark.industryName} industry average of ${industryAvg}%.`
          });
        }
      }
    }

    // Step D: Calculate risk score
    console.log('Step D: Calculating risk score...');
    
    let riskScore = 0;
    for (const flag of flags) {
      if (flag.severity === 'high') {
        riskScore += 30;
      } else if (flag.severity === 'medium') {
        riskScore += 10;
      } else {
        riskScore += 5;
      }
    }
    riskScore = Math.min(riskScore, 100);

    const assessment: RiskAssessment = {
      score: riskScore,
      flags,
      extractedData,
      benchmarks,
      industryBenchmark: industryBenchmark && userProfitMargin !== null ? {
        industryName: industryBenchmark.industryName,
        avgProfitMargin: industryBenchmark.avgProfitMargin,
        userProfitMargin: userProfitMargin
      } : null
    };

    console.log('Final risk assessment:', assessment);

    return new Response(JSON.stringify(assessment), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-audit-risk:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
