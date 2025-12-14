import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Loader2, Shield, Calendar, ShieldCheck, Briefcase, CheckCircle, ArrowRight, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePurchasePlan, PlanLevel } from '@/hooks/usePurchasePlan';

interface Plan {
  id: string;
  tax_year: number;
  status: string;
  plan_level: string;
  created_at: string;
}

export default function Plans() {
  const navigate = useNavigate();
  const { user, role, loading, profileId } = useAuth();
  const { toast } = useToast();
  const { purchasePlan, isLoading: isPurchasing } = usePurchasePlan();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role === 'agent') {
      navigate('/dashboard');
    }
  }, [user, loading, role, navigate]);

  useEffect(() => {
    if (user && role === 'client') {
      fetchPlans();
    }
  }, [user, role]);

  const fetchPlans = async () => {
    setDataLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_plans')
        .select('*')
        .order('tax_year', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load your plans',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handlePurchase = async (planLevel: PlanLevel) => {
    if (!profileId) {
      toast({
        title: 'Error',
        description: 'Profile not found. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    const result = await purchasePlan(profileId, planLevel);
    if (result.success) {
      fetchPlans(); // Refresh the plans list
    }
  };

  const getPlanLevelStyle = (level: string) => {
    const styles: Record<string, string> = {
      basic: 'bg-secondary text-secondary-foreground',
      silver: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      gold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      platinum: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
      premium: 'bg-accent text-accent-foreground',
      enterprise: 'bg-primary text-primary-foreground',
    };
    return styles[level] || styles.basic;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">My Plans</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your audit defense coverage
          </p>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <div className="space-y-8">
            <Card className="border-0 shadow-md">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <Shield className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Get Protected Today</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Choose your level of audit defense coverage. One flat fee, zero deductibles, full representation if you get audited.
                </p>
              </CardContent>
            </Card>

            {/* Plan Selection Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Silver Shield */}
              <Card className="relative border border-border shadow-md hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <Shield className="h-6 w-6 text-slate-500" />
                  </div>
                  <CardTitle className="font-display text-lg">Silver Shield</CardTitle>
                  <CardDescription>Essential protection for this year's return</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="font-display text-3xl font-bold text-foreground">$49</span>
                    <span className="text-muted-foreground">/year</span>
                  </div>
                  <ul className="space-y-2">
                    {['2024 Tax Year Coverage', 'Federal & State Defense', 'Identity Theft Restoration'].map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => handlePurchase('silver')}
                    disabled={isPurchasing}
                  >
                    {isPurchasing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Protect 2024 Return
                  </Button>
                </CardContent>
              </Card>

              {/* Gold Shield - Featured */}
              <Card className="relative border-2 border-primary shadow-xl hover:shadow-2xl transition-all duration-300 scale-105">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-md">
                    <Star className="h-3 w-3 fill-current" />
                    Most Popular
                  </div>
                </div>
                <CardHeader className="pb-4 pt-8">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
                    <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <CardTitle className="font-display text-lg">Gold Shield</CardTitle>
                  <CardDescription>Complete peace of mind for all open tax years</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="font-display text-3xl font-bold text-foreground">$99</span>
                    <span className="text-muted-foreground">/year</span>
                    <Badge className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Best Value</Badge>
                  </div>
                  <div className="bg-primary/10 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-primary">Covers 2021-2024</p>
                  </div>
                  <ul className="space-y-2">
                    {['All Silver features', 'Retroactive Audit Defense', 'Priority Agent Access'].map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    onClick={() => handlePurchase('gold')}
                    disabled={isPurchasing}
                  >
                    {isPurchasing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Get Total Protection
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Platinum Business */}
              <Card className="relative border border-border shadow-md hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-3">
                    <Briefcase className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <CardTitle className="font-display text-lg">Platinum Business</CardTitle>
                  <CardDescription>For Freelancers, Contractors & LLCs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="font-display text-3xl font-bold text-foreground">$199</span>
                    <span className="text-muted-foreground">/year</span>
                  </div>
                  <div className="bg-violet-100 dark:bg-violet-900/30 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">Schedule C & Business Defense</p>
                  </div>
                  <ul className="space-y-2">
                    {['All Gold features', 'Self-Employment Defense', 'Business Expense Verification'].map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => handlePurchase('platinum')}
                    disabled={isPurchasing}
                  >
                    {isPurchasing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Protect My Business
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <Badge className={getPlanLevelStyle(plan.plan_level)}>
                      {plan.plan_level}
                    </Badge>
                  </div>
                  <CardTitle className="font-display text-xl mt-4">
                    Tax Year {plan.tax_year}
                  </CardTitle>
                  <CardDescription>
                    Audit defense coverage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(plan.created_at).toLocaleDateString()}</span>
                    </div>
                    <Badge 
                      variant="outline"
                      className={plan.status === 'active' 
                        ? 'bg-success/10 text-success border-success/20' 
                        : 'bg-muted text-muted-foreground'}
                    >
                      {plan.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
