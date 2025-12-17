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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, Mail, Edit2, Loader2, UserPlus, RefreshCw, CheckCircle2, Clock, CreditCard, Gift, Sparkles, ChevronDown, Plus, Shield, Copy, RotateCcw, Key } from 'lucide-react';
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
  activation_code?: string | null;
  activation_code_id?: string | null;
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
  
  // Manual enrollment state
  const [showManualEnroll, setShowManualEnroll] = useState(false);
  const [manualEnrollForm, setManualEnrollForm] = useState({ full_name: '', email: '', planLevel: 'gold' });
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [lastEnrolledCode, setLastEnrolledCode] = useState<string | null>(null);
  const [regeneratingCodeId, setRegeneratingCodeId] = useState<string | null>(null);

  const PLAN_LABELS: Record<string, string> = {
    silver: 'Silver Shield',
    gold: 'Gold Shield',
    platinum: 'Platinum Business',
  };

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
      
      // Check activation status and fetch activation codes for each client
      const clientsWithStatus = await Promise.all(
        (data || []).map(async (client) => {
          const [activatedResult, codeResult] = await Promise.all([
            supabase.rpc('is_user_activated', { p_user_id: client.user_id }),
            supabase
              .from('client_activation_codes')
              .select('id, code, used_at')
              .eq('profile_id', client.id)
              .is('used_at', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          ]);
          
          return { 
            ...client, 
            is_activated: activatedResult.data ?? false,
            activation_code: codeResult.data?.code || null,
            activation_code_id: codeResult.data?.id || null
          };
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

  const handleCompClient = async (client: ManagedClient, planLevel: 'silver' | 'gold' | 'platinum') => {
    setCompingClientId(client.id);
    try {
      const currentYear = new Date().getFullYear();
      
      const { error } = await supabase
        .from('audit_plans')
        .insert({
          profile_id: client.id,
          plan_level: planLevel,
          tax_year: currentYear,
          status: 'active',
          covered_years: [currentYear]
        });

      if (error) throw error;

      const planNames = { silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };
      toast({
        title: 'Membership granted',
        description: `${client.full_name || 'Client'} now has complimentary ${planNames[planLevel]} Shield membership.`
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

  const copyActivationCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Code copied',
      description: `Activation code ${code} copied to clipboard.`
    });
  };

  const regenerateCode = async (client: ManagedClient) => {
    if (!profileId) return;
    
    setRegeneratingCodeId(client.id);
    try {
      // Generate new code
      const { data: newCode, error: codeGenError } = await supabase.rpc('generate_client_activation_code');
      if (codeGenError) throw codeGenError;

      // Insert new activation code
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error: insertError } = await supabase
        .from('client_activation_codes')
        .insert({
          code: newCode,
          profile_id: client.id,
          user_id: client.user_id,
          created_by: profileId,
          expires_at: expiresAt.toISOString()
        });

      if (insertError) throw insertError;

      toast({
        title: 'New code generated',
        description: `New activation code: ${newCode}`
      });
      
      fetchClients();
    } catch (error: any) {
      console.error('Regenerate code error:', error);
      toast({
        title: 'Failed to generate code',
        description: error.message || 'Could not generate new code.',
        variant: 'destructive'
      });
    } finally {
      setRegeneratingCodeId(null);
    }
  };

  const handleManualEnroll = async () => {
    if (!manualEnrollForm.email.trim() || !manualEnrollForm.full_name.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please enter both name and email.',
        variant: 'destructive'
      });
      return;
    }

    setIsEnrolling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('process-bulk-invites', {
        body: {
          clients: [{
            full_name: manualEnrollForm.full_name.trim(),
            email: manualEnrollForm.email.trim().toLowerCase()
          }],
          planLevel: manualEnrollForm.planLevel
        }
      });

      if (response.error) throw response.error;

      const result = response.data;
      if (result.results?.[0]?.success) {
        const activationCode = result.results[0].activationCode;
        setLastEnrolledCode(activationCode);
        toast({
          title: 'Client enrolled',
          description: activationCode 
            ? `Activation code: ${activationCode}` 
            : `${manualEnrollForm.full_name} has been enrolled.`
        });
        fetchClients();
      } else {
        throw new Error(result.results?.[0]?.error || 'Failed to enroll client');
      }
    } catch (error: any) {
      console.error('Manual enroll error:', error);
      toast({
        title: 'Enrollment failed',
        description: error.message || 'Could not enroll client.',
        variant: 'destructive'
      });
    } finally {
      setIsEnrolling(false);
    }
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
            <Button variant="outline" size="sm" onClick={() => setShowManualEnroll(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
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
                      <TableHead>Activation Code</TableHead>
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
                          {!client.is_activated && client.activation_code ? (
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                {client.activation_code}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => copyActivationCode(client.activation_code!)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => regenerateCode(client)}
                                disabled={regeneratingCodeId === client.id}
                              >
                                {regeneratingCodeId === client.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ) : !client.is_activated ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => regenerateCode(client)}
                              disabled={regeneratingCodeId === client.id}
                            >
                              {regeneratingCodeId === client.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Key className="h-3 w-3 mr-1" />
                              )}
                              Generate
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
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
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    disabled={compingClientId === client.id}
                                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                  >
                                    {compingClientId === client.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Sparkles className="h-4 w-4 mr-1" />
                                        Comp
                                        <ChevronDown className="h-3 w-3 ml-1" />
                                      </>
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
                                  <DropdownMenuItem 
                                    onClick={() => handleCompClient(client, 'silver')}
                                    className="cursor-pointer"
                                  >
                                    <span className="text-slate-500 mr-2">🥈</span>
                                    Silver Shield
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleCompClient(client, 'gold')}
                                    className="cursor-pointer"
                                  >
                                    <span className="text-amber-500 mr-2">🥇</span>
                                    Gold Shield
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleCompClient(client, 'platinum')}
                                    className="cursor-pointer"
                                  >
                                    <span className="text-purple-500 mr-2">💎</span>
                                    Platinum Shield
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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

      {/* Manual Enroll Dialog */}
      <Dialog open={showManualEnroll} onOpenChange={setShowManualEnroll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Enroll New Client
            </DialogTitle>
            <DialogDescription>
              Add a single client with complimentary audit protection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="enroll_name">Full Name *</Label>
              <Input
                id="enroll_name"
                value={manualEnrollForm.full_name}
                onChange={(e) => setManualEnrollForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Enter client's full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enroll_email">Email Address *</Label>
              <Input
                id="enroll_email"
                type="email"
                value={manualEnrollForm.email}
                onChange={(e) => setManualEnrollForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Enter client's email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enroll_plan">Plan Level</Label>
              <Select
                value={manualEnrollForm.planLevel}
                onValueChange={(value) => setManualEnrollForm(f => ({ ...f, planLevel: value }))}
              >
                <SelectTrigger id="enroll_plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="silver">
                    <span className="flex items-center gap-2">
                      <span className="text-slate-500">🥈</span> Silver Shield
                    </span>
                  </SelectItem>
                  <SelectItem value="gold">
                    <span className="flex items-center gap-2">
                      <span className="text-amber-500">🥇</span> Gold Shield
                    </span>
                  </SelectItem>
                  <SelectItem value="platinum">
                    <span className="flex items-center gap-2">
                      <span className="text-purple-500">💎</span> Platinum Business
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualEnroll(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualEnroll} disabled={isEnrolling}>
              {isEnrolling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Enroll Client
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
