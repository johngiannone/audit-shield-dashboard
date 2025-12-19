import { useState } from 'react';
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
import { 
  Eraser, 
  FileText, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  Info,
  Scale
} from 'lucide-react';
import { downloadFTALetter, type FTALetterData } from '@/utils/fta-letter-generator';
import { toast } from 'sonner';

type Step = 'input' | 'qualification' | 'result';

interface NoticeData {
  noticeType: string;
  noticeDate: string;
  taxYear: string;
  penaltyAmount: string;
  penaltyType: string;
}

interface TaxpayerInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  ssnLast4: string;
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
  const [step, setStep] = useState<Step>('input');
  const [noticeData, setNoticeData] = useState<NoticeData>({
    noticeType: '',
    noticeDate: '',
    taxYear: '',
    penaltyAmount: '',
    penaltyType: ''
  });
  const [taxpayerInfo, setTaxpayerInfo] = useState<TaxpayerInfo>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    ssnLast4: ''
  });
  const [hasPriorPenalties, setHasPriorPenalties] = useState<string>('');
  const [isQualified, setIsQualified] = useState<boolean | null>(null);

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

  const handleDownloadLetter = () => {
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

    downloadFTALetter(letterData);
    toast.success('FTA request letter downloaded successfully');
  };

  const handleStartOver = () => {
    setStep('input');
    setNoticeData({
      noticeType: '',
      noticeDate: '',
      taxYear: '',
      penaltyAmount: '',
      penaltyType: ''
    });
    setTaxpayerInfo({
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      ssnLast4: ''
    });
    setHasPriorPenalties('');
    setIsQualified(null);
  };

  const penaltyAmountNum = parseFloat(noticeData.penaltyAmount) || 0;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Penalty Eraser - First-Time Abatement Tool | Return Shield</title>
        <meta name="description" content="Generate IRS First-Time Abatement request letters to potentially eliminate penalties" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Eraser className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Penalty Eraser</h1>
            <p className="text-muted-foreground">
              Generate a First-Time Abatement request to potentially eliminate IRS penalties
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          <Badge variant={step === 'input' ? 'default' : 'secondary'} className="gap-1">
            1. Notice Details
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === 'qualification' ? 'default' : 'secondary'} className="gap-1">
            2. Qualification
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant={step === 'result' ? 'default' : 'secondary'} className="gap-1">
            3. Result
          </Badge>
        </div>

        {/* Step 1: Input */}
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
                  Enter the details from your IRS notice (CP14, CP503, etc.)
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
                    <Label htmlFor="penaltyAmount">Penalty Amount ($)</Label>
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
                  <Label htmlFor="penaltyType">Penalty Type</Label>
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
                    Only the last 4 digits are used for identification on the letter
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Button */}
            <div className="lg:col-span-2">
              <Button 
                size="lg" 
                className="w-full"
                onClick={handleProceedToQualification}
                disabled={!isNoticeDataComplete() || !isTaxpayerInfoComplete()}
              >
                Continue to Qualification Check
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Qualification */}
        {step === 'qualification' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                Qualification Check
              </CardTitle>
              <CardDescription className="text-base">
                The IRS First-Time Abatement (FTA) waiver requires a clean compliance history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Important Question</AlertTitle>
                <AlertDescription>
                  Your answer determines if you qualify for penalty relief under IRM 20.1.1.3.3.2.1
                </AlertDescription>
              </Alert>

              <div className="p-6 bg-muted/50 rounded-lg space-y-4">
                <p className="text-lg font-medium text-center">
                  Have you had any IRS penalties assessed in the prior 3 tax years?
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  (Excluding estimated tax penalties, which do not disqualify you)
                </p>

                <RadioGroup 
                  className="flex justify-center gap-8 pt-4"
                  value={hasPriorPenalties}
                  onValueChange={handleQualificationAnswer}
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="no" id="no" className="h-5 w-5" />
                    <Label htmlFor="no" className="text-lg cursor-pointer">
                      No, I have not
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="yes" id="yes" className="h-5 w-5" />
                    <Label htmlFor="yes" className="text-lg cursor-pointer">
                      Yes, I have
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="text-center">
                <Button variant="ghost" onClick={() => setStep('input')}>
                  ← Back to Notice Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Result */}
        {step === 'result' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {isQualified ? (
              <>
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <AlertTitle className="text-green-700 text-lg">
                    You Qualify for First-Time Abatement!
                  </AlertTitle>
                  <AlertDescription className="text-green-700/90">
                    Based on your clean compliance history, you may request penalty abatement 
                    of ${penaltyAmountNum.toLocaleString('en-US', { minimumFractionDigits: 2 })} under IRM 20.1.1.3.3.2.1.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Your FTA Request Letter
                    </CardTitle>
                    <CardDescription>
                      A formal First-Time Abatement request has been generated for you
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Notice Type:</span>
                        <span className="font-medium">{noticeData.noticeType}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax Year:</span>
                        <span className="font-medium">{noticeData.taxYear}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Penalty Type:</span>
                        <span className="font-medium">{noticeData.penaltyType}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Penalty Amount:</span>
                        <span className="font-bold text-lg text-destructive">
                          ${penaltyAmountNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Next Steps</AlertTitle>
                      <AlertDescription>
                        <ol className="list-decimal list-inside space-y-1 mt-2 text-sm">
                          <li>Download and print the letter below</li>
                          <li>Sign and date the letter where indicated</li>
                          <li>Mail to the IRS address shown on your notice</li>
                          <li>Keep a copy for your records</li>
                          <li>Allow 30-60 days for IRS response</li>
                        </ol>
                      </AlertDescription>
                    </Alert>

                    <Button 
                      size="lg" 
                      className="w-full"
                      onClick={handleDownloadLetter}
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Download FTA Request Letter (PDF)
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Alert className="border-destructive/50 bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <AlertTitle className="text-destructive text-lg">
                    You May Not Qualify for FTA
                  </AlertTitle>
                  <AlertDescription className="text-destructive/90">
                    Because you have had penalties in the prior 3 tax years, you may not be 
                    eligible for the First-Time Abatement administrative waiver.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle>Alternative Options</CardTitle>
                    <CardDescription>
                      Even without FTA, there may be other ways to reduce or eliminate your penalty
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium">Reasonable Cause</h4>
                        <p className="text-sm text-muted-foreground">
                          If you had circumstances beyond your control (serious illness, death in family, 
                          natural disaster), you may request abatement based on reasonable cause.
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium">Statutory Exception</h4>
                        <p className="text-sm text-muted-foreground">
                          Certain statutory exceptions may apply, such as reliance on erroneous 
                          advice from the IRS.
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium">Professional Representation</h4>
                        <p className="text-sm text-muted-foreground">
                          Consider working with an Enrolled Agent or tax attorney who can review 
                          your specific situation and identify the best strategy.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <div className="text-center">
              <Button variant="outline" onClick={handleStartOver}>
                Start New Analysis
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
