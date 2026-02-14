/**
 * Step B: Enrich extracted data with benchmark lookups and external data.
 * Fetches IRS benchmarks, industry benchmarks, geographic risk, occupation data,
 * property/lifestyle data, charity validations, and neighborhood economics.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  ExtractedData,
  Benchmarks,
  IndustryBenchmark,
  GeoRisk,
  LifestyleData,
  CharityValidation,
  NeighborhoodData,
  EnrichmentResult,
} from "./types.ts";

/**
 * Fetch IRS benchmarks for the user's income bracket.
 */
async function fetchIRSBenchmarks(
  supabase: SupabaseClient,
  data: ExtractedData
): Promise<Benchmarks | null> {
  if (data.agi === null) return null;

  const taxYear = data.taxYear || new Date().getFullYear() - 1;

  const { data: benchmarkData, error } = await supabase
    .from("irs_benchmarks")
    .select("*")
    .eq("tax_year", taxYear)
    .lte("income_range_min", data.agi)
    .or(`income_range_max.gte.${data.agi},income_range_max.is.null`)
    .limit(1)
    .single();

  if (error || !benchmarkData) {
    console.log("No IRS benchmarks found for AGI:", data.agi);
    return null;
  }

  const benchmarks = {
    avgCharitableDeduction: Number(benchmarkData.avg_charitable_deduction),
    avgMortgageInterest: Number(benchmarkData.avg_mortgage_interest),
  };
  console.log("Found IRS benchmarks:", benchmarks);
  return benchmarks;
}

/**
 * Fetch industry benchmarks based on NAICS code.
 */
async function fetchIndustryBenchmarks(
  supabase: SupabaseClient,
  naicsCode: string | null
): Promise<IndustryBenchmark | null> {
  if (!naicsCode) return null;

  const { data: industryData, error } = await supabase
    .from("industry_benchmarks")
    .select("*")
    .eq("naics_code", naicsCode)
    .single();

  if (error || !industryData) {
    console.log("No industry benchmark found for NAICS:", naicsCode);
    return null;
  }

  const benchmark: IndustryBenchmark = {
    industryName: industryData.industry_name,
    avgProfitMargin: Number(industryData.avg_profit_margin),
    avgCogsPercentage: Number(industryData.avg_cogs_percentage),
    highRiskExpenseCategories: industryData.high_risk_expense_categories || [],
  };
  console.log("Found industry benchmark:", benchmark);
  return benchmark;
}

/**
 * Fetch geographic risk data based on state code.
 */
async function fetchGeoRisk(
  supabase: SupabaseClient,
  stateCode: string | null
): Promise<GeoRisk | null> {
  if (!stateCode) return null;

  const { data: allGeoData, error } = await supabase
    .from("geo_risk_factors")
    .select("*")
    .order("audit_rate_per_1000", { ascending: false });

  if (error || !allGeoData || allGeoData.length === 0) return null;

  const userStateData = allGeoData.find(
    (g: { state_code: string }) => g.state_code.toUpperCase() === stateCode.toUpperCase()
  );

  if (!userStateData) return null;

  const top10PercentIndex = Math.ceil(allGeoData.length * 0.1);
  const top10PercentThreshold = allGeoData[top10PercentIndex - 1]?.audit_rate_per_1000 || 0;
  const isHighRisk = Number(userStateData.audit_rate_per_1000) >= Number(top10PercentThreshold);

  const geoRisk: GeoRisk = {
    stateCode: userStateData.state_code,
    stateName: userStateData.state_name,
    auditRate: Number(userStateData.audit_rate_per_1000),
    isHighRisk,
  };
  console.log("Geographic risk data:", geoRisk);
  return geoRisk;
}

/**
 * Match the taxpayer's occupation and check income reasonability.
 */
async function matchOccupation(
  supabase: SupabaseClient,
  data: ExtractedData
): Promise<{ matchedOccupation: string; avgWage: number; reportedIncome: number } | null> {
  if (!data.occupation || data.wagesIncome === null) return null;

  const occupationLower = data.occupation.toLowerCase().trim();

  const { data: occupationData, error } = await supabase
    .from("occupation_wages")
    .select("*");

  if (error || !occupationData) return null;

  let bestMatch: { job_title_keyword: string; avg_annual_wage: number } | null = null;
  let bestScore = 0;

  for (const occ of occupationData) {
    const keyword = occ.job_title_keyword.toLowerCase();

    if (occupationLower.includes(keyword) || keyword.includes(occupationLower)) {
      const score = keyword === occupationLower ? 100 :
                   occupationLower.includes(keyword) ? 80 :
                   keyword.includes(occupationLower) ? 60 : 0;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = occ;
      }
    }

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

  if (!bestMatch) {
    console.log("No occupation match found for:", data.occupation);
    return null;
  }

  const result = {
    matchedOccupation: bestMatch.job_title_keyword,
    avgWage: bestMatch.avg_annual_wage,
    reportedIncome: data.wagesIncome,
  };
  console.log("Matched occupation:", result);
  return result;
}

/**
 * Fetch property/lifestyle data from Estated API or manual input.
 */
async function fetchLifestyleData(
  data: ExtractedData,
  manualHousingCost?: number
): Promise<LifestyleData | null> {
  const ESTATED_API_KEY = Deno.env.get("ESTATED_API_KEY");

  // Try API if address is available and API key exists
  if (data.fullAddress && ESTATED_API_KEY && ESTATED_API_KEY.length > 0) {
    try {
      console.log("Querying Estated API for address:", data.fullAddress);

      const addressParts = data.fullAddress.split(",").map((s: string) => s.trim());
      const street = addressParts[0] || "";
      const city = addressParts[1] || "";
      const stateZip = addressParts[2] || "";

      const stateZipMatch = stateZip.match(/([A-Z]{2})\s*(\d{5})?/);
      const state = stateZipMatch?.[1] || data.stateCode || "";
      const zip = stateZipMatch?.[2] || "";

      const estatedUrl = new URL("https://apis.estated.com/v4/property");
      estatedUrl.searchParams.set("token", ESTATED_API_KEY);
      if (street) estatedUrl.searchParams.set("street_address", street);
      if (city) estatedUrl.searchParams.set("city", city);
      if (state) estatedUrl.searchParams.set("state", state);
      if (zip) estatedUrl.searchParams.set("zip_code", zip);

      const propertyResponse = await fetch(estatedUrl.toString());

      if (propertyResponse.ok) {
        const propertyData = await propertyResponse.json();

        if (propertyData.data) {
          const taxData = propertyData.data.taxes;
          const assessmentData = propertyData.data.assessments;
          const marketData = propertyData.data.market_assessments;

          const annualPropertyTax = taxData?.amount || null;
          const homeValue = marketData?.total_value || assessmentData?.total_value || propertyData.data.valuation?.value || null;

          if (annualPropertyTax || homeValue) {
            const result: LifestyleData = {
              propertyTax: annualPropertyTax,
              homeValue: homeValue,
              source: "api",
            };
            console.log("Property data from API:", result);
            return result;
          }
        }
      } else {
        console.log("Estated API error:", propertyResponse.status);
      }
    } catch (apiError) {
      console.error("Error fetching property data:", apiError instanceof Error ? apiError.message : "API error");
    }
  }

  // Fallback: Use manual housing cost if provided
  if (manualHousingCost && manualHousingCost > 0) {
    const annualHousingCost = manualHousingCost * 12;
    const result: LifestyleData = {
      propertyTax: annualHousingCost,
      homeValue: null,
      source: "manual",
    };
    console.log("Using manual housing cost:", result);
    return result;
  }

  return null;
}

/**
 * Validate charitable donations against the IRS Pub 78 database.
 */
async function validateCharities(
  supabase: SupabaseClient,
  charityList: { name: string; amount: number | null }[]
): Promise<CharityValidation[]> {
  if (!charityList || charityList.length === 0) return [];

  const { data: validCharities, error } = await supabase
    .from("valid_charities")
    .select("organization_name, ein");

  if (error || !validCharities) return [];

  console.log(`Found ${validCharities.length} valid charities in database`);

  const validations: CharityValidation[] = [];

  for (const donation of charityList) {
    const donationName = donation.name?.toLowerCase().trim() || "";
    let bestMatch: { name: string; ein: string | null; score: number } | null = null;

    for (const charity of validCharities) {
      const charityName = charity.organization_name.toLowerCase();

      if (charityName === donationName) {
        bestMatch = { name: charity.organization_name, ein: charity.ein, score: 100 };
        break;
      }

      if (donationName.includes(charityName) || charityName.includes(donationName)) {
        const score = 80;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { name: charity.organization_name, ein: charity.ein, score };
        }
        continue;
      }

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

    const isVerified = !!(bestMatch && bestMatch.score >= 50);

    validations.push({
      name: donation.name,
      amount: donation.amount,
      verified: isVerified,
      matchedName: isVerified && bestMatch ? bestMatch.name : null,
      ein: isVerified && bestMatch ? bestMatch.ein : null,
    });
  }

  console.log("Charity validations:", validations);
  return validations;
}

/**
 * Fetch neighborhood income data for outlier detection.
 */
async function fetchNeighborhoodData(
  supabase: SupabaseClient,
  data: ExtractedData
): Promise<NeighborhoodData | null> {
  if (!data.fullAddress || !data.agi || data.agi <= 0) return null;

  const zipMatch = data.fullAddress.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zipCode = zipMatch?.[1] || null;
  if (!zipCode) return null;

  console.log("Looking up zip code economics for:", zipCode);

  const { data: zipData, error } = await supabase
    .from("zip_code_economics")
    .select("median_household_income")
    .eq("zip_code", zipCode)
    .maybeSingle();

  if (error || !zipData) {
    console.log("No zip code data found for:", zipCode);
    return null;
  }

  const medianIncome = zipData.median_household_income;
  const incomeRatio = (data.agi / medianIncome) * 100;
  const isOutlier = incomeRatio < 30;

  const result: NeighborhoodData = {
    zipCode,
    medianIncome,
    userAgi: data.agi,
    incomeRatio: Math.round(incomeRatio),
    isOutlier,
  };
  console.log("Neighborhood data:", result);
  return result;
}

/**
 * Run all enrichment steps in parallel where possible.
 */
export async function enrichExtractedData(
  supabase: SupabaseClient,
  data: ExtractedData,
  manualHousingCost?: number
): Promise<EnrichmentResult> {
  console.log("Step B: Running enrichment lookups...");

  // Run independent lookups in parallel
  const [
    benchmarks,
    industryBenchmark,
    geoRisk,
    occupationMatch,
    lifestyleData,
    charityValidations,
    neighborhoodData,
  ] = await Promise.all([
    fetchIRSBenchmarks(supabase, data),
    fetchIndustryBenchmarks(supabase, data.naicsCode),
    fetchGeoRisk(supabase, data.stateCode),
    matchOccupation(supabase, data),
    fetchLifestyleData(data, manualHousingCost),
    validateCharities(supabase, data.charityList),
    fetchNeighborhoodData(supabase, data),
  ]);

  return {
    benchmarks,
    industryBenchmark,
    geoRisk,
    lifestyleData,
    charityValidations,
    neighborhoodData,
    occupationMatch,
  };
}
