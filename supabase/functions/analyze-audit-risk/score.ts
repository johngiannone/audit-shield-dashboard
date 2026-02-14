/**
 * Step C & D: Evaluate risk flags and calculate the overall risk score.
 * Contains all the IRS audit risk rules for 1040, 1120-S, and 1120 forms.
 */

import type {
  ExtractedData,
  RiskFlag,
  Benchmarks,
  IndustryBenchmark,
  GeoRisk,
  LifestyleData,
  CharityValidation,
  NeighborhoodData,
  EnrichmentResult,
  AnalysisInput,
} from "./types.ts";

// ============================================================
// CORPORATE FORM RISK RULES
// ============================================================

function evaluateSCorpRisks(data: ExtractedData, flags: RiskFlag[]): void {
  // Unreasonable Compensation
  if (data.ordinaryBusinessIncome !== null && data.ordinaryBusinessIncome > 50000) {
    const officerComp = data.officerCompensation ?? 0;
    const compRatio = officerComp / data.ordinaryBusinessIncome;

    if (officerComp === 0) {
      flags.push({
        flag: "Unreasonable Compensation Risk (IRS Priority)",
        severity: "high",
        details: `S-Corp has Ordinary Business Income of $${data.ordinaryBusinessIncome.toLocaleString()} but $0 Officer Compensation. This is a critical IRS audit trigger - shareholders cannot avoid payroll taxes by taking all income as distributions.`,
      });
    } else if (compRatio < 0.10) {
      flags.push({
        flag: "Unreasonable Compensation Risk (IRS Priority)",
        severity: "high",
        details: `Officer Compensation ($${officerComp.toLocaleString()}) is less than 10% of Ordinary Business Income ($${data.ordinaryBusinessIncome.toLocaleString()}). This is a critical IRS audit trigger for S-Corps attempting to minimize payroll taxes.`,
      });
    }
  }

  // Operating Loss with High Gross Receipts
  if (
    data.ordinaryBusinessIncome !== null &&
    data.ordinaryBusinessIncome < 0 &&
    data.grossReceipts !== null &&
    data.grossReceipts > 100000
  ) {
    flags.push({
      flag: "Operating Loss Flag",
      severity: "medium",
      details: `S-Corp shows a loss of $${Math.abs(data.ordinaryBusinessIncome).toLocaleString()} despite Gross Receipts of $${data.grossReceipts.toLocaleString()}. Large losses relative to revenue may attract IRS scrutiny.`,
    });
  }
}

function evaluateCCorpRisks(data: ExtractedData, flags: RiskFlag[]): void {
  // High Other Deductions
  if (
    data.totalIncome !== null &&
    data.totalIncome > 0 &&
    data.otherDeductions !== null
  ) {
    const otherDeductionRatio = data.otherDeductions / data.totalIncome;
    if (otherDeductionRatio > 0.20) {
      flags.push({
        flag: 'High "Other" Deductions (Audit Magnet)',
        severity: "high",
        details: `Other Deductions ($${data.otherDeductions.toLocaleString()}) are ${(otherDeductionRatio * 100).toFixed(1)}% of Total Income - exceeding the 20% threshold. The IRS frequently scrutinizes vague "Other" categories for personal expenses disguised as business deductions.`,
      });
    }
  }

  // Abnormally High COGS Ratio
  if (
    data.grossReceipts !== null &&
    data.grossReceipts > 0 &&
    data.costOfGoodsSold !== null
  ) {
    const cogsRatio = data.costOfGoodsSold / data.grossReceipts;
    if (cogsRatio > 0.75) {
      flags.push({
        flag: "Abnormally High COGS",
        severity: "medium",
        details: `Cost of Goods Sold ($${data.costOfGoodsSold.toLocaleString()}) is ${(cogsRatio * 100).toFixed(1)}% of Gross Receipts - exceeding the 75% threshold. This may indicate inventory valuation issues or inflated costs.`,
      });
    }
  }
}

// ============================================================
// SCHEDULE C (SELF-EMPLOYMENT) RISK RULES
// ============================================================

function evaluateScheduleCRisks(
  data: ExtractedData,
  input: AnalysisInput,
  flags: RiskFlag[]
): void {
  if (!data.hasScheduleC) return;

  console.log("Schedule C detected - applying business risk logic...");

  // Hobby Loss Rule
  if (input.profitableYears !== undefined && input.profitableYears !== null) {
    if (input.profitableYears < 3) {
      const severity = input.profitableYears < 2 ? "high" : "medium";
      flags.push({
        flag: "Hobby Loss Rule Risk",
        severity,
        details: `Business showed profit in only ${input.profitableYears} of the last 5 years. IRS requires profit in at least 3 of 5 years to presume business intent. This is a significant audit trigger that could reclassify your business as a hobby, disallowing all losses.`,
      });
    }
  }

  // New business with losses
  if (
    input.businessYearsActive !== undefined &&
    input.businessYearsActive > 0 &&
    input.businessYearsActive < 3
  ) {
    if (data.netProfit !== null && data.netProfit < 0) {
      flags.push({
        flag: "New Business With Losses",
        severity: "medium",
        details: `Business is only ${input.businessYearsActive} year${input.businessYearsActive === 1 ? "" : "s"} old and showing a loss of $${Math.abs(data.netProfit).toLocaleString()}. While startup losses are common, the IRS may scrutinize new businesses with consistent losses.`,
      });
    }
  }

  // Vehicle expense documentation risk
  if (input.hasMileageLog === "no" && data.vehicleExpenses !== null && data.vehicleExpenses > 0) {
    flags.push({
      flag: "Vehicle Expense Documentation Risk",
      severity: "high",
      details: `Vehicle expenses of $${data.vehicleExpenses.toLocaleString()} claimed without a mileage log. IRS requires contemporaneous records for vehicle deductions. Without proper documentation, these deductions are almost always disallowed in an audit.`,
    });
  } else if (
    input.hasMileageLog !== "yes" &&
    data.vehicleExpenses !== null &&
    data.vehicleExpenses > 5000
  ) {
    flags.push({
      flag: "High Vehicle Expenses",
      severity: "medium",
      details: `Vehicle expenses of $${data.vehicleExpenses.toLocaleString()} may require substantiation with a detailed mileage log showing business vs. personal use.`,
    });
  }

  // High gross receipts with loss
  if (
    data.grossReceipts !== null &&
    data.grossReceipts > 100000 &&
    data.netProfit !== null &&
    data.netProfit < 0
  ) {
    flags.push({
      flag: "High Revenue Business Loss",
      severity: "medium",
      details: `Business has substantial gross receipts ($${data.grossReceipts.toLocaleString()}) but reports a net loss. This pattern may attract IRS scrutiny for expense inflation.`,
    });
  }
}

// ============================================================
// INDIVIDUAL (1040) RISK RULES
// ============================================================

function evaluateIndividualRisks(
  data: ExtractedData,
  enrichment: EnrichmentResult,
  input: AnalysisInput,
  flags: RiskFlag[]
): void {
  // High Charity/Income Ratio
  if (data.agi !== null && data.charitableContributions !== null) {
    const charityRatio = data.charitableContributions / data.agi;
    if (charityRatio > 0.15) {
      flags.push({
        flag: "High Charity/Income Ratio",
        severity: "high",
        details: `Charitable contributions (${(charityRatio * 100).toFixed(1)}% of AGI) exceed 15% threshold. IRS may scrutinize.`,
      });
    } else if (enrichment.benchmarks?.avgCharitableDeduction != null && charityRatio > enrichment.benchmarks.avgCharitableDeduction * 2) {
      flags.push({
        flag: "Above Average Charitable Deductions",
        severity: "medium",
        details: `Charitable contributions are more than double the average for your income bracket.`,
      });
    }
  }

  // Hobby Loss Risk
  if (data.businessIncome !== null && data.businessIncome < 0) {
    const yearsWithLosses = input.priorYearLosses ? input.priorYearLosses + 1 : 1;
    if (yearsWithLosses >= 3) {
      flags.push({
        flag: "Hobby Loss Risk",
        severity: "high",
        details: `Business losses for ${yearsWithLosses} consecutive years may trigger IRS hobby loss rules (3 of 5 year test).`,
      });
    } else if (data.businessIncome < -10000) {
      flags.push({
        flag: "Significant Business Loss",
        severity: "medium",
        details: `Large business loss of $${Math.abs(data.businessIncome).toLocaleString()} may attract IRS attention.`,
      });
    }
  }

  // Round Number Anomaly
  const checkRoundNumber = (value: number | null, fieldName: string) => {
    if (value !== null && value >= 1000 && value % 1000 === 0) {
      flags.push({
        flag: "Round Number Anomaly",
        severity: "medium",
        details: `${fieldName} ($${value.toLocaleString()}) is a round number, which may indicate estimation rather than actual figures.`,
      });
    }
  };

  checkRoundNumber(data.charitableContributions, "Charitable Contributions");
  checkRoundNumber(data.totalItemizedDeductions, "Total Itemized Deductions");
  checkRoundNumber(data.businessIncome, "Business Income");

  // High Itemized Deductions
  if (data.agi !== null && enrichment.benchmarks && data.totalItemizedDeductions !== null) {
    const expectedMax = data.agi * 0.30;
    if (data.totalItemizedDeductions > expectedMax) {
      flags.push({
        flag: "High Itemized Deductions",
        severity: "medium",
        details: `Total itemized deductions exceed 30% of AGI, which is above typical ranges.`,
      });
    }
  }
}

// ============================================================
// CROSS-FORM ENRICHMENT-BASED RISK RULES
// ============================================================

function evaluateEnrichmentRisks(
  data: ExtractedData,
  enrichment: EnrichmentResult,
  flags: RiskFlag[]
): { userProfitMargin: number | null } {
  let userProfitMargin: number | null = null;

  // Industry Profitability Analysis
  if (data.grossReceipts !== null && data.grossReceipts > 0 && data.netProfit !== null) {
    userProfitMargin = (data.netProfit / data.grossReceipts) * 100;
    console.log("Calculated user profit margin:", userProfitMargin.toFixed(2) + "%");

    if (enrichment.industryBenchmark) {
      const industryAvg = enrichment.industryBenchmark.avgProfitMargin;
      const threshold = industryAvg * 0.5;

      if (userProfitMargin < threshold) {
        flags.push({
          flag: "Abnormally Low Profitability for Industry",
          severity: "high",
          details: `Your profit margin (${userProfitMargin.toFixed(1)}%) is less than 50% of the ${enrichment.industryBenchmark.industryName} industry average (${industryAvg}%). This suggests potential underreported income or inflated expenses and may trigger IRS scrutiny.`,
        });
      } else if (userProfitMargin < industryAvg * 0.75) {
        flags.push({
          flag: "Below Average Industry Profitability",
          severity: "medium",
          details: `Your profit margin (${userProfitMargin.toFixed(1)}%) is below the ${enrichment.industryBenchmark.industryName} industry average of ${industryAvg}%.`,
        });
      }
    }
  }

  // Geographic Risk
  if (enrichment.geoRisk?.isHighRisk) {
    flags.push({
      flag: "Location High-Activity Zone",
      severity: "medium",
      details: `You are located in ${enrichment.geoRisk.stateName}, which has an audit rate of ${enrichment.geoRisk.auditRate} per 1,000 returns - one of the highest in the nation. This geographic factor adds to your overall risk profile.`,
    });
  }

  // Income Mismatch for Occupation
  if (enrichment.occupationMatch) {
    const threshold = enrichment.occupationMatch.avgWage * 0.30;
    if (enrichment.occupationMatch.reportedIncome < threshold) {
      flags.push({
        flag: "Income Mismatch for Occupation",
        severity: "medium",
        details: `Reported W-2 income ($${enrichment.occupationMatch.reportedIncome.toLocaleString()}) is less than 30% of the average wage for "${enrichment.occupationMatch.matchedOccupation}" ($${enrichment.occupationMatch.avgWage.toLocaleString()}). This may indicate underreported income or part-time employment not clearly documented.`,
      });
    }
  }

  // Lifestyle Mismatch
  if (enrichment.lifestyleData && data.agi && data.agi > 0) {
    if (enrichment.lifestyleData.propertyTax && enrichment.lifestyleData.propertyTax > data.agi * 0.25) {
      flags.push({
        flag: "Housing Costs Exceed 25% of Gross Income",
        severity: "high",
        details: `Annual housing costs ($${enrichment.lifestyleData.propertyTax.toLocaleString()}) exceed 25% of your AGI ($${data.agi.toLocaleString()}). This lifestyle/income mismatch is a common IRS audit trigger for potential unreported income.`,
      });
    }

    if (enrichment.lifestyleData.homeValue && enrichment.lifestyleData.homeValue > 1000000 && data.agi < 60000) {
      flags.push({
        flag: "High Asset / Low Income Discrepancy",
        severity: "high",
        details: `Your home value ($${enrichment.lifestyleData.homeValue.toLocaleString()}) exceeds $1M but your reported AGI ($${data.agi.toLocaleString()}) is under $60K. This significant disparity often triggers IRS scrutiny for potential unreported income or asset-hiding.`,
      });
    }
  }

  // Unverified Charitable Donations
  for (const validation of enrichment.charityValidations) {
    if (!validation.verified && validation.amount && validation.amount >= 250) {
      flags.push({
        flag: "Unverified Charitable Donation",
        severity: "medium",
        details: `We could not verify "${validation.name}" as a registered 501(c)(3) organization. Ensure this is a registered non-profit, not a personal gift. Donations over $250 to unverified organizations may be scrutinized.`,
      });
    }
  }

  // Neighborhood Outlier
  if (enrichment.neighborhoodData?.isOutlier) {
    flags.push({
      flag: "Statistical Low-Income Outlier",
      severity: "medium",
      details: `Your reported income ($${data.agi?.toLocaleString()}) is only ${enrichment.neighborhoodData.incomeRatio}% of the median household income ($${enrichment.neighborhoodData.medianIncome.toLocaleString()}) for your ZIP code (${enrichment.neighborhoodData.zipCode}). This can sometimes trigger an IRS 'economic reality' review.`,
    });
  }

  return { userProfitMargin };
}

// ============================================================
// SCORE CALCULATION
// ============================================================

/**
 * Calculate the final risk score from flags (0-100).
 */
function calculateScore(flags: RiskFlag[], geoRisk: GeoRisk | null): number {
  let score = 0;

  // Add 10 points for geographic high-risk zone
  if (geoRisk?.isHighRisk) {
    score += 10;
    console.log("Added 10 points for geographic high-risk zone");
  }

  for (const flag of flags) {
    if (flag.severity === "high") {
      score += 30;
    } else if (flag.severity === "medium") {
      score += 10;
    } else {
      score += 5;
    }
  }

  return Math.min(score, 100);
}

// ============================================================
// PUBLIC API
// ============================================================

export interface ScoringResult {
  score: number;
  flags: RiskFlag[];
  userProfitMargin: number | null;
}

/**
 * Run all risk evaluation rules and calculate the score.
 */
export function evaluateRisks(
  data: ExtractedData,
  enrichment: EnrichmentResult,
  input: AnalysisInput
): ScoringResult {
  console.log("Step C: Analyzing risk flags...");
  const flags: RiskFlag[] = [];
  const returnType = input.formType || "1040";

  // Corporate form-specific rules
  if (returnType === "1120-S") {
    evaluateSCorpRisks(data, flags);
  }
  if (returnType === "1120") {
    evaluateCCorpRisks(data, flags);
  }

  // Schedule C rules for 1040
  if (returnType === "1040") {
    evaluateScheduleCRisks(data, input, flags);
    evaluateIndividualRisks(data, enrichment, input, flags);
  }

  // Enrichment-based rules (cross-form)
  const { userProfitMargin } = evaluateEnrichmentRisks(data, enrichment, flags);

  // Calculate final score
  console.log("Step D: Calculating risk score...");
  const score = calculateScore(flags, enrichment.geoRisk);

  return { score, flags, userProfitMargin };
}
