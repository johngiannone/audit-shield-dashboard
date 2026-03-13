import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TranscriptWizard } from "./TranscriptWizard";

// Mock image imports
vi.mock("@/assets/irs-step-1.png", () => ({ default: "irs-step-1.png" }));
vi.mock("@/assets/irs-step-1b.png", () => ({ default: "irs-step-1b.png" }));
vi.mock("@/assets/irs-step-1c.png", () => ({ default: "irs-step-1c.png" }));
vi.mock("@/assets/irs-step-2.png", () => ({ default: "irs-step-2.png" }));
vi.mock("@/assets/irs-step-2b.png", () => ({ default: "irs-step-2b.png" }));
vi.mock("@/assets/irs-step-4.png", () => ({ default: "irs-step-4.png" }));

describe("TranscriptWizard", () => {
  const setup = () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<TranscriptWizard open={true} onOpenChange={onOpenChange} />);
    return { onOpenChange, user };
  };

  it("renders step 1 by default", () => {
    setup();
    expect(screen.getByText("Help Me Get My Transcript")).toBeInTheDocument();
    expect(screen.getByText(/Go to IRS.gov and Sign In/)).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  });

  it("navigates to step 2 when clicking Next", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/Navigate to Tax Records/)).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
  });

  it("navigates through all 4 steps sequentially", async () => {
    const { user } = setup();

    // Step 1 → 2
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/Navigate to Tax Records/)).toBeInTheDocument();

    // Step 2 → 3
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/Select ACCOUNT Transcript/)).toBeInTheDocument();
    expect(screen.getByText("⚠️ Critical Step!")).toBeInTheDocument();

    // Step 3 → 4
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/Download the 2025 PDF/)).toBeInTheDocument();
  });

  it("shows Done button on last step instead of Next", async () => {
    const { user } = setup();

    // Navigate to step 4
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole("button", { name: /next/i }));
    }

    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
  });

  it("navigates back with Back button", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/Navigate to Tax Records/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText(/Go to IRS.gov and Sign In/)).toBeInTheDocument();
  });

  it("disables Back button on first step", () => {
    setup();
    const backBtn = screen.getByRole("button", { name: /back/i });
    expect(backBtn).toBeDisabled();
  });

  it("calls onOpenChange(false) when Done is clicked", async () => {
    const { user, onOpenChange } = setup();

    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole("button", { name: /next/i }));
    }

    await user.click(screen.getByRole("button", { name: /done/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders the IRS external link on step 1", () => {
    setup();
    const link = screen.getByRole("link", { name: /Open IRS.gov\/account/i });
    expect(link).toHaveAttribute("href", "https://www.irs.gov/payments/your-online-account");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows tip text on each step", async () => {
    const { user } = setup();
    expect(screen.getByText(/If you don't have an ID.me account/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/Look for the Transcripts card/)).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <TranscriptWizard open={false} onOpenChange={onOpenChange} />
    );
    expect(container.querySelector("[role='dialog']")).not.toBeInTheDocument();
  });

  it("shows step counter text", () => {
    setup();
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
  });
});
