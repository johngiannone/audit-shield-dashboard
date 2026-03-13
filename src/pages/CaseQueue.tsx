import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Inbox, Loader2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CaseDetailModal } from '@/components/cases/CaseDetailModal';

interface Case {
  id: string;
  status: string;
  notice_agency: string;
  notice_type: string;
  tax_year: number;
  summary: string | null;
  file_path: string | null;
  created_at: string;
  assigned_agent_id: string | null;
  client_id: string;
  client_name: string | null;
}

async function fetchProfileId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.id ?? null;
}

async function fetchQueueCases(): Promise<Case[]> {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .is('assigned_agent_id', null)
    .eq('status', 'triage')
    .order('created_at', { ascending: true });

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

export default function CaseQueue() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  if (!authLoading && !user) navigate('/auth');
  if (!authLoading && role === 'client') navigate('/dashboard');

  const { data: profileId } = useQuery({
    queryKey: ['my-profile-id', user?.id],
    queryFn: () => fetchProfileId(user!.id),
    enabled: !!user && role === 'enrolled_agent',
  });

  const { data: cases = [], isLoading: dataLoading } = useQuery({
    queryKey: ['case-queue'],
    queryFn: fetchQueueCases,
    enabled: !!user && role === 'enrolled_agent',
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const openCaseDetail = async (caseItem: Case) => {
    setSelectedCase(caseItem);
    if (caseItem.file_path) {
      const { data } = await supabase.storage.from('notices').createSignedUrl(caseItem.file_path, 3600);
      setSelectedFileUrl(data?.signedUrl || null);
    } else {
      setSelectedFileUrl(null);
    }
  };

  const closeCaseDetail = () => {
    setSelectedCase(null);
    setSelectedFileUrl(null);
  };

  const assignCase = async () => {
    if (!profileId || !selectedCase) return;
    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('cases')
        .update({ assigned_agent_id: profileId, status: 'agent_action' })
        .eq('id', selectedCase.id);
      if (error) throw error;

      try {
        await supabase.functions.invoke('send-intro-email', {
          body: { case_id: selectedCase.id, agent_profile_id: profileId },
        });
      } catch (emailErr) {
        console.error('Email function error:', emailErr);
      }

      toast({ title: 'Case Assigned', description: 'The case has been assigned to you and the client has been notified.' });

      // Invalidate both queue and caseload caches
      queryClient.invalidateQueries({ queryKey: ['case-queue'] });
      queryClient.invalidateQueries({ queryKey: ['my-caseload'] });
      closeCaseDetail();
    } catch {
      toast({ title: 'Error', description: 'Failed to assign case', variant: 'destructive' });
    } finally {
      setIsAssigning(false);
    }
  };

  if (authLoading || !user) {
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
          <h1 className="font-display text-3xl font-bold text-foreground">Case Queue</h1>
          <p className="text-muted-foreground mt-1">Unassigned cases waiting for an agent</p>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Inbox className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle>New Cases</CardTitle>
                <CardDescription>{cases.length} case{cases.length !== 1 ? 's' : ''} waiting for assignment</CardDescription>
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
                <Inbox className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Queue Empty</h3>
                <p className="text-muted-foreground">All cases have been assigned!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Notice Type</TableHead>
                      <TableHead>Agency</TableHead>
                      <TableHead>Tax Year</TableHead>
                      <TableHead className="max-w-xs">AI Summary</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.map((caseItem) => (
                      <TableRow key={caseItem.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{caseItem.client_name || 'Unknown'}</TableCell>
                        <TableCell>{caseItem.notice_type}</TableCell>
                        <TableCell><Badge variant="outline">{caseItem.notice_agency}</Badge></TableCell>
                        <TableCell>{caseItem.tax_year}</TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm text-muted-foreground line-clamp-2">{caseItem.summary || 'No summary'}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openCaseDetail(caseItem)}>
                            <Eye className="h-4 w-4 mr-2" />View
                          </Button>
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

      <CaseDetailModal
        isOpen={!!selectedCase}
        onClose={closeCaseDetail}
        caseData={selectedCase}
        fileUrl={selectedFileUrl}
        onAssign={assignCase}
        isAssigning={isAssigning}
      />
    </DashboardLayout>
  );
}
