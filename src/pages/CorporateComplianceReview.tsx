import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Calendar, CheckCircle2, Clock, Shield, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

const CorporateComplianceReview = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formType = searchParams.get('type') || '1120';
  const [calendlyLoaded, setCalendlyLoaded] = useState(false);

  // Load Calendly widget script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    script.onload = () => setCalendlyLoaded(true);
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  const openCalendly = () => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({
        url: 'https://calendly.com/your-company/corporate-compliance-review'
      });
    }
  };

  const formTypeLabel = formType === '1120-S' ? 'S-Corporation (1120-S)' : 'C-Corporation (1120)';

  const reviewBenefits = [
    {
      icon: Shield,
      title: "Audit Defense Strategy",
      description: "Custom defense plan tailored to your corporate structure and risk factors"
    },
    {
      icon: Users,
      title: "Reasonable Compensation Analysis",
      description: formType === '1120-S' 
        ? "Professional study to justify officer compensation and avoid IRS penalties"
        : "Review of officer compensation relative to industry benchmarks"
    },
    {
      icon: Building2,
      title: "Entity Structure Review",
      description: "Evaluate if your current corporate structure is optimized for tax efficiency"
    },
    {
      icon: CheckCircle2,
      title: "Compliance Checklist",
      description: "Comprehensive review of all filing requirements and potential red flags"
    }
  ];

  return (
    <>
      <Helmet>
        <title>Corporate Compliance Review | Schedule Consultation</title>
        <meta name="description" content="Schedule a corporate compliance review with our tax experts. Get audit defense strategies for S-Corps and C-Corps." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/audit-risk')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Risk Assessment
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              {formTypeLabel}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Corporate Compliance Review
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our enrolled agents specialize in corporate tax defense. Schedule a consultation 
              to review your {formType === '1120-S' ? 'S-Corp' : 'C-Corp'} return and build your audit defense strategy.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Benefits Card */}
            <Card>
              <CardHeader>
                <CardTitle>What's Included</CardTitle>
                <CardDescription>
                  Comprehensive corporate compliance review
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {reviewBenefits.map((benefit, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <benefit.icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Scheduling Card */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Schedule Your Review
                </CardTitle>
                <CardDescription>
                  Book a 30-minute consultation with a corporate tax specialist
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Calendly Inline Widget */}
                <div 
                  className="calendly-inline-widget rounded-lg overflow-hidden border" 
                  data-url="https://calendly.com/your-company/corporate-compliance-review?hide_gdpr_banner=1"
                  style={{ minWidth: '100%', height: '400px' }}
                />

                {/* Fallback Button */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Or click below to open the scheduling widget
                  </p>
                  <Button 
                    onClick={openCalendly}
                    className="w-full"
                    size="lg"
                    disabled={!calendlyLoaded}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {calendlyLoaded ? 'Open Scheduler' : 'Loading...'}
                  </Button>
                </div>

                {/* Session Info */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>30-minute consultation</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span>Free initial assessment</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span>Confidential & secure</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* S-Corp Specific Warning */}
          {formType === '1120-S' && (
            <Card className="mt-8 border-amber-500/30 bg-amber-500/5">
              <CardContent className="py-4">
                <p className="text-sm text-center text-amber-700 dark:text-amber-400">
                  <strong>S-Corp Owners:</strong> Reasonable compensation is the #1 audit trigger for S-Corps. 
                  Our review includes a preliminary compensation analysis to identify your risk level before the IRS does.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Trust Indicators */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">Trusted by corporate clients nationwide</p>
            <div className="flex justify-center gap-8 opacity-60">
              <div className="text-center">
                <div className="text-2xl font-bold">500+</div>
                <div className="text-xs text-muted-foreground">Corporate Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">98%</div>
                <div className="text-xs text-muted-foreground">Client Satisfaction</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">15+</div>
                <div className="text-xs text-muted-foreground">Years Experience</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

// Extend Window interface for Calendly
declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

export default CorporateComplianceReview;
