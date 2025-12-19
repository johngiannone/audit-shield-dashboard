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
  AlertTriangle,
  Download,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import screenshots
import irsStep1 from "@/assets/irs-step-1.png";
import irsStep1b from "@/assets/irs-step-1b.png";
import irsStep1c from "@/assets/irs-step-1c.png";
import irsStep2 from "@/assets/irs-step-2.png";
import irsStep2b from "@/assets/irs-step-2b.png";

interface TranscriptWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WIZARD_STEPS = [
  {
    step: 1,
    title: "Go to IRS.gov and Sign In",
    description: "Navigate to IRS.gov/account and click 'Sign in' in the top right corner. Select 'Individual' and sign in with your ID.me account.",
    icon: LogIn,
    link: "https://www.irs.gov/payments/your-online-account",
    linkText: "Open IRS.gov/account",
    images: [
      { src: irsStep1, caption: "Click 'Sign in' and select 'Individual'" },
      { src: irsStep1b, caption: "Click 'Sign in with ID.me'" },
      { src: irsStep1c, caption: "Enter your ID.me credentials" }
    ],
    tip: "If you don't have an ID.me account, you'll need to create one. Have a photo ID ready for verification."
  },
  {
    step: 2,
    title: "Navigate to Tax Records",
    description: "Once logged in, find the 'Transcripts' section and click 'View transcripts' to see all available transcript types.",
    icon: FolderOpen,
    images: [
      { src: irsStep2, caption: "Click 'View transcripts' button" }
    ],
    tip: "Look for the Transcripts card on your Tax Records page."
  },
  {
    step: 3,
    title: "Select ACCOUNT Transcript (Not Return!)",
    description: "This is the crucial step! You'll see two columns side by side. Choose 'Account Transcripts' on the LEFT. Do NOT select 'Return Transcripts' on the right.",
    icon: AlertTriangle,
    isImportant: true,
    images: [
      { src: irsStep2b, caption: "Choose Account Transcripts (LEFT column) - NOT Return Transcripts!" }
    ],
    tip: "Account Transcript = Payment history, penalties, IRS actions\nReturn Transcript = Just what you originally filed (won't show penalty codes)"
  },
  {
    step: 4,
    title: "Download the 2024 PDF",
    description: "Under 'Account Transcripts', click on '2024 Account Transcript [PDF] EN' to download. Save the file to your device, then upload it here!",
    icon: Download,
    tip: "The PDF filename will include 'Account' in it. If it says 'Return', you downloaded the wrong one!"
  }
];

export function TranscriptWizard({ open, onOpenChange }: TranscriptWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      setCurrentImageIndex(0);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setCurrentImageIndex(0);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setCurrentImageIndex(0);
    onOpenChange(false);
  };

  const step = WIZARD_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const hasMultipleImages = step.images && step.images.length > 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
              onClick={() => {
                setCurrentStep(index);
                setCurrentImageIndex(0);
              }}
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
          "p-5 rounded-lg border-2 transition-colors",
          step.isImportant 
            ? "border-amber-500 bg-amber-500/10" 
            : "border-muted bg-muted/30"
        )}>
          {/* Step Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className={cn(
              "p-3 rounded-full flex-shrink-0",
              step.isImportant ? "bg-amber-500/20" : "bg-primary/10"
            )}>
              <StepIcon className={cn(
                "h-6 w-6",
                step.isImportant ? "text-amber-500" : "text-primary"
              )} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  Step {step.step} of {WIZARD_STEPS.length}
                </Badge>
                {step.isImportant && (
                  <Badge className="bg-amber-500 text-xs">⚠️ Critical Step!</Badge>
                )}
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-muted-foreground mb-4 leading-relaxed">
            {step.description}
          </p>

          {/* Screenshot */}
          {step.images && step.images.length > 0 && (
            <div className="mb-4">
              <div className="rounded-lg overflow-hidden border bg-background">
                <img 
                  src={step.images[currentImageIndex].src} 
                  alt={step.images[currentImageIndex].caption}
                  className="w-full h-auto"
                />
              </div>
              <p className="text-sm text-center text-muted-foreground mt-2">
                {step.images[currentImageIndex].caption}
              </p>
              
              {/* Image navigation for multiple images */}
              {hasMultipleImages && (
                <div className="flex justify-center gap-2 mt-3">
                  {step.images.map((_, imgIndex) => (
                    <button
                      key={imgIndex}
                      onClick={() => setCurrentImageIndex(imgIndex)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        imgIndex === currentImageIndex 
                          ? "bg-primary" 
                          : "bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

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
