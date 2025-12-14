import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, Loader2, Lock, Award, BadgeCheck, ShieldCheck, CloudUpload, Brain, Gavel, CheckCircle, Calendar, Briefcase, Star, X, Clock, DollarSign, Frown, Smile } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-md">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold text-foreground">Return Shield</span>
        </div>
        <Link to="/auth">
          <Button variant="outline">Sign In</Button>
        </Link>
      </header>

      {/* Hero - Split Layout */}
      <main className="container mx-auto px-6 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Side - Copy */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <CheckCircle className="h-4 w-4" />
              Limited Time: Lock in 2024 Rates
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Audit Protection for Your Tax Return. <span className="text-primary">Just $99/Year.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              The IRS is hiring thousands of new agents. Lock in your defense team now. If you get audited, we handle everything for <span className="font-semibold text-foreground">$0 extra fees</span>.
            </p>
            
            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto text-base px-8">
                  Get Coverage Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto text-base px-8"
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              >
                View Membership Plans
              </Button>
            </div>

            {/* Trust Signals */}
            <div className="flex flex-wrap gap-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <BadgeCheck className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium">Enrolled Agents</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium">Bank-Level Security</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium">A+ Rating</span>
              </div>
            </div>
          </div>

          {/* Right Side - Protected Status UI */}
          <div className="relative animate-fade-in lg:order-last">
            <div className="relative bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
              {/* Status Card Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <ShieldCheck className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm font-medium">Protection Status</p>
                      <p className="text-white text-xl font-bold">ACTIVE</p>
                    </div>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                </div>
              </div>
              
              {/* Status Card Body */}
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Coverage Year</span>
                  <span className="font-semibold text-foreground">2024</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Plan Type</span>
                  <span className="font-semibold text-foreground">Premium Protection</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Defense Team</span>
                  <span className="font-semibold text-foreground">Enrolled Agent Assigned</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">Renewal</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-foreground">Dec 31, 2024</span>
                  </div>
                </div>
                
                {/* Coverage Features */}
                <div className="pt-4 space-y-3">
                  {['Full IRS Audit Defense', 'State Tax Coverage', 'Unlimited Consultations', '$0 Out-of-Pocket'].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -z-10 -top-4 -right-4 w-full h-full rounded-2xl bg-primary/10" />
          </div>
        </div>

        {/* Trust Strip */}
        <div className="mt-20 -mx-6 px-6 py-10 bg-[hsl(210,17%,98%)] dark:bg-muted/30 border-y border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            <div className="animate-fade-in" style={{ animationDelay: '0ms' }}>
              <div className="font-display text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                10,000<span className="text-primary">+</span>
              </div>
              <div className="text-sm uppercase tracking-widest text-muted-foreground mt-2 font-medium">
                Cases Resolved
              </div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="font-display text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                $50M<span className="text-primary">+</span>
              </div>
              <div className="text-sm uppercase tracking-widest text-muted-foreground mt-2 font-medium">
                Tax Savings Saved
              </div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="font-display text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                &lt;4<span className="text-primary">hrs</span>
              </div>
              <div className="text-sm uppercase tracking-widest text-muted-foreground mt-2 font-medium">
                Average Response Time
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mt-24 max-w-6xl mx-auto" id="pricing">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Choose Your Level of Protection
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              One flat fee. Zero deductibles. Full representation if you get audited.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {/* Silver Shield */}
            <Card className="relative bg-card border border-border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in" style={{ animationDelay: '0ms' }}>
              <CardHeader className="pb-4 pt-8 px-8">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Shield className="h-7 w-7 text-slate-500" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">Silver Shield</h3>
                <p className="text-muted-foreground text-sm mt-1">Essential protection for this year's return</p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="mb-6">
                  <span className="font-display text-4xl font-bold text-foreground">$49</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['2024 Tax Year Coverage', 'Federal & State Defense', 'Identity Theft Restoration', 'W-2 Income Protection'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/auth">
                  <Button variant="outline" className="w-full">Protect 2024 Return</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Gold Shield - Featured */}
            <Card className="relative bg-card border-2 border-primary shadow-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in scale-105" style={{ animationDelay: '100ms' }}>
              {/* Most Popular Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 shadow-lg">
                  <Star className="h-4 w-4 fill-current" />
                  Most Popular
                </div>
              </div>
              <CardHeader className="pb-4 pt-10 px-8">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">Gold Shield</h3>
                <p className="text-muted-foreground text-sm mt-1">Complete peace of mind for all open tax years</p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="mb-4">
                  <span className="font-display text-4xl font-bold text-foreground">$99</span>
                  <span className="text-muted-foreground">/year</span>
                  <div className="inline-flex ml-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs font-medium">
                    Best Value
                  </div>
                </div>
                {/* Key Differentiator */}
                <div className="bg-primary/10 rounded-lg px-4 py-2.5 mb-6">
                  <p className="text-sm font-semibold text-primary">Covers 2021, 2022, 2023 & 2024</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Includes all Silver features', 'Retroactive Audit Defense', 'Investment Income Coverage', 'Priority Agent Access'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/auth">
                  <Button className="w-full">
                    Get Total Protection
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Platinum Business */}
            <Card className="relative bg-card border border-border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <CardHeader className="pb-4 pt-8 px-8">
                <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                  <Briefcase className="h-7 w-7 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">Platinum Business</h3>
                <p className="text-muted-foreground text-sm mt-1">For Freelancers, Contractors & LLCs</p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="mb-4">
                  <span className="font-display text-4xl font-bold text-foreground">$199</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                {/* Key Differentiator */}
                <div className="bg-violet-100 dark:bg-violet-900/30 rounded-lg px-4 py-2.5 mb-6">
                  <p className="text-sm font-semibold text-violet-700 dark:text-violet-400">Schedule C & Business Defense</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Includes all Gold features', 'Self-Employment Audit Defense', 'Business Expense Verification', 'Payroll Tax Inquiry Defense'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/auth">
                  <Button variant="outline" className="w-full">Protect My Business</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Trust Footer */}
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="text-sm">Membership includes 100% of professional fees. No hidden costs.</span>
            </div>
          </div>
        </div>

        {/* Why Prepay Comparison Section */}
        <div className="mt-24 max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Prepay for Protection?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              See the difference our coverage makes when the IRS comes calling
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Without Us - The Risk */}
            <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-8 border border-red-200 dark:border-red-900/50 animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  The Cost of an Audit <span className="text-red-600 dark:text-red-400">Without Us</span>
                </h3>
              </div>
              
              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Average Professional Fees</p>
                    <p className="font-display text-2xl font-bold text-red-600 dark:text-red-400">$3,500+</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Hours of Your Time Lost</p>
                    <p className="font-display text-2xl font-bold text-red-600 dark:text-red-400">40+ Hours</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Frown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Stress Level</p>
                    <p className="font-display text-2xl font-bold text-red-600 dark:text-red-400">High</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* With Us - The Solution */}
            <div className="bg-green-50 dark:bg-green-950/20 rounded-2xl p-8 border border-green-200 dark:border-green-900/50 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  The Cost <span className="text-green-600 dark:text-green-400">With Return Shield</span>
                </h3>
              </div>
              
              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Your Cost</p>
                    <p className="font-display text-2xl font-bold text-green-600 dark:text-green-400">$0 <span className="text-base font-normal text-muted-foreground">(Included in Plan)</span></p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Your Time</p>
                    <p className="font-display text-2xl font-bold text-green-600 dark:text-green-400">0 Hours</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Smile className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Stress Level</p>
                    <p className="font-display text-2xl font-bold text-green-600 dark:text-green-400">Zero</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* How it Works Timeline */}
        <div className="mt-24 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              From Notice to Resolution in 3 Steps
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our streamlined process makes audit defense simple and stress-free
            </p>
          </div>

          <div className="relative">
            {/* Horizontal Connector Line */}
            <div className="hidden md:block absolute top-20 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent">
              <div className="absolute left-1/6 right-1/6 h-full bg-primary/40" style={{ left: '10%', right: '10%' }} />
            </div>

            <div className="grid md:grid-cols-3 gap-10">
              {[
                { 
                  step: '1', 
                  title: 'Upload Notice', 
                  desc: 'Snap a photo of your IRS or State letter.',
                  icon: CloudUpload
                },
                { 
                  step: '2', 
                  title: 'AI Analysis & Assignment', 
                  desc: 'Our system analyzes the threat and assigns a dedicated Enrolled Agent.',
                  icon: Brain
                },
                { 
                  step: '3', 
                  title: 'Defense & Resolution', 
                  desc: 'We communicate with the agency directly to resolve your case.',
                  icon: Gavel
                },
              ].map((item, i) => (
                <div 
                  key={i} 
                  className="relative animate-fade-in" 
                  style={{ animationDelay: `${i * 200}ms` }}
                >
                  {/* Step Number Circle */}
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-2xl mx-auto mb-8 relative z-10 shadow-xl ring-4 ring-background">
                    {item.step}
                  </div>
                  
                  <div className="bg-card rounded-xl p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50 hover:-translate-y-1">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Pre-Footer CTA */}
      <section className="bg-primary py-16 md:py-20">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto animate-fade-in">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              The IRS Clock is Ticking.
            </h2>
            <p className="text-primary-foreground/80 text-lg md:text-xl mb-8 leading-relaxed">
              Most notices have strict deadlines. Delaying can lead to penalties and interest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="w-full sm:w-auto text-base px-10 font-semibold"
                >
                  Start My Defense Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="text-primary-foreground/60 text-sm mt-6">
              No commitment required. Get a free case review today.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}