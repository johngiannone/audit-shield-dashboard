import { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Eraser, 
  FileText, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  Info,
  Scale,
  Mail,
  Loader2,
  Send,
  Upload,
  Sparkles,
  ShieldCheck,
  DollarSign,
  HelpCircle,
  Phone
} from 'lucide-react';
import { downloadFTALetter, generateFTALetter, type FTALetterData } from '@/utils/fta-letter-generator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Step = 'upload' | 'input' | 'qualification' | 'result';

interface NoticeData {
  noticeType: string;
  noticeDate: string;
  taxYear: string;
  penaltyAmount: string;
  penaltyType: string;
  failureToFilePenalty: string;
  failureToPayPenalty: string;
  interestAmount: string;
}

interface TaxpayerInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  ssnLast4: string;
  email: string;
}

interface EmailDelivery {
  sendToSelf: boolean;
  sendToTaxPro: boolean;
  taxProEmail: string;
  taxProName: string;
}

interface ScanResult {
  notice_number: string | null;
  tax_year: number | null;
  taxpayer_name: string | null;
  failure_to_file_penalty: number;
  failure_to_pay_penalty: number;
  other_penalties: number;
  interest_amount: number;
  total_amount_due: number;
  notice_date: string | null;
  response_due_date: string | null;
  ssn_last_4: string | null;
}

const PENALTY_TYPES = [
  'Failure to File Penalty',
  'Failure to Pay Penalty',
  'Accuracy-Related Penalty',
  'Failure to Deposit Penalty',
  'Other Penalty'
];

const NOTICE_TYPES = [
  'CP14',
  'CP501',
  'CP503',
  'CP504',
  'CP2000',
  'Other'
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

export default function PenaltyEraser() {
  const [step, setStep] = useState<Step>('upload');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Eligibility Wizard state
  const [showEligibilityWizard, setShowEligibilityWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 'result'>(1);
  const [isCurrentTaxYear, setIsCurrentTaxYear] = useState<boolean | null>(null);
  const [hasPriorPenaltiesWizard, setHasPriorPenaltiesWizard] = useState<boolean | null>(null);
  const [wizardResult, setWizardResult] = useState<'qualified' | 'standard-defense' | null>(null);
  
  const [noticeData, setNoticeData] = useState<NoticeData>({
    noticeType: '',
    noticeDate: '',
    taxYear: '',
    penaltyAmount: '',
    penaltyType: '',
    failureToFilePenalty: '',
    failureToPayPenalty: '',
    interestAmount: ''
  });
  const [taxpayerInfo, setTaxpayerInfo] = useState<TaxpayerInfo>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    ssnLast4: '',
    email: ''
  });
  const [emailDelivery, setEmailDelivery] = useState<EmailDelivery>({
    sendToSelf: false,
    sendToTaxPro: false,
    taxProEmail: '',
    taxProName: ''
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [hasPriorPenalties, setHasPriorPenalties] = useState<string>('');
  const [isQualified, setIsQualified] = useState<boolean | null>(null);

  // Eligibility Wizard handlers
  const handleOpenEligibilityWizard = () => {
    setWizardStep(1);
    setIsCurrentTaxYear(null);
    setHasPriorPenaltiesWizard(null);
    setWizardResult(null);
    setShowEligibilityWizard(true);
  };

  const handleWizardQ1Answer = (answer: boolean) => {
    setIsCurrentTaxYear(answer);
    setWizardStep(2);
  };

  const handleWizardQ2Answer = (answer: boolean) => {
    setHasPriorPenaltiesWizard(answer);
    // Logic: If Q1=Yes (current tax year) AND Q2=No (no prior penalties) -> Qualified
    if (isCurrentTaxYear === true && answer === false) {
      setWizardResult('qualified');
      setIsQualified(true);
    } else {
      setWizardResult('standard-defense');
      setIsQualified(false);
    }
    setWizardStep('result');
  };

  const handleWizardGenerateLetter = () => {
    setShowEligibilityWizard(false);
    setStep('input');
  };

  const handleWizardClose = () => {
    setShowEligibilityWizard(false);
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadedFile(file);
    setIsScanning(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-penalty-notice`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze notice');
      }

      const result = await response.json();
      const analysis = result.analysis as ScanResult;
      setScanResult(analysis);
      
      // Pre-fill form with scanned data
      const totalPenalty = (analysis.failure_to_file_penalty || 0) + (analysis.failure_to_pay_penalty || 0) + (analysis.other_penalties || 0);
      
      setNoticeData({
        noticeType: analysis.notice_number || '',
        noticeDate: analysis.notice_date || '',
        taxYear: analysis.tax_year?.toString() || '',
        penaltyAmount: totalPenalty.toString(),
        penaltyType: analysis.failure_to_file_penalty > 0 ? 'Failure to File Penalty' : 
                    analysis.failure_to_pay_penalty > 0 ? 'Failure to Pay Penalty' : '',
        failureToFilePenalty: analysis.failure_to_file_penalty?.toString() || '0',
        failureToPayPenalty: analysis.failure_to_pay_penalty?.toString() || '0',
        interestAmount: analysis.interest_amount?.toString() || '0'
      });
      
      if (analysis.taxpayer_name) {
        setTaxpayerInfo(prev => ({ ...prev, name: analysis.taxpayer_name || '' }));
      }
      if (analysis.ssn_last_4) {
        setTaxpayerInfo(prev => ({ ...prev, ssnLast4: analysis.ssn_last_4 || '' }));
      }

      toast.success('Notice scanned successfully! Please review the detected information.');
      
    } catch (error: any) {
      console.error('Scan error:', error);
      toast.error(error.message || 'Failed to scan notice. Please enter details manually.');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      handleFileUpload(file);
    } else {
      toast.error('Please upload a PDF or image file');
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleNoticeChange = (field: keyof NoticeData, value: string) => {
    setNoticeData(prev => ({ ...prev, [field]: value }));
  };

  const handleTaxpayerChange = (field: keyof TaxpayerInfo, value: string) => {
    setTaxpayerInfo(prev => ({ ...prev, [field]: value }));
  };

  const isNoticeDataComplete = () => {
    return noticeData.noticeType && 
           noticeData.noticeDate && 
           noticeData.taxYear && 
           noticeData.penaltyAmount && 
           noticeData.penaltyType &&
           parseFloat(noticeData.penaltyAmount) > 0;
  };

  const isTaxpayerInfoComplete = () => {
    return taxpayerInfo.name && 
           taxpayerInfo.address && 
           taxpayerInfo.city && 
           taxpayerInfo.state && 
           taxpayerInfo.zip && 
           taxpayerInfo.ssnLast4.length === 4;
  };

  const handleProceedToInput = () => {
    setStep('input');
  };

  const handleProceedToQualification = () => {
    if (!isNoticeDataComplete() || !isTaxpayerInfoComplete()) {
      toast.error('Please complete all fields before proceeding');
      return;
    }
    setStep('qualification');
  };

  const handleQualificationAnswer = (answer: string) => {
    setHasPriorPenalties(answer);
    const qualified = answer === 'no' && parseFloat(noticeData.penaltyAmount) > 0;
    setIsQualified(qualified);
    setStep('result');
  };

  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);

  const handleDownloadLetter = async () => {
    setIsGeneratingLetter(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-fta-letter`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userName: taxpayerInfo.name,
            address: taxpayerInfo.address,
            city: taxpayerInfo.city,
            state: taxpayerInfo.state,
            zip: taxpayerInfo.zip,
            ssnLast4: taxpayerInfo.ssnLast4,
            taxYear: noticeData.taxYear,
            penaltyAmount: parseFloat(noticeData.penaltyAmount),
            noticeNumber: noticeData.noticeType,
            penaltyType: noticeData.penaltyType
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate letter');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FTA_Request_${noticeData.taxYear}_${noticeData.noticeType}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('FTA request letter downloaded successfully');
    } catch (error: any) {
      console.error('Error generating letter:', error);
      toast.error(error.message || 'Failed to generate letter');
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const handleEmailLetter = async () => {
    if (!emailDelivery.sendToSelf && !emailDelivery.sendToTaxPro) {
      toast.error('Please select at least one delivery option');
      return;
    }

    if (emailDelivery.sendToSelf && !taxpayerInfo.email) {
      toast.error('Please enter your email address');
      return;
    }

    if (emailDelivery.sendToTaxPro && !emailDelivery.taxProEmail) {
      toast.error("Please enter your tax professional's email");
      return;
    }

    setIsSendingEmail(true);

    try {
      const letterData: FTALetterData = {
        taxpayerName: taxpayerInfo.name,
        taxpayerAddress: taxpayerInfo.address,
        taxpayerCity: taxpayerInfo.city,
        taxpayerState: taxpayerInfo.state,
        taxpayerZip: taxpayerInfo.zip,
        ssn: taxpayerInfo.ssnLast4,
        noticeType: noticeData.noticeType,
        noticeDate: noticeData.noticeDate,
        taxYear: noticeData.taxYear,
        penaltyAmount: parseFloat(noticeData.penaltyAmount),
        penaltyType: noticeData.penaltyType
      };

      const doc = generateFTALetter(letterData);
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      const { data, error } = await supabase.functions.invoke('send-fta-letter', {
        body: {
          recipientEmail: taxpayerInfo.email,
          recipientName: taxpayerInfo.name,
          taxpayerName: taxpayerInfo.name,
          taxYear: noticeData.taxYear,
          penaltyAmount: parseFloat(noticeData.penaltyAmount),
          penaltyType: noticeData.penaltyType,
          noticeType: noticeData.noticeType,
          noticeDate: noticeData.noticeDate,
          letterPdfBase64: pdfBase64,
          sendToTaxPro: emailDelivery.sendToTaxPro,
          taxProEmail: emailDelivery.taxProEmail,
          taxProName: emailDelivery.taxProName
        }
      });

      if (error) throw error;

      const recipients = [];
      if (emailDelivery.sendToSelf) recipients.push(taxpayerInfo.email);
      if (emailDelivery.sendToTaxPro) recipients.push(emailDelivery.taxProEmail);
      
      toast.success(`Letter sent to ${recipients.join(' and ')}`);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleStartOver = () => {
    setStep('upload');
    setScanResult(null);
    setUploadedFile(null);
    setNoticeData({
      noticeType: '',
      noticeDate: '',
      taxYear: '',
      penaltyAmount: '',
      penaltyType: '',
      failureToFilePenalty: '',
      failureToPayPenalty: '',
      interestAmount: ''
    });
    setTaxpayerInfo({
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      ssnLast4: '',
      email: ''
    });
    setEmailDelivery({
      sendToSelf: false,
      sendToTaxPro: false,
      taxProEmail: '',
      taxProName: ''
    });
    setHasPriorPenalties('');
    setIsQualified(null);
  };

  const penaltyAmountNum = parseFloat(noticeData.penaltyAmount) || 0;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Penalty Eraser - Remove IRS Penalties Automatically | Return Shield</title>
        <meta name="description" content="Use the IRS First-Time Abatement waiver to automatically remove Failure-to-File and Failure-to-Pay penalties" />
      </Helmet>

      <div className="space-y-8">
        {/* Hero Section */}
        {step === 'upload' && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-8 md:p-12">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10 max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI-Powered
                </Badge>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Remove IRS Penalties Automatically
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                We use the IRS First-Time Abatement (FTA) waiver to erase Failure-to-File and Failure-to-Pay penalties.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <span>IRS-Approved Method</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span>Save Thousands</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 text-green-500" />
                  <span>Instant Letter Generation</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={step === 'upload' ? 'default' : 'secondary'} className="gap-1">
            1. Upload Notice
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === 'input' ? 'default' : 'secondary'} className="gap-1">
            2. Review Details
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === 'qualification' ? 'default' : 'secondary'} className="gap-1">
            3. Qualification
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === 'result' ? 'default' : 'secondary'} className="gap-1">
            4. Result
          </Badge>
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Upload Zone */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Your Penalty Notice
                </CardTitle>
                <CardDescription>
                  Upload your IRS penalty notice (CP14, CP503, CP504) and we'll automatically extract the penalty information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`relative border-2 border-dashed rounded-xl p-8 md:p-12 text-center transition-all ${
                    isDragging 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  {isScanning ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-12 w-12 text-primary animate-spin" />
                      <div>
                        <p className="text-lg font-medium">Scanning your notice...</p>
                        <p className="text-sm text-muted-foreground">Our AI is extracting penalty information</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-primary" />
                      </div>
                      <p className="text-lg font-medium mb-2">
                        Drag and drop your penalty notice here
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        or click to browse (PDF, PNG, JPG)
                      </p>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      />
                      <Button variant="outline" className="pointer-events-none">
                        <Upload className="h-4 w-4 mr-2" />
                        Select File
                      </Button>
                    </>
                  )}
                </div>

                {/* Scan Results Preview */}
                {scanResult && (
                  <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-700 dark:text-green-400">Detected Information</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Notice Type:</span>
                        <p className="font-medium">{scanResult.notice_number || 'Not detected'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tax Year:</span>
                        <p className="font-medium">{scanResult.tax_year || 'Not detected'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Failure to File:</span>
                        <p className="font-medium text-destructive">
                          ${(scanResult.failure_to_file_penalty || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Failure to Pay:</span>
                        <p className="font-medium text-destructive">
                          ${(scanResult.failure_to_pay_penalty || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Interest:</span>
                        <p className="font-medium">
                          ${(scanResult.interest_amount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Due:</span>
                        <p className="font-medium">
                          ${(scanResult.total_amount_due || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button onClick={handleOpenEligibilityWizard} className="bg-green-600 hover:bg-green-700">
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Check Eligibility
                      </Button>
                      <Button variant="outline" onClick={handleProceedToInput}>
                        Skip to Details
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                      <Button variant="ghost" onClick={handleStartOver}>
                        Upload Different Notice
                      </Button>
                    </div>
                  </div>
                )}

                {/* Manual Entry Option */}
                {!scanResult && !isScanning && (
                  <div className="mt-6 text-center">
                    <Separator className="my-4" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Don't have the notice handy? No problem.
                    </p>
                    <Button variant="outline" onClick={handleProceedToInput}>
                      Enter Details Manually
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Input (Review/Manual Entry) */}
        {step === 'input' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Notice Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notice Information
                </CardTitle>
                <CardDescription>
                  {scanResult ? 'Review and confirm the detected information' : 'Enter the details from your IRS notice'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="noticeType">Notice Type</Label>
                    <Select 
                      value={noticeData.noticeType} 
                      onValueChange={(v) => handleNoticeChange('noticeType', v)}
                    >
                      <SelectTrigger id="noticeType">
                        <SelectValue placeholder="Select notice type" />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTICE_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noticeDate">Notice Date</Label>
                    <Input
                      id="noticeDate"
                      type="date"
                      value={noticeData.noticeDate}
                      onChange={(e) => handleNoticeChange('noticeDate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="taxYear">Tax Year</Label>
                    <Select 
                      value={noticeData.taxYear} 
                      onValueChange={(v) => handleNoticeChange('taxYear', v)}
                    >
                      <SelectTrigger id="taxYear">
                        <SelectValue placeholder="Select tax year" />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2023, 2022, 2021, 2020, 2019].map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="penaltyAmount">Total Penalty Amount ($)</Label>
                    <Input
                      id="penaltyAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={noticeData.penaltyAmount}
                      onChange={(e) => handleNoticeChange('penaltyAmount', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="penaltyType">Primary Penalty Type</Label>
                  <Select 
                    value={noticeData.penaltyType} 
                    onValueChange={(v) => handleNoticeChange('penaltyType', v)}
                  >
                    <SelectTrigger id="penaltyType">
                      <SelectValue placeholder="Select penalty type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PENALTY_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {scanResult && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Breakdown from Notice</AlertTitle>
                    <AlertDescription className="text-sm">
                      <div className="mt-2 space-y-1">
                        <div>Failure to File: ${parseFloat(noticeData.failureToFilePenalty || '0').toLocaleString()}</div>
                        <div>Failure to Pay: ${parseFloat(noticeData.failureToPayPenalty || '0').toLocaleString()}</div>
                        <div>Interest: ${parseFloat(noticeData.interestAmount || '0').toLocaleString()}</div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Taxpayer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Your Information
                </CardTitle>
                <CardDescription>
                  This will be used to generate your formal FTA request letter
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Legal Name</Label>
                  <Input
                    id="name"
                    placeholder="John M. Doe"
                    value={taxpayerInfo.name}
                    onChange={(e) => handleTaxpayerChange('name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={taxpayerInfo.address}
                    onChange={(e) => handleTaxpayerChange('address', e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Anytown"
                      value={taxpayerInfo.city}
                      onChange={(e) => handleTaxpayerChange('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select 
                      value={taxpayerInfo.state} 
                      onValueChange={(v) => handleTaxpayerChange('state', v)}
                    >
                      <SelectTrigger id="state">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      placeholder="12345"
                      maxLength={10}
                      value={taxpayerInfo.zip}
                      onChange={(e) => handleTaxpayerChange('zip', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ssnLast4">Last 4 Digits of SSN</Label>
                    <Input
                      id="ssnLast4"
                      placeholder="1234"
                      maxLength={4}
                      value={taxpayerInfo.ssnLast4}
                      onChange={(e) => handleTaxpayerChange('ssnLast4', e.target.value.replace(/\D/g, ''))}
                    />
                    <p className="text-xs text-muted-foreground">
                      For identification on the letter
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={taxpayerInfo.email}
                      onChange={(e) => handleTaxpayerChange('email', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      For letter delivery (optional)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Continue Button */}
            <div className="lg:col-span-2 flex justify-between">
              <Button variant="outline" onClick={handleStartOver}>
                Start Over
              </Button>
              <Button 
                onClick={handleProceedToQualification}
                disabled={!isNoticeDataComplete() || !isTaxpayerInfoComplete()}
              >
                Continue to Qualification
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Qualification */}
        {step === 'qualification' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                FTA Qualification Check
              </CardTitle>
              <CardDescription>
                Answer this question to determine if you qualify for First-Time Abatement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>What is First-Time Abatement?</AlertTitle>
                <AlertDescription>
                  The IRS offers penalty relief to taxpayers who have a clean compliance history 
                  for the past 3 years. This is an administrative waiver that can eliminate 
                  Failure to File and Failure to Pay penalties.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <p className="font-medium">
                  Have you been assessed any IRS penalties in the past 3 tax years 
                  (before {parseInt(noticeData.taxYear) - 3})?
                </p>
                <RadioGroup value={hasPriorPenalties} onValueChange={handleQualificationAnswer}>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="no" id="no-penalties" />
                    <Label htmlFor="no-penalties" className="flex-1 cursor-pointer">
                      <span className="font-medium">No</span>
                      <span className="block text-sm text-muted-foreground">
                        I have had a clean compliance history (no penalties in past 3 years)
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="yes" id="yes-penalties" />
                    <Label htmlFor="yes-penalties" className="flex-1 cursor-pointer">
                      <span className="font-medium">Yes</span>
                      <span className="block text-sm text-muted-foreground">
                        I have been assessed penalties in the past 3 years
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="unsure" id="unsure" />
                    <Label htmlFor="unsure" className="flex-1 cursor-pointer">
                      <span className="font-medium">I'm not sure</span>
                      <span className="block text-sm text-muted-foreground">
                        I don't know my penalty history
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('input')}>
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Result */}
        {step === 'result' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {isQualified ? (
              <>
                <Card className="border-green-500/50 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-6 w-6" />
                      You Likely Qualify for FTA!
                    </CardTitle>
                    <CardDescription>
                      Based on your answers, you may be eligible to have your penalties removed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-background rounded-lg border">
                      <div className="text-sm text-muted-foreground">Potential Savings</div>
                      <div className="text-3xl font-bold text-green-600">
                        ${penaltyAmountNum.toLocaleString()}
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Your FTA request letter is ready. Download it and mail to the IRS address 
                        on your notice, or call the IRS and request FTA verbally using this letter 
                        as a reference.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                {/* Download & Email Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Get Your FTA Letter
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      onClick={handleDownloadLetter} 
                      className="w-full" 
                      size="lg"
                      disabled={isGeneratingLetter}
                    >
                      {isGeneratingLetter ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Generating Letter...
                        </>
                      ) : (
                        <>
                          <Download className="h-5 w-5 mr-2" />
                          Download FTA Request Letter (PDF)
                        </>
                      )}
                    </Button>

                    <Separator />

                    <div className="space-y-4">
                      <p className="text-sm font-medium">Or send via email:</p>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="sendToSelf" 
                          checked={emailDelivery.sendToSelf}
                          onCheckedChange={(checked) => 
                            setEmailDelivery(prev => ({ ...prev, sendToSelf: checked as boolean }))
                          }
                        />
                        <Label htmlFor="sendToSelf" className="text-sm">
                          Send to my email ({taxpayerInfo.email || 'not provided'})
                        </Label>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="sendToTaxPro" 
                            checked={emailDelivery.sendToTaxPro}
                            onCheckedChange={(checked) => 
                              setEmailDelivery(prev => ({ ...prev, sendToTaxPro: checked as boolean }))
                            }
                          />
                          <Label htmlFor="sendToTaxPro" className="text-sm">
                            Send to my tax professional
                          </Label>
                        </div>
                        
                        {emailDelivery.sendToTaxPro && (
                          <div className="ml-6 space-y-2">
                            <Input
                              placeholder="Tax Pro Name"
                              value={emailDelivery.taxProName}
                              onChange={(e) => 
                                setEmailDelivery(prev => ({ ...prev, taxProName: e.target.value }))
                              }
                            />
                            <Input
                              type="email"
                              placeholder="Tax Pro Email"
                              value={emailDelivery.taxProEmail}
                              onChange={(e) => 
                                setEmailDelivery(prev => ({ ...prev, taxProEmail: e.target.value }))
                              }
                            />
                          </div>
                        )}
                      </div>

                      <Button 
                        variant="outline" 
                        onClick={handleEmailLetter}
                        disabled={isSendingEmail || (!emailDelivery.sendToSelf && !emailDelivery.sendToTaxPro)}
                        className="w-full"
                      >
                        {isSendingEmail ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Letter via Email
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-600">
                    <XCircle className="h-6 w-6" />
                    FTA May Not Apply
                  </CardTitle>
                  <CardDescription>
                    Based on your answers, you may not qualify for First-Time Abatement
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Other Options Available</AlertTitle>
                    <AlertDescription>
                      Don't worry! There are other penalty relief options including:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Reasonable Cause relief (if you have a valid reason)</li>
                        <li>Statutory exceptions</li>
                        <li>Installment agreement to pay over time</li>
                        <li>Offer in Compromise (if you can't pay)</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <p className="text-sm text-muted-foreground">
                    Consider consulting with a tax professional to explore other 
                    penalty abatement strategies for your situation.
                  </p>
                </CardContent>
              </Card>
            )}

            <Button variant="outline" onClick={handleStartOver} className="w-full">
              Start Over with New Notice
            </Button>
          </div>
        )}
      </div>

      {/* Eligibility Wizard Modal */}
      <Dialog open={showEligibilityWizard} onOpenChange={setShowEligibilityWizard}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Check Eligibility
            </DialogTitle>
            <DialogDescription>
              Answer these questions to determine if you qualify for First-Time Abatement
            </DialogDescription>
          </DialogHeader>

          {/* Question 1 */}
          {wizardStep === 1 && (
            <div className="space-y-4 py-4">
              <p className="font-medium text-foreground">
                Is this penalty for the current tax year?
              </p>
              <p className="text-sm text-muted-foreground">
                The tax year shown on your notice: <strong>{scanResult?.tax_year || noticeData.taxYear || 'Unknown'}</strong>
              </p>
              <div className="flex gap-3">
                <Button 
                  onClick={() => handleWizardQ1Answer(true)} 
                  className="flex-1"
                  variant="outline"
                >
                  Yes
                </Button>
                <Button 
                  onClick={() => handleWizardQ1Answer(false)} 
                  className="flex-1"
                  variant="outline"
                >
                  No
                </Button>
              </div>
            </div>
          )}

          {/* Question 2 */}
          {wizardStep === 2 && (
            <div className="space-y-4 py-4">
              <p className="font-medium text-foreground">
                Have you had ANY other penalties (except Estimated Tax) in the prior 3 years?
              </p>
              <p className="text-sm text-muted-foreground">
                This includes Failure to File, Failure to Pay, or any other IRS penalties.
              </p>
              <div className="flex gap-3">
                <Button 
                  onClick={() => handleWizardQ2Answer(true)} 
                  className="flex-1"
                  variant="outline"
                >
                  Yes, I've had penalties
                </Button>
                <Button 
                  onClick={() => handleWizardQ2Answer(false)} 
                  className="flex-1"
                  variant="outline"
                >
                  No, clean record
                </Button>
              </div>
            </div>
          )}

          {/* Result: Qualified */}
          {wizardStep === 'result' && wizardResult === 'qualified' && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                  Success! You Qualify for Abatement
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Based on your answers, you're eligible for the IRS First-Time Abatement waiver.
                </p>
                <div className="mt-3 p-3 bg-background rounded-lg">
                  <span className="text-sm text-muted-foreground">Potential Savings:</span>
                  <p className="text-2xl font-bold text-green-600">
                    ${((scanResult?.failure_to_file_penalty || 0) + (scanResult?.failure_to_pay_penalty || 0) + parseFloat(noticeData.penaltyAmount || '0')).toLocaleString()}
                  </p>
                </div>
              </div>
              <Button onClick={handleWizardGenerateLetter} className="w-full" size="lg">
                <FileText className="h-4 w-4 mr-2" />
                Generate FTA Letter
              </Button>
            </div>
          )}

          {/* Result: Standard Defense */}
          {wizardStep === 'result' && wizardResult === 'standard-defense' && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                  Standard Defense
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  You may not qualify for automatic FTA, but we can challenge this penalty for Reasonable Cause.
                </p>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Don't give up!</AlertTitle>
                <AlertDescription>
                  Many penalties can still be removed through Reasonable Cause arguments. 
                  An enrolled agent can review your situation and build a strong case.
                </AlertDescription>
              </Alert>
              <div className="flex gap-3">
                <Button onClick={handleWizardClose} variant="outline" className="flex-1">
                  Close
                </Button>
                <Button className="flex-1">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact an Agent
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
