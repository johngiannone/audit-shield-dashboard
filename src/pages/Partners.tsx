import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, Calculator, TrendingUp, DollarSign, Users, Clock, CheckCircle, RefreshCw, Handshake } from 'lucide-react';
import partnerDashboard from '@/assets/partner-dashboard.png';
import { RevenueCalculator } from '@/components/partners/RevenueCalculator';
import { PartnerApplicationForm } from '@/components/partners/PartnerApplicationForm';

export default function Partners() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-md">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold text-foreground">Return Shield</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost">For Taxpayers</Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline">Partner Login</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Side - Copy */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <TrendingUp className="h-4 w-4" />
              Partner Program
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Increase Revenue Per Return by <span className="text-primary">$40+</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              Offer Return Shield protection to your clients at the time of filing. You get the revenue share, we handle the IRS notices. <span className="font-semibold text-foreground">Zero extra work for your firm.</span>
            </p>
            
            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button 
                size="lg" 
                className="text-base px-8"
                onClick={() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Become a Partner
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <RevenueCalculator />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border">
              <div>
                <div className="font-display text-3xl font-bold text-foreground">$40+</div>
                <div className="text-sm text-muted-foreground mt-1">Per Return</div>
              </div>
              <div>
                <div className="font-display text-3xl font-bold text-foreground">50%</div>
                <div className="text-sm text-muted-foreground mt-1">Revenue Share</div>
              </div>
              <div>
                <div className="font-display text-3xl font-bold text-foreground">0</div>
                <div className="text-sm text-muted-foreground mt-1">Extra Work</div>
              </div>
            </div>
          </div>

          {/* Right Side - Dashboard Visual */}
          <div className="relative animate-fade-in lg:order-last">
            <div className="relative rounded-2xl shadow-2xl overflow-hidden border border-border">
              <img 
                src={partnerDashboard} 
                alt="Partner dashboard showing ancillary revenue growth" 
                className="w-full h-auto"
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -z-10 -top-4 -right-4 w-full h-full rounded-2xl bg-primary/10" />
          </div>
        </div>

        {/* Why Partner Section */}
        <div className="mt-32">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Partner?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Add a valuable service to your practice without adding complexity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: 'Instant Revenue Stream',
                description: 'Turn a cost center into a profit center. Earn a commission on every protection plan sold during tax season.',
              },
              {
                icon: RefreshCw,
                title: 'Year-Round Client Retention',
                description: "Don't just see them in April. Our branded client portal keeps your firm top-of-mind with monthly tax tips and audit risk monitoring.",
              },
              {
                icon: Handshake,
                title: 'We Do The Work, You Get The Credit',
                description: 'When a notice arrives, our Enrolled Agents handle the defense. Your client stays protected, and your staff stays focused on billable work.',
              },
            ].map((benefit, i) => (
              <div 
                key={i} 
                className="bg-card rounded-2xl border border-border p-8 hover:shadow-lg transition-shadow animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Seamless Integration Section */}
        <div className="mt-32">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Fits Into Your Existing Workflow
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              No new software to learn. Just a simple checkbox at checkout.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Mock UI Visual */}
            <div className="relative animate-fade-in order-2 lg:order-1">
              <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
                {/* Mock Header */}
                <div className="bg-muted/50 px-6 py-4 border-b border-border flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">TaxPro Software - Checkout</span>
                </div>
                
                {/* Mock Content */}
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Client: John Smith</p>
                    <p className="text-sm text-muted-foreground">Return Type: 1040 Individual</p>
                  </div>
                  
                  <div className="border-t border-border pt-6 space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">Tax Preparation Fee</span>
                      <span className="font-medium text-foreground">$299.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">State Filing</span>
                      <span className="font-medium text-foreground">$49.00</span>
                    </div>
                  </div>
                  
                  {/* The Checkbox - Highlighted */}
                  <div className="bg-primary/5 border-2 border-primary rounded-xl p-4 relative">
                    <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                      NEW
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div className="mt-0.5 w-5 h-5 rounded border-2 border-primary bg-primary flex items-center justify-center">
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Add Audit Protection for $59</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Full IRS & State defense if audited. Powered by Return Shield.
                        </p>
                      </div>
                    </label>
                  </div>
                  
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between font-semibold">
                      <span className="text-foreground">Total</span>
                      <span className="text-foreground">$407.00</span>
                    </div>
                  </div>
                  
                  <div className="bg-primary text-primary-foreground rounded-lg py-3 text-center font-medium">
                    Complete Payment
                  </div>
                </div>
              </div>
              <div className="absolute -z-10 -bottom-4 -right-4 w-full h-full rounded-2xl bg-primary/10" />
            </div>

            {/* Steps */}
            <div className="space-y-8 order-1 lg:order-2">
              {[
                {
                  step: '1',
                  title: 'Offer',
                  description: 'Add the checkbox to your filing process. One click for your client, instant protection.',
                },
                {
                  step: '2',
                  title: 'Connect',
                  description: 'Client receives instant access to the Return Shield portal with your branding.',
                },
                {
                  step: '3',
                  title: 'Earn',
                  description: 'We send you monthly revenue share payouts. No invoicing, no chasing payments.',
                },
              ].map((item, i) => (
                <div 
                  key={i}
                  className="flex gap-5 animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-display text-lg font-bold flex items-center justify-center flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Partner Application Form Section */}
        <div className="mt-32" id="apply">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Apply to Become a Partner
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Fill out the form below and our partnerships team will reach out within 1-2 business days.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <PartnerApplicationForm />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 border-t border-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-foreground">Return Shield</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Return Shield. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
