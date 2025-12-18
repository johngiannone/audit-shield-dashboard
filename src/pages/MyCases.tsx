import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, Loader2, ChevronRight, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ActionRequiredCard } from '@/components/cases/ActionRequiredCard';
import { DeadlineBadge } from '@/components/cases/DeadlineBadge';

interface Case {
  id: string;
  status: string;
  notice_agency: string;
  notice_type: string;
  tax_year: number;
  summary: string | null;
  created_at: string;
  agent_name: string | null;
  response_due_date?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  triage: 'Triage',
  agent_action: 'Agent Action',
  client_action: 'Client Action',
  resolved: 'Resolved',
};

export default function MyCases() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  
  const [cases, setCases] = useState<Case[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role === 'enrolled_agent') {
      navigate('/dashboard');
    }
  }, [user, loading, role, navigate]);

  useEffect(() => {
    if (user && role === 'client') {
      fetchMyCases();
    }
  }, [user, role]);

  const fetchMyCases = async () => {
    setDataLoading(true);
    try {
      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profile) {
        setProfileId(profile.id);
      }

      const { data: casesData, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch agent names
      const casesWithAgents = await Promise.all(
        (casesData || []).map(async (c) => {
          let agentName = null;
          if (c.assigned_agent_id) {
            const { data: agentProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', c.assigned_agent_id)
              .maybeSingle();
            agentName = agentProfile?.full_name || null;
          }
          return { ...c, agent_name: agentName };
        })
      );

      setCases(casesWithAgents);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load your cases',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'triage':
        return <AlertTriangle className="h-4 w-4 text-info" />;
      case 'agent_action':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'client_action':
        return <AlertTriangle className="h-4 w-4 text-accent-foreground" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      triage: 'bg-info/10 text-info border-info/20',
      agent_action: 'bg-warning/10 text-warning border-warning/20',
      client_action: 'bg-accent/10 text-accent-foreground border-accent/20',
      resolved: 'bg-success/10 text-success border-success/20',
    };
    return styles[status] || styles.triage;
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">My Cases</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage your audit cases
            </p>
          </div>
          <Button onClick={() => navigate('/report')}>
            Report New Notice
          </Button>
        </div>

        {/* Action Required Card */}
        {profileId && <ActionRequiredCard profileId={profileId} />}

        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Your Cases</CardTitle>
                <CardDescription>
                  {cases.length} case{cases.length !== 1 ? 's' : ''} total
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : cases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Briefcase className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Cases Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  You haven't reported any audit notices yet.
                </p>
                <Button onClick={() => navigate('/report')}>
                  Report Your First Notice
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {cases.map((caseItem) => (
                  <div 
                    key={caseItem.id}
                    onClick={() => navigate(`/my-cases/${caseItem.id}`)}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        {getStatusIcon(caseItem.status)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {caseItem.notice_agency} - {caseItem.notice_type}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Tax Year {caseItem.tax_year}</span>
                          {caseItem.agent_name && (
                            <>
                              <span>•</span>
                              <span>Agent: {caseItem.agent_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {caseItem.response_due_date && caseItem.status !== 'resolved' && (
                        <DeadlineBadge dueDate={caseItem.response_due_date} status={caseItem.status} />
                      )}
                      <Badge variant="outline" className={getStatusBadge(caseItem.status)}>
                        {STATUS_LABELS[caseItem.status] || caseItem.status}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
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
