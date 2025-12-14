import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, Calculator, TrendingUp, DollarSign, Users, Clock, CheckCircle } from 'lucide-react';
import partnerDashboard from '@/assets/partner-dashboard.png';

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
              <Button size="lg" className="text-base px-8">
                Become a Partner
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8">
                <Calculator className="mr-2 h-5 w-5" />
                Calculate Your Revenue
              </Button>
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

        {/* Benefits Section */}
        <div className="mt-32">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Partner with Return Shield?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Add a valuable service to your practice without adding complexity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: DollarSign,
                title: 'Recurring Revenue',
                description: 'Earn commission on every policy sold. Annual renewals mean passive income year after year.',
              },
              {
                icon: Users,
                title: 'Client Retention',
                description: 'Clients who purchase protection are more likely to return for next year\'s filing.',
              },
              {
                icon: Clock,
                title: 'Zero Liability',
                description: 'We handle all audit defense work. You never have to deal with the IRS on their behalf.',
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

        {/* How It Works */}
        <div className="mt-32">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simple Integration
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Get started in minutes, not months.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Sign Up', desc: 'Complete our brief partner application' },
              { step: '2', title: 'Get Materials', desc: 'Receive branded collateral and training' },
              { step: '3', title: 'Offer Protection', desc: 'Present to clients at filing time' },
              { step: '4', title: 'Earn Revenue', desc: 'Get paid on every sale automatically' },
            ].map((item, i) => (
              <div 
                key={i} 
                className="relative text-center animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground font-display text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 bg-primary/5 rounded-3xl p-12 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Boost Your Practice Revenue?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Join hundreds of tax professionals already earning with Return Shield.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base px-8">
              Apply Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8">
              Schedule a Demo
            </Button>
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
