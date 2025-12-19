import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ExternalLink, 
  Info,
  LogIn,
  FolderOpen,
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import screenshots
import irsStep1 from "@/assets/irs-step-1.png";
import irsStep1b from "@/assets/irs-step-1b.png";
import irsStep1c from "@/assets/irs-step-1c.png";
import irsStep2 from "@/assets/irs-step-2.png";
import irsStep2b from "@/assets/irs-step-2b.png";
import irsStep4 from "@/assets/irs-step-4.png";

const GUIDE_STEPS = [
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
    images: [
      { src: irsStep4, caption: "Click 'EN' next to '2024 Record of Account Transcript [PDF]'" }
    ],
    tip: "The PDF filename will include 'Account' in it. If it says 'Return', you downloaded the wrong one!"
  }
];

export function TranscriptGuide() {
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<number, number>>({});

  const toggleStep = (step: number) => {
    setExpandedStep(expandedStep === step ? null : step);
  };

  const getImageIndex = (stepNum: number) => currentImageIndex[stepNum] || 0;
  
  const setImageIndex = (stepNum: number, index: number) => {
    setCurrentImageIndex(prev => ({ ...prev, [stepNum]: index }));
  };

  return (
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
      <CardContent className="space-y-3">
        {GUIDE_STEPS.map((item) => {
          const StepIcon = item.icon;
          const isExpanded = expandedStep === item.step;
          const hasMultipleImages = item.images && item.images.length > 1;
          const imgIndex = getImageIndex(item.step);

          return (
            <div 
              key={item.step} 
              className={cn(
                "rounded-lg border transition-all",
                item.isImportant && "border-amber-500/50",
                isExpanded && "bg-muted/30"
              )}
            >
              {/* Step Header - Clickable */}
              <button
                onClick={() => toggleStep(item.step)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 rounded-lg",
                  item.isImportant && isExpanded && "bg-amber-500/10"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  item.isImportant 
                    ? "bg-amber-500 text-amber-950" 
                    : "bg-primary text-primary-foreground"
                )}>
                  {item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium">{item.title}</h4>
                    {item.isImportant && (
                      <Badge className="bg-amber-500 text-xs">⚠️ Critical</Badge>
                    )}
                  </div>
                  {!isExpanded && (
                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-muted-foreground">
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3">
                  {/* Description */}
                  <p className="text-sm text-muted-foreground pl-11">
                    {item.description}
                  </p>

                  {/* Screenshot */}
                  {item.images && item.images.length > 0 && (
                    <div className="pl-11">
                      <div className="rounded-lg overflow-hidden border bg-background">
                        <img 
                          src={item.images[imgIndex].src} 
                          alt={item.images[imgIndex].caption}
                          className="w-full h-auto"
                        />
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        {item.images[imgIndex].caption}
                      </p>
                      
                      {/* Image navigation for multiple images */}
                      {hasMultipleImages && (
                        <div className="flex justify-center gap-2 mt-2">
                          {item.images.map((_, i) => (
                            <button
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                setImageIndex(item.step, i);
                              }}
                              className={cn(
                                "w-2 h-2 rounded-full transition-all",
                                i === imgIndex 
                                  ? "bg-primary" 
                                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tip */}
                  {item.tip && (
                    <div className="pl-11">
                      <div className="p-2 rounded bg-background border text-xs">
                        <span className="font-medium text-primary">💡 Tip: </span>
                        <span className="text-muted-foreground whitespace-pre-line">{item.tip}</span>
                      </div>
                    </div>
                  )}

                  {/* External Link */}
                  {item.link && (
                    <div className="pl-11">
                      <Button
                        variant="default"
                        size="sm"
                        asChild
                      >
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2"
                        >
                          {item.linkText}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
