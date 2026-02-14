import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, AlertTriangle, CheckCircle, Shield, Loader2 } from "lucide-react";
import { detectEstimationAnomaly, EstimationAnomalyResult } from "@/utils/audit-logic";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExpenseEntry {
  id: string;
  category: string;
  amount: string;
}

const FreeScan = () => {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([
    { id: crypto.randomUUID(), category: "", amount: "" },
  ]);
  const [result, setResult] = useState<EstimationAnomalyResult | null>(null);
  const [email, setEmail] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [emailCaptured, setEmailCaptured] = useState(false);

  const addExpense = () => {
    setExpenses([...expenses, { id: crypto.randomUUID(), category: "", amount: "" }]);
  };

  const removeExpense = (id: string) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter((e) => e.id !== id));
    }
  };

  const updateExpense = (id: string, field: "category" | "amount", value: string) => {
    setExpenses(
      expenses.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const runAnalysis = () => {
    const expenseObj: Record<string, string> = {};
    expenses.forEach((e) => {
      if (e.category.trim() && e.amount.trim()) {
        expenseObj[e.category.trim()] = e.amount.trim();
      }
    });

    if (Object.keys(expenseObj).length === 0) {
      toast.error("Please add at least one expense with a category and amount");
      return;
    }

    const analysisResult = detectEstimationAnomaly(expenseObj);
    setResult(analysisResult);
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!emailConsent) {
      toast.error("Please agree to receive communications before submitting");
      return;
    }

    setSubmittingEmail(true);
    try {
      const { error } = await supabase.from("newsletter_subscribers").insert({
        email: email.trim().toLowerCase(),
        source: "free_scan_consult",
      });

      if (error) {
        if (error.code === "23505") {
          toast.info("You're already on our list! We'll be in touch soon.");
        } else {
          throw error;
        }
      } else {
        toast.success("Thank you! We'll contact you within 24 hours.");
      }
      setEmailCaptured(true);
    } catch (error) {
      console.error("Error capturing email:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmittingEmail(false);
    }
  };

  const resetAnalysis = () => {
    setResult(null);
    setEmail("");
    setEmailCaptured(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full mb-6">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Free Audit Risk Scan</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
            Is Your Tax Return an Audit Target?
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Enter your business expenses below. Our AI will analyze them for IRS audit red flags 
            like round numbers that suggest estimated—not documented—amounts.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        {!result ? (
          <Card className="shadow-xl border-slate-200">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Enter Your Expenses</CardTitle>
              <CardDescription>
                Add your Schedule C business expense categories and amounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {expenses.map((expense, index) => (
                <div key={expense.id} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="Category (e.g., Office Supplies)"
                      value={expense.category}
                      onChange={(e) => updateExpense(expense.id, "category", e.target.value)}
                    />
                  </div>
                  <div className="w-36">
                    <Input
                      placeholder="$0.00"
                      value={expense.amount}
                      onChange={(e) => updateExpense(expense.id, "amount", e.target.value)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExpense(expense.id)}
                    disabled={expenses.length === 1}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" onClick={addExpense} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Expense
              </Button>

              <div className="pt-4">
                <Button onClick={runAnalysis} className="w-full" size="lg">
                  Analyze My Expenses
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Results Card */}
            <Card className={`shadow-xl ${result.isHighRisk ? "border-destructive/50" : "border-green-500/50"}`}>
              <CardHeader className="text-center pb-2">
                {result.isHighRisk ? (
                  <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                ) : (
                  <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                )}
                <CardTitle className="font-serif text-2xl">
                  {result.isHighRisk ? "High Audit Risk Detected" : "Low Audit Risk"}
                </CardTitle>
                <CardDescription>
                  Estimation Score: {result.riskScore}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result.isHighRisk ? (
                  <div className="space-y-6">
                    {/* Blurred Report Preview */}
                    <div className="relative">
                      <div className="blur-sm select-none pointer-events-none bg-slate-50 rounded-lg p-6 space-y-3">
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                        <div className="space-y-2 mt-4">
                          {result.flaggedItems.slice(0, 3).map((item, i) => (
                            <div key={i} className="flex justify-between">
                              <div className="h-3 bg-red-200 rounded w-1/3"></div>
                              <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-3 bg-red-50 rounded">
                          <div className="h-3 bg-red-200 rounded w-full"></div>
                          <div className="h-3 bg-red-200 rounded w-2/3 mt-2"></div>
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                        <div className="text-center">
                          <Shield className="h-8 w-8 mx-auto text-primary mb-2" />
                          <p className="font-medium text-foreground">Full Report Available</p>
                          <p className="text-sm text-muted-foreground">Book a free consult to unlock</p>
                        </div>
                      </div>
                    </div>

                    {/* Alert Message */}
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <p className="text-sm text-destructive font-medium">
                        {result.message}
                      </p>
                    </div>

                    {/* Email Capture */}
                    {!emailCaptured ? (
                      <div className="bg-slate-50 rounded-lg p-6 text-center space-y-4">
                        <h3 className="font-serif text-xl font-semibold">
                          Get Your Free Consultation
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Our Enrolled Agents can help you fix these issues before the IRS finds them.
                        </p>
                        <div className="flex gap-3 max-w-md mx-auto">
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex-1"
                          />
                          <Button onClick={handleEmailSubmit} disabled={submittingEmail || !emailConsent}>
                            {submittingEmail ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Book Free Consult"
                            )}
                          </Button>
                        </div>
                        <label className="flex items-start gap-2 max-w-md mx-auto text-left cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailConsent}
                            onChange={(e) => setEmailConsent(e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-xs text-muted-foreground">
                            I agree to receive email communications about my audit risk consultation.
                            You can unsubscribe at any time.
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <h3 className="font-semibold text-green-800">You're All Set!</h3>
                        <p className="text-sm text-green-700">
                          We'll contact you within 24 hours to schedule your free consultation.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-center text-muted-foreground">
                      Your expense amounts don't show obvious signs of estimation. 
                      Keep maintaining good records!
                    </p>
                    {result.flaggedItems.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-amber-800 mb-2">
                          Minor observations:
                        </p>
                        <ul className="text-sm text-amber-700 space-y-1">
                          {result.flaggedItems.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reset Button */}
            <div className="text-center">
              <Button variant="outline" onClick={resetAnalysis}>
                Run Another Scan
              </Button>
            </div>
          </div>
        )}

        {/* Trust Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            This tool provides statistical analysis based on IRS audit patterns. 
            It is not an official IRS determination.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FreeScan;
