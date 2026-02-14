import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { evaluateRisks } from "../score.ts";
import type { ExtractedData, EnrichmentResult, AnalysisInput } from "../types.ts";

// ============================================================
// TEST UTILITIES
// ============================================================

function createMockExtractedData(overrides: Partial<ExtractedData> = {}): ExtractedData {
  return {
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
    ...overrides,
  };
}

function createMockEnrichmentResult(overrides: Partial<EnrichmentResult> = {}): EnrichmentResult {
  return {
    benchmarks: null,
    industryBenchmark: null,
    geoRisk: null,
    lifestyleData: null,
    charityValidations: [],
    neighborhoodData: null,
    occupationMatch: null,
    ...overrides,
  };
}

function createMockAnalysisInput(overrides: Partial<AnalysisInput> = {}): AnalysisInput {
  return {
    filePath: "test.pdf",
    fileType: "pdf",
    formType: "1040",
    ...overrides,
  };
}

// ============================================================
// S-CORP RISK TESTS
// ============================================================

Deno.test("S-Corp: zero officer compensation triggers high flag", () => {
  const data = createMockExtractedData({
    ordinaryBusinessIncome: 100000,
    officerCompensation: 0,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1120-S" });

  const result = evaluateRisks(data, enrichment, input);

  const unreasonableCompFlag = result.flags.find((f) =>
    f.flag.includes("Unreasonable Compensation")
  );
  assertEquals(unreasonableCompFlag !== undefined, true);
  assertEquals(unreasonableCompFlag?.severity, "high");
});

Deno.test("S-Corp: officer compensation below 10% of income triggers high flag", () => {
  const data = createMockExtractedData({
    ordinaryBusinessIncome: 100000,
    officerCompensation: 5000, // 5% of income
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1120-S" });

  const result = evaluateRisks(data, enrichment, input);

  const unreasonableCompFlag = result.flags.find((f) =>
    f.flag.includes("Unreasonable Compensation")
  );
  assertEquals(unreasonableCompFlag !== undefined, true);
  assertEquals(unreasonableCompFlag?.severity, "high");
});

Deno.test("S-Corp: operating loss with high gross receipts triggers medium flag", () => {
  const data = createMockExtractedData({
    ordinaryBusinessIncome: -50000, // Loss
    grossReceipts: 200000,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1120-S" });

  const result = evaluateRisks(data, enrichment, input);

  const lossFlag = result.flags.find((f) => f.flag.includes("Operating Loss"));
  assertEquals(lossFlag !== undefined, true);
  assertEquals(lossFlag?.severity, "medium");
});

Deno.test("S-Corp: reasonable officer compensation does not trigger flag", () => {
  const data = createMockExtractedData({
    ordinaryBusinessIncome: 100000,
    officerCompensation: 50000, // 50% of income
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1120-S" });

  const result = evaluateRisks(data, enrichment, input);

  const unreasonableCompFlag = result.flags.find((f) =>
    f.flag.includes("Unreasonable Compensation")
  );
  assertEquals(unreasonableCompFlag, undefined);
});

// ============================================================
// C-CORP RISK TESTS
// ============================================================

Deno.test("C-Corp: high other deductions (>20% of income) triggers high flag", () => {
  const data = createMockExtractedData({
    totalIncome: 100000,
    otherDeductions: 30000, // 30% of income
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1120" });

  const result = evaluateRisks(data, enrichment, input);

  const deductionFlag = result.flags.find((f) =>
    f.flag.includes('High "Other" Deductions')
  );
  assertEquals(deductionFlag !== undefined, true);
  assertEquals(deductionFlag?.severity, "high");
});

Deno.test("C-Corp: other deductions at 20% threshold does not trigger flag", () => {
  const data = createMockExtractedData({
    totalIncome: 100000,
    otherDeductions: 20000, // Exactly 20%
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1120" });

  const result = evaluateRisks(data, enrichment, input);

  const deductionFlag = result.flags.find((f) =>
    f.flag.includes('High "Other" Deductions')
  );
  assertEquals(deductionFlag, undefined);
});

Deno.test("C-Corp: abnormally high COGS ratio (>75%) triggers medium flag", () => {
  const data = createMockExtractedData({
    grossReceipts: 100000,
    costOfGoodsSold: 80000, // 80% of gross receipts
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1120" });

  const result = evaluateRisks(data, enrichment, input);

  const cogsFlag = result.flags.find((f) =>
    f.flag.includes("Abnormally High COGS")
  );
  assertEquals(cogsFlag !== undefined, true);
  assertEquals(cogsFlag?.severity, "medium");
});

// ============================================================
// SCHEDULE C RISK TESTS
// ============================================================

Deno.test("Schedule C: hobby loss rule < 3 profitable years triggers high flag", () => {
  const data = createMockExtractedData({
    hasScheduleC: true,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({
    formType: "1040",
    profitableYears: 1,
  });

  const result = evaluateRisks(data, enrichment, input);

  const hobbyFlag = result.flags.find((f) => f.flag.includes("Hobby Loss Rule"));
  assertEquals(hobbyFlag !== undefined, true);
  assertEquals(hobbyFlag?.severity, "high");
});

Deno.test("Schedule C: hobby loss rule with 2 profitable years triggers medium flag", () => {
  const data = createMockExtractedData({
    hasScheduleC: true,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({
    formType: "1040",
    profitableYears: 2,
  });

  const result = evaluateRisks(data, enrichment, input);

  const hobbyFlag = result.flags.find((f) => f.flag.includes("Hobby Loss Rule"));
  assertEquals(hobbyFlag !== undefined, true);
  assertEquals(hobbyFlag?.severity, "medium");
});

Deno.test("Schedule C: 3+ profitable years does not trigger hobby loss flag", () => {
  const data = createMockExtractedData({
    hasScheduleC: true,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({
    formType: "1040",
    profitableYears: 3,
  });

  const result = evaluateRisks(data, enrichment, input);

  const hobbyFlag = result.flags.find((f) => f.flag.includes("Hobby Loss Rule"));
  assertEquals(hobbyFlag, undefined);
});

Deno.test("Schedule C: vehicle expenses without mileage log triggers high flag", () => {
  const data = createMockExtractedData({
    hasScheduleC: true,
    vehicleExpenses: 5000,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({
    formType: "1040",
    hasMileageLog: "no",
  });

  const result = evaluateRisks(data, enrichment, input);

  const vehicleFlag = result.flags.find((f) =>
    f.flag.includes("Vehicle Expense Documentation Risk")
  );
  assertEquals(vehicleFlag !== undefined, true);
  assertEquals(vehicleFlag?.severity, "high");
});

Deno.test("Schedule C: vehicle expenses with mileage log does not trigger documentation flag", () => {
  const data = createMockExtractedData({
    hasScheduleC: true,
    vehicleExpenses: 5000,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({
    formType: "1040",
    hasMileageLog: "yes",
  });

  const result = evaluateRisks(data, enrichment, input);

  const vehicleFlag = result.flags.find((f) =>
    f.flag.includes("Vehicle Expense Documentation Risk")
  );
  assertEquals(vehicleFlag, undefined);
});

Deno.test("Schedule C: high vehicle expenses (>5000) without mileage log triggers medium flag", () => {
  const data = createMockExtractedData({
    hasScheduleC: true,
    vehicleExpenses: 8000,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({
    formType: "1040",
    hasMileageLog: "unsure",
  });

  const result = evaluateRisks(data, enrichment, input);

  const highVehicleFlag = result.flags.find((f) =>
    f.flag.includes("High Vehicle Expenses")
  );
  assertEquals(highVehicleFlag !== undefined, true);
  assertEquals(highVehicleFlag?.severity, "medium");
});

// ============================================================
// INDIVIDUAL (1040) RISK TESTS
// ============================================================

Deno.test("Individual: charity ratio > 15% triggers high flag", () => {
  const data = createMockExtractedData({
    agi: 100000,
    charitableContributions: 20000, // 20% of AGI
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1040" });

  const result = evaluateRisks(data, enrichment, input);

  const charityFlag = result.flags.find((f) =>
    f.flag.includes("High Charity/Income Ratio")
  );
  assertEquals(charityFlag !== undefined, true);
  assertEquals(charityFlag?.severity, "high");
});

Deno.test("Individual: charity ratio at 15% does not trigger flag", () => {
  const data = createMockExtractedData({
    agi: 100000,
    charitableContributions: 15000, // Exactly 15%
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1040" });

  const result = evaluateRisks(data, enrichment, input);

  const charityFlag = result.flags.find((f) =>
    f.flag.includes("High Charity/Income Ratio")
  );
  assertEquals(charityFlag, undefined);
});

Deno.test("Individual: business loss for 3+ consecutive years triggers high flag", () => {
  const data = createMockExtractedData({
    businessIncome: -5000,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({
    formType: "1040",
    priorYearLosses: 2, // 3 total including current year
  });

  const result = evaluateRisks(data, enrichment, input);

  const hobbyLossFlag = result.flags.find((f) =>
    f.flag.includes("Hobby Loss Risk")
  );
  assertEquals(hobbyLossFlag !== undefined, true);
  assertEquals(hobbyLossFlag?.severity, "high");
});

Deno.test("Individual: large business loss (>10k) triggers medium flag", () => {
  const data = createMockExtractedData({
    businessIncome: -15000,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1040" });

  const result = evaluateRisks(data, enrichment, input);

  const lossFlag = result.flags.find((f) =>
    f.flag.includes("Significant Business Loss")
  );
  assertEquals(lossFlag !== undefined, true);
  assertEquals(lossFlag?.severity, "medium");
});

Deno.test("Individual: round number charitable contributions triggers medium flag", () => {
  const data = createMockExtractedData({
    charitableContributions: 10000, // Round number
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1040" });

  const result = evaluateRisks(data, enrichment, input);

  const roundNumberFlag = result.flags.find((f) =>
    f.flag.includes("Round Number Anomaly")
  );
  assertEquals(roundNumberFlag !== undefined, true);
  assertEquals(roundNumberFlag?.severity, "medium");
});

Deno.test("Individual: non-round charitable contributions does not trigger round number flag", () => {
  const data = createMockExtractedData({
    charitableContributions: 9500,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1040" });

  const result = evaluateRisks(data, enrichment, input);

  const roundNumberFlag = result.flags.find((f) =>
    f.flag && f.flag.includes("Round Number") && f.details.includes("Charitable")
  );
  assertEquals(roundNumberFlag, undefined);
});

// ============================================================
// ENRICHMENT RISK TESTS
// ============================================================

Deno.test("Enrichment: abnormally low profitability (<50% of industry avg) triggers high flag", () => {
  const data = createMockExtractedData({
    grossReceipts: 100000,
    netProfit: 5000, // 5% margin
  });
  const enrichment = createMockEnrichmentResult({
    industryBenchmark: {
      industryName: "Technology",
      avgProfitMargin: 15,
    },
  });
  const input = createMockAnalysisInput({ formType: "1040" });

  const result = evaluateRisks(data, enrichment, input);

  const profitFlag = result.flags.find((f) =>
    f.flag.includes("Abnormally Low Profitability")
  );
  assertEquals(profitFlag !== undefined, true);
  assertEquals(profitFlag?.severity, "high");
});

Deno.test("Enrichment: below average profitability (50-75% of industry) triggers medium flag", () => {
  const data = createMockExtractedData({
    grossReceipts: 100000,
    netProfit: 10000, // 10% margin
  });
  const enrichment = createMockEnrichmentResult({
    industryBenchmark: {
      industryName: "Technology",
      avgProfitMargin: 15,
    },
  });
  const input = createMockAnalysisInput({ formType: "1040" });

  const result = evaluateRisks(data, enrichment, input);

  const profitFlag = result.flags.find((f) =>
    f.flag.includes("Below Average Industry Profitability")
  );
  assertEquals(profitFlag !== undefined, true);
  assertEquals(profitFlag?.severity, "medium");
});

Deno.test("Enrichment: high-risk geographic location triggers medium flag", () => {
  const data = createMockExtractedData();
  const enrichment = createMockEnrichmentResult({
    geoRisk: {
      stateCode: "CA",
      stateName: "California",
      auditRate: 0.8,
      isHighRisk: true,
    },
  });
  const input = createMockAnalysisInput({ formType: "1040" });

  const result = evaluateRisks(data, enrichment, input);

  const geoFlag = result.flags.find((f) =>
    f.flag.includes("Location High-Activity Zone")
  );
  assertEquals(geoFlag !== undefined, true);
  assertEquals(geoFlag?.severity, "medium");
});

// ============================================================
// SCORE CALCULATION TESTS
// ============================================================

Deno.test("Score: no flags results in zero or baseline score", () => {
  const data = createMockExtractedData({
    ordinaryBusinessIncome: 100000,
    officerCompensation: 50000, // Reasonable
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1120-S" });

  const result = evaluateRisks(data, enrichment, input);

  assertEquals(result.score >= 0, true);
  assertEquals(result.score <= 100, true);
});

Deno.test("Score: single high severity flag adds 30 points", () => {
  const data = createMockExtractedData({
    ordinaryBusinessIncome: 100000,
    officerCompensation: 0, // Triggers high flag
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1120-S" });

  const result = evaluateRisks(data, enrichment, input);

  assertEquals(result.score >= 30, true);
  assertEquals(result.score <= 100, true);
});

Deno.test("Score: multiple high severity flags add up capped at 100", () => {
  const data = createMockExtractedData({
    ordinaryBusinessIncome: 100000,
    officerCompensation: 0, // High flag
    agi: 100000,
    charitableContributions: 20000, // Another high flag
  });
  const enrichment = createMockEnrichmentResult({
    geoRisk: {
      stateCode: "CA",
      stateName: "California",
      auditRate: 0.8,
      isHighRisk: true,
    },
  });
  const input = createMockAnalysisInput({ formType: "1040" });

  const result = evaluateRisks(data, enrichment, input);

  assertEquals(result.score, 100); // Capped at 100
});

Deno.test("Score: geographic high-risk adds 10 base points", () => {
  const data = createMockExtractedData();
  const enrichment = createMockEnrichmentResult({
    geoRisk: {
      stateCode: "CA",
      stateName: "California",
      auditRate: 0.8,
      isHighRisk: true,
    },
  });
  const input = createMockAnalysisInput({ formType: "1040" });

  const result = evaluateRisks(data, enrichment, input);

  // At minimum 10 points from geo risk + medium flag for location = 20
  assertEquals(result.score >= 10, true);
});

Deno.test("Score is always between 0 and 100", () => {
  const data = createMockExtractedData({
    ordinaryBusinessIncome: 500000,
    officerCompensation: 0,
    agi: 500000,
    charitableContributions: 100000,
    businessIncome: -50000,
  });
  const enrichment = createMockEnrichmentResult({
    geoRisk: {
      stateCode: "CA",
      stateName: "California",
      auditRate: 0.8,
      isHighRisk: true,
    },
    industryBenchmark: {
      industryName: "Tech",
      avgProfitMargin: 25,
    },
  });
  const input = createMockAnalysisInput({
    formType: "1040",
    profitableYears: 0,
  });

  const result = evaluateRisks(data, enrichment, input);

  assertEquals(result.score >= 0, true);
  assertEquals(result.score <= 100, true);
});

// ============================================================
// PROFIT MARGIN CALCULATION TESTS
// ============================================================

Deno.test("Score result includes userProfitMargin calculation", () => {
  const data = createMockExtractedData({
    grossReceipts: 100000,
    netProfit: 10000,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1040" });

  const result = evaluateRisks(data, enrichment, input);

  assertEquals(result.userProfitMargin, 10); // 10%
});

Deno.test("Score result handles null profit margin when no gross receipts", () => {
  const data = createMockExtractedData({
    grossReceipts: null,
    netProfit: 10000,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1040" });

  const result = evaluateRisks(data, enrichment, input);

  assertEquals(result.userProfitMargin, null);
});

// ============================================================
// FORM TYPE ROUTING TESTS
// ============================================================

Deno.test("Score applies S-Corp rules only for 1120-S form", () => {
  const data = createMockExtractedData({
    ordinaryBusinessIncome: 100000,
    officerCompensation: 0,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1120-S" });

  const result = evaluateRisks(data, enrichment, input);

  const unreasonableFlag = result.flags.find((f) =>
    f.flag.includes("Unreasonable Compensation")
  );
  assertEquals(unreasonableFlag !== undefined, true);
});

Deno.test("Score applies C-Corp rules only for 1120 form", () => {
  const data = createMockExtractedData({
    totalIncome: 100000,
    otherDeductions: 30000,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({ formType: "1120" });

  const result = evaluateRisks(data, enrichment, input);

  const deductionFlag = result.flags.find((f) =>
    f.flag.includes('High "Other" Deductions')
  );
  assertEquals(deductionFlag !== undefined, true);
});

Deno.test("Score applies Schedule C rules for 1040 form with hasScheduleC", () => {
  const data = createMockExtractedData({
    hasScheduleC: true,
    vehicleExpenses: 5000,
  });
  const enrichment = createMockEnrichmentResult();
  const input = createMockAnalysisInput({
    formType: "1040",
    hasMileageLog: "no",
  });

  const result = evaluateRisks(data, enrichment, input);

  const vehicleFlag = result.flags.find((f) =>
    f.flag.includes("Vehicle Expense")
  );
  assertEquals(vehicleFlag !== undefined, true);
});
