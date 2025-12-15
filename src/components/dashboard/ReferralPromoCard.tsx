import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Copy, Check, ArrowRight, Users, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AffiliateData {
  referral_code: string;
  total_earnings: number;
}

interface ReferralPromoCardProps {
  userId: string;
}

export function ReferralPromoCard({ userId }: ReferralPromoCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [clicks, setClicks] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAffiliateData();
  }, [userId]);

  const fetchAffiliateData = async () => {
    try {
      // Check if user is an affiliate
      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('referral_code, total_earnings')
        .eq('user_id', userId)
        .maybeSingle();

      if (affiliateData) {
        setAffiliate(affiliateData);
        
        // Fetch click count
        const { count } = await supabase
          .from('referral_visits')
          .select('*', { count: 'exact', head: true })
          .eq('referral_code', affiliateData.referral_code);
        
        setClicks(count || 0);
      }
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const referralLink = affiliate 
    ? `${window.location.origin}/?ref=${affiliate.referral_code}`
    : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Referral link copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return null;

  // Already an affiliate - show quick stats widget
  if (affiliate) {
    return (
      <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-display">Your Referral Link</CardTitle>
          </div>
          <CardDescription>Share with friends & family to earn rewards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              value={referralLink} 
              readOnly 
              className="bg-background text-sm"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Clicks:</span>
                <span className="font-semibold text-foreground">{clicks}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Earned:</span>
                <span className="font-semibold text-success">${affiliate.total_earnings.toFixed(2)}</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/affiliate-portal')}
              className="text-primary"
            >
              View Portal
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not an affiliate - show promotional CTA
  return (
    <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Gift className="h-7 w-7 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 space-y-2">
            <h3 className="font-display text-xl font-semibold text-foreground">
              Refer Family or Friends
            </h3>
            <p className="text-muted-foreground">
              Earn <span className="font-semibold text-primary">20% commission</span> when your referrals get audit protection. Help loved ones stay protected while earning recurring rewards.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" />
                <span>Earn on every sale</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" />
                <span>Recurring commissions</span>
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <Button 
              onClick={() => navigate('/affiliates')}
              className="w-full md:w-auto"
            >
              Become an Affiliate
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
