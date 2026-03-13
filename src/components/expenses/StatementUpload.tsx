import { useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useExpenseStore, AnalyzedTransaction } from "@/store/useExpenseStore";
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
  CheckCircle2,
  X,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseInsert } from "@/hooks/useExpenseTransactions";

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

interface StatementUploadProps {
  onSaveTransactions: (txs: ExpenseInsert[]) => Promise<void>;
}

export function StatementUpload({ onSaveTransactions }: StatementUploadProps) {
  const {
    step, file, isAnalyzing, transactions,
    setStep, setFile, setIsAnalyzing, setTransactions,
    updateTransactionCategory, reset,
    getTotalIncome, getTotalExpenses, getTotalDeductions,
  } = useExpenseStore();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "pdf") {
      toast({ title: "Unsupported file", description: "Please upload a CSV or PDF.", variant: "destructive" });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10 MB.", variant: "destructive" });
      return;
    }
    setSelectedFile(f);
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

      const { transactions: txs } = await res.json() as { transactions: AnalyzedTransaction[] };
      setTransactions(txs);
      setStep(3);
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
      setStep(1);
      setSelectedFile(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCategoryChange = useCallback(
    (index: number, value: string) => {
      const cat = CATEGORIES.find((c) => c.value === value);
      updateTransactionCategory(index, value, cat?.deductible ?? false);
    },
    [updateTransactionCategory]
  );

  const handleSaveAll = async () => {
    if (transactions.length === 0) return;
    setIsSaving(true);
    try {
      const inserts: ExpenseInsert[] = transactions
        .filter((t) => t.category !== "Income")
        .map((t) => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: t.category,
          is_deductible: t.is_deductible,
        }));
      await onSaveTransactions(inserts);
      toast({ title: "Saved!", description: `${inserts.length} transactions added to your tracker.` });
      reset();
      setSelectedFile(null);
    } catch {
      toast({ title: "Save failed", description: "Could not save transactions.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    reset();
    setSelectedFile(null);
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  /* ─── Step 1: Upload ─── */
  if (step === 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            AI Statement Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a bank or credit-card statement (CSV or PDF) and our AI will auto-categorize every transaction.
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200",
              dragActive
                ? "border-primary bg-primary/5"
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
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground text-sm">Drop your statement here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">CSV or PDF · Max 10 MB</p>
            </div>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground truncate max-w-[240px]">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
                <Button onClick={analyze} size="sm">Analyze</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  /* ─── Step 2: Processing ─── */
  if (step === 2) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Analyzing your statement…</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Our AI CPA is categorizing transactions from <span className="font-medium text-foreground">{file?.name}</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground/70">This typically takes 10–30 seconds.</p>
        </CardContent>
      </Card>
    );
  }

  /* ─── Step 3: Results ─── */
  const summaryCards = [
    { label: "Total Income", value: getTotalIncome(), icon: DollarSign, color: "text-emerald-600" },
    { label: "Total Expenses", value: getTotalExpenses(), icon: TrendingDown, color: "text-destructive" },
    { label: "Estimated Deductions", value: getTotalDeductions(), icon: Receipt, color: "text-primary" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
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

      {/* Results table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-serif text-xl">AI-Categorized Transactions</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>New Upload</Button>
            <Button size="sm" onClick={handleSaveAll} disabled={isSaving || transactions.length === 0} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save All to Tracker
            </Button>
          </div>
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
                  <TableHead className="w-[90px] text-center">Deductible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{tx.date}</TableCell>
                    <TableCell className="text-sm max-w-[260px] truncate">{tx.description}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{fmt(tx.amount)}</TableCell>
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
                      No transactions found in statement.
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
