import { useCallback, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useExpenseStore, AnalyzedTransaction } from "@/store/useExpenseStore";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  Loader2,
  DollarSign,
  TrendingDown,
  Receipt,
  RotateCcw,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "Income", deductible: false },
  { value: "Advertising", deductible: true },
  { value: "Car & Truck Expenses", deductible: true },
  { value: "Commissions & Fees", deductible: true },
  { value: "Contract Labor", deductible: true },
  { value: "Insurance", deductible: true },
  { value: "Legal & Professional Services", deductible: true },
  { value: "Office Expenses", deductible: true },
  { value: "Rent or Lease", deductible: true },
  { value: "Repairs & Maintenance", deductible: true },
  { value: "Supplies", deductible: true },
  { value: "Taxes & Licenses", deductible: true },
  { value: "Travel", deductible: true },
  { value: "Meals", deductible: true },
  { value: "Utilities", deductible: true },
  { value: "Wages", deductible: true },
  { value: "Other Deductible Expense", deductible: true },
  { value: "Personal/Non-deductible", deductible: false },
];

/* ────────── Step 1: Upload Dropzone ────────── */

function UploadStep() {
  const { setFile, setStep, setIsAnalyzing, setTransactions } = useExpenseStore();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "pdf") {
      toast({ title: "Unsupported file", description: "Please upload a CSV or PDF file.", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 20 MB.", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const analyze = async () => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setStep(2);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-statement`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || "Analysis failed");
      }

      const { transactions } = await res.json() as { transactions: AnalyzedTransaction[] };
      setTransactions(transactions);
      setStep(3);
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
      setStep(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 cursor-pointer transition-all duration-200",
          dragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="h-7 w-7 text-primary" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Drop your bank statement here</p>
          <p className="text-sm text-muted-foreground mt-1">CSV or PDF · Max 20 MB</p>
        </div>
      </div>

      {selectedFile && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground truncate max-w-[260px]">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
                <X className="h-4 w-4" />
              </Button>
              <Button onClick={analyze}>Analyze Statement</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ────────── Step 2: Processing ────────── */

function ProcessingStep() {
  const file = useExpenseStore((s) => s.file);
  return (
    <div className="max-w-md mx-auto text-center py-16 space-y-6">
      <div className="w-20 h-20 rounded-full gradient-primary mx-auto flex items-center justify-center shadow-lg animate-pulse">
        <Loader2 className="h-9 w-9 text-primary-foreground animate-spin" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">Analyzing your statement…</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Our AI CPA is reviewing <span className="font-medium text-foreground">{file?.name}</span> and categorizing every transaction into IRS Schedule C categories.
        </p>
      </div>
      <p className="text-xs text-muted-foreground/70">This typically takes 10–30 seconds.</p>
    </div>
  );
}

/* ────────── Step 3: Results ────────── */

function ResultsStep() {
  const { transactions, updateTransactionCategory, reset, getTotalIncome, getTotalExpenses, getTotalDeductions } = useExpenseStore();

  const handleCategoryChange = useCallback(
    (index: number, value: string) => {
      const cat = CATEGORIES.find((c) => c.value === value);
      updateTransactionCategory(index, value, cat?.deductible ?? false);
    },
    [updateTransactionCategory]
  );

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const summaryCards = [
    { label: "Total Income", value: getTotalIncome(), icon: DollarSign, color: "text-emerald-600" },
    { label: "Total Expenses", value: getTotalExpenses(), icon: TrendingDown, color: "text-destructive" },
    { label: "Estimated Deductions", value: getTotalDeductions(), icon: Receipt, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={cn("h-5 w-5", c.color)} />
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-bold", c.color)}>{fmt(c.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transaction table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categorized Transactions</CardTitle>
          <Button variant="outline" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> New Upload
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-[110px]">Amount</TableHead>
                  <TableHead className="w-[220px]">Category</TableHead>
                  <TableHead className="w-[100px] text-center">Deductible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{tx.date}</TableCell>
                    <TableCell className="text-sm max-w-[260px] truncate">{tx.description}</TableCell>
                    <TableCell className="text-sm text-right font-mono">
                      {fmt(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <Select value={tx.category} onValueChange={(v) => handleCategoryChange(i, v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value} className="text-xs">
                              {c.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      {tx.is_deductible ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ────────── Page ────────── */

const STEP_LABELS = ["Upload", "Processing", "Results"];

const DeductionFinder = () => {
  const step = useExpenseStore((s) => s.step);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground">
              AI Deduction Finder
            </h1>
          </div>
          <p className="text-muted-foreground">
            Upload a bank or credit-card statement and let our AI CPA categorize every transaction.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 max-w-md">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const active = step === num;
            const done = step > num;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : num}
                </div>
                <span className={cn("text-xs font-medium hidden sm:inline", active ? "text-foreground" : "text-muted-foreground")}>
                  {label}
                </span>
                {i < STEP_LABELS.length - 1 && (
                  <div className={cn("flex-1 h-px", done ? "bg-primary/40" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        {step === 1 && <UploadStep />}
        {step === 2 && <ProcessingStep />}
        {step === 3 && <ResultsStep />}
      </div>
    </DashboardLayout>
  );
};

export default DeductionFinder;
