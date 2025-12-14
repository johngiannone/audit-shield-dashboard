import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, Loader2, Lock, Award, BadgeCheck, ShieldCheck, CloudUpload, Brain, Gavel } from 'lucide-react';
import heroAgent from '@/assets/hero-agent.jpg';

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
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Don't Face the IRS Alone.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              Professional Audit Defense by Enrolled Agents. We handle the paperwork, the calls, and the strategy so you don't have to.
            </p>
            
            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto text-base px-8">
                  Start My Defense
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8">
                How it Works
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

          {/* Right Side - Visual */}
          <div className="relative animate-fade-in lg:order-last">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src={heroAgent} 
                alt="Professional enrolled agent reviewing tax documents" 
                className="w-full h-auto object-cover"
              />
              {/* Verified Secure Badge */}
              <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg px-4 py-2.5 shadow-lg flex items-center gap-2 border border-border">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold text-foreground">Verified Secure</span>
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
    </div>
  );
}