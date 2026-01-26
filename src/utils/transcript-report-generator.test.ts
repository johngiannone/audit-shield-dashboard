import { describe, it, expect, vi } from "vitest";
import { getActionStep } from "./transcript-report-generator";

describe("getActionStep", () => {
  describe("returns correct action for known codes", () => {
    it("returns audit action for code 420", () => {
      const result = getActionStep("420");
      
      expect(result).toContain("Do NOT file an amended return");
      expect(result).toContain("Letter 2205 or 566");
    });

    it("returns CID warning for code 922", () => {
      const result = getActionStep("922");
      
      expect(result).toContain("Criminal Investigation Division");
      expect(result).toContain("tax attorney");
      expect(result).toContain("STOP all communication");
    });

    it("returns hold action for code 570", () => {
      const result = getActionStep("570");
      
      expect(result).toContain("hold");
      expect(result).toContain("60 days");
    });

    it("returns freeze action for code 810", () => {
      const result = getActionStep("810");
      
      expect(result).toContain("frozen");
      expect(result).toContain("Do NOT call the IRS repeatedly");
    });

    it("returns notice action for code 971", () => {
      const result = getActionStep("971");
      
      expect(result).toContain("notice");
      expect(result).toContain("certified mail");
    });

    it("returns identity theft action for code 976", () => {
      const result = getActionStep("976");
      
      expect(result).toContain("identity theft");
      expect(result).toContain("Form 14039");
    });

    it("returns refund approved message for code 846", () => {
      const result = getActionStep("846");
      
      expect(result).toContain("refund was approved");
      expect(result).toContain("5 business days");
    });

    it("returns penalty action for code 160", () => {
      const result = getActionStep("160");
      
      expect(result).toContain("penalty");
      expect(result).toContain("Form 843");
    });

    it("returns return processed message for code 150", () => {
      const result = getActionStep("150");
      
      expect(result).toContain("processed");
      expect(result).toContain("routine");
    });
  });

  describe("fallback behavior", () => {
    it("returns fallback when code not in dictionary", () => {
      const fallback = "Custom fallback action";
      const result = getActionStep("999", fallback);
      
      expect(result).toBe(fallback);
    });

    it("returns generic message when no code and no fallback", () => {
      const result = getActionStep("unknown_code");
      
      expect(result).toContain("Review your IRS account transcript");
      expect(result).toContain("tax professional");
    });

    it("returns generic message for empty code", () => {
      const result = getActionStep("");
      
      expect(result).toContain("Review your IRS account transcript");
    });

    it("prefers dictionary over fallback when code exists", () => {
      const fallback = "This should not be used";
      const result = getActionStep("420", fallback);
      
      expect(result).toContain("Do NOT file an amended return");
      expect(result).not.toBe(fallback);
    });

    it("uses fallback for undefined fallback parameter", () => {
      const result = getActionStep("nonexistent", undefined);
      
      expect(result).toContain("Review your IRS account transcript");
    });
  });

  describe("edge cases", () => {
    it("handles numeric code as string", () => {
      const result = getActionStep("420");
      expect(result).toContain("Do NOT file an amended return");
    });

    it("handles code with leading zeros", () => {
      // Our dictionary uses "150" not "0150"
      const result = getActionStep("0150");
      expect(result).toContain("Review your IRS account transcript"); // Falls back
    });

    it("handles whitespace in code", () => {
      // Whitespace should cause lookup to fail
      const result = getActionStep(" 420 ");
      expect(result).toContain("Review your IRS account transcript");
    });

    it("handles lowercase variations", () => {
      // Only exact matches work
      const result = getActionStep("abc");
      expect(result).toContain("Review your IRS account transcript");
    });
  });

  describe("all critical codes have actions", () => {
    const criticalCodes = ["420", "922", "810", "976"];
    
    criticalCodes.forEach((code) => {
      it(`has specific action for critical code ${code}`, () => {
        const result = getActionStep(code);
        // Should not return the generic fallback
        expect(result).not.toContain("Review your IRS account transcript carefully");
      });
    });
  });

  describe("all high priority codes have actions", () => {
    const highCodes = ["570", "424", "914", "971", "290"];
    
    highCodes.forEach((code) => {
      it(`has specific action for high priority code ${code}`, () => {
        const result = getActionStep(code);
        expect(result).not.toContain("Review your IRS account transcript carefully");
      });
    });
  });

  describe("positive codes have appropriate messaging", () => {
    it("code 846 (refund) has positive tone", () => {
      const result = getActionStep("846");
      expect(result).toContain("Great news");
    });

    it("code 421 (audit reversal) indicates no action needed", () => {
      const result = getActionStep("421");
      expect(result).toContain("No action required");
    });

    it("code 161 (penalty relief) indicates no action needed", () => {
      const result = getActionStep("161");
      expect(result).toContain("No action needed");
    });
  });
});
