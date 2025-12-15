import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  UserCheck, 
  DollarSign, 
  Link2, 
  Copy, 
  Mail, 
  Download,
  FileText,
  Loader2,
  Check,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';

interface Recruit {
  id: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  affiliate_status: string | null;
}

export default function PartnerProgram() {
  const navigate = useNavigate();
  const { user, role, profileId, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!authLoading && role !== 'agent') {
      navigate('/dashboard');
      return;
    }

    if (profileId) {
      fetchPartnerData();
    }
  }, [user, role, profileId, authLoading, navigate]);

  const fetchPartnerData = async () => {
    if (!profileId) return;

    try {
      // Fetch user's referral code
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', profileId)
        .maybeSingle();

      if (profileError) throw profileError;
      setReferralCode(profile?.referral_code || null);

      // Fetch recruits (users referred by this user)
      const { data: recruitData, error: recruitsError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at, updated_at, affiliate_status')
        .eq('referred_by', profileId)
        .order('created_at', { ascending: false });

      if (recruitsError) throw recruitsError;
      setRecruits(recruitData || []);

      // Count active preparers (logged in within 30 days)
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const activeRecruits = (recruitData || []).filter(
        (r) => r.updated_at && new Date(r.updated_at) > new Date(thirtyDaysAgo)
      );
      setActiveCount(activeRecruits.length);

    } catch (error) {
      console.error('Error fetching partner data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load partner program data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const referralLink = referralCode
    ? `${window.location.origin}/auth?ref=${referralCode}`
    : '';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Your referral link has been copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Copy failed',
        description: 'Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Join Return Shield - Partner Invitation');
    const body = encodeURIComponent(
      `Hi,\n\nI wanted to share an opportunity with you. Return Shield provides excellent audit defense services for tax professionals and their clients.\n\nSign up using my referral link: ${referralLink}\n\nBest regards`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const getStatusBadge = (status: string | null, updatedAt: string) => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const isActive = new Date(updatedAt) > thirtyDaysAgo;

    if (isActive) {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
    }
    return <Badge variant="secondary" className="text-muted-foreground">Inactive</Badge>;
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Partner Program</h1>
          <p className="text-muted-foreground mt-1">
            Grow your network and earn rewards by referring other tax preparers
          </p>
        </div>

        {/* Hero Section - Referral Link */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Your Unique Referral Link
            </CardTitle>
            <CardDescription>
              Share this link with other tax preparers to invite them to Return Shield
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-muted/50 rounded-lg px-4 py-3 font-mono text-sm border border-border overflow-x-auto">
                {referralLink || 'Loading...'}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={copyToClipboard}
                  variant="outline"
                  className="gap-2"
                  disabled={!referralCode}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button 
                  onClick={shareViaEmail}
                  className="gap-2"
                  disabled={!referralCode}
                >
                  <Mail className="h-4 w-4" />
                  Share via Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{recruits.length}</p>
                  <p className="text-sm text-muted-foreground">Total Recruits</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <UserCheck className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">Active Preparers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <DollarSign className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">$0.00</p>
                  <p className="text-sm text-muted-foreground">Pending Commissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recruits Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Recruits</CardTitle>
            <CardDescription>Tax preparers you've invited to Return Shield</CardDescription>
          </CardHeader>
          <CardContent>
            {recruits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No recruits yet</p>
                <p className="text-sm mt-1">Share your referral link to start building your network</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Date Joined</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recruits.map((recruit) => (
                    <TableRow key={recruit.id}>
                      <TableCell className="font-medium">
                        {recruit.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(recruit.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(recruit.affiliate_status, recruit.updated_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Resources Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Partner Resources
            </CardTitle>
            <CardDescription>
              Download materials to help promote Return Shield to other preparers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Marketing Kit</p>
                    <p className="text-xs text-muted-foreground">PDF • Coming Soon</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" disabled>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
