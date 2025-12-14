import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Inbox, Loader2, UserPlus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Case {
  id: string;
  status: string;
  notice_agency: string;
  notice_type: string;
  tax_year: number;
  summary: string | null;
  created_at: string;
  assigned_agent_id: string | null;
  client_id: string;
}

export default function CaseQueue() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  
  const [cases, setCases] = useState<Case[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role === 'client') {
      navigate('/dashboard');
    }
  }, [user, loading, role, navigate]);

  useEffect(() => {
    if (user && role === 'agent') {
      fetchProfileAndCases();
    }
  }, [user, role]);

  const fetchProfileAndCases = async () => {
    setDataLoading(true);
    try {
      // Get agent's profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profile) {
        setProfileId(profile.id);
      }

      // Fetch unassigned cases
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .is('assigned_agent_id', null)
        .eq('status', 'new')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load case queue',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  const claimCase = async (caseId: string) => {
    if (!profileId) return;

    setClaiming(caseId);
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          assigned_agent_id: profileId,
          status: 'in_progress',
        })
        .eq('id', caseId);

      if (error) throw error;

      toast({
        title: 'Case Claimed',
        description: 'The case has been assigned to you.',
      });

      // Remove from queue
      setCases(cases.filter(c => c.id !== caseId));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to claim case',
        variant: 'destructive',
      });
    } finally {
      setClaiming(null);
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
          <h1 className="font-display text-3xl font-bold text-foreground">Case Queue</h1>
          <p className="text-muted-foreground mt-1">
            Unassigned cases waiting for an agent
          </p>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Inbox className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle>New Cases</CardTitle>
                <CardDescription>
                  {cases.length} case{cases.length !== 1 ? 's' : ''} waiting for assignment
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
                <Inbox className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Queue Empty</h3>
                <p className="text-muted-foreground">All cases have been assigned!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agency</TableHead>
                      <TableHead>Notice Type</TableHead>
                      <TableHead>Tax Year</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.map((caseItem) => (
                      <TableRow key={caseItem.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {caseItem.notice_agency}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            {caseItem.notice_type}
                          </div>
                        </TableCell>
                        <TableCell>{caseItem.tax_year}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(caseItem.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => claimCase(caseItem.id)}
                            disabled={claiming === caseItem.id}
                          >
                            {claiming === caseItem.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Claim
                              </>
                            )}
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
    </DashboardLayout>
  );
}
