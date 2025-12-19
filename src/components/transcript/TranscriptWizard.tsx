import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle,
  LogIn,
  FolderOpen,
  FileSearch,
  AlertTriangle,
  Download,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TranscriptWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WIZARD_STEPS = [
  {
    step: 1,
    title: "Sign In to IRS.gov",
    description: "Go to IRS.gov/account and sign in using your ID.me credentials. If you don't have an account, you'll need to create one first.",
    icon: LogIn,
    link: "https://www.irs.gov/payments/your-online-account",
    linkText: "Open IRS.gov/account",
    tip: "ID.me verification may require a photo ID and selfie for first-time setup."
  },
  {
    step: 2,
    title: "Click on Tax Records",
    description: "Once logged in, look for the \"Tax Records\" tab in your account dashboard. Click on it to access your transcript options.",
    icon: FolderOpen,
    tip: "The Tax Records section is usually displayed prominently on your account homepage."
  },
  {
    step: 3,
    title: "Click \"Get Transcript\"",
    description: "Select \"Get Transcript\" and when asked for a reason, choose \"Other\" from the dropdown menu.",
    icon: FileSearch,
    tip: "The reason you select doesn't affect which transcripts are available to you."
  },
  {
    step: 4,
    title: "Select ACCOUNT Transcript",
    description: "This is the most important step! Look for the \"Account Transcript\" box — it's usually in the bottom left area. Do NOT download the \"Return Transcript\" as it won't show penalty codes.",
    icon: AlertTriangle,
    isImportant: true,
    tip: "Account Transcript = Payment history, penalties, IRS actions\nReturn Transcript = Just what you originally filed"
  },
  {
    step: 5,
    title: "Download the PDF",
    description: "Select tax year 2024 (or the year you need) and download the Account Transcript PDF. Then come back here and drop it in the upload zone!",
    icon: Download,
    tip: "The PDF will download to your device's default download location."
  }
];

export function TranscriptWizard({ open, onOpenChange }: TranscriptWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onOpenChange(false);
  };

  const step = WIZARD_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <DialogTitle>Help Me Get My Transcript</DialogTitle>
          </div>
          <DialogDescription>
            Follow these steps to download your IRS Account Transcript
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex justify-center gap-2 py-2">
          {WIZARD_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all",
                index === currentStep 
                  ? "bg-primary w-6" 
                  : index < currentStep 
                    ? "bg-primary/50" 
                    : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className={cn(
          "p-6 rounded-lg border-2 transition-colors",
          step.isImportant 
            ? "border-amber-500 bg-amber-500/10" 
            : "border-muted bg-muted/30"
        )}>
          {/* Step Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className={cn(
              "p-3 rounded-full",
              step.isImportant ? "bg-amber-500/20" : "bg-primary/10"
            )}>
              <StepIcon className={cn(
                "h-6 w-6",
                step.isImportant ? "text-amber-500" : "text-primary"
              )} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  Step {step.step} of {WIZARD_STEPS.length}
                </Badge>
                {step.isImportant && (
                  <Badge className="bg-amber-500 text-xs">Important!</Badge>
                )}
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-muted-foreground mb-4 leading-relaxed">
            {step.description}
          </p>

          {/* Screenshot Placeholder */}
          <div className="relative aspect-video rounded-lg bg-gradient-to-br from-muted to-muted/50 border-2 border-dashed border-muted-foreground/20 mb-4 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <StepIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Screenshot placeholder</p>
              <p className="text-xs opacity-70">Image will be added here</p>
            </div>
          </div>

          {/* Tip Box */}
          {step.tip && (
            <div className="p-3 rounded-lg bg-background border text-sm">
              <span className="font-medium text-primary">💡 Tip: </span>
              <span className="text-muted-foreground whitespace-pre-line">{step.tip}</span>
            </div>
          )}

          {/* External Link */}
          {step.link && (
            <a
              href={step.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              {step.linkText}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <span className="text-sm text-muted-foreground">
            {currentStep + 1} / {WIZARD_STEPS.length}
          </span>

          {isLastStep ? (
            <Button onClick={handleClose}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Done
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
