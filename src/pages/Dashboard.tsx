import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { FileText, AlertTriangle, CheckCircle, Clock, ArrowRight, Inbox, Briefcase, Loader2, Mail, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReferralPromoCard } from '@/components/dashboard/ReferralPromoCard';

interface Case {
  id: string;
  status: string;
  notice_agency: string;
  notice_type: string;
  tax_year: number;
  created_at: string;
}

interface Plan {
  id: string;
  tax_year: number;
  status: string;
  plan_level: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, role, loading, resendVerificationEmail } = useAuth();
  const { toast } = useToast();
  
  const [cases, setCases] = useState<Case[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [dismissedVerificationBanner, setDismissedVerificationBanner] = useState(() => {
    return localStorage.getItem('verification_banner_dismissed') === 'true';
  });

  const dismissVerificationBanner = () => {
    localStorage.setItem('verification_banner_dismissed', 'true');
    setDismissedVerificationBanner(true);
  };

  // Clear dismissed state when email becomes verified
  useEffect(() => {
    if (user?.email_confirmed_at) {
      localStorage.removeItem('verification_banner_dismissed');
    }
  }, [user?.email_confirmed_at]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && role) {
      fetchData();
    }
  }, [user, role]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      // Fetch cases
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (casesError) throw casesError;
      setCases(casesData || []);

      // Fetch plans for clients
      if (role === 'client') {
        const { data: plansData, error: plansError } = await supabase
          .from('audit_plans')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (plansError) throw plansError;
        setPlans(plansData || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      triage: 'bg-info/10 text-info border-info/20',
      agent_action: 'bg-warning/10 text-warning border-warning/20',
      client_action: 'bg-accent/10 text-accent-foreground border-accent/20',
      resolved: 'bg-success/10 text-success border-success/20',
      active: 'bg-success/10 text-success border-success/20',
      expired: 'bg-muted text-muted-foreground border-muted',
    };
    return styles[status as keyof typeof styles] || styles.triage;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isEmailUnverified = user && !user.email_confirmed_at;

  const handleResendVerification = async () => {
    if (!user?.email) return;
    
    setIsResending(true);
    const { error } = await resendVerificationEmail(user.email);
    setIsResending(false);
    
    if (error) {
      toast({
        title: 'Failed to Resend',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Email Sent',
        description: 'We sent a verification link to your email.',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Email Verification Banner */}
        {isEmailUnverified && !dismissedVerificationBanner && (
          <Alert className="border-warning/30 bg-warning/10">
            <Mail className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">Email not verified</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="text-muted-foreground mb-3">
                Please verify your email address ({user.email}) to ensure you receive important notifications about your cases.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="border-warning/30 hover:bg-warning/10"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Resend verification email'
                  )}
                </Button>
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={dismissVerificationBanner}
                >
                  Dismiss
                </button>
              </div>
            </AlertDescription>
            <button
              onClick={dismissVerificationBanner}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        )}
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              {role === 'agent' ? 'Agent Dashboard' : 'Welcome Back'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {role === 'agent' 
                ? 'Manage your cases and help clients navigate audits'
                : 'Your audit defense status at a glance'}
            </p>
          </div>
          <Button 
            onClick={() => navigate(role === 'agent' ? '/queue' : '/report')}
            className="w-full md:w-auto"
          >
            {role === 'agent' ? 'View Case Queue' : 'Report New Notice'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {role === 'agent' ? (
            <>
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Triage
                  </CardTitle>
                  <Inbox className="h-5 w-5 text-info" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">
                    {cases.filter(c => c.status === 'triage').length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Waiting for assignment</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Agent Action
                  </CardTitle>
                  <Clock className="h-5 w-5 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">
                    {cases.filter(c => c.status === 'agent_action').length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Waiting on agent work</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Resolved
                  </CardTitle>
                  <CheckCircle className="h-5 w-5 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">
                    {cases.filter(c => c.status === 'resolved').length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Successfully closed</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Plans
                  </CardTitle>
                  <FileText className="h-5 w-5 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">
                    {plans.filter(p => p.status === 'active').length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Coverage active</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Open Cases
                  </CardTitle>
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">
                    {cases.filter(c => c.status !== 'resolved').length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Being handled</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Resolved
                  </CardTitle>
                  <CheckCircle className="h-5 w-5 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">
                    {cases.filter(c => c.status === 'resolved').length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Completed</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Referral Promo Card - Clients Only */}
        {role === 'client' && user && (
          <ReferralPromoCard userId={user.id} />
        )}

        {/* Recent Activity */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display">Recent Cases</CardTitle>
            <CardDescription>
              {role === 'agent' ? 'Latest cases in the system' : 'Your recent audit cases'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No cases yet</p>
                {role === 'client' && (
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/report')}
                    className="mt-2"
                  >
                    Report your first notice
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {cases.map((caseItem) => (
                  <div 
                    key={caseItem.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {caseItem.notice_agency} - {caseItem.notice_type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Tax Year {caseItem.tax_year}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={getStatusBadge(caseItem.status)}>
                      {caseItem.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
