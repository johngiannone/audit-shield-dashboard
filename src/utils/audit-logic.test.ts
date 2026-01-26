import { describe, it, expect } from "vitest";
import { detectEstimationAnomaly, EstimationAnomalyResult } from "./audit-logic";

describe("detectEstimationAnomaly", () => {
  describe("basic functionality", () => {
    it("returns low risk for non-round numbers", () => {
      const expenses = {
        "Office Supplies": "$1,243.21",
        "Travel": "567.89",
        "Marketing": "2,345.67",
      };
      const result = detectEstimationAnomaly(expenses);
      
      expect(result.isHighRisk).toBe(false);
      expect(result.riskScore).toBe(0);
      expect(result.flaggedItems).toHaveLength(0);
      expect(result.message).toBeNull();
    });

    it("detects high risk when majority are round numbers", () => {
      const expenses = {
        "Office Supplies": "$500",
        "Travel": "1000",
        "Marketing": "$2,500",
        "Utilities": "750",
      };
      const result = detectEstimationAnomaly(expenses);
      
      expect(result.isHighRisk).toBe(true);
      expect(result.riskScore).toBe(100);
      expect(result.flaggedItems).toHaveLength(4);
      expect(result.message).toContain("Estimation Risk");
    });

    it("flags amounts divisible by 50", () => {
      const expenses = {
        "Category1": "$150",
        "Category2": "$250",
        "Category3": "$350",
      };
      const result = detectEstimationAnomaly(expenses);
      
      expect(result.isHighRisk).toBe(true);
      expect(result.flaggedItems).toHaveLength(3);
      expect(result.flaggedItems).toContain("Category1: $150");
    });
  });

  describe("edge cases - zero and small amounts", () => {
    it("ignores $0 expenses", () => {
      const expenses = {
        "Zero Expense": "$0",
        "Real Expense": "$1,243.21",
      };
      const result = detectEstimationAnomaly(expenses);
      
      expect(result.isHighRisk).toBe(false);
      expect(result.flaggedItems).toHaveLength(0);
    });

    it("ignores amounts under $100", () => {
      const expenses = {
        "Small1": "$50",
        "Small2": "$99",
        "Small3": "$25.00",
        "Large": "$1,234.56",
      };
      const result = detectEstimationAnomaly(expenses);
      
      // Only the large amount should be counted, and it's not round
      expect(result.isHighRisk).toBe(false);
      expect(result.flaggedItems).toHaveLength(0);
    });

    it("includes $100 and above in analysis", () => {
      const expenses = {
        "Exactly100": "$100",
        "Above100": "$200",
      };
      const result = detectEstimationAnomaly(expenses);
      
      expect(result.isHighRisk).toBe(true);
      expect(result.flaggedItems).toHaveLength(2);
    });
  });

  describe("edge cases - string formatting", () => {
    it("handles strings with commas", () => {
      const expenses = {
        "Big Expense": "$1,000,000",
        "Medium": "$50,000",
      };
      const result = detectEstimationAnomaly(expenses);
      
      expect(result.isHighRisk).toBe(true);
      expect(result.flaggedItems).toContain("Big Expense: $1000000");
      expect(result.flaggedItems).toContain("Medium: $50000");
    });

    it("handles dollar signs", () => {
      const expenses = {
        "With Dollar": "$500.00",
        "Without Dollar": "500.00",
      };
      const result = detectEstimationAnomaly(expenses);
      
      expect(result.isHighRisk).toBe(true);
      expect(result.flaggedItems).toHaveLength(2);
    });

    it("handles decimal places", () => {
      const expenses = {
        "Round with cents": "$500.00",
        "Not round": "$500.01",
      };
      const result = detectEstimationAnomaly(expenses);
      
      // $500.00 is round (divisible by 50), $500.01 is not
      expect(result.flaggedItems).toContain("Round with cents: $500");
      expect(result.flaggedItems).not.toContain("Not round");
    });

    it("handles plain numeric strings", () => {
      const expenses = {
        "Plain": "1500",
        "Another": "2000",
      };
      const result = detectEstimationAnomaly(expenses);
      
      expect(result.isHighRisk).toBe(true);
      expect(result.flaggedItems).toHaveLength(2);
    });
  });

  describe("edge cases - negative numbers", () => {
    it("handles negative amounts by stripping the sign", () => {
      // The function strips non-numeric chars except decimal, so -500 becomes 500
      const expenses = {
        "Negative": "-500",
        "Positive": "500",
      };
      const result = detectEstimationAnomaly(expenses);
      
      // Both should be treated as 500 (round number)
      expect(result.isHighRisk).toBe(true);
      expect(result.flaggedItems).toHaveLength(2);
    });
  });

  describe("edge cases - empty and invalid inputs", () => {
    it("handles empty expenses object", () => {
      const expenses = {};
      const result = detectEstimationAnomaly(expenses);
      
      expect(result.isHighRisk).toBe(false);
      expect(result.riskScore).toBe(0);
      expect(result.flaggedItems).toHaveLength(0);
      expect(result.message).toBeNull();
    });

    it("handles NaN values gracefully", () => {
      const expenses = {
        "Invalid": "not a number",
        "Empty": "",
        "Valid": "$1,234.56",
      };
      const result = detectEstimationAnomaly(expenses);
      
      // Invalid values should be skipped, only valid one counted
      expect(result.isHighRisk).toBe(false);
      expect(result.flaggedItems).toHaveLength(0);
    });

    it("handles undefined-like values", () => {
      const expenses = {
        "Category": "undefined",
        "Another": "null",
        "Valid": "$500",
      };
      const result = detectEstimationAnomaly(expenses);
      
      // "undefined" and "null" strings become NaN, only $500 is valid
      expect(result.flaggedItems).toContain("Valid: $500");
    });
  });

  describe("threshold behavior", () => {
    it("returns low risk at exactly 30% round numbers", () => {
      // 3 round out of 10 = 30% exactly (threshold is > 30%, not >=)
      const expenses = {
        "Round1": "$500",
        "Round2": "$1000",
        "Round3": "$1500",
        "NotRound1": "$101",
        "NotRound2": "$203",
        "NotRound3": "$307",
        "NotRound4": "$411",
        "NotRound5": "$519",
        "NotRound6": "$623",
        "NotRound7": "$731",
      };
      const result = detectEstimationAnomaly(expenses);
      
      expect(result.riskScore).toBe(30);
      expect(result.isHighRisk).toBe(false);
    });

    it("returns high risk just above 30%", () => {
      // 4 round out of 10 = 40% (above threshold)
      const expenses = {
        "Round1": "$500",
        "Round2": "$1000",
        "Round3": "$1500",
        "Round4": "$2000",
        "NotRound1": "$101",
        "NotRound2": "$203",
        "NotRound3": "$307",
        "NotRound4": "$411",
        "NotRound5": "$519",
        "NotRound6": "$623",
      };
      const result = detectEstimationAnomaly(expenses);
      
      expect(result.riskScore).toBe(40);
      expect(result.isHighRisk).toBe(true);
    });
  });

  describe("message formatting", () => {
    it("includes percentage in risk message", () => {
      const expenses = {
        "Round1": "$500",
        "Round2": "$1000",
      };
      const result = detectEstimationAnomaly(expenses);
      
      expect(result.message).toContain("100%");
      expect(result.message).toContain("IRS");
    });

    it("returns null message for low risk", () => {
      const expenses = {
        "NotRound": "$1,234.56",
      };
      const result = detectEstimationAnomaly(expenses);
      
      expect(result.message).toBeNull();
    });
  });
});
