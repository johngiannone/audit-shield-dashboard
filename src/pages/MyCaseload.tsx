import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, Loader2, CheckCircle, Clock, Eye, Zap, Hourglass, Archive, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays } from 'date-fns';
import { DeadlineBadge } from '@/components/cases/DeadlineBadge';

interface Case {
  id: string;
  status: string;
  notice_agency: string;
  notice_type: string;
  tax_year: number;
  summary: string | null;
  created_at: string;
  updated_at: string;
  assigned_agent_id: string | null;
  client_name?: string | null;
  response_due_date?: string | null;
}

async function fetchProfileId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.id ?? null;
}

async function fetchMyCaseload(profileId: string): Promise<Case[]> {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('assigned_agent_id', profileId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const clientIds = [...new Set((data || []).map(c => c.client_id))];
  if (clientIds.length === 0) return (data || []).map(c => ({ ...c, client_name: null }));

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', clientIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
  return (data || []).map(c => ({ ...c, client_name: profileMap.get(c.client_id) || null }));
}

export default function MyCaseload() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [updating, setUpdating] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  // Redirect logic
  if (!authLoading && !user) navigate('/auth');
  if (!authLoading && role === 'client') navigate('/dashboard');

  const { data: profileId } = useQuery({
    queryKey: ['my-profile-id', user?.id],
    queryFn: () => fetchProfileId(user!.id),
    enabled: !!user && role === 'enrolled_agent',
  });

  const {
    data: cases = [],
    isLoading: dataLoading,
  } = useQuery({
    queryKey: ['my-caseload', profileId],
    queryFn: () => fetchMyCaseload(profileId!),
    enabled: !!profileId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const updateStatus = async (caseId: string, newStatus: string) => {
    setUpdating(caseId);
    const currentCase = cases.find(c => c.id === caseId);
    const oldStatus = currentCase?.status || null;

    try {
      const { error } = await supabase
        .from('cases')
        .update({ status: newStatus })
        .eq('id', caseId);
      if (error) throw error;

      await supabase
        .from('case_status_history')
        .insert({ case_id: caseId, old_status: oldStatus, new_status: newStatus, changed_by: profileId });

      try {
        await supabase.functions.invoke('send-status-update', {
          body: { case_id: caseId, new_status: newStatus, agent_profile_id: profileId },
        });
      } catch (emailErr) {
        console.error('Email function error:', emailErr);
      }

      toast({ title: 'Status Updated', description: `Case status changed to ${newStatus.replace('_', ' ')}.` });
      queryClient.invalidateQueries({ queryKey: ['my-caseload', profileId] });
    } catch {
      toast({ title: 'Error', description: 'Failed to update case status', variant: 'destructive' });
    } finally {
      setUpdating(null);
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

  const actionRequiredCases = cases.filter(c => c.status === 'agent_action');
  const waitingOnClientCases = cases
    .filter(c => c.status === 'client_action')
    .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
  const resolvedCases = cases.filter(c => c.status === 'resolved');

  const getDaysWaiting = (updatedAt: string) => {
    const days = differenceInDays(new Date(), new Date(updatedAt));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  const sendReminder = async (caseItem: Case) => {
    setSendingReminder(caseItem.id);
    try {
      const daysWaiting = differenceInDays(new Date(), new Date(caseItem.updated_at));
      const { error } = await supabase.functions.invoke('send-client-reminder', {
        body: { case_id: caseItem.id, agent_profile_id: profileId, days_waiting: daysWaiting },
      });
      if (error) throw error;
      toast({ title: 'Reminder Sent', description: `Reminder email sent to ${caseItem.client_name || 'client'}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to send reminder email', variant: 'destructive' });
    } finally {
      setSendingReminder(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const CaseCard = ({ caseItem, isInactive = false, showWaitingTime = false }: { caseItem: Case; isInactive?: boolean; showWaitingTime?: boolean }) => {
    const daysWaiting = differenceInDays(new Date(), new Date(caseItem.updated_at));
    const showReminderButton = showWaitingTime && daysWaiting >= 3;

    return (
      <div className={`p-4 rounded-lg border transition-all ${isInactive ? 'bg-muted/30 border-border/50 opacity-70' : 'bg-card border-border hover:shadow-md hover:border-primary/20'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-medium text-xs">{caseItem.notice_agency}</Badge>
              <span className="text-sm font-medium text-foreground truncate">{caseItem.notice_type}</span>
              {showWaitingTime && (
                <Badge variant="outline" className={`text-xs ${daysWaiting >= 3 ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-muted text-muted-foreground'}`}>
                  <Clock className="h-3 w-3 mr-1" />
                  {getDaysWaiting(caseItem.updated_at)} waiting
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{caseItem.client_name || 'Unknown Client'}</span>
              <span>•</span>
              <span>Tax Year {caseItem.tax_year}</span>
              {caseItem.response_due_date && caseItem.status !== 'resolved' && (
                <>
                  <span>•</span>
                  <DeadlineBadge dueDate={caseItem.response_due_date} status={caseItem.status} />
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Assigned {new Date(caseItem.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {showReminderButton && (
              <Button variant="outline" size="sm" onClick={() => sendReminder(caseItem)} disabled={sendingReminder === caseItem.id} className="text-warning border-warning/30 hover:bg-warning/10">
                {sendingReminder === caseItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Bell className="h-4 w-4 mr-1" />Remind</>}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate(`/agent/cases/${caseItem.id}`)}>
              <Eye className="h-4 w-4 mr-1" />View
            </Button>
            <Select value={caseItem.status} onValueChange={(value) => updateStatus(caseItem.id, value)} disabled={updating === caseItem.id}>
              <SelectTrigger className="w-[130px]">
                {updating === caseItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Badge variant="outline" className={`${getStatusBadge(caseItem.status)} text-xs`}>{caseItem.status.replace('_', ' ')}</Badge>}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="triage">Triage</SelectItem>
                <SelectItem value="agent_action">Agent Action</SelectItem>
                <SelectItem value="client_action">Client Action</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  };

  const EmptyState = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center py-16">
      <Icon className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-center text-sm">{description}</p>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">My Caseload</h1>
            <p className="text-muted-foreground mt-1">{cases.length} total case{cases.length !== 1 ? 's' : ''} assigned to you</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/queue')}>View Case Queue</Button>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : cases.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="py-16">
              <EmptyState icon={Briefcase} title="No Assigned Cases" description="You don't have any cases assigned yet. Visit the Case Queue to claim new cases." />
              <div className="flex justify-center mt-4">
                <Button onClick={() => navigate('/queue')}>View Case Queue</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="action-required" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="action-required" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />Action Required
                {actionRequiredCases.length > 0 && <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs">{actionRequiredCases.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="waiting-client" className="flex items-center gap-2">
                <Hourglass className="h-4 w-4" />Waiting on Client
                {waitingOnClientCases.length > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">{waitingOnClientCases.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex items-center gap-2">
                <Archive className="h-4 w-4" />Resolved
                {resolvedCases.length > 0 && <Badge variant="outline" className="ml-1 h-5 min-w-5 px-1.5 text-xs">{resolvedCases.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="action-required" className="mt-0">
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  {actionRequiredCases.length === 0 ? (
                    <EmptyState icon={CheckCircle} title="All Caught Up!" description="You have no cases requiring your immediate action. Great work!" />
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground mb-4">These cases require your attention. Work to clear this queue.</p>
                      {actionRequiredCases.map((caseItem) => <CaseCard key={caseItem.id} caseItem={caseItem} />)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="waiting-client" className="mt-0">
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  {waitingOnClientCases.length === 0 ? (
                    <EmptyState icon={Hourglass} title="No Pending Client Actions" description="No cases are currently waiting on client response." />
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground mb-4">These cases are waiting on client action. Sorted by oldest first.</p>
                      {waitingOnClientCases.map((caseItem) => <CaseCard key={caseItem.id} caseItem={caseItem} isInactive showWaitingTime />)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resolved" className="mt-0">
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  {resolvedCases.length === 0 ? (
                    <EmptyState icon={Archive} title="No Resolved Cases" description="Completed cases will appear here." />
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground mb-4">Archive of completed cases.</p>
                      {resolvedCases.map((caseItem) => <CaseCard key={caseItem.id} caseItem={caseItem} isInactive />)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
