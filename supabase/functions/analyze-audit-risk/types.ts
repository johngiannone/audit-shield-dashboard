/**
 * Shared type definitions for the audit risk analysis pipeline.
 */

export interface CharityDonation {
  name: string;
  amount: number | null;
}

export interface CharityValidation {
  name: string;
  amount: number | null;
  verified: boolean;
  matchedName: string | null;
  ein: string | null;
}

export interface ExtractedData {
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
  wagesIncome: number | null;
  // Address fields for geographic and lifestyle risk
  stateCode: string | null;
  fullAddress: string | null;
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

export interface LifestyleData {
  propertyTax: number | null;
  homeValue: number | null;
  source: "api" | "manual" | null;
}

export interface NeighborhoodData {
  zipCode: string;
  medianIncome: number;
  userAgi: number;
  incomeRatio: number;
  isOutlier: boolean;
}

export interface RiskFlag {
  flag: string;
  severity: "high" | "medium" | "low";
  details: string;
}

export interface Benchmarks {
  avgCharitableDeduction: number | null;
  avgMortgageInterest: number | null;
}

export interface IndustryBenchmark {
  industryName: string;
  avgProfitMargin: number;
  avgCogsPercentage?: number;
  highRiskExpenseCategories?: string[];
}

export interface GeoRisk {
  stateCode: string;
  stateName: string;
  auditRate: number;
  isHighRisk: boolean;
}

export interface RiskAssessment {
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
  geoRisk: GeoRisk | null;
  lifestyleData: LifestyleData | null;
  charityValidations: CharityValidation[];
  neighborhoodData: NeighborhoodData | null;
}

export interface AnalysisInput {
  filePath: string;
  fileType?: string;
  formType?: string;
  priorYearLosses?: number;
  manualHousingCost?: number;
  activeShareholders?: number;
  totalAssets?: number;
  businessYearsActive?: number;
  profitableYears?: number;
  hasMileageLog?: string;
}

export interface EnrichmentResult {
  benchmarks: Benchmarks | null;
  industryBenchmark: IndustryBenchmark | null;
  geoRisk: GeoRisk | null;
  lifestyleData: LifestyleData | null;
  charityValidations: CharityValidation[];
  neighborhoodData: NeighborhoodData | null;
  occupationMatch: {
    matchedOccupation: string;
    avgWage: number;
    reportedIncome: number;
  } | null;
}
