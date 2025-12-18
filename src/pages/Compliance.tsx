import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Loader2, Search, Download, RefreshCw, Eye, FileText, Upload, UserCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { securityLog } from '@/hooks/useSecurityLog';

interface SecurityLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user_email?: string;
}

const ACTION_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  viewed_document: { label: 'Viewed Document', icon: Eye, color: 'bg-blue-500/10 text-blue-600' },
  downloaded_document: { label: 'Downloaded Document', icon: Download, color: 'bg-purple-500/10 text-purple-600' },
  signed_contract: { label: 'Signed Contract', icon: FileText, color: 'bg-green-500/10 text-green-600' },
  exported_case: { label: 'Exported Case', icon: Download, color: 'bg-orange-500/10 text-orange-600' },
  deleted_client: { label: 'Deleted Client', icon: AlertTriangle, color: 'bg-red-500/10 text-red-600' },
  login_success: { label: 'Login Success', icon: UserCheck, color: 'bg-green-500/10 text-green-600' },
  login_failed: { label: 'Login Failed', icon: AlertTriangle, color: 'bg-red-500/10 text-red-600' },
  case_assigned: { label: 'Case Assigned', icon: UserCheck, color: 'bg-blue-500/10 text-blue-600' },
  case_unassigned: { label: 'Case Unassigned', icon: AlertTriangle, color: 'bg-yellow-500/10 text-yellow-600' },
  status_changed: { label: 'Status Changed', icon: RefreshCw, color: 'bg-purple-500/10 text-purple-600' },
  document_uploaded: { label: 'Document Uploaded', icon: Upload, color: 'bg-green-500/10 text-green-600' },
  admin_access: { label: 'Admin Access', icon: Shield, color: 'bg-amber-500/10 text-amber-600' },
};

export default function Compliance() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();

  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    
    if (user) {
      checkSuperAdminAccess();
    }
  }, [user, loading, navigate]);

  const checkSuperAdminAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .eq('role', 'super_admin')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to view this page.',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }

      setIsSuperAdmin(true);
      // Log admin access
      securityLog.adminAccess('compliance');
      fetchLogs();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/dashboard');
    }
  };

  const fetchLogs = async () => {
    setDataLoading(true);
    try {
      let query = supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (actionFilter && actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user emails for display
      const userIds = [...new Set((data || []).map(log => log.user_id).filter(Boolean))];
      let userEmails: Record<string, string> = {};
      
      if (userIds.length > 0) {
        // Get emails from auth.users via profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', userIds as string[]);

        if (profiles) {
          userEmails = Object.fromEntries(
            profiles.map(p => [p.user_id, p.email || 'Unknown'])
          );
        }
      }

      const logsWithEmails = (data || []).map(log => ({
        ...log,
        metadata: log.metadata as Record<string, unknown>,
        user_email: log.user_id ? userEmails[log.user_id] || 'Unknown' : 'System',
      }));

      setLogs(logsWithEmails);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load security logs',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.user_email?.toLowerCase().includes(searchLower) ||
      log.resource_type?.toLowerCase().includes(searchLower) ||
      log.resource_id?.toLowerCase().includes(searchLower)
    );
  });

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Metadata'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.user_email || '',
        log.action,
        log.resource_type || '',
        log.resource_id || '',
        JSON.stringify(log.metadata || {}).replace(/,/g, ';'),
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Security logs exported to CSV',
    });
  };

  if (loading || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Compliance</h1>
              <p className="text-muted-foreground">Security audit log - all user actions are tracked</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchLogs} disabled={dataLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportLogs} disabled={filteredLogs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, action, or resource..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={(value) => { setActionFilter(value); fetchLogs(); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
            <CardDescription>
              {filteredLogs.length} entries found • Showing most recent 500
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Shield className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Logs Found</h3>
                <p className="text-muted-foreground text-center">
                  {searchQuery || actionFilter !== 'all'
                    ? 'No logs match your current filters.'
                    : 'Security events will appear here as they occur.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const actionInfo = ACTION_LABELS[log.action] || {
                        label: log.action,
                        icon: Shield,
                        color: 'bg-muted text-muted-foreground',
                      };
                      const Icon = actionInfo.icon;

                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'MMM d, yyyy')}
                            <br />
                            {format(new Date(log.created_at), 'HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{log.user_email}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`gap-1 ${actionInfo.color}`}>
                              <Icon className="h-3 w-3" />
                              {actionInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.resource_type && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">{log.resource_type}:</span>{' '}
                                <span className="font-mono text-xs">{log.resource_id?.slice(0, 8)}...</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {Object.entries(log.metadata)
                                  .slice(0, 2)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(', ')}
                              </code>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
