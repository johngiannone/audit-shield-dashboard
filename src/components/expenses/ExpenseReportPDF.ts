import jsPDF from "jspdf";

interface ReportTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  is_deductible: boolean;
}

interface GenerateExpenseReportOptions {
  transactions: ReportTransaction[];
  totalIncome: number;
  totalExpenses: number;
  totalDeductions: number;
}

const BRAND_GOLD: [number, number, number] = [212, 175, 55];
const NAVY: [number, number, number] = [15, 23, 42];
const GRAY: [number, number, number] = [100, 116, 139];
const LIGHT_BG: [number, number, number] = [248, 250, 252];
const WHITE: [number, number, number] = [255, 255, 255];
const GREEN: [number, number, number] = [22, 163, 74];
const RED: [number, number, number] = [220, 38, 38];

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function generateExpenseReportPDF({
  transactions,
  totalIncome,
  totalExpenses,
  totalDeductions,
}: GenerateExpenseReportOptions): void {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const mx = 18;
  let y = 0;

  const ensurePage = (need: number) => {
    if (y + need > ph - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Header bar ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pw, 38, "F");

  // Gold accent line
  doc.setFillColor(...BRAND_GOLD);
  doc.rect(0, 38, pw, 2, "F");

  // Company name
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Audit Shield", mx, 18);

  // Report title
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Schedule C — Expense & Deduction Report", mx, 28);

  // Date
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, pw - mx, 28, { align: "right" });

  y = 50;

  // ── Summary cards ──
  const cardW = (pw - mx * 2 - 12) / 3;
  const cards = [
    { label: "Total Income", value: totalIncome, color: GREEN },
    { label: "Total Expenses", value: totalExpenses, color: RED },
    { label: "Estimated Deductions", value: totalDeductions, color: BRAND_GOLD },
  ];

  cards.forEach((c, i) => {
    const cx = mx + i * (cardW + 6);
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(cx, y, cardW, 28, 3, 3, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(c.label, cx + 6, y + 10);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...c.color);
    doc.text(fmt(c.value), cx + 6, y + 22);
  });

  y += 38;

  // ── Category breakdown ──
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Deduction Breakdown by Category", mx, y);
  y += 8;

  const deductibleTxs = transactions.filter((t) => t.is_deductible);
  const categoryTotals = new Map<string, number>();
  deductibleTxs.forEach((t) => {
    categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + Math.abs(t.amount));
  });
  const sortedCats = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);

  if (sortedCats.length > 0) {
    // Table header
    doc.setFillColor(...NAVY);
    doc.rect(mx, y, pw - mx * 2, 8, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Category", mx + 4, y + 5.5);
    doc.text("Amount", pw - mx - 4, y + 5.5, { align: "right" });
    y += 8;

    sortedCats.forEach(([ cat, total ], i) => {
      ensurePage(8);
      if (i % 2 === 0) {
        doc.setFillColor(...LIGHT_BG);
        doc.rect(mx, y, pw - mx * 2, 7, "F");
      }
      doc.setTextColor(...NAVY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(cat, mx + 4, y + 5);
      doc.setFont("helvetica", "bold");
      doc.text(fmt(total), pw - mx - 4, y + 5, { align: "right" });
      y += 7;
    });

    // Total row
    ensurePage(9);
    doc.setFillColor(...BRAND_GOLD);
    doc.rect(mx, y, pw - mx * 2, 8, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Total Deductions", mx + 4, y + 5.5);
    doc.text(fmt(totalDeductions), pw - mx - 4, y + 5.5, { align: "right" });
    y += 14;
  }

  // ── Transaction detail ──
  ensurePage(20);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Transaction Detail", mx, y);
  y += 8;

  // Table header
  const cols = [mx, mx + 22, mx + 90, pw - mx - 50, pw - mx - 16];
  doc.setFillColor(...NAVY);
  doc.rect(mx, y, pw - mx * 2, 8, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Date", cols[0] + 3, y + 5.5);
  doc.text("Description", cols[1] + 3, y + 5.5);
  doc.text("Category", cols[2] + 3, y + 5.5);
  doc.text("Amount", cols[3] + 3, y + 5.5);
  doc.text("Ded.", cols[4] + 3, y + 5.5);
  y += 8;

  transactions.forEach((tx, i) => {
    ensurePage(7);
    if (i % 2 === 0) {
      doc.setFillColor(...LIGHT_BG);
      doc.rect(mx, y, pw - mx * 2, 7, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...NAVY);
    doc.text(tx.date, cols[0] + 3, y + 5);
    doc.text(tx.description.substring(0, 32), cols[1] + 3, y + 5);
    doc.text(tx.category.substring(0, 20), cols[2] + 3, y + 5);
    doc.setFont("helvetica", "bold");
    doc.text(fmt(tx.amount), cols[3] + 3, y + 5);
    doc.setTextColor(tx.is_deductible ? GREEN[0] : GRAY[0], tx.is_deductible ? GREEN[1] : GRAY[1], tx.is_deductible ? GREEN[2] : GRAY[2]);
    doc.text(tx.is_deductible ? "Yes" : "No", cols[4] + 3, y + 5);
    y += 7;
  });

  // ── Footer ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFillColor(...BRAND_GOLD);
    doc.rect(0, ph - 12, pw, 12, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Audit Shield — Confidential", mx, ph - 4);
    doc.text(`Page ${p} of ${pages}`, pw - mx, ph - 4, { align: "right" });
  }

  doc.save("Schedule-C-Expense-Report.pdf");
}
