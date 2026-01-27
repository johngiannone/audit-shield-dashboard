import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { securityLog } from "@/hooks/useSecurityLog";

interface MaskedTextProps {
  /** The full unmasked value (e.g., "123-45-6789") */
  value: string;
  /** Type of PII for logging purposes */
  type: "ssn" | "ein" | "ptin" | "caf" | "other";
  /** Optional resource ID for security logging */
  resourceId?: string;
  /** Number of visible characters at the end (default: 4) */
  visibleChars?: number;
  /** Mask character (default: •) */
  maskChar?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the toggle button (default: true) */
  showToggle?: boolean;
  /** Label for screen readers */
  ariaLabel?: string;
}

/**
 * MaskedText component for displaying sensitive PII like SSN, EIN, PTIN, CAF numbers.
 * 
 * - Shows masked value by default (e.g., •••-••-1234)
 * - On click/toggle, logs a "Viewed PII" event to security_logs and reveals the text
 * - Automatically handles common formats (SSN, EIN, PTIN, CAF)
 */
export const MaskedText = ({
  value,
  type,
  resourceId,
  visibleChars = 4,
  maskChar = "•",
  className,
  showToggle = true,
  ariaLabel,
}: MaskedTextProps) => {
  const [isRevealed, setIsRevealed] = useState(false);

  // Generate masked version
  const getMaskedValue = (): string => {
    if (!value) return "";
    
    // For formatted values like SSN (123-45-6789) or EIN (12-3456789)
    // Keep the format but mask the characters
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, "");
    
    if (cleanValue.length <= visibleChars) {
      return value; // Nothing to mask
    }

    // Find positions of non-alphanumeric characters (separators)
    const separatorPositions: { index: number; char: string }[] = [];
    let alphanumericCount = 0;
    
    for (let i = 0; i < value.length; i++) {
      if (/[^a-zA-Z0-9]/.test(value[i])) {
        separatorPositions.push({ index: alphanumericCount, char: value[i] });
      } else {
        alphanumericCount++;
      }
    }

    // Create masked string
    const charsToMask = cleanValue.length - visibleChars;
    let maskedClean = maskChar.repeat(charsToMask) + cleanValue.slice(-visibleChars);

    // Reinsert separators
    let result = maskedClean;
    for (const sep of separatorPositions) {
      if (sep.index <= result.length) {
        result = result.slice(0, sep.index) + sep.char + result.slice(sep.index);
      }
    }

    return result;
  };

  const handleReveal = async () => {
    if (!isRevealed) {
      // Log the PII view event before revealing
      try {
        await securityLog.viewedPii(type, resourceId, getMaskedValue());
      } catch (error) {
        console.error("Failed to log PII view:", error);
        // Still reveal even if logging fails - user experience first
      }
    }
    setIsRevealed(!isRevealed);
  };

  const displayValue = isRevealed ? value : getMaskedValue();
  const typeLabels: Record<string, string> = {
    ssn: "Social Security Number",
    ein: "Employer Identification Number",
    ptin: "Preparer Tax ID Number",
    caf: "Centralized Authorization File Number",
    other: "Sensitive Information",
  };

  if (!value) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono",
        showToggle && "cursor-pointer hover:text-primary transition-colors",
        className
      )}
      onClick={showToggle ? handleReveal : undefined}
      role={showToggle ? "button" : undefined}
      tabIndex={showToggle ? 0 : undefined}
      onKeyDown={showToggle ? (e) => e.key === "Enter" && handleReveal() : undefined}
      aria-label={ariaLabel || `${isRevealed ? "Hide" : "Reveal"} ${typeLabels[type]}`}
      title={isRevealed ? "Click to hide" : "Click to reveal"}
    >
      <span>{displayValue}</span>
      {showToggle && (
        <span className="text-muted-foreground">
          {isRevealed ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </span>
      )}
    </span>
  );
};

export default MaskedText;
