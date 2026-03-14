import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingDown, TrendingUp, Receipt, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { generateExpenseReportPDF } from "./ExpenseReportPDF";
import type { ExpenseTransaction } from "@/hooks/useExpenseTransactions";

interface Props {
  transactions: ExpenseTransaction[];
  isLoading: boolean;
}

export function ExpenseSummary({ transactions, isLoading }: Props) {
  const totalExpenses = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const deductible = transactions.filter((t) => t.is_deductible).reduce((s, t) => s + Number(t.amount), 0);
  const nonDeductible = totalExpenses - deductible;

  const cards = [
    { label: "Total Expenses", value: totalExpenses, icon: Receipt, color: "text-foreground" },
    { label: "Deductible", value: deductible, icon: TrendingDown, color: "text-green-600" },
    { label: "Non-Deductible", value: nonDeductible, icon: TrendingUp, color: "text-destructive" },
    { label: "Transactions", value: transactions.length, icon: DollarSign, color: "text-primary", isCurrency: false },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const handleDownload = () => {
    const income = transactions.filter((t) => t.category === "Income").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    generateExpenseReportPDF({
      transactions: transactions.map((t) => ({
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        category: t.category,
        is_deductible: t.is_deductible,
      })),
      totalIncome: income,
      totalExpenses: totalExpenses,
      totalDeductions: deductible,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Summary</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={transactions.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download Report
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-muted">
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className={`text-2xl font-bold ${c.color}`}>
                  {c.isCurrency === false
                    ? c.value
                    : `$${c.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
