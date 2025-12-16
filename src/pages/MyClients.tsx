import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, Mail, Phone, Edit2, Loader2, UserPlus, RefreshCw, CheckCircle2, Clock, CreditCard, Gift, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface ManagedClient {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  referral_code: string | null;
  is_activated?: boolean;
  audit_plans?: {
    status: string;
    stripe_subscription_id: string | null;
  }[];
}

export default function MyClients() {
  const { user, role, profileId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState<ManagedClient | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '' });
  const [compingClientId, setCompingClientId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Only tax_preparer can access My Clients
  useEffect(() => {
    if (!authLoading && (!user || role !== 'tax_preparer')) {
      navigate('/dashboard');
    }
  }, [authLoading, user, role, navigate]);

  // Fetch managed clients
  const fetchClients = async () => {
    if (!profileId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, user_id, full_name, email, phone, created_at, referral_code,
          audit_plans (status, stripe_subscription_id)
        `)
        .eq('managed_by', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Check activation status for each client
      const clientsWithStatus = await Promise.all(
        (data || []).map(async (client) => {
          const { data: activated } = await supabase.rpc('is_user_activated', { 
            p_user_id: client.user_id 
          });
          return { ...client, is_activated: activated ?? false };
        })
      );
      
      setClients(clientsWithStatus);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clients.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileId) {
      fetchClients();
    }
  }, [profileId]);

  const handleEdit = (client: ManagedClient) => {
    setEditingClient(client);
    setEditForm({
      full_name: client.full_name || '',
      email: client.email || '',
      phone: client.phone || ''
    });
  };

  const handleSave = async () => {
    if (!editingClient) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name.trim() || null,
          email: editForm.email.trim() || null,
          phone: editForm.phone.trim() || null
        })
        .eq('id', editingClient.id);

      if (error) throw error;

      toast({
        title: 'Client updated',
        description: 'Client information has been saved.'
      });

      setEditingClient(null);
      fetchClients();
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: 'Update failed',
        description: 'Could not update client information.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompClient = async (client: ManagedClient) => {
    setCompingClientId(client.id);
    try {
      const currentYear = new Date().getFullYear();
      
      const { error } = await supabase
        .from('audit_plans')
        .insert({
          profile_id: client.id,
          plan_level: 'gold',
          tax_year: currentYear,
          status: 'active',
          covered_years: [currentYear]
        });

      if (error) throw error;

      toast({
        title: 'Membership granted',
        description: `${client.full_name || 'Client'} now has complimentary Gold Shield membership.`
      });

      fetchClients();
    } catch (error: any) {
      console.error('Comp error:', error);
      toast({
        title: 'Failed to grant membership',
        description: error.message || 'Could not comp client.',
        variant: 'destructive'
      });
    } finally {
      setCompingClientId(null);
    }
  };

  const getClientMembershipStatus = (client: ManagedClient) => {
    const activePlan = client.audit_plans?.find(p => p.status === 'active');
    if (!activePlan) return 'none';
    if (activePlan.stripe_subscription_id) return 'purchased';
    return 'comped';
  };

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    return (
      client.full_name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query) ||
      client.referral_code?.toLowerCase().includes(query)
    );
  });

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">My Clients</h1>
            <p className="text-muted-foreground mt-1">Manage clients you've enrolled in Return Shield.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchClients}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => navigate('/bulk-enroll')}>
              <UserPlus className="h-4 w-4 mr-2" />
              Bulk Enroll
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <p className="text-3xl font-bold text-foreground">{clients.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Purchased</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-success" />
                <p className="text-3xl font-bold text-foreground">
                  {clients.filter(c => c.audit_plans?.some(p => p.stripe_subscription_id !== null)).length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Comped</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-info" />
                <p className="text-3xl font-bold text-foreground">
                  {clients.filter(c => c.audit_plans?.some(p => p.stripe_subscription_id === null && p.status === 'active')).length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Activated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="text-3xl font-bold text-foreground">
                  {clients.filter(c => c.is_activated).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Enrolled Clients
                </CardTitle>
                <CardDescription>
                  {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  {searchQuery ? 'No clients found' : 'No clients enrolled yet'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery 
                    ? 'Try a different search term.' 
                    : 'Use Bulk Enroll to add your first clients.'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => navigate('/bulk-enroll')}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Bulk Enroll Clients
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Membership</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {client.full_name || <span className="text-muted-foreground italic">No name</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.email ? (
                            <div className="flex items-center gap-1 text-muted-foreground text-sm">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const status = getClientMembershipStatus(client);
                            if (status === 'purchased') {
                              return (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  Purchased
                                </Badge>
                              );
                            } else if (status === 'comped') {
                              return (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                  <Gift className="h-3 w-3 mr-1" />
                                  Comped
                                </Badge>
                              );
                            } else {
                              return (
                                <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">
                                  None
                                </Badge>
                              );
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          {client.is_activated ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(client.created_at), 'MMM d, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {getClientMembershipStatus(client) === 'none' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleCompClient(client)}
                                disabled={compingClientId === client.id}
                                className="text-purple-600 border-purple-200 hover:bg-purple-50"
                              >
                                {compingClientId === client.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    Comp
                                  </>
                                )}
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(client)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Edit Dialog */}
      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClient(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
