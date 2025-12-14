import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, Loader2, Lock, Award, BadgeCheck, ShieldCheck, CloudUpload, Brain, Gavel, CheckCircle, Calendar, Briefcase, Star, X, Clock, DollarSign, Frown, Smile, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Helmet } from 'react-helmet-async';
import { PricingCard } from '@/components/landing/PricingCard';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What exactly does 'Audit Defense' cover?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "If you receive a notice from the IRS or State tax authorities, we handle everything. This includes drafting correspondence, making phone calls to the agency, and physically representing you at audit meetings if necessary. We defend your tax return to ensure you only pay what you legally owe—not a penny more."
        }
      },
      {
        "@type": "Question",
        "name": "Do I still have to pay the taxes if I lose?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Our membership covers 100% of the professional fees to defend you (which can cost $3,500+ without insurance). However, any additional taxes, penalties, or interest determined to be owed to the IRS are your responsibility. Our job is to minimize or eliminate that amount through expert defense."
        }
      },
      {
        "@type": "Question",
        "name": "I am self-employed / have a side hustle. Which plan do I need?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You need the Platinum Business plan. The Silver and Gold plans cover personal W-2 income and standard deductions. If you file a Schedule C (Sole Proprietorship) or have 1099 income, your audit risk is significantly higher, requiring the specialized defense included in the Platinum tier."
        }
      },
      {
        "@type": "Question",
        "name": "Does the 'Gold Shield' cover tax returns I filed years ago?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! The Gold Shield plan provides Retroactive Coverage. It protects the current tax year plus the previous three tax years (the standard IRS statute of limitations). As long as you haven't received a notice for those years before buying the plan, they are fully covered."
        }
      },
      {
        "@type": "Question",
        "name": "What if I already received a notice yesterday?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our prepaid memberships are for future protection. If you already have a notice in hand, we can still help! Please click 'Report a Notice' in the top navigation to upload your letter. Our team will review it and provide a customized flat-rate quote for defense, separate from our annual membership plans."
        }
      },
      {
        "@type": "Question",
        "name": "Who will be handling my case?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You are assigned a dedicated Enrolled Agent (EA) or CPA. Enrolled Agents are federally licensed tax practitioners empowered by the U.S. Department of the Treasury to represent taxpayers before the IRS. We do not outsource your defense to unqualified support staff."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>
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
        <div className="mt-24 max-w-5xl mx-auto" id="pricing">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Choose Your Protection Plan
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              One flat fee. Zero deductibles. Full representation if you get audited.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            <PricingCard type="individual" />
            <PricingCard type="business" />
          </div>

          {/* Trust Footer */}
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="text-sm">Membership includes 100% of professional fees. No hidden costs.</span>
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-4xl mx-auto bg-secondary/30 rounded-3xl p-8 md:p-12" id="faq">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to know about our audit defense coverage
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-card rounded-xl border border-border px-6 data-[state=open]:shadow-md transition-shadow">
              <AccordionTrigger className="font-display text-left text-foreground hover:no-underline py-5">
                What exactly does "Audit Defense" cover?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                If you receive a notice from the IRS or State tax authorities, we handle everything. This includes drafting correspondence, making phone calls to the agency, and physically representing you at audit meetings if necessary. We defend your tax return to ensure you only pay what you legally owe—not a penny more.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-card rounded-xl border border-border px-6 data-[state=open]:shadow-md transition-shadow">
              <AccordionTrigger className="font-display text-left text-foreground hover:no-underline py-5">
                Do I still have to pay the taxes if I lose?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                Yes. Our membership covers 100% of the professional fees to defend you (which can cost $3,500+ without insurance). However, any additional taxes, penalties, or interest determined to be owed to the IRS are your responsibility. Our job is to minimize or eliminate that amount through expert defense.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-card rounded-xl border border-border px-6 data-[state=open]:shadow-md transition-shadow">
              <AccordionTrigger className="font-display text-left text-foreground hover:no-underline py-5">
                I am self-employed / have a side hustle. Which plan do I need?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                You need the Platinum Business plan. The Silver and Gold plans cover personal W-2 income and standard deductions. If you file a Schedule C (Sole Proprietorship) or have 1099 income, your audit risk is significantly higher, requiring the specialized defense included in the Platinum tier.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-card rounded-xl border border-border px-6 data-[state=open]:shadow-md transition-shadow">
              <AccordionTrigger className="font-display text-left text-foreground hover:no-underline py-5">
                Does the "Gold Shield" cover tax returns I filed years ago?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                Yes! The Gold Shield plan provides Retroactive Coverage. It protects the current tax year plus the previous three tax years (the standard IRS statute of limitations). As long as you haven't received a notice for those years before buying the plan, they are fully covered.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-card rounded-xl border border-border px-6 data-[state=open]:shadow-md transition-shadow">
              <AccordionTrigger className="font-display text-left text-foreground hover:no-underline py-5">
                What if I already received a notice yesterday?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                Our prepaid memberships are for future protection. If you already have a notice in hand, we can still help! Please click "Report a Notice" in the top navigation to upload your letter. Our team will review it and provide a customized flat-rate quote for defense, separate from our annual membership plans.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="bg-card rounded-xl border border-border px-6 data-[state=open]:shadow-md transition-shadow">
              <AccordionTrigger className="font-display text-left text-foreground hover:no-underline py-5">
                Who will be handling my case?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                You are assigned a dedicated Enrolled Agent (EA) or CPA. Enrolled Agents are federally licensed tax practitioners empowered by the U.S. Department of the Treasury to represent taxpayers before the IRS. We do not outsource your defense to unqualified support staff.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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

      {/* Back to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-8 right-8 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-110 ${
          showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label="Back to top"
      >
        <ChevronUp className="h-5 w-5" />
      </button>
    </div>
  );
}