/**
 * Audit Logic Utilities
 * Functions for detecting tax return anomalies and audit risk factors
 */

import { z } from 'zod';

// Schema for validating expense input
const expenseValueSchema = z.union([
  z.number(),
  z.string()
]);

const expensesInputSchema = z.record(z.string(), expenseValueSchema);

export interface EstimationAnomalyResult {
  isHighRisk: boolean;
  roundNumberPercentage: number;
  totalExpenseLines: number;
  roundExpenseLines: number;
  roundExpenses: { name: string; amount: number }[];
  flag: {
    flag: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    details: string;
    irsReference?: string;
  } | null;
}

/**
 * Sanitizes a currency string or number to a numeric value
 * Removes $, commas, and handles negative values in parentheses
 */
function sanitizeCurrencyValue(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }
  
  // Handle string values
  let sanitized = value
    .replace(/\$/g, '')           // Remove dollar signs
    .replace(/,/g, '')            // Remove commas
    .replace(/\s/g, '')           // Remove whitespace
    .trim();
  
  // Handle negative values in parentheses (e.g., "(500)" = -500)
  if (sanitized.startsWith('(') && sanitized.endsWith(')')) {
    sanitized = '-' + sanitized.slice(1, -1);
  }
  
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Checks if a number is a "round" number (divisible by 50 or 100)
 * Round numbers suggest estimated rather than actual expenses
 */
function isRoundNumber(value: number): boolean {
  // Check divisibility by 100 first (more suspicious)
  if (value % 100 === 0) return true;
  // Check divisibility by 50
  if (value % 50 === 0) return true;
  return false;
}

/**
 * Detects estimation anomalies in expense data
 * 
 * IRS auditors are trained to identify patterns of round numbers in expenses,
 * as they often indicate the taxpayer is estimating rather than using actual records.
 * 
 * @param expenses - Object with expense names as keys and amounts as values
 * @param options - Configuration options
 * @returns Analysis result with risk assessment
 * 
 * @example
 * ```typescript
 * const expenses = {
 *   "Office Supplies": "$500.00",
 *   "Travel": "1,200",
 *   "Utilities": 847.32,
 *   "Marketing": 2000
 * };
 * 
 * const result = detectEstimationAnomaly(expenses);
 * // result.isHighRisk = true if >30% are round numbers
 * ```
 */
export function detectEstimationAnomaly(
  expenses: Record<string, string | number>,
  options: {
    minimumThreshold?: number;    // Ignore amounts below this (default: 100)
    roundPercentageThreshold?: number; // High risk threshold (default: 30)
  } = {}
): EstimationAnomalyResult {
  const {
    minimumThreshold = 100,
    roundPercentageThreshold = 30
  } = options;

  // Validate input
  const validationResult = expensesInputSchema.safeParse(expenses);
  if (!validationResult.success) {
    return {
      isHighRisk: false,
      roundNumberPercentage: 0,
      totalExpenseLines: 0,
      roundExpenseLines: 0,
      roundExpenses: [],
      flag: null
    };
  }

  const sanitizedExpenses: { name: string; amount: number }[] = [];
  const roundExpenses: { name: string; amount: number }[] = [];

  // Process each expense line
  for (const [name, value] of Object.entries(expenses)) {
    const amount = sanitizeCurrencyValue(value);
    
    // Skip if amount is below minimum threshold or zero/negative
    if (amount < minimumThreshold) {
      continue;
    }
    
    sanitizedExpenses.push({ name, amount });
    
    // Check if it's a round number
    if (isRoundNumber(amount)) {
      roundExpenses.push({ name, amount });
    }
  }

  const totalExpenseLines = sanitizedExpenses.length;
  const roundExpenseLines = roundExpenses.length;
  
  // Calculate round number percentage
  const roundNumberPercentage = totalExpenseLines > 0
    ? (roundExpenseLines / totalExpenseLines) * 100
    : 0;

  // Determine if high risk (>30% round numbers)
  const isHighRisk = roundNumberPercentage > roundPercentageThreshold;

  // Generate flag if high risk
  let flag: EstimationAnomalyResult['flag'] = null;
  
  if (isHighRisk) {
    const topRoundExpenses = roundExpenses
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(e => `${e.name}: $${e.amount.toLocaleString()}`)
      .join(', ');

    flag = {
      flag: 'Estimated Expenses Detected (Lack of Records)',
      severity: roundNumberPercentage > 50 ? 'high' : 'medium',
      details: `${roundNumberPercentage.toFixed(0)}% of expense entries (${roundExpenseLines}/${totalExpenseLines}) are round numbers (divisible by $50 or $100). This pattern suggests estimated rather than actual expenses, indicating potential lack of substantiating records. IRS auditors are trained to identify this pattern.${topRoundExpenses ? ` Notable entries: ${topRoundExpenses}` : ''}`,
      irsReference: 'IRM 4.10.3.2 - Audit Techniques for Schedule C'
    };
  } else if (roundNumberPercentage > 20) {
    // Medium warning for 20-30%
    flag = {
      flag: 'Multiple Round Number Expenses',
      severity: 'low',
      details: `${roundNumberPercentage.toFixed(0)}% of expense entries are round numbers. Consider maintaining more detailed records with exact amounts to reduce audit scrutiny.`,
    };
  }

  return {
    isHighRisk,
    roundNumberPercentage,
    totalExpenseLines,
    roundExpenseLines,
    roundExpenses,
    flag
  };
}

/**
 * Batch analyze multiple expense categories for round number patterns
 * Useful for analyzing complete Schedule C data
 */
export function analyzeExpensePatterns(
  expenseCategories: Record<string, Record<string, string | number>>
): Map<string, EstimationAnomalyResult> {
  const results = new Map<string, EstimationAnomalyResult>();
  
  for (const [category, expenses] of Object.entries(expenseCategories)) {
    results.set(category, detectEstimationAnomaly(expenses));
  }
  
  return results;
}

/**
 * Calculate aggregate risk from multiple expense analyses
 */
export function calculateAggregateRisk(
  analyses: EstimationAnomalyResult[]
): {
  overallRoundPercentage: number;
  totalLines: number;
  totalRoundLines: number;
  highRiskCategories: number;
  isOverallHighRisk: boolean;
} {
  let totalLines = 0;
  let totalRoundLines = 0;
  let highRiskCategories = 0;

  for (const analysis of analyses) {
    totalLines += analysis.totalExpenseLines;
    totalRoundLines += analysis.roundExpenseLines;
    if (analysis.isHighRisk) highRiskCategories++;
  }

  const overallRoundPercentage = totalLines > 0
    ? (totalRoundLines / totalLines) * 100
    : 0;

  return {
    overallRoundPercentage,
    totalLines,
    totalRoundLines,
    highRiskCategories,
    isOverallHighRisk: overallRoundPercentage > 30 || highRiskCategories > 0
  };
}
