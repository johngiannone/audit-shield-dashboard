import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { RiskGauge } from '@/components/audit/RiskGauge';
import { RiskFlagCard } from '@/components/audit/RiskFlagCard';
import { DefenseUpsellBanner } from '@/components/audit/DefenseUpsellBanner';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Shield, 
  Loader2,
  DollarSign,
  Info
} from 'lucide-react';

interface ExtractedData {
  agi: number | null;
  businessIncome: number | null;
  charitableContributions: number | null;
  totalItemizedDeductions: number | null;
  taxYear: number | null;
}

interface RiskFlag {
  flag: string;
  severity: 'high' | 'medium' | 'low';
  details: string;
}

interface RiskAssessment {
  score: number;
  flags: RiskFlag[];
  extractedData: ExtractedData;
  benchmarks: {
    avgCharitableDeduction: number | null;
    avgMortgageInterest: number | null;
  } | null;
}

export default function AuditRiskCheck() {
  const { toast } = useToast();
  const { profileId } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [priorYearLosses, setPriorYearLosses] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [hasActivePlan, setHasActivePlan] = useState<boolean | null>(null);

  // Check if user has an active plan
  useEffect(() => {
    const checkPlan = async () => {
      if (!profileId) return;
      
      const { data } = await supabase
        .from('audit_plans')
        .select('id, status')
        .eq('profile_id', profileId)
        .eq('status', 'active')
        .limit(1);
      
      setHasActivePlan(data && data.length > 0);
    };
    
    checkPlan();
  }, [profileId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a PDF file.',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      setAssessment(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please upload your Form 1040 PDF first.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAssessment(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const pdfBase64 = await base64Promise;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-audit-risk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            pdfBase64,
            priorYearLosses: priorYearLosses > 0 ? priorYearLosses : undefined
          }),
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
        description: `Your audit risk score is ${result.score}/100`,
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'An error occurred during analysis.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'Not found';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  // Determine if we should show upsell
  const showUpsell = assessment && assessment.score > 50 && hasActivePlan === false;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Audit Risk Check | Return Shield</title>
        <meta name="description" content="Analyze your tax return for potential audit risk factors" />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Audit Risk Check</h1>
          <p className="text-muted-foreground mt-1">
            Upload your Form 1040 to analyze potential audit risk factors
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Tax Return
              </CardTitle>
              <CardDescription>
                Upload your Form 1040 PDF for AI-powered analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tax-return">Form 1040 PDF</Label>
                <div className="mt-2">
                  <Input
                    id="tax-return"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>
                {file && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {file.name}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="prior-losses">
                  Prior Years with Business Losses (optional)
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  How many of the past 2 years had business losses?
                </p>
                <Input
                  id="prior-losses"
                  type="number"
                  min="0"
                  max="2"
                  value={priorYearLosses}
                  onChange={(e) => setPriorYearLosses(parseInt(e.target.value) || 0)}
                  className="w-24"
                />
              </div>

              <Button 
                onClick={handleAnalyze} 
                disabled={!file || isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Analyze Risk
                  </>
                )}
              </Button>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Privacy Notice</AlertTitle>
                <AlertDescription className="text-xs">
                  Your tax data is processed securely and is not stored. Analysis is performed in real-time and results are only shown to you.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="space-y-4">
            {assessment ? (
              <>
                {/* Risk Gauge Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-center">Audit Risk Score</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center py-6">
                    <RiskGauge score={assessment.score} size={240} />
                  </CardContent>
                </Card>

                {/* Extracted Data Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Extracted Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax Year</span>
                        <span className="font-medium">{assessment.extractedData.taxYear || 'Not found'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Adjusted Gross Income (AGI)</span>
                        <span className="font-medium">{formatCurrency(assessment.extractedData.agi)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Business Income</span>
                        <span className="font-medium">{formatCurrency(assessment.extractedData.businessIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Charitable Contributions</span>
                        <span className="font-medium">{formatCurrency(assessment.extractedData.charitableContributions)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Itemized Deductions</span>
                        <span className="font-medium">{formatCurrency(assessment.extractedData.totalItemizedDeductions)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Flags Section */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    Risk Flags ({assessment.flags.length})
                  </h3>
                  {assessment.flags.length > 0 ? (
                    <div className="space-y-3">
                      {assessment.flags.map((flag, index) => (
                        <RiskFlagCard
                          key={index}
                          flag={flag.flag}
                          severity={flag.severity}
                          details={flag.details}
                          yourValue={
                            flag.flag.includes('Charity') ? assessment.extractedData.charitableContributions :
                            flag.flag.includes('Business') ? assessment.extractedData.businessIncome :
                            undefined
                          }
                          benchmarkValue={
                            flag.flag.includes('Charity') ? assessment.benchmarks?.avgCharitableDeduction :
                            undefined
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-green-500/10 border-green-500/20">
                      <CardContent className="flex items-center gap-3 py-4">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-700">No Significant Risk Flags</p>
                          <p className="text-sm text-muted-foreground">Your return appears to be within normal parameters</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[300px]">
                <CardContent className="text-center py-12">
                  <Shield className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No Analysis Yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Upload your Form 1040 PDF and click "Analyze Risk" to see your audit risk assessment.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
        {/* Spacer for sticky footer */}
        {showUpsell && <div className="h-24" />}
      </div>

      {/* Sticky Upsell Banner */}
      {showUpsell && <DefenseUpsellBanner riskScore={assessment.score} />}
    </DashboardLayout>
  );
}
