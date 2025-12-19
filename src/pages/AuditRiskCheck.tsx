import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { RiskGauge } from '@/components/audit/RiskGauge';
import { RiskFlagCard } from '@/components/audit/RiskFlagCard';
import { DefenseUpsellBanner } from '@/components/audit/DefenseUpsellBanner';
import { RiskFactorBreakdown } from '@/components/audit/RiskFactorBreakdown';
import { cn } from '@/lib/utils';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Shield, 
  Loader2,
  DollarSign,
  Info,
  AlertTriangle,
  MapPin,
  HelpCircle,
  Car,
  Download
} from 'lucide-react';

type FormType = '1040' | '1120-S' | '1120';

interface CharityDonation {
  name: string;
  amount: number | null;
}

interface CharityValidation {
  name: string;
  amount: number | null;
  verified: boolean;
  matchedName: string | null;
  ein: string | null;
}

interface ExtractedData {
  agi: number | null;
  businessIncome: number | null;
  charitableContributions: number | null;
  totalItemizedDeductions: number | null;
  taxYear: number | null;
  naicsCode: string | null;
  grossReceipts: number | null;
  netProfit: number | null;
  occupation: string | null;
  wagesIncome: number | null;
  stateCode: string | null;
  fullAddress: string | null;
  charityList: CharityDonation[];
  hasScheduleC: boolean;
}

interface LifestyleData {
  propertyTax: number | null;
  homeValue: number | null;
  source: 'api' | 'manual' | null;
}

interface NeighborhoodData {
  zipCode: string;
  medianIncome: number;
  userAgi: number;
  incomeRatio: number;
  isOutlier: boolean;
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
  industryBenchmark: {
    industryName: string;
    avgProfitMargin: number;
    userProfitMargin: number;
  } | null;
  geoRisk: {
    stateCode: string;
    stateName: string;
    auditRate: number;
    isHighRisk: boolean;
  } | null;
  lifestyleData: LifestyleData | null;
  charityValidations: CharityValidation[];
  neighborhoodData: NeighborhoodData | null;
}

// Calculate individual risk factor scores from assessment data
function calculateRiskFactors(assessment: RiskAssessment) {
  const { extractedData, flags, industryBenchmark, geoRisk } = assessment;
  
  // Deduction Intensity: Based on charity ratio and itemized deductions vs AGI
  let deductionIntensity = 20; // Base score
  if (extractedData.agi && extractedData.charitableContributions) {
    const charityRatio = extractedData.charitableContributions / extractedData.agi;
    if (charityRatio > 0.15) deductionIntensity = 90;
    else if (charityRatio > 0.10) deductionIntensity = 70;
    else if (charityRatio > 0.05) deductionIntensity = 40;
  }
  if (extractedData.agi && extractedData.totalItemizedDeductions) {
    const deductionRatio = extractedData.totalItemizedDeductions / extractedData.agi;
    if (deductionRatio > 0.30) deductionIntensity = Math.max(deductionIntensity, 80);
    else if (deductionRatio > 0.20) deductionIntensity = Math.max(deductionIntensity, 50);
  }
  // Check for deduction-related flags
  if (flags.some(f => f.flag.includes('Charity') || f.flag.includes('Deduction'))) {
    deductionIntensity = Math.min(100, deductionIntensity + 20);
  }
  
  // Industry Alignment: Based on NAICS profit margin comparison
  let industryAlignment = 15; // Base low score (good alignment)
  if (industryBenchmark) {
    const marginDiff = industryBenchmark.avgProfitMargin - industryBenchmark.userProfitMargin;
    const percentBelow = (marginDiff / industryBenchmark.avgProfitMargin) * 100;
    
    if (industryBenchmark.userProfitMargin < industryBenchmark.avgProfitMargin * 0.5) {
      industryAlignment = 95; // Very high risk - below 50% of industry avg
    } else if (industryBenchmark.userProfitMargin < industryBenchmark.avgProfitMargin * 0.75) {
      industryAlignment = 65; // Medium risk
    } else if (industryBenchmark.userProfitMargin < industryBenchmark.avgProfitMargin) {
      industryAlignment = 35; // Slightly below average
    }
  }
  // Check for industry-related flags
  if (flags.some(f => f.flag.includes('Profitability') || f.flag.includes('Industry'))) {
    industryAlignment = Math.min(100, industryAlignment + 15);
  }
  
  // Income Consistency: Based on occupation wage comparison
  let incomeConsistency = 10; // Base low score (consistent)
  if (flags.some(f => f.flag.includes('Income Mismatch'))) {
    incomeConsistency = 75; // Medium-high risk if income mismatch detected
  } else if (extractedData.occupation && extractedData.wagesIncome) {
    // If we have data but no flag, it's reasonably consistent
    incomeConsistency = 20;
  }
  
  // Audit Environment: Based on geographic IRS data
  let auditEnvironment = 25; // Base average score
  if (geoRisk) {
    // Normalize audit rate - higher rate = higher risk
    // Rates range from ~2.0 to ~6.8 per 1000
    const normalizedRate = ((geoRisk.auditRate - 2.0) / (6.8 - 2.0)) * 100;
    auditEnvironment = Math.round(Math.max(10, Math.min(100, normalizedRate)));
    
    if (geoRisk.isHighRisk) {
      auditEnvironment = Math.max(auditEnvironment, 80);
    }
  }
  
  return {
    deductionIntensity: Math.round(Math.min(100, Math.max(0, deductionIntensity))),
    industryAlignment: Math.round(Math.min(100, Math.max(0, industryAlignment))),
    incomeConsistency: Math.round(Math.min(100, Math.max(0, incomeConsistency))),
    auditEnvironment: Math.round(Math.min(100, Math.max(0, auditEnvironment))),
  };
}

// Calculate weighted total score
function calculateTotalScore(factors: ReturnType<typeof calculateRiskFactors>) {
  return Math.round(
    factors.deductionIntensity * 0.30 +
    factors.industryAlignment * 0.25 +
    factors.incomeConsistency * 0.25 +
    factors.auditEnvironment * 0.20
  );
}

export default function AuditRiskCheck() {
  const { toast } = useToast();
  const { profileId } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [formType, setFormType] = useState<FormType>('1040');
  const [priorYearLosses, setPriorYearLosses] = useState<number>(0);
  const [manualHousingCost, setManualHousingCost] = useState<number>(0);
  const [activeShareholders, setActiveShareholders] = useState<number>(0);
  const [totalAssets, setTotalAssets] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [hasActivePlan, setHasActivePlan] = useState<boolean | null>(null);
  
  // Schedule C (business) specific fields for 1040
  const [businessYearsActive, setBusinessYearsActive] = useState<number>(0);
  const [profitableYears, setProfitableYears] = useState<number>(0);
  const [hasMileageLog, setHasMileageLog] = useState<'yes' | 'no' | ''>('');
  const [scheduleCDetected, setScheduleCDetected] = useState(false);

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
      setScheduleCDetected(false);
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
            formType,
            priorYearLosses: priorYearLosses > 0 ? priorYearLosses : undefined,
            manualHousingCost: manualHousingCost > 0 ? manualHousingCost : undefined,
            activeShareholders: formType === '1120-S' && activeShareholders > 0 ? activeShareholders : undefined,
            totalAssets: formType === '1120' && totalAssets > 0 ? totalAssets : undefined,
            // Schedule C business fields
            businessYearsActive: formType === '1040' && businessYearsActive > 0 ? businessYearsActive : undefined,
            profitableYears: formType === '1040' && profitableYears > 0 ? profitableYears : undefined,
            hasMileageLog: formType === '1040' && hasMileageLog ? hasMileageLog : undefined
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result: RiskAssessment = await response.json();
      setAssessment(result);
      
      // Check if Schedule C was detected in 1040
      if (formType === '1040' && result.extractedData?.hasScheduleC) {
        setScheduleCDetected(true);
      }

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

  // Calculate risk factors if assessment exists
  const riskFactors = assessment ? calculateRiskFactors(assessment) : null;
  const totalScore = riskFactors ? calculateTotalScore(riskFactors) : 0;
  
  // Show urgent CTA if score > 65
  const isHighRisk = totalScore > 65;
  
  // Determine if we should show upsell
  const showUpsell = assessment && totalScore > 50 && hasActivePlan === false;

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
            Upload your tax return to analyze potential audit risk factors
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
              {/* Return Type Selector */}
              <div>
                <Label htmlFor="form-type">Select Return Type</Label>
                <Select value={formType} onValueChange={(value: FormType) => setFormType(value)}>
                  <SelectTrigger id="form-type" className="mt-2">
                    <SelectValue placeholder="Select return type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1040">Individual (1040)</SelectItem>
                    <SelectItem value="1120-S">S-Corp (1120-S)</SelectItem>
                    <SelectItem value="1120">C-Corp (1120)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tax-return">
                  {formType === '1040' ? 'Form 1040 PDF' : 
                   formType === '1120-S' ? 'Form 1120-S PDF' : 
                   'Form 1120 PDF'}
                </Label>
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

              {/* S-Corp specific field */}
              {formType === '1120-S' && (
                <div>
                  <Label htmlFor="shareholders">
                    Number of Active Shareholders
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Total number of shareholders who were active during the tax year
                  </p>
                  <Input
                    id="shareholders"
                    type="number"
                    min="1"
                    placeholder="e.g., 2"
                    value={activeShareholders || ''}
                    onChange={(e) => setActiveShareholders(parseInt(e.target.value) || 0)}
                    className="w-32"
                  />
                </div>
              )}

              {/* C-Corp specific field */}
              {formType === '1120' && (
                <div>
                  <Label htmlFor="total-assets">
                    Total Assets (End of Year)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Total assets from Schedule L, Line 15, Column (d)
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      id="total-assets"
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="1,000,000"
                      value={totalAssets || ''}
                      onChange={(e) => setTotalAssets(parseInt(e.target.value) || 0)}
                      className="w-40"
                    />
                  </div>
                </div>
              )}

              {/* Schedule C Business Risk Card - shown when Schedule C is detected in 1040 */}
              {formType === '1040' && scheduleCDetected && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-5 w-5" />
                      Business Audit Risk Detected
                    </CardTitle>
                    <CardDescription>
                      Schedule C detected on your 1040. Please provide additional business information for accurate risk analysis.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="business-years">
                        How many years has this business been active?
                      </Label>
                      <Input
                        id="business-years"
                        type="number"
                        min="1"
                        max="50"
                        placeholder="e.g., 3"
                        value={businessYearsActive || ''}
                        onChange={(e) => setBusinessYearsActive(parseInt(e.target.value) || 0)}
                        className="w-24 mt-2"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="profitable-years">
                        How many of the last 5 years showed a profit?
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Critical for Hobby Loss rules - IRS requires profit in 3 of 5 years
                      </p>
                      <Input
                        id="profitable-years"
                        type="number"
                        min="0"
                        max="5"
                        placeholder="0-5"
                        value={profitableYears || ''}
                        onChange={(e) => setProfitableYears(Math.min(5, parseInt(e.target.value) || 0))}
                        className="w-24"
                      />
                    </div>
                    
                    <div>
                      <Label>Do you have a mileage log for vehicle expenses claimed?</Label>
                      <Select value={hasMileageLog} onValueChange={(value: 'yes' | 'no') => setHasMileageLog(value)}>
                        <SelectTrigger className="w-32 mt-2">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                      {hasMileageLog === 'no' && (
                        <div className="mt-2 space-y-2">
                          <Alert variant="destructive" className="py-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              <strong>Critical Risk:</strong> Without a contemporaneous mileage log, vehicle expense deductions are <strong>automatically disallowed</strong> in an audit - no exceptions. IRS requires records made at or near the time of each trip.
                            </AlertDescription>
                          </Alert>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full border-amber-500/50 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                            onClick={() => {
                              // Generate and download mileage log template
                              const csvContent = `Date,Starting Location,Destination,Business Purpose,Miles Driven,Notes
${new Date().toISOString().split('T')[0]},Office,Client Meeting,Sales presentation to ABC Corp,15.2,Round trip
YYYY-MM-DD,Starting Address,Ending Address,Business Purpose Description,0.0,Additional notes

INSTRUCTIONS:
- Record EVERY business trip at or near the time it occurs
- Include: Date - Starting Point - Destination - Business Purpose - Miles
- Keep receipts for parking and tolls
- Do NOT include commuting miles (home to regular work location)
- Personal miles must be tracked separately
- Contemporaneous means recorded "at or near the time" of the expense
- The IRS defines this as within one week of the trip

This log format complies with IRS requirements under Treas. Reg. 1.274-5T(c)(2)`;
                              
                              const blob = new Blob([csvContent], { type: 'text/csv' });
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'IRS_Compliant_Mileage_Log_Template.csv';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                              
                              toast({
                                title: 'Mileage Log Template Downloaded',
                                description: 'Start logging your trips immediately to protect your deductions.',
                              });
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Download Compliant Mileage Log Template
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

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

              <div>
                <Label htmlFor="housing-cost">
                  Monthly Housing Cost (optional)
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Enter mortgage/rent if you want lifestyle mismatch analysis
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    id="housing-cost"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="2,500"
                    value={manualHousingCost || ''}
                    onChange={(e) => setManualHousingCost(parseInt(e.target.value) || 0)}
                    className="w-32"
                  />
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>
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
            {assessment && riskFactors ? (
              <>
                {/* Risk Factor Breakdown - NEW */}
                <RiskFactorBreakdown
                  deductionIntensity={riskFactors.deductionIntensity}
                  industryAlignment={riskFactors.industryAlignment}
                  incomeConsistency={riskFactors.incomeConsistency}
                  auditEnvironment={riskFactors.auditEnvironment}
                />

                {/* High Risk CTA */}
                {isHighRisk && hasActivePlan === false && (
                  <Card className="border-destructive bg-destructive/5">
                    <CardContent className="py-4">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <AlertTriangle className="h-8 w-8 text-destructive animate-pulse" />
                        <div>
                          <p className="font-semibold text-destructive">High Audit Risk Detected</p>
                          <p className="text-sm text-muted-foreground">
                            Your return has a {totalScore}% audit probability
                          </p>
                        </div>
                        <Button 
                          onClick={() => navigate('/plans')}
                          className={cn(
                            "w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground",
                            "animate-pulse shadow-lg shadow-destructive/25"
                          )}
                          size="lg"
                        >
                          <Shield className="mr-2 h-5 w-5" />
                          {(formType === '1120' || formType === '1120-S') && totalScore > 50 
                            ? 'Schedule Corporate Compliance Review' 
                            : 'Protect Now'}
                        </Button>
                        {(formType === '1120' || formType === '1120-S') && totalScore > 50 && (
                          <Button
                            onClick={() => navigate(`/corporate-compliance-review?type=${formType}`)}
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            View Consultation Details
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Risk Gauge Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-center">Legacy Risk Score</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center py-6">
                    <RiskGauge score={assessment.score} size={180} />
                  </CardContent>
                </Card>

                {/* Extracted Data Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <DollarSign className="h-4 w-4" />
                      Extracted Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax Year</span>
                        <span className="font-medium">{assessment.extractedData.taxYear || 'Not found'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">AGI</span>
                        <span className="font-medium">{formatCurrency(assessment.extractedData.agi)}</span>
                      </div>
                      {assessment.extractedData.businessIncome !== null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Business Income</span>
                          <span className="font-medium">{formatCurrency(assessment.extractedData.businessIncome)}</span>
                        </div>
                      )}
                      {assessment.extractedData.charitableContributions !== null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Charitable</span>
                          <span className="font-medium">{formatCurrency(assessment.extractedData.charitableContributions)}</span>
                        </div>
                      )}
                      {assessment.geoRisk && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">State</span>
                          <span className={cn(
                            "font-medium",
                            assessment.geoRisk.isHighRisk && "text-destructive"
                          )}>
                            {assessment.geoRisk.stateName}
                            {assessment.geoRisk.isHighRisk && " ⚠️"}
                          </span>
                        </div>
                      )}
                      {assessment.industryBenchmark && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Industry</span>
                          <span className="font-medium">{assessment.industryBenchmark.industryName}</span>
                        </div>
                      )}
                      {assessment.lifestyleData && (
                        <>
                          {assessment.lifestyleData.propertyTax && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                {assessment.lifestyleData.source === 'manual' ? 'Housing Cost (Annual)' : 'Property Tax'}
                              </span>
                              <span className="font-medium">{formatCurrency(assessment.lifestyleData.propertyTax)}</span>
                            </div>
                          )}
                          {assessment.lifestyleData.homeValue && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Home Value</span>
                              <span className="font-medium">{formatCurrency(assessment.lifestyleData.homeValue)}</span>
                            </div>
                          )}
                        </>
                      )}
                      {assessment.neighborhoodData && (
                        <div className="flex justify-between items-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-muted-foreground flex items-center gap-1 cursor-help">
                                  <MapPin className="h-3 w-3" />
                                  Neighborhood
                                  <HelpCircle className="h-3 w-3" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">
                                  Your reported income is compared to the median household income for ZIP code {assessment.neighborhoodData.zipCode}. 
                                  Significant differences can sometimes trigger an IRS "economic reality" review.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <span className={cn(
                            "font-medium",
                            assessment.neighborhoodData.isOutlier && "text-amber-600"
                          )}>
                            {assessment.neighborhoodData.incomeRatio}% of median
                            {assessment.neighborhoodData.isOutlier && " ⚠️"}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Flags Section */}
                {assessment.flags.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      Risk Flags ({assessment.flags.length})
                    </h3>
                    <div className="space-y-2">
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
                  </div>
                )}

                {/* Charity Validation Section */}
                {assessment.charityValidations && assessment.charityValidations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CheckCircle className="h-4 w-4" />
                        Charity Verification
                      </CardTitle>
                      <CardDescription>
                        Validation against IRS Pub 78 registered 501(c)(3) organizations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {assessment.charityValidations.map((charity, index) => (
                          <div 
                            key={index} 
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border",
                              charity.verified 
                                ? "bg-green-500/10 border-green-500/20" 
                                : "bg-amber-500/10 border-amber-500/20"
                            )}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {charity.verified ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                )}
                                <span className={cn(
                                  "font-medium text-sm",
                                  charity.verified ? "text-green-700" : "text-amber-700"
                                )}>
                                  {charity.name}
                                </span>
                              </div>
                              {charity.verified && charity.matchedName && charity.matchedName !== charity.name && (
                                <p className="text-xs text-muted-foreground ml-6">
                                  Matched: {charity.matchedName}
                                </p>
                              )}
                              {!charity.verified && (
                                <p className="text-xs text-amber-600 ml-6">
                                  ⚠️ Could not verify as a 501(c)(3). Ensure this is a registered non-profit.
                                </p>
                              )}
                            </div>
                            {charity.amount && (
                              <span className="font-medium text-sm">
                                {formatCurrency(charity.amount)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {assessment.flags.length === 0 && (
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
        
        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center mt-8 max-w-2xl mx-auto">
          This tool provides a statistical analysis based on public data benchmarks. It is not an official IRS determination and does not guarantee an audit will or will not occur.
        </p>
        
        {/* S-Corp specific disclaimer */}
        {formType === '1120-S' && assessment && (
          <p className="text-xs text-amber-600 text-center mt-2 max-w-2xl mx-auto font-medium">
            Note: Reasonable Compensation analysis is a statistical estimate. Consult a compensation study for IRS defense.
          </p>
        )}

        {/* Spacer for sticky footer */}
        {showUpsell && <div className="h-24" />}
      </div>

      {/* Sticky Upsell Banner */}
      {showUpsell && <DefenseUpsellBanner riskScore={totalScore} />}
    </DashboardLayout>
  );
}
