/**
 * Step A: Extract structured data from tax return PDFs using AI.
 * Handles Form 1040, 1120-S, and 1120 with form-specific prompts.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, parseJSONFromAIResponse } from "../_shared/ai.ts";
import type { ExtractedData } from "./types.ts";

const EMPTY_EXTRACTED_DATA: ExtractedData = {
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

/**
 * Download a file from Supabase storage and convert to base64.
 */
export async function downloadAndConvert(
  supabase: SupabaseClient,
  filePath: string
): Promise<string> {
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("temp-audit-files")
    .download(filePath);

  if (downloadError || !fileData) {
    console.error("Download error:", downloadError?.message || "Unknown download error");
    throw new Error("File not found or access denied");
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Use chunked conversion to avoid "Maximum call stack size exceeded" error
  let binaryString = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binaryString += String.fromCharCode.apply(null, Array.from(chunk));
  }

  console.log("File downloaded and converted to base64, size:", uint8Array.length);
  return btoa(binaryString);
}

/**
 * Build the form-specific extraction prompt.
 */
function getExtractionPrompt(returnType: string): string {
  if (returnType === "1120-S") {
    return `Analyze this Form 1120-S (S Corporation) tax return PDF and extract the following information. Return ONLY a JSON object with these exact fields:

{
  "grossReceipts": <number or null>,
  "officerCompensation": <number or null>,
  "ordinaryBusinessIncome": <number or null>,
  "distributions": <number or null>,
  "taxYear": <number or null>,
  "stateCode": <string or null>,
  "fullAddress": <string or null>
}

Important:
- Extract exact dollar amounts as numbers (no $ signs or commas)
- If a field is not present or cannot be found, use null
- Ordinary Business Income can be negative (a loss)
- Only return the JSON object, no other text`;
  }

  if (returnType === "1120") {
    return `Analyze this Form 1120 (C Corporation) tax return PDF and extract the following information. Return ONLY a JSON object with these exact fields:

{
  "grossReceipts": <number or null>,
  "costOfGoodsSold": <number or null>,
  "totalIncome": <number or null>,
  "officerCompensation": <number or null>,
  "otherDeductions": <number or null>,
  "taxYear": <number or null>,
  "stateCode": <string or null>,
  "fullAddress": <string or null>
}

Important:
- Extract exact dollar amounts as numbers (no $ signs or commas)
- If a field is not present or cannot be found, use null
- Only return the JSON object, no other text`;
  }

  // Default: Form 1040
  return `Analyze this Form 1040 tax return PDF and extract the following information. Return ONLY a JSON object with these exact fields:

{
  "agi": <number or null>,
  "businessIncome": <number or null>,
  "charitableContributions": <number or null>,
  "totalItemizedDeductions": <number or null>,
  "taxYear": <number or null>,
  "naicsCode": <string or null>,
  "grossReceipts": <number or null>,
  "netProfit": <number or null>,
  "occupation": <string or null>,
  "wagesIncome": <number or null>,
  "stateCode": <string or null>,
  "fullAddress": <string or null>,
  "charityList": [{"name": <string>, "amount": <number or null>}, ...],
  "hasScheduleC": <boolean>,
  "vehicleExpenses": <number or null>
}

Important:
- Extract exact dollar amounts as numbers (no $ signs or commas)
- If a field is not present or cannot be found, use null
- Business income and net profit can be negative (a loss)
- NAICS code should be a 6-digit string if found
- Occupation should be the text from the occupation field near signature
- stateCode should be the 2-letter US state abbreviation from the address at the top of the form
- fullAddress should be the complete address including street, city, state and zip if visible
- charityList should be an array of objects with "name" and "amount" from Schedule A. Return empty array [] if no charities found.
- hasScheduleC should be true if you find any Schedule C pages in the document
- vehicleExpenses should include car and truck expenses, mileage deductions, or vehicle depreciation from Schedule C
- Only return the JSON object, no other text`;
}

/**
 * Extract structured data from a tax return PDF using AI.
 */
export async function extractDataFromPDF(
  pdfBase64: string,
  returnType: string
): Promise<ExtractedData> {
  const extractionPrompt = getExtractionPrompt(returnType);

  const aiResponse = await callAI({
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: extractionPrompt },
          {
            type: "image_url",
            image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
          },
        ],
      },
    ],
    timeoutMs: 45000,
  });

  if (!aiResponse.content) {
    throw new Error("No content in AI extraction response");
  }

  console.log("AI extraction response received");

  try {
    const parsed = parseJSONFromAIResponse(aiResponse.content) as Record<string, unknown>;

    const extractedData: ExtractedData = {
      agi: (parsed.agi as number) ?? null,
      businessIncome: (parsed.businessIncome as number) ?? null,
      charitableContributions: (parsed.charitableContributions as number) ?? null,
      totalItemizedDeductions: (parsed.totalItemizedDeductions as number) ?? null,
      taxYear: (parsed.taxYear as number) ?? null,
      naicsCode: (parsed.naicsCode as string) ?? null,
      grossReceipts: (parsed.grossReceipts as number) ?? null,
      netProfit: (parsed.netProfit as number) ?? null,
      occupation: (parsed.occupation as string) ?? null,
      wagesIncome: (parsed.wagesIncome as number) ?? null,
      stateCode: (parsed.stateCode as string) ?? null,
      fullAddress: (parsed.fullAddress as string) ?? null,
      charityList: Array.isArray(parsed.charityList) ? parsed.charityList as { name: string; amount: number | null }[] : [],
      hasScheduleC: (parsed.hasScheduleC as boolean) ?? false,
      vehicleExpenses: (parsed.vehicleExpenses as number) ?? null,
      officerCompensation: (parsed.officerCompensation as number) ?? null,
      ordinaryBusinessIncome: (parsed.ordinaryBusinessIncome as number) ?? null,
      distributions: (parsed.distributions as number) ?? null,
      totalIncome: (parsed.totalIncome as number) ?? null,
      costOfGoodsSold: (parsed.costOfGoodsSold as number) ?? null,
      otherDeductions: (parsed.otherDeductions as number) ?? null,
    };

    // Ensure charityList is always an array
    if (!extractedData.charityList || !Array.isArray(extractedData.charityList)) {
      extractedData.charityList = [];
    }

    console.log("Extracted data:", extractedData);
    return extractedData;
  } catch (parseError) {
    console.error("Failed to parse extraction:", parseError instanceof Error ? parseError.message : "Parse error");
    return { ...EMPTY_EXTRACTED_DATA };
  }
}

/**
 * Clean up the temporary file from storage after analysis.
 */
export async function cleanupTempFile(
  supabase: SupabaseClient,
  filePath: string
): Promise<void> {
  console.log("Cleaning up temporary file...");
  const { error: deleteError } = await supabase.storage
    .from("temp-audit-files")
    .remove([filePath]);

  if (deleteError) {
    console.warn("Failed to delete temp file (non-critical):", deleteError?.message || "Unknown delete error");
  } else {
    console.log("Temporary file deleted successfully");
  }
}
