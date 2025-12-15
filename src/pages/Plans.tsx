import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Loader2, Shield, Calendar, ShieldCheck, Briefcase, CheckCircle, ArrowRight, Star, CreditCard, AlertCircle, ExternalLink, Receipt, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePurchasePlan, PlanLevel } from '@/hooks/usePurchasePlan';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CardBrandIcon } from '@/components/billing/CardBrandIcon';
interface Plan {
  id: string;
  tax_year: number;
  status: string;
  plan_level: string;
  created_at: string;
}

interface PaymentMethodInfo {
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
}

interface SubscriptionInfo {
  id: string;
  status: string;
  planName: string;
  priceId: string;
  productId: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  paymentMethod: PaymentMethodInfo | null;
}

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amount: number;
  currency: string;
  created: string;
  periodStart: string | null;
  periodEnd: string | null;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
}

export default function Plans() {
  const navigate = useNavigate();
  const { user, role, loading, profileId } = useAuth();
  const { toast } = useToast();
  const { purchasePlan, isLoading: isPurchasing } = usePurchasePlan();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

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
      fetchSubscription();
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

  const fetchSubscription = async () => {
    setSubscriptionLoading(true);
    try {
      // First verify we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('No valid session for subscription check');
        setSubscriptionLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) {
        // Don't throw for auth errors - user might not have a subscription
        console.error('Subscription check error:', error);
        return;
      }
      if (data?.subscription) {
        setSubscription(data.subscription);
      }
      if (data?.invoices) {
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to open billing portal',
        variant: 'destructive',
      });
    } finally {
      setPortalLoading(false);
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
      fetchPlans();
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

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
          Canceling
        </Badge>
      );
    }
    
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            Active
          </Badge>
        );
      case 'trialing':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
            Trial
          </Badge>
        );
      case 'past_due':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
            Past Due
          </Badge>
        );
      case 'canceled':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
            Canceled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
            {status}
          </Badge>
        );
    }
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

        {/* Billing & Subscription Card */}
        {!subscriptionLoading && subscription && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-display text-lg">Billing & Subscription</CardTitle>
                  <CardDescription>Manage your subscription and payment method</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="font-semibold text-foreground">{subscription.planName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div>{getStatusBadge(subscription.status, subscription.cancelAtPeriodEnd)}</div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {subscription.cancelAtPeriodEnd ? 'Coverage Ends' : 'Next Renewal'}
                  </p>
                  <p className="font-semibold text-foreground">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              {/* Payment Method Section */}
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Payment Method</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="text-primary hover:text-primary/80"
                  >
                    {portalLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    Update Card
                  </Button>
                </div>
                {subscription.paymentMethod ? (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <CardBrandIcon brand={subscription.paymentMethod.brand} className="w-12 h-8 rounded shadow-sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        •••• {subscription.paymentMethod.last4}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires {subscription.paymentMethod.expMonth.toString().padStart(2, '0')}/{subscription.paymentMethod.expYear}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No payment method on file</p>
                  </div>
                )}
              </div>

              {subscription.cancelAtPeriodEnd && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Your subscription is set to cancel
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      You'll retain access until {new Date(subscription.currentPeriodEnd).toLocaleDateString()}. 
                      You can reactivate anytime before then.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Manage Subscription
                </Button>
                {!subscription.cancelAtPeriodEnd && (
                  <Button 
                    variant="ghost" 
                    className="text-muted-foreground hover:text-destructive"
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                  >
                    Cancel Auto-Renewal
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing History Section */}
        {!subscriptionLoading && invoices.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-display text-lg">Billing History</CardTitle>
                  <CardDescription>Your past invoices and receipts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.number || invoice.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.created).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: invoice.currency.toUpperCase()
                          }).format(invoice.amount / 100)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              invoice.status === 'paid' 
                                ? 'bg-success/10 text-success border-success/20' 
                                : invoice.status === 'open'
                                ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {invoice.hostedInvoiceUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(invoice.hostedInvoiceUrl!, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            {invoice.invoicePdf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(invoice.invoicePdf!, '_blank')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

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
          <div className="space-y-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Your Coverage</h2>
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
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
