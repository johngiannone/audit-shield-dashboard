import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Copy, 
  Check, 
  MousePointerClick, 
  Users, 
  DollarSign,
  CreditCard,
  ExternalLink,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AffiliateData {
  id: string;
  referral_code: string;
  commission_rate: number;
  total_earnings: number;
  stripe_connect_id: string | null;
}

interface AffiliateStats {
  clicks: number;
  conversions: number;
}

const BASE_URL = 'https://app.taxaudithelp.com';

export default function AffiliatePortal() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [stats, setStats] = useState<AffiliateStats>({ clicks: 0, conversions: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/affiliate-portal');
      return;
    }

    if (user) {
      fetchAffiliateData();
    }
  }, [user, authLoading, navigate]);

  const fetchAffiliateData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch affiliate record
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (affiliateError) {
        console.error('Error fetching affiliate:', affiliateError);
        throw affiliateError;
      }

      if (!affiliateData) {
        // User is not an affiliate
        setAffiliate(null);
        setIsLoading(false);
        return;
      }

      setAffiliate(affiliateData);

      // Fetch referral stats
      const { data: visitsData, error: visitsError } = await supabase
        .from('referral_visits')
        .select('id, converted')
        .eq('referral_code', affiliateData.referral_code);

      if (visitsError) {
        console.error('Error fetching visits:', visitsError);
      } else {
        const clicks = visitsData?.length || 0;
        const conversions = visitsData?.filter(v => v.converted).length || 0;
        setStats({ clicks, conversions });
      }
    } catch (error) {
      console.error('Error loading affiliate data:', error);
      toast.error('Failed to load affiliate data');
    } finally {
      setIsLoading(false);
    }
  };

  const referralLink = affiliate ? `${BASE_URL}/?ref=${affiliate.referral_code}` : '';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleConnectBank = () => {
    // Placeholder for Stripe Connect integration
    toast.info('Stripe Connect integration coming soon!');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not an affiliate
  if (!affiliate) {
    return (
      <>
        <Helmet>
          <title>Affiliate Portal | Return Shield</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <nav className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-display font-semibold text-lg">Return Shield</span>
              </Link>
            </div>
          </nav>
          <div className="container mx-auto px-4 py-20 text-center">
            <div className="max-w-md mx-auto">
              <h1 className="font-display text-2xl font-bold mb-4">Not an Affiliate Yet</h1>
              <p className="text-muted-foreground mb-6">
                You don't have an affiliate account. Join our program to start earning commissions!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/affiliates">
                  <Button>Join Affiliate Program</Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const unpaidEarnings = affiliate.total_earnings || 0;
  const conversionRate = stats.clicks > 0 ? ((stats.conversions / stats.clicks) * 100).toFixed(1) : '0';

  return (
    <>
      <Helmet>
        <title>Affiliate Portal | Return Shield</title>
        <meta name="description" content="Manage your Return Shield affiliate account, track referrals, and view earnings." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-display font-semibold text-lg">Return Shield</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Affiliate Portal
            </h1>
            <p className="text-muted-foreground">
              Track your referrals and earnings
            </p>
          </div>

          {/* Referral Link Card */}
          <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                Your Referral Link
              </CardTitle>
              <CardDescription>
                Share this link to earn 20% commission on every sale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-sm break-all">
                  {referralLink}
                </div>
                <Button onClick={copyToClipboard} className="shrink-0">
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Your referral code: <span className="font-mono font-semibold text-foreground">{affiliate.referral_code}</span>
              </p>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <MousePointerClick className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clicks</p>
                    <p className="font-display text-2xl font-bold text-foreground">
                      {stats.clicks.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conversions</p>
                    <p className="font-display text-2xl font-bold text-foreground">
                      {stats.conversions.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{conversionRate}% rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-200 dark:bg-amber-900/50 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-700 dark:text-amber-300">Unpaid Earnings</p>
                    <p className="font-display text-2xl font-bold text-amber-800 dark:text-amber-200">
                      ${unpaidEarnings.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payout Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payout Settings
              </CardTitle>
              <CardDescription>
                Connect your bank account to receive commission payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {affiliate.stripe_connect_id ? (
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">Bank Account Connected</p>
                      <p className="text-sm text-green-600 dark:text-green-400">Payouts will be sent automatically</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleConnectBank}>
                    Update
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">No bank account connected</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your bank account to receive payouts when you reach the $50 minimum
                    </p>
                  </div>
                  <Button onClick={handleConnectBank}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Connect Bank Account
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commission Info */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
            <h3 className="font-semibold text-sm text-foreground mb-2">Commission Details</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• You earn <span className="font-semibold text-foreground">{(affiliate.commission_rate * 100).toFixed(0)}%</span> of every sale</li>
              <li>• Commissions are paid monthly on the 1st</li>
              <li>• Minimum payout threshold: $50</li>
              <li>• Recurring commissions on subscription renewals</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
