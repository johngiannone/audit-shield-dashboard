import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, Loader2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
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
}

export default function MyCaseload() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  
  const [cases, setCases] = useState<Case[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
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
      fetchMyCases();
    }
  }, [user, role]);

  const fetchMyCases = async () => {
    setDataLoading(true);
    try {
      // Get agent's profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!profile) {
        setCases([]);
        return;
      }

      setProfileId(profile.id);

      // Fetch assigned cases
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('assigned_agent_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
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

  const updateStatus = async (caseId: string, newStatus: string) => {
    setUpdating(caseId);
    try {
      const { error } = await supabase
        .from('cases')
        .update({ status: newStatus })
        .eq('id', caseId);

      if (error) throw error;

      // Send status update email to client
      try {
        const { error: emailError } = await supabase.functions.invoke('send-status-update', {
          body: {
            case_id: caseId,
            new_status: newStatus,
            agent_profile_id: profileId,
          },
        });

        if (emailError) {
          console.error('Failed to send status update email:', emailError);
        }
      } catch (emailErr) {
        console.error('Email function error:', emailErr);
      }

      toast({
        title: 'Status Updated',
        description: `Case status changed to ${newStatus.replace('_', ' ')}. Client has been notified.`,
      });

      setCases(cases.map(c => 
        c.id === caseId ? { ...c, status: newStatus } : c
      ));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update case status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <AlertTriangle className="h-4 w-4 text-info" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'pending_info':
        return <AlertTriangle className="h-4 w-4 text-accent-foreground" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: 'bg-info/10 text-info border-info/20',
      in_progress: 'bg-warning/10 text-warning border-warning/20',
      pending_info: 'bg-accent/10 text-accent-foreground border-accent/20',
      resolved: 'bg-success/10 text-success border-success/20',
    };
    return styles[status] || styles.new;
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
          <h1 className="font-display text-3xl font-bold text-foreground">My Caseload</h1>
          <p className="text-muted-foreground mt-1">
            Cases assigned to you
          </p>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Your Cases</CardTitle>
                <CardDescription>
                  {cases.length} case{cases.length !== 1 ? 's' : ''} assigned to you
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
                <h3 className="text-xl font-semibold text-foreground mb-2">No Assigned Cases</h3>
                <p className="text-muted-foreground text-center mb-4">
                  You don't have any cases assigned yet.
                </p>
                <Button variant="outline" onClick={() => navigate('/queue')}>
                  View Case Queue
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agency</TableHead>
                      <TableHead>Notice Type</TableHead>
                      <TableHead>Tax Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead className="text-right">Update Status</TableHead>
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
                            {getStatusIcon(caseItem.status)}
                            {caseItem.notice_type}
                          </div>
                        </TableCell>
                        <TableCell>{caseItem.tax_year}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadge(caseItem.status)}>
                            {caseItem.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(caseItem.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Select
                            value={caseItem.status}
                            onValueChange={(value) => updateStatus(caseItem.id, value)}
                            disabled={updating === caseItem.id}
                          >
                            <SelectTrigger className="w-[140px]">
                              {updating === caseItem.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="pending_info">Pending Info</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
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
