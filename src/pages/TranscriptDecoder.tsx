import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  FileText, 
  Upload, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function TranscriptDecoder() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showReturnWarning, setShowReturnWarning] = useState(false);

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
    
    // Check if filename contains "Return"
    if (file.name.toLowerCase().includes("return")) {
      setShowReturnWarning(true);
    } else {
      setShowReturnWarning(false);
    }
  };

  const handleContinueAnyway = () => {
    setShowReturnWarning(false);
    // Continue with processing
  };

  const handleUploadDifferent = () => {
    setUploadedFile(null);
    setShowReturnWarning(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transcript Decoder</h1>
          <p className="text-muted-foreground mt-2">
            Upload your IRS Account Transcript to decode penalty codes and payment history
          </p>
        </div>

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
                  <Button size="sm">
                    Analyze Transcript
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
      </div>
    </DashboardLayout>
  );
}
