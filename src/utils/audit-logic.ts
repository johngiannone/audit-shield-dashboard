/**
 * Audit Logic Utilities
 * Functions for detecting tax return anomalies and audit risk factors
 */

export interface EstimationAnomalyResult {
  isHighRisk: boolean;
  riskScore: number;
  flaggedItems: string[];
  message: string | null;
}

/**
 * Detects estimation anomalies in expense data
 * 
 * IRS auditors are trained to identify patterns of round numbers in expenses,
 * as they often indicate the taxpayer is estimating rather than using actual records.
 * 
 * @param expenses - Object with expense names as keys and amounts as values
 * @returns Analysis result with risk assessment
 */
export function detectEstimationAnomaly(expenses: Record<string, any>): EstimationAnomalyResult {
  let roundCount = 0;
  let totalCount = 0;
  const roundEntries: string[] = [];

  // 1. Iterate through all keys in the expense object
  for (const [category, value] of Object.entries(expenses)) {
    // 2. Clean the value (handle "$1,200.00", "500", etc.)
    const cleanString = String(value).replace(/[^0-9.]/g, '');
    const amount = parseFloat(cleanString);

    // Skip empty, zero, or very small amounts (IRS ignores $5 rounding)
    if (isNaN(amount) || amount < 100) continue;

    totalCount++;

    // 3. The "Round Number" Check
    // We check if it is divisible by 50 or 100.
    // Real expenses (e.g. $1,243.21) are rarely divisible by 10.
    // "Guesstimates" (e.g. $500, $1,250) are almost always divisible by 50.
    if (amount % 50 === 0) {
      roundCount++;
      roundEntries.push(`${category}: $${amount}`);
    }
  }

  // 4. Calculate Risk Score
  // If more than 30% of lines are round, that is statistically improbable.
  const ratio = totalCount > 0 ? (roundCount / totalCount) : 0;
  const isHighRisk = ratio > 0.30; // 30% threshold

  return {
    isHighRisk,
    riskScore: Math.round(ratio * 100), // 0 to 100 score
    flaggedItems: roundEntries, // List of suspicious items to show user
    message: isHighRisk 
      ? `Estimation Risk: ${Math.round(ratio * 100)}% of your expenses end in '00' or '50'. The IRS views this as lack of record keeping.`
      : null
  };
}
