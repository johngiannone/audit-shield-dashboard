import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CharityDonation {
  name: string;
  amount: number | null;
}

interface CharityValidation {
  name: string;
  amount: number | null;
  verified: boolean;
  matchedName: string | null;
  ein: string | null;
}

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
  // Occupation field from signature block
  occupation: string | null;
  wagesIncome: number | null; // W-2 wages from Line 1
  // Address fields for geographic and lifestyle risk
  stateCode: string | null; // 2-letter state code from address
  fullAddress: string | null; // Full street address for property lookup
  // Charity list from Schedule A
  charityList: CharityDonation[];
  // Schedule C detection
  hasScheduleC: boolean;
  vehicleExpenses: number | null;
  // S-Corp (1120-S) specific fields
  officerCompensation: number | null;
  ordinaryBusinessIncome: number | null;
  distributions: number | null;
  // C-Corp (1120) specific fields
  totalIncome: number | null;
  costOfGoodsSold: number | null;
  otherDeductions: number | null;
}

interface LifestyleData {
  propertyTax: number | null;
  homeValue: number | null;
  source: 'api' | 'manual' | null;
}

interface NeighborhoodData {
  zipCode: string;
  medianIncome: number;
  userAgi: number;
  incomeRatio: number; // User AGI as percentage of median
  isOutlier: boolean;
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
  geoRisk: {
    stateCode: string;
    stateName: string;
    auditRate: number;
    isHighRisk: boolean;
  } | null;
  lifestyleData: LifestyleData | null;
  charityValidations: CharityValidation[];
  neighborhoodData: NeighborhoodData | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, formType, priorYearLosses, manualHousingCost, activeShareholders, totalAssets, businessYearsActive, profitableYears, hasMileageLog } = await req.json();

    if (!pdfBase64) {
      throw new Error('PDF data is required');
    }

    // Log the form type being analyzed
    const returnType = formType || '1040';
    console.log(`Analyzing ${returnType} return...`);
    console.log('Additional params:', { priorYearLosses, manualHousingCost, activeShareholders, totalAssets, businessYearsActive, profitableYears, hasMileageLog });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Step A: Extracting data from ${returnType} PDF...`);
    
    // Step A: Extract data using Lovable AI (Gemini) - form-specific prompts
    let extractionPrompt: string;
    
    if (returnType === '1120-S') {
      // S-Corp Form 1120-S extraction prompt
      extractionPrompt = `Analyze this Form 1120-S (S Corporation) tax return PDF and extract the following information. Return ONLY a JSON object with these exact fields:

{
  "grossReceipts": <number or null>, // Gross Receipts or Sales (Line 1a)
  "officerCompensation": <number or null>, // Compensation of Officers (Line 7)
  "ordinaryBusinessIncome": <number or null>, // Ordinary Business Income/Loss (Line 21) - can be negative
  "distributions": <number or null>, // Distributions from Schedule K, Line 16d
  "taxYear": <number or null>, // Tax year from the form header
  "stateCode": <string or null>, // 2-letter state code from address
  "fullAddress": <string or null> // Full address from the form
}

Important:
- Extract exact dollar amounts as numbers (no $ signs or commas)
- If a field is not present or cannot be found, use null
- Ordinary Business Income can be negative (a loss)
- Only return the JSON object, no other text`;
    } else if (returnType === '1120') {
      // C-Corp Form 1120 extraction prompt
      extractionPrompt = `Analyze this Form 1120 (C Corporation) tax return PDF and extract the following information. Return ONLY a JSON object with these exact fields:

{
  "grossReceipts": <number or null>, // Gross Receipts or Sales (Line 1a)
  "costOfGoodsSold": <number or null>, // Cost of Goods Sold (Line 2)
  "totalIncome": <number or null>, // Total Income (Line 11)
  "officerCompensation": <number or null>, // Compensation of Officers (Line 12)
  "otherDeductions": <number or null>, // Other Deductions (Line 26)
  "taxYear": <number or null>, // Tax year from the form header
  "stateCode": <string or null>, // 2-letter state code from address
  "fullAddress": <string or null> // Full address from the form
}

Important:
- Extract exact dollar amounts as numbers (no $ signs or commas)
- If a field is not present or cannot be found, use null
- Only return the JSON object, no other text`;
    } else {
      // Individual Form 1040 extraction prompt (default)
      extractionPrompt = `Analyze this Form 1040 tax return PDF and extract the following information. Return ONLY a JSON object with these exact fields:

{
  "agi": <number or null>, // Adjusted Gross Income (Line 11 on Form 1040)
  "businessIncome": <number or null>, // Business Income/Loss from Schedule 1 or Schedule C (can be negative)
  "charitableContributions": <number or null>, // Charitable Contributions from Schedule A
  "totalItemizedDeductions": <number or null>, // Total Itemized Deductions from Schedule A
  "taxYear": <number or null>, // Tax year from the form header
  "naicsCode": <string or null>, // NAICS code from Schedule C (6-digit code like "541110")
  "grossReceipts": <number or null>, // Gross Receipts from Schedule C Line 1
  "netProfit": <number or null>, // Net Profit from Schedule C Line 31 (can be negative)
  "occupation": <string or null>, // Occupation from Page 2 signature block (taxpayer's occupation field)
  "wagesIncome": <number or null>, // Wages, salaries, tips from Line 1 (W-2 income)
  "stateCode": <string or null>, // 2-letter state code from taxpayer's address (e.g., "CA", "NY", "TX")
  "fullAddress": <string or null>, // Full street address from the form (e.g., "123 Main St, Los Angeles, CA 90001")
  "charityList": [{"name": <string>, "amount": <number or null>}, ...], // List of charitable donations from Schedule A with organization names and amounts
  "hasScheduleC": <boolean>, // true if Schedule C (Profit or Loss From Business) pages are present in the PDF, false otherwise
  "vehicleExpenses": <number or null> // Vehicle, machinery, and equipment expenses from Schedule C Line 13 or Part IV
}

Important:
- Extract exact dollar amounts as numbers (no $ signs or commas)
- If a field is not present or cannot be found, use null
- Business income and net profit can be negative (a loss)
- NAICS code should be a 6-digit string if found
- Occupation should be the text from the occupation field near signature
- stateCode should be the 2-letter US state abbreviation from the address at the top of the form
- fullAddress should be the complete address including street, city, state and zip if visible
- charityList should be an array of objects with "name" (charity organization name) and "amount" (donation amount) extracted from Schedule A charitable contributions section. Return empty array [] if no charities found.
- hasScheduleC should be true if you find any Schedule C pages (titled "Schedule C - Profit or Loss From Business") in the document
- vehicleExpenses should include car and truck expenses, mileage deductions, or vehicle depreciation from Schedule C
- Only return the JSON object, no other text`;
    }

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
        const parsed = JSON.parse(jsonMatch[0]);
        // Normalize to full ExtractedData structure
        extractedData = {
          agi: parsed.agi ?? null,
          businessIncome: parsed.businessIncome ?? null,
          charitableContributions: parsed.charitableContributions ?? null,
          totalItemizedDeductions: parsed.totalItemizedDeductions ?? null,
          taxYear: parsed.taxYear ?? null,
          naicsCode: parsed.naicsCode ?? null,
          grossReceipts: parsed.grossReceipts ?? null,
          netProfit: parsed.netProfit ?? null,
          occupation: parsed.occupation ?? null,
          wagesIncome: parsed.wagesIncome ?? null,
          stateCode: parsed.stateCode ?? null,
          fullAddress: parsed.fullAddress ?? null,
          charityList: parsed.charityList ?? [],
          // Schedule C detection
          hasScheduleC: parsed.hasScheduleC ?? false,
          vehicleExpenses: parsed.vehicleExpenses ?? null,
          // Corporate fields
          officerCompensation: parsed.officerCompensation ?? null,
          ordinaryBusinessIncome: parsed.ordinaryBusinessIncome ?? null,
          distributions: parsed.distributions ?? null,
          totalIncome: parsed.totalIncome ?? null,
          costOfGoodsSold: parsed.costOfGoodsSold ?? null,
          otherDeductions: parsed.otherDeductions ?? null,
        };
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
        netProfit: null,
        occupation: null,
        wagesIncome: null,
        stateCode: null,
        fullAddress: null,
        charityList: [],
        hasScheduleC: false,
        vehicleExpenses: null,
        officerCompensation: null,
        ordinaryBusinessIncome: null,
        distributions: null,
        totalIncome: null,
        costOfGoodsSold: null,
        otherDeductions: null,
      };
    }
    
    // Ensure charityList is always an array
    if (!extractedData.charityList || !Array.isArray(extractedData.charityList)) {
      extractedData.charityList = [];
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

    // ========== CORPORATE FORM RISK LOGIC ==========
    
    // S-Corp (1120-S) specific risk checks
    if (returnType === '1120-S') {
      console.log('Applying S-Corp (1120-S) risk logic...');
      
      // Risk Logic A: The Salary Trap - Unreasonable Compensation
      if (extractedData.ordinaryBusinessIncome !== null && extractedData.ordinaryBusinessIncome > 50000) {
        const officerComp = extractedData.officerCompensation ?? 0;
        const compRatio = officerComp / extractedData.ordinaryBusinessIncome;
        
        if (officerComp === 0) {
          flags.push({
            flag: 'Unreasonable Compensation Risk (IRS Priority)',
            severity: 'high',
            details: `S-Corp has Ordinary Business Income of $${extractedData.ordinaryBusinessIncome.toLocaleString()} but $0 Officer Compensation. This is a critical IRS audit trigger - shareholders cannot avoid payroll taxes by taking all income as distributions.`
          });
        } else if (compRatio < 0.10) {
          flags.push({
            flag: 'Unreasonable Compensation Risk (IRS Priority)',
            severity: 'high',
            details: `Officer Compensation ($${officerComp.toLocaleString()}) is less than 10% of Ordinary Business Income ($${extractedData.ordinaryBusinessIncome.toLocaleString()}). This is a critical IRS audit trigger for S-Corps attempting to minimize payroll taxes.`
          });
        }
      }
      
      // Risk Logic B: Operating Loss with High Gross Receipts
      if (extractedData.ordinaryBusinessIncome !== null && 
          extractedData.ordinaryBusinessIncome < 0 && 
          extractedData.grossReceipts !== null && 
          extractedData.grossReceipts > 100000) {
        flags.push({
          flag: 'Operating Loss Flag',
          severity: 'medium',
          details: `S-Corp shows a loss of $${Math.abs(extractedData.ordinaryBusinessIncome).toLocaleString()} despite Gross Receipts of $${extractedData.grossReceipts.toLocaleString()}. Large losses relative to revenue may attract IRS scrutiny.`
        });
      }
    }
    
    // C-Corp (1120) specific risk checks
    if (returnType === '1120') {
      console.log('Applying C-Corp (1120) risk logic...');
      
      // Risk Logic A: The "Other" Trap - High Other Deductions
      if (extractedData.totalIncome !== null && 
          extractedData.totalIncome > 0 && 
          extractedData.otherDeductions !== null) {
        const otherDeductionRatio = extractedData.otherDeductions / extractedData.totalIncome;
        
        if (otherDeductionRatio > 0.20) {
          flags.push({
            flag: 'High "Other" Deductions (Audit Magnet)',
            severity: 'high',
            details: `Other Deductions ($${extractedData.otherDeductions.toLocaleString()}) are ${(otherDeductionRatio * 100).toFixed(1)}% of Total Income - exceeding the 20% threshold. The IRS frequently scrutinizes vague "Other" categories for personal expenses disguised as business deductions.`
          });
        }
      }
      
      // Risk Logic B: Abnormally High COGS Ratio
      if (extractedData.grossReceipts !== null && 
          extractedData.grossReceipts > 0 && 
          extractedData.costOfGoodsSold !== null) {
        const cogsRatio = extractedData.costOfGoodsSold / extractedData.grossReceipts;
        
        if (cogsRatio > 0.75) {
          flags.push({
            flag: 'Abnormally High COGS',
            severity: 'medium',
            details: `Cost of Goods Sold ($${extractedData.costOfGoodsSold.toLocaleString()}) is ${(cogsRatio * 100).toFixed(1)}% of Gross Receipts - exceeding the 75% threshold. This may indicate inventory valuation issues or inflated costs.`
          });
        }
      }
    }

    // ========== SCHEDULE C (SELF-EMPLOYMENT) RISK LOGIC FOR 1040 ==========
    
    if (returnType === '1040' && extractedData.hasScheduleC) {
      console.log('Schedule C detected - applying business risk logic...');
      console.log('Business inputs:', { businessYearsActive, profitableYears, hasMileageLog });
      
      // Hobby Loss Rule - Critical IRS test (3 of 5 years must show profit)
      if (profitableYears !== undefined && profitableYears !== null) {
        if (profitableYears < 3) {
          const severity = profitableYears < 2 ? 'high' : 'medium';
          flags.push({
            flag: 'Hobby Loss Rule Risk',
            severity,
            details: `Business showed profit in only ${profitableYears} of the last 5 years. IRS requires profit in at least 3 of 5 years to presume business intent. This is a significant audit trigger that could reclassify your business as a hobby, disallowing all losses.`
          });
        }
      }
      
      // New business with losses - higher scrutiny for businesses under 3 years
      if (businessYearsActive !== undefined && businessYearsActive > 0 && businessYearsActive < 3) {
        if (extractedData.netProfit !== null && extractedData.netProfit < 0) {
          flags.push({
            flag: 'New Business With Losses',
            severity: 'medium',
            details: `Business is only ${businessYearsActive} year${businessYearsActive === 1 ? '' : 's'} old and showing a loss of $${Math.abs(extractedData.netProfit).toLocaleString()}. While startup losses are common, the IRS may scrutinize new businesses with consistent losses.`
          });
        }
      }
      
      // Vehicle expense documentation risk
      if (hasMileageLog === 'no' && extractedData.vehicleExpenses !== null && extractedData.vehicleExpenses > 0) {
        flags.push({
          flag: 'Vehicle Expense Documentation Risk',
          severity: 'high',
          details: `Vehicle expenses of $${extractedData.vehicleExpenses.toLocaleString()} claimed without a mileage log. IRS requires contemporaneous records for vehicle deductions. Without proper documentation, these deductions are almost always disallowed in an audit.`
        });
      } else if (hasMileageLog !== 'yes' && extractedData.vehicleExpenses !== null && extractedData.vehicleExpenses > 5000) {
        flags.push({
          flag: 'High Vehicle Expenses',
          severity: 'medium',
          details: `Vehicle expenses of $${extractedData.vehicleExpenses.toLocaleString()} may require substantiation with a detailed mileage log showing business vs. personal use.`
        });
      }
      
      // High gross receipts with loss - suspicious pattern
      if (extractedData.grossReceipts !== null && 
          extractedData.grossReceipts > 100000 && 
          extractedData.netProfit !== null && 
          extractedData.netProfit < 0) {
        flags.push({
          flag: 'High Revenue Business Loss',
          severity: 'medium',
          details: `Business has substantial gross receipts ($${extractedData.grossReceipts.toLocaleString()}) but reports a net loss. This pattern may attract IRS scrutiny for expense inflation.`
        });
      }
    }

    // ========== INDIVIDUAL (1040) RISK LOGIC ==========

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

    // NEW: Geographic Risk Check based on State
    let geoRisk = null;
    if (extractedData.stateCode) {
      console.log('Checking geographic risk for state:', extractedData.stateCode);
      
      // Fetch all geo risk factors to determine top 10%
      const { data: allGeoData, error: allGeoError } = await supabase
        .from('geo_risk_factors')
        .select('*')
        .order('audit_rate_per_1000', { ascending: false });
      
      if (!allGeoError && allGeoData && allGeoData.length > 0) {
        // Find the user's state
        const userStateData = allGeoData.find(
          (g: any) => g.state_code.toUpperCase() === extractedData.stateCode?.toUpperCase()
        );
        
        if (userStateData) {
          // Calculate top 10% threshold (top 5-6 states out of 51)
          const top10PercentIndex = Math.ceil(allGeoData.length * 0.1);
          const top10PercentThreshold = allGeoData[top10PercentIndex - 1]?.audit_rate_per_1000 || 0;
          
          const isHighRisk = Number(userStateData.audit_rate_per_1000) >= Number(top10PercentThreshold);
          
          geoRisk = {
            stateCode: userStateData.state_code,
            stateName: userStateData.state_name,
            auditRate: Number(userStateData.audit_rate_per_1000),
            isHighRisk
          };
          
          console.log('Geographic risk data:', geoRisk, 'Threshold:', top10PercentThreshold);
          
          if (isHighRisk) {
            flags.push({
              flag: 'Location High-Activity Zone',
              severity: 'medium',
              details: `You are located in ${userStateData.state_name}, which has an audit rate of ${userStateData.audit_rate_per_1000} per 1,000 returns - one of the highest in the nation. This geographic factor adds to your overall risk profile.`
            });
          }
        }
      }
    }

    // NEW: Income Reasonability Check based on Occupation
    let occupationMatch = null;
    if (extractedData.occupation && extractedData.wagesIncome !== null) {
      console.log('Step C2: Checking income reasonability for occupation:', extractedData.occupation);
      
      const occupationLower = extractedData.occupation.toLowerCase().trim();
      
      // Query occupation wages with fuzzy matching
      const { data: occupationData, error: occupationError } = await supabase
        .from('occupation_wages')
        .select('*');
      
      if (!occupationError && occupationData) {
        // Find best matching occupation using keyword matching
        let bestMatch = null;
        let bestScore = 0;
        
        for (const occ of occupationData) {
          const keyword = occ.job_title_keyword.toLowerCase();
          // Check if occupation contains the keyword or keyword contains occupation
          if (occupationLower.includes(keyword) || keyword.includes(occupationLower)) {
            // Score based on how close the match is
            const score = keyword === occupationLower ? 100 : 
                         occupationLower.includes(keyword) ? 80 :
                         keyword.includes(occupationLower) ? 60 : 0;
            if (score > bestScore) {
              bestScore = score;
              bestMatch = occ;
            }
          }
          // Also check individual words
          const occupationWords = occupationLower.split(/\s+/);
          const keywordWords = keyword.split(/\s+/);
          for (const word of occupationWords) {
            if (word.length > 3 && keywordWords.some((kw: string) => kw.includes(word) || word.includes(kw))) {
              if (bestScore < 50) {
                bestScore = 50;
                bestMatch = occ;
              }
            }
          }
        }
        
        if (bestMatch) {
          occupationMatch = {
            matchedOccupation: bestMatch.job_title_keyword,
            avgWage: bestMatch.avg_annual_wage,
            reportedIncome: extractedData.wagesIncome
          };
          console.log('Matched occupation:', occupationMatch);
          
          const threshold = bestMatch.avg_annual_wage * 0.30; // 30% of average
          
          if (extractedData.wagesIncome < threshold) {
            flags.push({
              flag: 'Income Mismatch for Occupation',
              severity: 'medium',
              details: `Reported W-2 income ($${extractedData.wagesIncome.toLocaleString()}) is less than 30% of the average wage for "${bestMatch.job_title_keyword}" ($${bestMatch.avg_annual_wage.toLocaleString()}). This may indicate underreported income or part-time employment not clearly documented.`
            });
          }
        } else {
          console.log('No occupation match found for:', extractedData.occupation);
        }
      }
    }

    // NEW: Lifestyle Mismatch Check (Property Data)
    console.log('Step C3: Checking lifestyle mismatch...');
    
    let lifestyleData: LifestyleData | null = null;
    const ESTATED_API_KEY = Deno.env.get('ESTATED_API_KEY');
    
    // Try to get property data from API if address is available and API key exists
    if (extractedData.fullAddress && ESTATED_API_KEY && ESTATED_API_KEY.length > 0) {
      try {
        console.log('Querying Estated API for address:', extractedData.fullAddress);
        
        // Parse address components - Estated API expects individual fields
        const addressParts = extractedData.fullAddress.split(',').map((s: string) => s.trim());
        let street = addressParts[0] || '';
        let city = addressParts[1] || '';
        let stateZip = addressParts[2] || '';
        
        // Extract state and zip from last part
        const stateZipMatch = stateZip.match(/([A-Z]{2})\s*(\d{5})?/);
        const state = stateZipMatch?.[1] || extractedData.stateCode || '';
        const zip = stateZipMatch?.[2] || '';
        
        const estatedUrl = new URL('https://apis.estated.com/v4/property');
        estatedUrl.searchParams.set('token', ESTATED_API_KEY);
        if (street) estatedUrl.searchParams.set('street_address', street);
        if (city) estatedUrl.searchParams.set('city', city);
        if (state) estatedUrl.searchParams.set('state', state);
        if (zip) estatedUrl.searchParams.set('zip_code', zip);
        
        const propertyResponse = await fetch(estatedUrl.toString());
        
        if (propertyResponse.ok) {
          const propertyData = await propertyResponse.json();
          console.log('Estated API response:', JSON.stringify(propertyData).slice(0, 500));
          
          if (propertyData.data) {
            const taxData = propertyData.data.taxes;
            const assessmentData = propertyData.data.assessments;
            const marketData = propertyData.data.market_assessments;
            
            const annualPropertyTax = taxData?.amount || null;
            const homeValue = marketData?.total_value || assessmentData?.total_value || propertyData.data.valuation?.value || null;
            
            if (annualPropertyTax || homeValue) {
              lifestyleData = {
                propertyTax: annualPropertyTax,
                homeValue: homeValue,
                source: 'api'
              };
              console.log('Property data from API:', lifestyleData);
            }
          }
        } else {
          console.log('Estated API error:', propertyResponse.status, await propertyResponse.text());
        }
      } catch (apiError) {
        console.error('Error fetching property data:', apiError);
      }
    }
    
    // Fallback: Use manual housing cost if provided and no API data
    if (!lifestyleData && manualHousingCost && manualHousingCost > 0) {
      // Convert monthly to annual
      const annualHousingCost = manualHousingCost * 12;
      lifestyleData = {
        propertyTax: annualHousingCost, // Use housing cost as proxy
        homeValue: null, // Cannot determine from rent/mortgage payment
        source: 'manual'
      };
      console.log('Using manual housing cost:', lifestyleData);
    }
    
    // Apply Lifestyle Mismatch rules
    if (lifestyleData && extractedData.agi && extractedData.agi > 0) {
      // Rule A: If Annual_Property_Tax > (AGI * 0.25) = Housing costs exceed 25% of gross income
      if (lifestyleData.propertyTax && lifestyleData.propertyTax > extractedData.agi * 0.25) {
        flags.push({
          flag: 'Housing Costs Exceed 25% of Gross Income',
          severity: 'high',
          details: `Annual housing costs ($${lifestyleData.propertyTax.toLocaleString()}) exceed 25% of your AGI ($${extractedData.agi.toLocaleString()}). This lifestyle/income mismatch is a common IRS audit trigger for potential unreported income.`
        });
      }
      
      // Rule B: If Home_Value > $1M AND AGI < $60k = High Asset / Low Income Discrepancy
      if (lifestyleData.homeValue && lifestyleData.homeValue > 1000000 && extractedData.agi < 60000) {
        flags.push({
          flag: 'High Asset / Low Income Discrepancy',
          severity: 'high',
          details: `Your home value ($${lifestyleData.homeValue.toLocaleString()}) exceeds $1M but your reported AGI ($${extractedData.agi.toLocaleString()}) is under $60K. This significant disparity often triggers IRS scrutiny for potential unreported income or asset-hiding.`
        });
      }
    }

    // NEW: Charity Validation against IRS Pub 78 database
    console.log('Step C4: Validating charitable donations...');
    
    const charityValidations: CharityValidation[] = [];
    
    if (extractedData.charityList && extractedData.charityList.length > 0) {
      // Fetch all valid charities for fuzzy matching
      const { data: validCharities, error: charityError } = await supabase
        .from('valid_charities')
        .select('organization_name, ein');
      
      if (!charityError && validCharities) {
        console.log(`Found ${validCharities.length} valid charities in database`);
        
        for (const donation of extractedData.charityList) {
          const donationName = donation.name?.toLowerCase().trim() || '';
          let bestMatch: { name: string; ein: string | null; score: number } | null = null;
          
          // Fuzzy matching logic
          for (const charity of validCharities) {
            const charityName = charity.organization_name.toLowerCase();
            
            // Exact match
            if (charityName === donationName) {
              bestMatch = { name: charity.organization_name, ein: charity.ein, score: 100 };
              break;
            }
            
            // Partial match - donation name contains charity name or vice versa
            if (donationName.includes(charityName) || charityName.includes(donationName)) {
              const score = 80;
              if (!bestMatch || score > bestMatch.score) {
                bestMatch = { name: charity.organization_name, ein: charity.ein, score };
              }
              continue;
            }
            
            // Word-based matching
            const donationWords = donationName.split(/\s+/).filter((w: string) => w.length > 2);
            const charityWords = charityName.split(/\s+/).filter((w: string) => w.length > 2);
            let matchedWords = 0;
            
            for (const dWord of donationWords) {
              if (charityWords.some((cWord: string) => cWord.includes(dWord) || dWord.includes(cWord))) {
                matchedWords++;
              }
            }
            
            if (matchedWords >= 2 || (matchedWords >= 1 && donationWords.length <= 2)) {
              const score = (matchedWords / Math.max(donationWords.length, charityWords.length)) * 70;
              if (!bestMatch || score > bestMatch.score) {
                bestMatch = { name: charity.organization_name, ein: charity.ein, score };
              }
            }
          }
          
          // Threshold for considering a match valid
          const isVerified = !!(bestMatch && bestMatch.score >= 50);
          
          charityValidations.push({
            name: donation.name,
            amount: donation.amount,
            verified: isVerified,
            matchedName: isVerified && bestMatch ? bestMatch.name : null,
            ein: isVerified && bestMatch ? bestMatch.ein : null
          });
          
          // Add risk flag for unverified charities
          if (!isVerified && donation.amount && donation.amount >= 250) {
            flags.push({
              flag: 'Unverified Charitable Donation',
              severity: 'medium',
              details: `We could not verify "${donation.name}" as a registered 501(c)(3) organization. Ensure this is a registered non-profit, not a personal gift. Donations over $250 to unverified organizations may be scrutinized.`
            });
          }
        }
        
        console.log('Charity validations:', charityValidations);
      }
    }

    // NEW: Neighborhood Outlier Check
    console.log('Step C5: Checking neighborhood income outlier...');
    
    let neighborhoodData: NeighborhoodData | null = null;
    
    if (extractedData.fullAddress && extractedData.agi && extractedData.agi > 0) {
      // Extract zip code from address
      const zipMatch = extractedData.fullAddress.match(/\b(\d{5})(?:-\d{4})?\b/);
      const zipCode = zipMatch?.[1] || null;
      
      if (zipCode) {
        console.log('Looking up zip code economics for:', zipCode);
        
        const { data: zipData, error: zipError } = await supabase
          .from('zip_code_economics')
          .select('median_household_income')
          .eq('zip_code', zipCode)
          .maybeSingle();
        
        if (!zipError && zipData) {
          const medianIncome = zipData.median_household_income;
          const incomeRatio = (extractedData.agi / medianIncome) * 100;
          const isOutlier = incomeRatio < 30; // AGI is less than 30% of zip median
          
          neighborhoodData = {
            zipCode,
            medianIncome,
            userAgi: extractedData.agi,
            incomeRatio: Math.round(incomeRatio),
            isOutlier
          };
          
          console.log('Neighborhood data:', neighborhoodData);
          
          // Rule: If AGI < 30% of median, flag as outlier
          // Note: Age check would require extracting age from return, which is not currently extracted
          if (isOutlier) {
            flags.push({
              flag: 'Statistical Low-Income Outlier',
              severity: 'medium',
              details: `Your reported income ($${extractedData.agi.toLocaleString()}) is only ${Math.round(incomeRatio)}% of the median household income ($${medianIncome.toLocaleString()}) for your ZIP code (${zipCode}). This can sometimes trigger an IRS 'economic reality' review.`
            });
          }
        } else {
          console.log('No zip code data found for:', zipCode);
        }
      }
    }

    // Step D: Calculate risk score
    console.log('Step D: Calculating risk score...');
    
    let riskScore = 0;
    
    // Add 10 points for geographic high-risk zone
    if (geoRisk?.isHighRisk) {
      riskScore += 10;
      console.log('Added 10 points for geographic high-risk zone');
    }
    
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
      } : null,
      geoRisk,
      lifestyleData,
      charityValidations,
      neighborhoodData
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
