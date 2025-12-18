import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Shield, 
  Loader2,
  TrendingUp,
  DollarSign,
  AlertCircle,
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
  const [file, setFile] = useState<File | null>(null);
  const [priorYearLosses, setPriorYearLosses] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);

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

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { label: 'High Risk', color: 'bg-destructive', textColor: 'text-destructive' };
    if (score >= 40) return { label: 'Moderate Risk', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    return { label: 'Low Risk', color: 'bg-green-500', textColor: 'text-green-600' };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'Not found';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

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
                {/* Risk Score Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Risk Score
                      </span>
                      <Badge 
                        variant={assessment.score >= 70 ? 'destructive' : assessment.score >= 40 ? 'secondary' : 'default'}
                        className="text-lg px-3 py-1"
                      >
                        {assessment.score}/100
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Progress 
                        value={assessment.score} 
                        className="h-3"
                      />
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Low Risk</span>
                        <span className="text-yellow-600">Moderate</span>
                        <span className="text-destructive">High Risk</span>
                      </div>
                      <p className={`text-center font-semibold ${getRiskLevel(assessment.score).textColor}`}>
                        {getRiskLevel(assessment.score).label}
                      </p>
                    </div>
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

                {/* Risk Flags Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Risk Flags ({assessment.flags.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {assessment.flags.length > 0 ? (
                      <div className="space-y-3">
                        {assessment.flags.map((flag, index) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              {flag.severity === 'high' ? (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                              )}
                              <span className="font-medium">{flag.flag}</span>
                              <Badge variant={getSeverityColor(flag.severity)} className="ml-auto">
                                {flag.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{flag.details}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span>No significant risk flags detected</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
      </div>
    </DashboardLayout>
  );
}
