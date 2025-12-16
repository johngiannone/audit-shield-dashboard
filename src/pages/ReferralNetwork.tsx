import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Network, 
  Plus, 
  Copy, 
  Check, 
  Loader2, 
  Users, 
  UserCheck, 
  Clock,
  Share2,
  Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';

interface InviteCode {
  id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  used_by: string | null;
  used_at: string | null;
  target_role: string;
}

interface InviteStats {
  totalGenerated: number;
  totalUsed: number;
  activeCodes: number;
}

export default function ReferralNetwork() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [stats, setStats] = useState<InviteStats>({ totalGenerated: 0, totalUsed: 0, activeCodes: 0 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expirationDays, setExpirationDays] = useState<number>(30);

  // Only tax_preparer can access this page
  useEffect(() => {
    if (!authLoading && (!user || role !== 'tax_preparer')) {
      navigate('/dashboard');
    }
  }, [authLoading, user, role, navigate]);

  useEffect(() => {
    if (user && role === 'tax_preparer') {
      fetchInviteCodes();
    }
  }, [user, role]);

  const fetchInviteCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInviteCodes(data || []);

      // Calculate stats
      const totalGenerated = data?.length || 0;
      const totalUsed = data?.filter(c => c.used_by !== null).length || 0;
      const activeCodes = data?.filter(c => 
        c.used_by === null && 
        (c.expires_at === null || new Date(c.expires_at) > new Date())
      ).length || 0;

      setStats({ totalGenerated, totalUsed, activeCodes });
    } catch (error) {
      console.error('Error fetching invite codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invite codes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInviteCode = async () => {
    setGenerating(true);
    try {
      // Generate a new code using the database function
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_invite_code');

      if (codeError) throw codeError;

      const expiresAt = expirationDays > 0 
        ? addDays(new Date(), expirationDays).toISOString() 
        : null;

      // Insert the new invite code
      const { error: insertError } = await supabase
        .from('invite_codes')
        .insert({
          code: codeData,
          created_by: user?.id,
          target_role: 'tax_preparer',
          expires_at: expiresAt,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Invite code generated!',
        description: `Code: ${codeData}`,
      });

      fetchInviteCodes();
    } catch (error: any) {
      console.error('Error generating invite code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate invite code.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: 'Copied!',
        description: 'Invite code copied to clipboard.',
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast({
        title: 'Copy failed',
        description: 'Please copy the code manually.',
        variant: 'destructive',
      });
    }
  };

  const copyInviteLink = async (code: string) => {
    const link = `${window.location.origin}/auth?invite=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedCode(`link-${code}`);
      toast({
        title: 'Link copied!',
        description: 'Invite link copied to clipboard.',
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast({
        title: 'Copy failed',
        description: 'Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  const shareViaEmail = (code: string) => {
    const link = `${window.location.origin}/auth?invite=${code}`;
    const subject = encodeURIComponent('Join Return Shield as a Tax Preparer');
    const body = encodeURIComponent(
      `Hi,\n\nI'd like to invite you to join Return Shield as a Tax Preparer.\n\nUse this invite code to sign up: ${code}\n\nOr click this link: ${link}\n\nBest regards`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const getCodeStatus = (code: InviteCode) => {
    if (code.used_by) {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Used</Badge>;
    }
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return <Badge variant="secondary" className="text-muted-foreground">Expired</Badge>;
    }
    return <Badge className="bg-primary/20 text-primary border-primary/30">Active</Badge>;
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Referral Network</h1>
          <p className="text-muted-foreground mt-1">
            Generate and share invite codes to grow your network of tax preparers
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Network className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalGenerated}</p>
                  <p className="text-sm text-muted-foreground">Codes Generated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <UserCheck className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalUsed}</p>
                  <p className="text-sm text-muted-foreground">Codes Used</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.activeCodes}</p>
                  <p className="text-sm text-muted-foreground">Active Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generate New Code */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Generate New Invite Code
            </CardTitle>
            <CardDescription>
              Create a new invite code to share with other tax preparers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiration">Expiration (days)</Label>
                <Input
                  id="expiration"
                  type="number"
                  min="0"
                  max="365"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
                  className="w-32"
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">Set to 0 for no expiration</p>
              </div>
              <Button 
                onClick={generateInviteCode} 
                disabled={generating}
                className="gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Generate Code
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invite Codes Table */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display">Your Invite Codes</CardTitle>
            <CardDescription>Manage and share your generated invite codes</CardDescription>
          </CardHeader>
          <CardContent>
            {inviteCodes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No invite codes yet</p>
                <p className="text-sm mt-1">Generate your first invite code to start building your network</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inviteCodes.map((code) => {
                      const isUsed = code.used_by !== null;
                      const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
                      const isActive = !isUsed && !isExpired;

                      return (
                        <TableRow key={code.id} className={!isActive ? 'opacity-60' : ''}>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                              {code.code}
                            </code>
                          </TableCell>
                          <TableCell>{getCodeStatus(code)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(code.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {code.expires_at 
                              ? format(new Date(code.expires_at), 'MMM d, yyyy')
                              : 'Never'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            {isActive && (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyCode(code.code)}
                                  className="h-8 w-8 p-0"
                                  title="Copy code"
                                >
                                  {copiedCode === code.code ? (
                                    <Check className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyInviteLink(code.code)}
                                  className="h-8 w-8 p-0"
                                  title="Copy invite link"
                                >
                                  {copiedCode === `link-${code.code}` ? (
                                    <Check className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <Share2 className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => shareViaEmail(code.code)}
                                  className="h-8 w-8 p-0"
                                  title="Share via email"
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {code.used_at && (
                              <span className="text-xs text-muted-foreground">
                                Used {format(new Date(code.used_at), 'MMM d, yyyy')}
                              </span>
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
