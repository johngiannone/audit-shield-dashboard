import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleCData {
  // Core financial data
  grossReceipts: number | null; // Line 1
  totalExpenses: number | null; // Line 28
  netProfitLoss: number | null; // Line 31
  
  // Key expense categories
  carTruckExpenses: number | null; // Line 9
  travelExpenses: number | null; // Line 24a
  mealsExpenses: number | null; // Line 24b
  otherExpenses: number | null; // Line 27a total
  otherExpensesList: { description: string; amount: number }[]; // Line 27a detail
  
  // Additional Schedule C data
  businessName: string | null;
  businessActivity: string | null;
  naicsCode: string | null;
  
  // All expense lines for round number analysis
  allExpenseAmounts: number[];
}

interface BusinessRiskFlag {
  flag: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  details: string;
  irsReference?: string;
}

interface ScheduleCAnalysis {
  businessRiskScore: number;
  flags: BusinessRiskFlag[];
  extractedData: ScheduleCData;
  summary: {
    profitMargin: number | null;
    expenseToRevenueRatio: number | null;
    travelMealsRatio: number | null;
    otherExpensesRatio: number | null;
    roundNumberPercentage: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, yearsProfitable, hasMileageLog, businessYearsActive } = await req.json();

    if (!pdfBase64) {
      throw new Error('PDF data is required');
    }

    console.log('Analyzing Schedule C...');
    console.log('User inputs:', { yearsProfitable, hasMileageLog, businessYearsActive });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Step 1: Extract Schedule C data using AI
    console.log('Step 1: Extracting Schedule C data...');
    
    const extractionPrompt = `Analyze this Schedule C (Profit or Loss From Business) tax form PDF and extract the following information. Return ONLY a JSON object with these exact fields:

{
  "grossReceipts": <number or null>, // Line 1 - Gross receipts or sales
  "totalExpenses": <number or null>, // Line 28 - Total expenses before net profit
  "netProfitLoss": <number or null>, // Line 31 - Net profit or loss (can be negative)
  
  "carTruckExpenses": <number or null>, // Line 9 - Car and truck expenses
  "travelExpenses": <number or null>, // Line 24a - Travel expenses
  "mealsExpenses": <number or null>, // Line 24b - Deductible meals
  "otherExpenses": <number or null>, // Line 27a - Other expenses total
  
  "otherExpensesList": [
    {"description": <string>, "amount": <number>}
  ], // Detailed breakdown of Line 27a "Other expenses" with each item's description and amount
  
  "businessName": <string or null>, // Business name from top of form
  "businessActivity": <string or null>, // Principal business or profession (Line A)
  "naicsCode": <string or null>, // Business code from Line B (6-digit)
  
  "allExpenseAmounts": [<numbers>] // Array of ALL non-zero expense amounts from Lines 8-27 for round number analysis
}

Important:
- Extract exact dollar amounts as numbers (no $ signs or commas)
- Net profit/loss can be negative (a loss)
- For otherExpensesList, extract each individual item listed under Line 27a "Other expenses"
- For allExpenseAmounts, include every expense line that has a value (Lines 8 through 27)
- If a field is not present or cannot be found, use null
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
              { type: 'text', text: extractionPrompt },
              {
                type: 'image_url',
                image_url: { url: `data:application/pdf;base64,${pdfBase64}` }
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

    // Parse extracted data
    let extractedData: ScheduleCData;
    try {
      const jsonMatch = extractionContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        extractedData = {
          grossReceipts: parsed.grossReceipts ?? null,
          totalExpenses: parsed.totalExpenses ?? null,
          netProfitLoss: parsed.netProfitLoss ?? null,
          carTruckExpenses: parsed.carTruckExpenses ?? null,
          travelExpenses: parsed.travelExpenses ?? null,
          mealsExpenses: parsed.mealsExpenses ?? null,
          otherExpenses: parsed.otherExpenses ?? null,
          otherExpensesList: parsed.otherExpensesList ?? [],
          businessName: parsed.businessName ?? null,
          businessActivity: parsed.businessActivity ?? null,
          naicsCode: parsed.naicsCode ?? null,
          allExpenseAmounts: parsed.allExpenseAmounts ?? [],
        };
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse extraction:', parseError);
      extractedData = {
        grossReceipts: null,
        totalExpenses: null,
        netProfitLoss: null,
        carTruckExpenses: null,
        travelExpenses: null,
        mealsExpenses: null,
        otherExpenses: null,
        otherExpensesList: [],
        businessName: null,
        businessActivity: null,
        naicsCode: null,
        allExpenseAmounts: [],
      };
    }

    console.log('Extracted Schedule C data:', extractedData);

    // Step 2: Apply Business Risk Logic
    console.log('Step 2: Analyzing business risk factors...');
    
    const flags: BusinessRiskFlag[] = [];
    let riskScore = 0;

    // ========== RISK CHECK 1: The Hobby Rule (Sec. 183) ==========
    if (extractedData.netProfitLoss !== null && extractedData.netProfitLoss < 0) {
      const yearsProfit = yearsProfitable ?? 0;
      
      if (yearsProfit < 3) {
        flags.push({
          flag: 'Hobby Loss Risk (Sec. 183)',
          severity: 'critical',
          details: `Net loss of $${Math.abs(extractedData.netProfitLoss).toLocaleString()} with only ${yearsProfit} profitable year${yearsProfit === 1 ? '' : 's'} out of the last 5. IRS requires profit in 3 of 5 years to presume business intent. All losses may be disallowed if classified as a hobby.`,
          irsReference: 'IRC Section 183 - Activities Not Engaged in for Profit'
        });
        riskScore += 35;
      }
    }

    // ========== RISK CHECK 2: The 'Round Number' Effect ==========
    const expenseAmounts = extractedData.allExpenseAmounts.filter(amt => amt > 0);
    if (expenseAmounts.length > 0) {
      const roundNumbers = expenseAmounts.filter(amt => 
        amt % 100 === 0 || amt % 1000 === 0
      );
      const roundNumberPercentage = (roundNumbers.length / expenseAmounts.length) * 100;
      
      if (roundNumberPercentage > 40) {
        flags.push({
          flag: 'Estimated Expenses Detected (Lack of Records)',
          severity: 'high',
          details: `${roundNumberPercentage.toFixed(0)}% of expense entries are round numbers (ending in 00 or 000). This pattern suggests estimated rather than actual expenses, indicating potential lack of substantiating records. IRS auditors are trained to identify this pattern.`,
          irsReference: 'IRM 4.10.3.2 - Audit Techniques for Schedule C'
        });
        riskScore += 25;
      } else if (roundNumberPercentage > 25) {
        flags.push({
          flag: 'Multiple Round Number Expenses',
          severity: 'medium',
          details: `${roundNumberPercentage.toFixed(0)}% of expense entries are round numbers. Consider maintaining more detailed records with exact amounts.`
        });
        riskScore += 10;
      }
    }

    // ========== RISK CHECK 3: High 'Other' Expenses ==========
    if (extractedData.grossReceipts !== null && 
        extractedData.grossReceipts > 0 && 
        extractedData.otherExpenses !== null) {
      const otherRatio = extractedData.otherExpenses / extractedData.grossReceipts;
      
      if (otherRatio > 0.10) {
        const topOtherItems = extractedData.otherExpensesList
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3)
          .map(item => `${item.description}: $${item.amount.toLocaleString()}`)
          .join(', ');
        
        flags.push({
          flag: 'High Miscellaneous Expenses',
          severity: 'high',
          details: `"Other Expenses" ($${extractedData.otherExpenses.toLocaleString()}) represent ${(otherRatio * 100).toFixed(1)}% of Gross Receipts - exceeding the 10% threshold. IRS frequently scrutinizes vague "Other" categories.${topOtherItems ? ` Top items: ${topOtherItems}` : ''}`,
          irsReference: 'IRS Audit Technique Guide - Schedule C'
        });
        riskScore += 20;
      }
    }

    // ========== RISK CHECK 4: Travel/Meals Ratio ==========
    if (extractedData.grossReceipts !== null && extractedData.grossReceipts > 0) {
      const travelAmount = extractedData.travelExpenses ?? 0;
      const mealsAmount = extractedData.mealsExpenses ?? 0;
      const travelMealsTotal = travelAmount + mealsAmount;
      const travelMealsRatio = travelMealsTotal / extractedData.grossReceipts;
      
      if (travelMealsRatio > 0.20) {
        flags.push({
          flag: 'Excessive Travel/Entertainment',
          severity: 'high',
          details: `Travel ($${travelAmount.toLocaleString()}) + Meals ($${mealsAmount.toLocaleString()}) = $${travelMealsTotal.toLocaleString()} represents ${(travelMealsRatio * 100).toFixed(1)}% of Gross Receipts. This exceeds the 20% threshold and is a significant audit trigger. IRS closely examines travel and meals for personal use.`,
          irsReference: 'IRC Section 274 - Disallowance of Entertainment Expenses'
        });
        riskScore += 20;
      } else if (travelMealsRatio > 0.15) {
        flags.push({
          flag: 'Elevated Travel/Meals Expenses',
          severity: 'medium',
          details: `Travel and meals represent ${(travelMealsRatio * 100).toFixed(1)}% of Gross Receipts. While below the high-risk threshold, ensure you have detailed records documenting business purpose.`
        });
        riskScore += 8;
      }
    }

    // ========== RISK CHECK 5: Car/Truck Expenses Without Mileage Log ==========
    if (extractedData.carTruckExpenses !== null && extractedData.carTruckExpenses > 0) {
      if (hasMileageLog === 'no') {
        flags.push({
          flag: 'Vehicle Deduction Without Required Records',
          severity: 'critical',
          details: `Car/truck expenses of $${extractedData.carTruckExpenses.toLocaleString()} claimed without a mileage log. IRS requires contemporaneous written records for vehicle deductions. Without proper documentation, these deductions are almost always disallowed.`,
          irsReference: 'Treas. Reg. 1.274-5T - Substantiation Requirements'
        });
        riskScore += 25;
      } else if (hasMileageLog !== 'yes' && extractedData.carTruckExpenses > 10000) {
        flags.push({
          flag: 'High Vehicle Expenses',
          severity: 'medium',
          details: `Vehicle expenses of $${extractedData.carTruckExpenses.toLocaleString()} should be supported by a detailed mileage log showing business vs. personal use.`
        });
        riskScore += 10;
      }
    }

    // ========== RISK CHECK 6: High Expense-to-Revenue Ratio ==========
    if (extractedData.grossReceipts !== null && 
        extractedData.grossReceipts > 0 && 
        extractedData.totalExpenses !== null) {
      const expenseRatio = extractedData.totalExpenses / extractedData.grossReceipts;
      
      if (expenseRatio > 0.95) {
        flags.push({
          flag: 'Very High Expense Ratio',
          severity: 'high',
          details: `Total expenses represent ${(expenseRatio * 100).toFixed(1)}% of gross receipts, leaving almost no profit margin. This pattern may indicate expense inflation or business viability concerns.`
        });
        riskScore += 15;
      }
    }

    // Calculate summary metrics
    const roundNumberPercentage = expenseAmounts.length > 0 
      ? (expenseAmounts.filter(amt => amt % 100 === 0 || amt % 1000 === 0).length / expenseAmounts.length) * 100 
      : 0;

    const summary = {
      profitMargin: extractedData.grossReceipts && extractedData.netProfitLoss !== null
        ? (extractedData.netProfitLoss / extractedData.grossReceipts) * 100
        : null,
      expenseToRevenueRatio: extractedData.grossReceipts && extractedData.totalExpenses
        ? (extractedData.totalExpenses / extractedData.grossReceipts) * 100
        : null,
      travelMealsRatio: extractedData.grossReceipts
        ? (((extractedData.travelExpenses ?? 0) + (extractedData.mealsExpenses ?? 0)) / extractedData.grossReceipts) * 100
        : null,
      otherExpensesRatio: extractedData.grossReceipts && extractedData.otherExpenses
        ? (extractedData.otherExpenses / extractedData.grossReceipts) * 100
        : null,
      roundNumberPercentage,
    };

    // Cap risk score at 100
    riskScore = Math.min(100, riskScore);

    const analysis: ScheduleCAnalysis = {
      businessRiskScore: riskScore,
      flags,
      extractedData,
      summary,
    };

    console.log('Analysis complete. Business Risk Score:', riskScore);
    console.log('Flags:', flags.length);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-schedule-c:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Analysis failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
