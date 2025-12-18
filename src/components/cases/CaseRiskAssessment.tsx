import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ScanSearch, 
  Loader2, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Save
} from 'lucide-react';

interface RiskFlag {
  flag: string;
  severity: 'high' | 'medium' | 'low';
  details: string;
}

interface RiskAssessment {
  score: number;
  flags: RiskFlag[];
  extractedData: {
    agi: number | null;
    businessIncome: number | null;
    charitableContributions: number | null;
    totalItemizedDeductions: number | null;
    taxYear: number | null;
  };
  benchmarks: {
    avgCharitableDeduction: number | null;
    avgMortgageInterest: number | null;
  } | null;
}

interface CaseRiskAssessmentProps {
  caseId: string;
  clientId: string;
  taxReturnUrl: string | null;
  clientName: string | null;
}

export function CaseRiskAssessment({ caseId, clientId, taxReturnUrl, clientName }: CaseRiskAssessmentProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [saved, setSaved] = useState(false);

  const runAssessment = async () => {
    if (!taxReturnUrl) {
      toast({
        title: 'Tax Return Required',
        description: 'A tax return must be uploaded to run a risk assessment.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAssessment(null);
    setSaved(false);

    try {
      // Fetch the PDF from the signed URL
      const pdfResponse = await fetch(taxReturnUrl);
      if (!pdfResponse.ok) throw new Error('Failed to fetch tax return');
      
      const pdfBlob = await pdfResponse.blob();
      
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(pdfBlob);
      const pdfBase64 = await base64Promise;

      // Call the edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-audit-risk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ pdfBase64 }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result: RiskAssessment = await response.json();
      setAssessment(result);

      toast({
        title: 'Analysis Complete',
        description: `Risk score: ${result.score}/100`,
      });
    } catch (error) {
      console.error('Risk assessment error:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAssessment = async () => {
    if (!assessment) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('risk_assessments').insert({
        profile_id: clientId,
        risk_score: assessment.score,
        red_flags: assessment.flags as any,
        analyzed_at: new Date().toISOString(),
      });

      if (error) throw error;

      setSaved(true);
      toast({
        title: 'Assessment Saved',
        description: 'Risk assessment has been saved to the client profile.',
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save the assessment.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { label: 'High Risk', variant: 'destructive' as const, color: 'text-destructive' };
    if (score >= 40) return { label: 'Moderate Risk', variant: 'secondary' as const, color: 'text-yellow-600' };
    return { label: 'Low Risk', variant: 'default' as const, color: 'text-green-600' };
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={!taxReturnUrl}
          title={!taxReturnUrl ? 'Tax return required' : 'Run risk assessment'}
        >
          <ScanSearch className="h-4 w-4 mr-1" />
          Risk Check
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Audit Risk Assessment
          </DialogTitle>
          <DialogDescription>
            Analyze {clientName || 'client'}'s tax return for potential audit triggers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!assessment && !isAnalyzing && (
            <div className="text-center py-6">
              <ScanSearch className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Click below to analyze the tax return for audit risk factors.
              </p>
              <Button onClick={runAssessment}>
                <ScanSearch className="h-4 w-4 mr-2" />
                Run Analysis
              </Button>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Analyzing tax return...
              </p>
            </div>
          )}

          {assessment && (
            <div className="space-y-4">
              {/* Risk Score */}
              <div className="p-4 rounded-lg bg-secondary/50 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Risk Score</span>
                  <Badge variant={getRiskLevel(assessment.score).variant} className="text-lg px-3">
                    {assessment.score}/100
                  </Badge>
                </div>
                <Progress value={assessment.score} className="h-2 mb-2" />
                <p className={`text-center text-sm font-semibold ${getRiskLevel(assessment.score).color}`}>
                  {getRiskLevel(assessment.score).label}
                </p>
              </div>

              {/* Extracted Data */}
              <div className="text-sm space-y-2">
                <p className="font-medium text-xs uppercase text-muted-foreground">Extracted Data</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">AGI</p>
                    <p className="font-medium">{formatCurrency(assessment.extractedData.agi)}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">Business Income</p>
                    <p className="font-medium">{formatCurrency(assessment.extractedData.businessIncome)}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">Charitable</p>
                    <p className="font-medium">{formatCurrency(assessment.extractedData.charitableContributions)}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">Itemized Ded.</p>
                    <p className="font-medium">{formatCurrency(assessment.extractedData.totalItemizedDeductions)}</p>
                  </div>
                </div>
              </div>

              {/* Risk Flags */}
              {assessment.flags.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-medium text-xs uppercase text-muted-foreground">
                    Risk Flags ({assessment.flags.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {assessment.flags.map((flag, idx) => (
                      <div key={idx} className="p-2 rounded border bg-background">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className={`h-3 w-3 ${flag.severity === 'high' ? 'text-destructive' : 'text-yellow-600'}`} />
                          <span className="text-sm font-medium">{flag.flag}</span>
                          <Badge variant={flag.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs ml-auto">
                            {flag.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{flag.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600 p-3 rounded bg-green-50 dark:bg-green-950/20">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">No significant risk flags detected</span>
                </div>
              )}

              {/* Save Button */}
              <div className="flex justify-end pt-2 border-t">
                {saved ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Saved
                  </Badge>
                ) : (
                  <Button onClick={saveAssessment} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save to Profile
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
