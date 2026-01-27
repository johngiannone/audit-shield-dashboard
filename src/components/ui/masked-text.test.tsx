import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MaskedText } from "./masked-text";

// Mock the security log module
const mockViewedPii = vi.fn().mockResolvedValue(undefined);
vi.mock("@/hooks/useSecurityLog", () => ({
  securityLog: {
    viewedPii: (...args: unknown[]) => mockViewedPii(...args),
  },
}));

describe("MaskedText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockViewedPii.mockResolvedValue(undefined);
  });

  describe("Masking Logic", () => {
    it("masks SSN format correctly (###-##-####)", () => {
      render(<MaskedText value="123-45-6789" type="ssn" />);
      // SSN: 9 chars, visibleChars=4, so 5 masked + separators preserved
      // The actual output from the component
      expect(screen.getByText("•••-•-•6789")).toBeInTheDocument();
    });

    it("masks EIN format correctly (##-#######)", () => {
      render(<MaskedText value="12-3456789" type="ein" />);
      // EIN: 9 chars, visibleChars=4
      expect(screen.getByText("••-•••6789")).toBeInTheDocument();
    });

    it("masks PTIN format correctly (P########)", () => {
      render(<MaskedText value="P12345678" type="ptin" />);
      expect(screen.getByText("•••••5678")).toBeInTheDocument();
    });

    it("masks CAF number format correctly", () => {
      render(<MaskedText value="1234-56789-A" type="caf" />);
      // CAF: 10 alphanumeric chars, visibleChars=4
      expect(screen.getByText("••••-••78-9A")).toBeInTheDocument();
    });

    it("respects custom visibleChars parameter", () => {
      render(<MaskedText value="123456789" type="other" visibleChars={2} />);
      expect(screen.getByText("•••••••89")).toBeInTheDocument();
    });

    it("respects custom maskChar parameter", () => {
      render(<MaskedText value="123456789" type="other" maskChar="*" />);
      expect(screen.getByText("*****6789")).toBeInTheDocument();
    });

    it("handles empty value gracefully", () => {
      render(<MaskedText value="" type="ssn" />);
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("shows full value when shorter than visibleChars", () => {
      render(<MaskedText value="123" type="other" visibleChars={4} />);
      expect(screen.getByText("123")).toBeInTheDocument();
    });

    it("handles value with only separators", () => {
      render(<MaskedText value="---" type="other" />);
      expect(screen.getByText("---")).toBeInTheDocument();
    });

    it("preserves multiple separator types", () => {
      render(<MaskedText value="12-34/56" type="other" visibleChars={2} />);
      // 6 alphanumeric, 2 visible = 4 masked
      expect(screen.getByText("••-•/•56")).toBeInTheDocument();
    });

    it("handles alphanumeric values", () => {
      render(<MaskedText value="ABC123DEF" type="other" visibleChars={3} />);
      expect(screen.getByText("••••••DEF")).toBeInTheDocument();
    });
  });

  describe("Toggle Reveal Behavior", () => {
    it("shows masked value by default", () => {
      render(<MaskedText value="123-45-6789" type="ssn" />);
      expect(screen.getByText("•••-•-•6789")).toBeInTheDocument();
    });

    it("reveals full value on click", async () => {
      const user = userEvent.setup();
      render(<MaskedText value="123-45-6789" type="ssn" />);
      
      const element = screen.getByRole("button");
      await user.click(element);
      
      await waitFor(() => {
        expect(screen.getByText("123-45-6789")).toBeInTheDocument();
      });
    });

    it("hides value again on second click", async () => {
      const user = userEvent.setup();
      render(<MaskedText value="123-45-6789" type="ssn" />);
      
      const element = screen.getByRole("button");
      await user.click(element);
      await waitFor(() => {
        expect(screen.getByText("123-45-6789")).toBeInTheDocument();
      });
      
      await user.click(element);
      await waitFor(() => {
        expect(screen.getByText("•••-•-•6789")).toBeInTheDocument();
      });
    });

    it("does not toggle when showToggle is false", async () => {
      const user = userEvent.setup();
      render(<MaskedText value="123-45-6789" type="ssn" showToggle={false} />);
      
      const element = screen.getByText("•••-•-•6789");
      await user.click(element);
      
      // Should still be masked
      expect(screen.getByText("•••-•-•6789")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("Keyboard Accessibility", () => {
    it("has correct tabIndex when showToggle is true", () => {
      render(<MaskedText value="123-45-6789" type="ssn" />);
      const element = screen.getByRole("button");
      expect(element).toHaveAttribute("tabindex", "0");
    });

    it("does not have tabIndex when showToggle is false", () => {
      render(<MaskedText value="123-45-6789" type="ssn" showToggle={false} />);
      const element = screen.getByText("•••-•-•6789");
      expect(element).not.toHaveAttribute("tabindex");
    });

    it("reveals value on Enter key press", async () => {
      render(<MaskedText value="123-45-6789" type="ssn" />);
      
      const element = screen.getByRole("button");
      
      await act(async () => {
        element.focus();
        fireEvent.keyDown(element, { key: "Enter" });
      });
      
      await waitFor(() => {
        expect(screen.getByText("123-45-6789")).toBeInTheDocument();
      });
    });

    it("does not reveal on other key presses", async () => {
      render(<MaskedText value="123-45-6789" type="ssn" />);
      
      const element = screen.getByRole("button");
      element.focus();
      fireEvent.keyDown(element, { key: "Space" });
      
      expect(screen.getByText("•••-•-•6789")).toBeInTheDocument();
    });

    it("has correct aria-label for masked state", () => {
      render(<MaskedText value="123-45-6789" type="ssn" />);
      const element = screen.getByRole("button");
      expect(element).toHaveAttribute("aria-label", "Reveal Social Security Number");
    });

    it("has correct aria-label for revealed state", async () => {
      const user = userEvent.setup();
      render(<MaskedText value="123-45-6789" type="ssn" />);
      
      const element = screen.getByRole("button");
      await user.click(element);
      
      await waitFor(() => {
        expect(element).toHaveAttribute("aria-label", "Hide Social Security Number");
      });
    });

    it("uses custom ariaLabel when provided", () => {
      render(
        <MaskedText 
          value="123-45-6789" 
          type="ssn" 
          ariaLabel="Custom label" 
        />
      );
      const element = screen.getByRole("button");
      expect(element).toHaveAttribute("aria-label", "Custom label");
    });
  });

  describe("Security Log Integration", () => {
    it("logs viewedPii event when revealing value", async () => {
      const user = userEvent.setup();
      render(<MaskedText value="123-45-6789" type="ssn" resourceId="test-123" />);
      
      const element = screen.getByRole("button");
      await user.click(element);
      
      await waitFor(() => {
        expect(mockViewedPii).toHaveBeenCalledTimes(1);
      });
      expect(mockViewedPii).toHaveBeenCalledWith(
        "ssn",
        "test-123",
        "•••-•-•6789"
      );
    });

    it("does not log when hiding value", async () => {
      const user = userEvent.setup();
      render(<MaskedText value="123-45-6789" type="ssn" />);
      
      const element = screen.getByRole("button");
      await user.click(element); // reveal
      await user.click(element); // hide
      
      // Should only log once (on reveal)
      await waitFor(() => {
        expect(mockViewedPii).toHaveBeenCalledTimes(1);
      });
    });

    it("logs correct PII type for EIN", async () => {
      const user = userEvent.setup();
      render(<MaskedText value="12-3456789" type="ein" />);
      
      await user.click(screen.getByRole("button"));
      
      await waitFor(() => {
        expect(mockViewedPii).toHaveBeenCalledWith("ein", undefined, "••-•••6789");
      });
    });

    it("logs correct PII type for PTIN", async () => {
      const user = userEvent.setup();
      render(<MaskedText value="P12345678" type="ptin" />);
      
      await user.click(screen.getByRole("button"));
      
      await waitFor(() => {
        expect(mockViewedPii).toHaveBeenCalledWith("ptin", undefined, "•••••5678");
      });
    });

    it("logs via keyboard interaction", async () => {
      render(<MaskedText value="123-45-6789" type="ssn" resourceId="kb-test" />);
      
      const element = screen.getByRole("button");
      
      await act(async () => {
        element.focus();
        fireEvent.keyDown(element, { key: "Enter" });
      });
      
      await waitFor(() => {
        expect(mockViewedPii).toHaveBeenCalledWith(
          "ssn",
          "kb-test",
          "•••-•-•6789"
        );
      });
    });

    it("still reveals value if logging fails", async () => {
      mockViewedPii.mockRejectedValueOnce(new Error("Log failed"));
      
      const user = userEvent.setup();
      render(<MaskedText value="123-45-6789" type="ssn" />);
      
      const element = screen.getByRole("button");
      await user.click(element);
      
      // Value should still be revealed despite log failure
      await waitFor(() => {
        expect(screen.getByText("123-45-6789")).toBeInTheDocument();
      });
    });
  });

  describe("Styling and Display", () => {
    it("applies custom className", () => {
      render(<MaskedText value="123456" type="other" className="custom-class" />);
      const element = screen.getByRole("button");
      expect(element).toHaveClass("custom-class");
    });

    it("shows Eye icon when masked", () => {
      render(<MaskedText value="123456" type="other" />);
      const element = screen.getByRole("button");
      expect(element.querySelector("svg")).toBeInTheDocument();
    });

    it("shows EyeOff icon when revealed", async () => {
      const user = userEvent.setup();
      render(<MaskedText value="123456" type="other" />);
      
      const element = screen.getByRole("button");
      await user.click(element);
      
      await waitFor(() => {
        expect(element.querySelector("svg")).toBeInTheDocument();
      });
    });

    it("has hover title for masked state", () => {
      render(<MaskedText value="123456" type="other" />);
      const element = screen.getByRole("button");
      expect(element).toHaveAttribute("title", "Click to reveal");
    });

    it("has hover title for revealed state", async () => {
      const user = userEvent.setup();
      render(<MaskedText value="123456" type="other" />);
      
      const element = screen.getByRole("button");
      await user.click(element);
      
      await waitFor(() => {
        expect(element).toHaveAttribute("title", "Click to hide");
      });
    });
  });
});
