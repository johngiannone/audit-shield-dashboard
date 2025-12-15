import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  DollarSign, 
  MousePointerClick, 
  TrendingUp,
  Loader2,
  Search,
  ExternalLink,
  Banknote,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  commission_rate: number;
  total_earnings: number;
  stripe_connect_id: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
  };
  clicks: number;
  conversions: number;
}

interface AffiliateStats {
  totalAffiliates: number;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  pendingPayouts: number;
}

export default function AffiliateAdmin() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [stats, setStats] = useState<AffiliateStats>({
    totalAffiliates: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalEarnings: 0,
    pendingPayouts: 0,
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && role !== 'agent') {
      navigate('/dashboard');
    }
  }, [user, loading, role, navigate]);

  useEffect(() => {
    if (user && role === 'agent') {
      fetchData();
    }
  }, [user, role]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      // Fetch all affiliates
      const { data: affiliatesData, error: affiliatesError } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      if (affiliatesError) throw affiliatesError;

      // Fetch profiles for affiliates
      const userIds = affiliatesData?.map(a => a.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Fetch referral visits for each affiliate
      const { data: visitsData } = await supabase
        .from('referral_visits')
        .select('referral_code, converted');

      // Map data together
      const affiliatesWithStats = affiliatesData?.map(affiliate => {
        const profile = profilesData?.find(p => p.user_id === affiliate.user_id);
        const visits = visitsData?.filter(v => v.referral_code === affiliate.referral_code) || [];
        
        return {
          ...affiliate,
          profile: { full_name: profile?.full_name || null },
          clicks: visits.length,
          conversions: visits.filter(v => v.converted).length,
        };
      }) || [];

      setAffiliates(affiliatesWithStats);

      // Calculate stats
      const totalClicks = visitsData?.length || 0;
      const totalConversions = visitsData?.filter(v => v.converted).length || 0;
      const totalEarnings = affiliatesData?.reduce((sum, a) => sum + Number(a.total_earnings), 0) || 0;
      const pendingPayouts = affiliatesData?.filter(a => !a.stripe_connect_id && a.total_earnings > 0)
        .reduce((sum, a) => sum + Number(a.total_earnings), 0) || 0;

      setStats({
        totalAffiliates: affiliatesData?.length || 0,
        totalClicks,
        totalConversions,
        totalEarnings,
        pendingPayouts,
      });

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load affiliate data',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  const filteredAffiliates = affiliates.filter(affiliate => {
    const searchLower = searchQuery.toLowerCase();
    return (
      affiliate.referral_code.toLowerCase().includes(searchLower) ||
      affiliate.profile?.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const conversionRate = stats.totalClicks > 0 
    ? ((stats.totalConversions / stats.totalClicks) * 100).toFixed(1)
    : '0';

  if (loading || !user || role !== 'agent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Affiliate Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor affiliate performance and manage payouts
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Affiliates
              </CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{stats.totalAffiliates}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Clicks
              </CardTitle>
              <MousePointerClick className="h-5 w-5 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{stats.totalClicks}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conversions
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{stats.totalConversions}</div>
              <p className="text-xs text-muted-foreground">{conversionRate}% rate</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Earnings
              </CardTitle>
              <DollarSign className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-success">
                ${stats.totalEarnings.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-warning/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Payouts
              </CardTitle>
              <Banknote className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-warning">
                ${stats.pendingPayouts.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Affiliates Table */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="font-display">All Affiliates</CardTitle>
                <CardDescription>View and manage affiliate accounts</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search affiliates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAffiliates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No affiliates found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Affiliate</TableHead>
                      <TableHead>Referral Code</TableHead>
                      <TableHead className="text-center">Clicks</TableHead>
                      <TableHead className="text-center">Conversions</TableHead>
                      <TableHead className="text-center">Rate</TableHead>
                      <TableHead className="text-right">Earnings</TableHead>
                      <TableHead className="text-center">Payout Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAffiliates.map((affiliate) => (
                      <TableRow key={affiliate.id}>
                        <TableCell className="font-medium">
                          {affiliate.profile?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">
                            {affiliate.referral_code}
                          </code>
                        </TableCell>
                        <TableCell className="text-center">{affiliate.clicks}</TableCell>
                        <TableCell className="text-center">{affiliate.conversions}</TableCell>
                        <TableCell className="text-center">
                          {(affiliate.commission_rate * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-right font-semibold text-success">
                          ${affiliate.total_earnings.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {affiliate.stripe_connect_id ? (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                          ) : affiliate.total_earnings > 0 ? (
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Pending Setup
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                              No Earnings
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(affiliate.created_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
