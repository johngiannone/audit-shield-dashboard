import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  RefreshCw, 
  Shield, 
  ArrowRight, 
  DollarSign,
  Loader2,
  CheckCircle,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const AOV = 99; // Average order value
const COMMISSION_RATE = 0.20;

const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Generate referral code from name
const generateReferralCode = (name: string): string => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 20);
  const randomSuffix = Math.floor(Math.random() * 1000);
  return `${slug}-${randomSuffix}`;
};

export default function Affiliates() {
  const [referrals, setReferrals] = useState([10]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const monthlyEarnings = Math.round(referrals[0] * AOV * COMMISSION_RATE);
  const yearlyEarnings = monthlyEarnings * 12;

  const scrollToSignup = () => {
    document.getElementById('affiliate-signup')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const result = signupSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setErrors({ email: 'This email is already registered. Please sign in instead.' });
        } else {
          throw authError;
        }
        return;
      }

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      // 2. Create affiliate record
      const referralCode = generateReferralCode(formData.fullName);
      
      const { error: affiliateError } = await supabase
        .from('affiliates')
        .insert({
          user_id: authData.user.id,
          referral_code: referralCode,
          commission_rate: COMMISSION_RATE,
          total_earnings: 0,
        });

      if (affiliateError) {
        console.error('Affiliate creation error:', affiliateError);
        // Don't fail completely - user is created, they can be upgraded to affiliate later
        toast.error('Account created but affiliate setup failed. Please contact support.');
      } else {
        setIsSuccess(true);
        toast.success(`Welcome! Your referral code is: ${referralCode}`);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pitchCards = [
    {
      icon: TrendingUp,
      title: 'High Conversion',
      description: 'Audit defense is an emotional, high-urgency purchase. Your audience converts because the pain of an IRS audit is real.',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: RefreshCw,
      title: 'Recurring Revenue',
      description: 'Get paid every year the client stays protected. One referral can earn you commissions for years.',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: Shield,
      title: 'Trusted Product',
      description: 'Promote a service backed by licensed Enrolled Agents. Your reputation stays intact.',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Affiliate Program | Return Shield</title>
        <meta name="description" content="Earn 20% recurring commissions by helping your audience survive an IRS audit. Join the Return Shield affiliate program today." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-display font-semibold text-lg">Return Shield</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/partners">
                <Button variant="ghost" size="sm">For Tax Firms</Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-muted/50 to-background">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <DollarSign className="h-4 w-4" />
              20% Recurring Commissions
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 max-w-4xl mx-auto leading-tight">
              Monetize Your Financial Audience
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Earn 20% recurring commissions by helping your readers survive an IRS audit. 
              One referral can pay you for years.
            </p>
            <Button size="lg" onClick={scrollToSignup} className="text-lg px-8">
              Join Program
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* Pitch Cards */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Promote Return Shield?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A high-converting offer that aligns with your audience's needs
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {pitchCards.map((card, index) => (
                <Card key={index} className="border border-border hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center mb-4`}>
                      <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                    </div>
                    <CardTitle className="font-display text-xl">{card.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Commission Calculator */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <Card className="border-2 border-primary/20 shadow-xl">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="font-display text-2xl md:text-3xl">
                    Commission Calculator
                  </CardTitle>
                  <CardDescription className="text-base">
                    See how much you could earn
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">If you refer</Label>
                      <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-display text-xl font-bold text-primary">
                          {referrals[0]}
                        </span>
                        <span className="text-muted-foreground">customers/mo</span>
                      </div>
                    </div>
                    <Slider
                      value={referrals}
                      onValueChange={setReferrals}
                      min={1}
                      max={100}
                      step={1}
                      className="py-4"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>1 customer</span>
                      <span>100 customers</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 rounded-xl p-6 text-center">
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-1">Monthly Earnings</p>
                      <p className="font-display text-3xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                        ${monthlyEarnings.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl p-6 text-center">
                      <p className="text-sm text-primary/80 mb-1">Yearly Earnings</p>
                      <p className="font-display text-3xl md:text-4xl font-bold text-primary">
                        ${yearlyEarnings.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <p className="text-center text-sm text-muted-foreground">
                    Based on ${AOV} average order value × {COMMISSION_RATE * 100}% commission
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Sign Up Form */}
        <section id="affiliate-signup" className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto">
              <Card className="border border-border shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle className="font-display text-2xl">
                    {isSuccess ? 'Welcome to the Program!' : 'Join the Affiliate Program'}
                  </CardTitle>
                  <CardDescription>
                    {isSuccess 
                      ? 'Check your email to verify your account'
                      : 'Create your account and get your unique referral link'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSuccess ? (
                    <div className="text-center py-8 space-y-4">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-muted-foreground">
                        Your affiliate account has been created. Check your email to verify and access your dashboard.
                      </p>
                      <Link to="/auth">
                        <Button className="mt-4">Sign In to Dashboard</Button>
                      </Link>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          placeholder="John Doe"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className={errors.fullName ? 'border-destructive' : ''}
                        />
                        {errors.fullName && (
                          <p className="text-sm text-destructive">{errors.fullName}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={errors.email ? 'border-destructive' : ''}
                        />
                        {errors.email && (
                          <p className="text-sm text-destructive">{errors.email}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={handleInputChange}
                          className={errors.password ? 'border-destructive' : ''}
                        />
                        {errors.password && (
                          <p className="text-sm text-destructive">{errors.password}</p>
                        )}
                      </div>

                      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          <>
                            Create Affiliate Account
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>

                      <p className="text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link to="/auth" className="text-primary hover:underline">
                          Sign in
                        </Link>
                      </p>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-border">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Return Shield. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
