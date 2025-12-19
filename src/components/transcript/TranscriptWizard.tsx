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
  MousePointer,
  AlertTriangle,
  Download,
  CheckCircle2,
  ArrowRight,
  Check,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TranscriptWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WIZARD_STEPS = [
  {
    step: 1,
    title: "Go to IRS.gov and Sign In",
    description: "Navigate to IRS.gov/account and click 'Sign in' in the top right corner. You'll need to verify your identity with ID.me.",
    icon: LogIn,
    link: "https://www.irs.gov/payments/your-online-account",
    linkText: "Open IRS.gov/account",
    visual: {
      type: "steps",
      items: [
        "Go to irs.gov and click 'Sign in' dropdown",
        "Select 'Individual' for personal taxes",
        "Click 'Sign in with ID.me'",
        "Enter your email and password"
      ]
    },
    tip: "If you don't have an ID.me account, you'll need to create one. Have a photo ID ready for verification."
  },
  {
    step: 2,
    title: "Click on Tax Records",
    description: "Once logged in to your IRS account, look for the 'Records and Status' menu in the top navigation bar, or find 'Tax Records' on your account dashboard.",
    icon: FolderOpen,
    visual: {
      type: "highlight",
      location: "Look for 'Records and Status' in the blue navigation bar at the top",
      action: "Click to open the Tax Records page"
    },
    tip: "The Tax Records section shows your return summary, transcripts, and compliance information."
  },
  {
    step: 3,
    title: "Click 'View Transcripts'",
    description: "On the Tax Records page, find the 'Transcripts' section on the right side. Click the 'View transcripts' button to see all available transcript types.",
    icon: MousePointer,
    visual: {
      type: "highlight",
      location: "Right side of the page under 'Transcripts' heading",
      action: "Click the blue 'View transcripts' button"
    },
    tip: "You'll see different transcript types on the next page. Make sure you select the right one!"
  },
  {
    step: 4,
    title: "Select ACCOUNT Transcript (Not Return!)",
    description: "This is the crucial step! You'll see two main options side by side. Look for 'Account Transcripts' on the LEFT side. Do NOT select 'Return Transcripts' on the right.",
    icon: AlertTriangle,
    isImportant: true,
    visual: {
      type: "comparison",
      correct: {
        title: "Account Transcripts ✓",
        description: "Shows penalties, payments, IRS actions",
        side: "LEFT side of page"
      },
      incorrect: {
        title: "Return Transcripts ✗",
        description: "Only shows what you originally filed",
        side: "RIGHT side - DO NOT USE"
      }
    },
    tip: "Account Transcript = Payment history, penalties, IRS actions\nReturn Transcript = Just what you originally filed (won't show penalty codes)"
  },
  {
    step: 5,
    title: "Download the 2024 PDF",
    description: "Under 'Account Transcripts', click on '2024 Account Transcript [PDF] EN' to download. Save the file to your device, then upload it here!",
    icon: Download,
    visual: {
      type: "steps",
      items: [
        "Find '2024 Account Transcript [PDF]' under Account Transcripts",
        "Click 'EN' for English version",
        "PDF will download to your device",
        "Come back here and drop it in the upload zone!"
      ]
    },
    tip: "The PDF filename will include 'Account' in it. If it says 'Return', you downloaded the wrong one!"
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

  const renderVisual = () => {
    if (!step.visual) return null;

    if (step.visual.type === "steps") {
      return (
        <div className="space-y-2">
          {step.visual.items.map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-2 rounded bg-background/50">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                {index + 1}
              </div>
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
      );
    }

    if (step.visual.type === "highlight") {
      return (
        <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            <span className="font-medium text-primary">Where to look:</span>
          </div>
          <p className="text-sm mb-3">{step.visual.location}</p>
          <div className="flex items-center gap-2 text-sm bg-background/50 p-2 rounded">
            <MousePointer className="h-4 w-4" />
            <span>{step.visual.action}</span>
          </div>
        </div>
      );
    }

    if (step.visual.type === "comparison") {
      return (
        <div className="grid grid-cols-2 gap-3">
          {/* Correct Option */}
          <div className="p-4 rounded-lg border-2 border-green-500 bg-green-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Check className="h-5 w-5 text-green-500" />
              <span className="font-bold text-green-600">USE THIS</span>
            </div>
            <h4 className="font-semibold text-sm mb-1">{step.visual.correct.title}</h4>
            <p className="text-xs text-muted-foreground mb-2">{step.visual.correct.description}</p>
            <Badge variant="outline" className="text-xs border-green-500 text-green-600">
              {step.visual.correct.side}
            </Badge>
          </div>
          
          {/* Incorrect Option */}
          <div className="p-4 rounded-lg border-2 border-red-500/50 bg-red-500/5 opacity-75">
            <div className="flex items-center gap-2 mb-2">
              <X className="h-5 w-5 text-red-500" />
              <span className="font-bold text-red-500">DO NOT USE</span>
            </div>
            <h4 className="font-semibold text-sm mb-1 line-through">{step.visual.incorrect.title}</h4>
            <p className="text-xs text-muted-foreground mb-2">{step.visual.incorrect.description}</p>
            <Badge variant="outline" className="text-xs border-red-500/50 text-red-500">
              {step.visual.incorrect.side}
            </Badge>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
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

          {/* Visual Guide */}
          <div className="mb-4">
            {renderVisual()}
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
