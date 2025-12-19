import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Upload, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Shield,
  Loader2,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GUIDE_STEPS = [
  {
    step: 1,
    title: "Log in to your IRS Online Account",
    description: "Access your account via ID.me verification.",
    link: "https://www.irs.gov/payments/your-online-account",
    linkText: "Go to IRS.gov"
  },
  {
    step: 2,
    title: "Navigate to Tax Records",
    description: "Click on \"Tax Records\" and select \"Get Transcript\"."
  },
  {
    step: 3,
    title: "Select the Reason",
    description: "Choose \"Federal Tax\" as the reason for your transcript request."
  },
  {
    step: 4,
    title: "Choose Account Transcript",
    description: "Look for the Account Transcript section (NOT Return Transcript). This shows payment history and penalties.",
    important: true
  },
  {
    step: 5,
    title: "Download the PDF",
    description: "Download the 2024 Account Transcript PDF to your device."
  }
];

// Plain English translations for common codes
const PLAIN_ENGLISH: Record<string, string> = {
  '150': 'Your tax return was received and processed by the IRS.',
  '420': '⚠️ The IRS has flagged this return for review (audit examination).',
  '421': 'A previous audit examination flag was removed.',
  '424': '⚠️ The IRS has requested an examination of your return.',
  '570': 'There is a hold on your account preventing any credits or refunds.',
  '571': 'A previous account hold has been released.',
  '766': 'A tax credit was applied to your account.',
  '768': 'You received the Earned Income Tax Credit.',
  '806': 'Federal tax withholding from your W-2 or 1099 was credited.',
  '810': '🔴 Your refund has been frozen pending IRS review.',
  '811': 'A previous refund freeze has been lifted.',
  '826': 'Your refund was used to pay a balance you owed.',
  '841': 'A scheduled refund was cancelled.',
  '846': '✅ Your refund has been approved and sent!',
  '898': 'Your refund was redirected to pay other government debt.',
  '914': '⚠️ Active audit examination is in progress on your account.',
  '922': '🚨 Criminal investigation division is involved with your account.',
  '971': 'The IRS has sent you a notice - check your mail.',
  '976': '🚨 A duplicate return was filed - possible identity theft.',
  '977': 'An amended return (1040-X) was filed.',
  '170': 'A penalty was assessed for filing your return late.',
  '276': 'A penalty was assessed for paying your taxes late.',
  '196': 'Interest has been charged on your unpaid balance.',
  '290': 'Additional tax has been added to your account.',
  '291': 'Previously assessed tax was reduced.',
  '300': 'Tax was added as a result of an audit.',
  '301': 'Tax was reduced as a result of an audit review.'
};

interface TimelineEntry {
  code: string;
  date: string;
  description: string;
  severity: string;
  category: string;
  explanation: string;
  recommendedAction: string;
}

interface DecodeResult {
  timeline: TimelineEntry[];
  statusSummary: {
    status: string;
    riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'clear';
    criticalCodes: string[];
    highCodes: string[];
    message: string;
  };
  rawExtractedCodes: { code: string; date: string }[];
}

export default function TranscriptDecoder() {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showReturnWarning, setShowReturnWarning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const processFile = (file: File) => {
    setUploadedFile(file);
    setDecodeResult(null);
    
    if (file.name.toLowerCase().includes("return")) {
      setShowReturnWarning(true);
    } else {
      setShowReturnWarning(false);
    }
  };

  const handleContinueAnyway = () => {
    setShowReturnWarning(false);
  };

  const handleUploadDifferent = () => {
    setUploadedFile(null);
    setShowReturnWarning(false);
    setDecodeResult(null);
  };

  const handleAnalyze = async () => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(uploadedFile);
      
      const pdfBase64 = await base64Promise;

      const { data, error } = await supabase.functions.invoke('decode-transcript', {
        body: { pdfBase64, fileName: uploadedFile.name }
      });

      if (error) throw error;

      setDecodeResult(data);
      toast.success('Transcript decoded successfully!');
    } catch (error: unknown) {
      console.error('Error analyzing transcript:', error);
      const message = error instanceof Error ? error.message : 'Failed to analyze transcript';
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'medium':
        return 'text-amber-500';
      case 'routine':
        return 'text-green-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTimelineDot = (severity: string, code: string) => {
    // Positive codes (refund, credits)
    const positiveCodes = ['846', '766', '768', '806', '811', '571', '291', '301'];
    // Negative codes (audit, freeze, investigation)
    const negativeCodes = ['420', '424', '570', '810', '914', '922', '976'];
    
    if (positiveCodes.includes(code)) {
      return (
        <div className="w-4 h-4 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
      );
    }
    
    if (negativeCodes.includes(code) || severity === 'critical' || severity === 'high') {
      return (
        <div className="relative">
          <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
          <div className="absolute inset-0 w-4 h-4 rounded-full bg-red-500/50 animate-ping" />
        </div>
      );
    }
    
    return (
      <div className="w-4 h-4 rounded-full bg-muted-foreground/50" />
    );
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return <Badge variant="destructive" className="animate-pulse">CRITICAL</Badge>;
      case 'high':
        return <Badge variant="destructive">HIGH RISK</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500">MEDIUM</Badge>;
      case 'low':
        return <Badge variant="secondary">LOW</Badge>;
      default:
        return <Badge className="bg-green-500">CLEAR</Badge>;
    }
  };

  const getPlainEnglish = (code: string, description: string) => {
    return PLAIN_ENGLISH[code] || description;
  };

  const hasHighSeverity = decodeResult?.statusSummary.riskLevel === 'critical' || 
                          decodeResult?.statusSummary.riskLevel === 'high';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transcript Decoder</h1>
          <p className="text-muted-foreground mt-2">
            Upload your IRS Account Transcript to decode penalty codes and payment history
          </p>
        </div>

        {/* Results Section */}
        {decodeResult && (
          <div className="space-y-6">
            {/* Status Summary */}
            <Card className={cn(
              "border-2",
              decodeResult.statusSummary.riskLevel === 'critical' && "border-red-500 bg-red-500/5",
              decodeResult.statusSummary.riskLevel === 'high' && "border-orange-500 bg-orange-500/5",
              decodeResult.statusSummary.riskLevel === 'medium' && "border-amber-500 bg-amber-500/5",
              decodeResult.statusSummary.riskLevel === 'clear' && "border-green-500 bg-green-500/5"
            )}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {decodeResult.statusSummary.riskLevel === 'critical' || decodeResult.statusSummary.riskLevel === 'high' ? (
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    ) : decodeResult.statusSummary.riskLevel === 'clear' ? (
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    ) : (
                      <Clock className="h-8 w-8 text-amber-500" />
                    )}
                    <div>
                      <CardTitle className="text-xl">{decodeResult.statusSummary.status}</CardTitle>
                      <CardDescription className="mt-1">{decodeResult.statusSummary.message}</CardDescription>
                    </div>
                  </div>
                  {getRiskBadge(decodeResult.statusSummary.riskLevel)}
                </div>
              </CardHeader>
              {hasHighSeverity && (
                <CardContent>
                  <Button 
                    size="lg" 
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => navigate('/audit-risk')}
                  >
                    <Shield className="h-5 w-5 mr-2" />
                    Start Defense Prep
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Timeline</CardTitle>
                <CardDescription>
                  {decodeResult.timeline.length} transaction codes found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {decodeResult.timeline.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No transaction codes were detected in this transcript.</p>
                    <p className="text-sm mt-2">Try uploading a different file or ensure it's an Account Transcript.</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-border" />
                    
                    <div className="space-y-6">
                      {decodeResult.timeline.map((entry, index) => (
                        <div key={index} className="relative flex gap-4 pl-8">
                          {/* Timeline dot */}
                          <div className="absolute left-0 top-1">
                            {getTimelineDot(entry.severity, entry.code)}
                          </div>
                          
                          {/* Content */}
                          <div className={cn(
                            "flex-1 p-4 rounded-lg border",
                            entry.severity === 'critical' && "border-red-500/50 bg-red-500/5",
                            entry.severity === 'high' && "border-orange-500/50 bg-orange-500/5",
                            entry.severity === 'medium' && "border-amber-500/50 bg-amber-500/5",
                            entry.severity === 'routine' && "border-green-500/30 bg-green-500/5"
                          )}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={cn(
                                    "font-mono font-bold text-lg",
                                    getSeverityColor(entry.severity)
                                  )}>
                                    Code {entry.code}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {entry.category}
                                  </Badge>
                                </div>
                                
                                {/* Plain English Translation */}
                                <p className="font-medium text-foreground mb-2">
                                  {getPlainEnglish(entry.code, entry.description)}
                                </p>
                                
                                {/* Technical description if different */}
                                {PLAIN_ENGLISH[entry.code] && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    IRS Description: {entry.description}
                                  </p>
                                )}
                                
                                {/* Recommended action for important codes */}
                                {(entry.severity === 'critical' || entry.severity === 'high') && entry.recommendedAction && (
                                  <div className="mt-3 p-2 rounded bg-background border">
                                    <p className="text-sm">
                                      <span className="font-medium">Recommended Action:</span>{' '}
                                      {entry.recommendedAction}
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-right flex-shrink-0">
                                <span className="text-sm text-muted-foreground">{entry.date}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload another */}
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleUploadDifferent}>
                <Upload className="h-4 w-4 mr-2" />
                Analyze Another Transcript
              </Button>
            </div>
          </div>
        )}

        {/* Upload Section - Only show if no results */}
        {!decodeResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  How to Get Your Transcript
                </CardTitle>
                <CardDescription>
                  Follow these steps to download your IRS Account Transcript
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {GUIDE_STEPS.map((item) => (
                  <div 
                    key={item.step} 
                    className={cn(
                      "flex gap-4 p-3 rounded-lg border",
                      item.important && "border-primary/50 bg-primary/5"
                    )}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                        {item.step}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                        >
                          {item.linkText}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {item.important && (
                        <p className="text-xs text-primary font-medium mt-1">
                          ⚠️ Important: Account Transcript shows penalties & payments
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Right Column - Upload */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Upload Transcript
                  </CardTitle>
                  <CardDescription>
                    Drop your Account Transcript PDF here for analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
                      isDragging 
                        ? "border-primary bg-primary/10" 
                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                      uploadedFile && !showReturnWarning && "border-green-500 bg-green-500/10"
                    )}
                    onClick={() => document.getElementById("transcript-upload")?.click()}
                  >
                    <input
                      id="transcript-upload"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    
                    {uploadedFile ? (
                      <div className="space-y-3">
                        <FileText className="h-12 w-12 mx-auto text-green-500" />
                        <div>
                          <p className="font-medium">{uploadedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(uploadedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          handleUploadDifferent();
                        }}>
                          Upload Different File
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div>
                          <p className="font-medium">Drop your Account Transcript PDF here</p>
                          <p className="text-sm text-muted-foreground">
                            or click to browse your files
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Return Transcript Warning */}
              {showReturnWarning && (
                <Alert variant="destructive" className="border-amber-500 bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <AlertTitle className="text-amber-600">Are you sure?</AlertTitle>
                  <AlertDescription className="text-amber-600/90">
                    <p className="mb-3">
                      We recommend the <strong>"Account Transcript"</strong> for the best audit monitoring. 
                      The Account Transcript shows your payment history, penalties, and IRS actions.
                    </p>
                    <p className="mb-4 text-sm">
                      The Return Transcript only shows what was originally filed and won't reveal penalty codes.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleUploadDifferent}
                      >
                        Upload Account Transcript
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={handleContinueAnyway}
                      >
                        Continue Anyway
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success State */}
              {uploadedFile && !showReturnWarning && (
                <Alert className="border-green-500 bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <AlertTitle className="text-green-600">Transcript Uploaded</AlertTitle>
                  <AlertDescription className="text-green-600/90">
                    <p className="mb-3">
                      Your transcript is ready for analysis. Click below to decode penalty codes and payment history.
                    </p>
                    <Button 
                      size="sm" 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        'Analyze Transcript'
                      )}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Info Box */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Why Account Transcript?</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Shows all IRS transaction codes</li>
                        <li>Reveals penalty assessments and interest</li>
                        <li>Displays payment history</li>
                        <li>Indicates audit flags and notices sent</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}