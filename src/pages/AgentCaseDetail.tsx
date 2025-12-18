import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, Building, Calendar, User, FileText, ExternalLink, AlertTriangle, Bell, UserMinus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CaseNotes } from '@/components/cases/CaseNotes';
import { CaseTimeline } from '@/components/cases/CaseTimeline';
import { DocumentRequests } from '@/components/cases/DocumentRequests';
import { ResponseDrafter } from '@/components/cases/ResponseDrafter';
import { DeadlineBadge } from '@/components/cases/DeadlineBadge';
import { CaseRiskAssessment } from '@/components/cases/CaseRiskAssessment';
import { securityLog } from '@/hooks/useSecurityLog';

interface CaseDetail {
  id: string;
  status: string;
  notice_agency: string;
  notice_type: string;
  tax_year: number;
  summary: string | null;
  file_path: string | null;
  tax_return_path: string | null;
  response_due_date: string | null;
  created_at: string;
  client_id: string;
  client_name: string | null;
}

export default function AgentCaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();

  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [noticeUrl, setNoticeUrl] = useState<string | null>(null);
  const [taxReturnUrl, setTaxReturnUrl] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [unassigning, setUnassigning] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role === 'client') {
      navigate('/dashboard');
    }
  }, [user, loading, role, navigate]);

  useEffect(() => {
    if (user && role === 'enrolled_agent' && caseId) {
      fetchCaseData();
    }
  }, [user, role, caseId]);

  const fetchCaseData = async () => {
    setDataLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profile) {
        setProfileId(profile.id);
      }

      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .maybeSingle();

      if (caseError) throw caseError;
      if (!caseData) {
        navigate('/caseload');
        return;
      }

      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', caseData.client_id)
        .maybeSingle();

      setCaseDetail({
        ...caseData,
        client_name: clientProfile?.full_name || null,
      });

      // Get signed URL for notice
      if (caseData.file_path) {
        const { data } = await supabase.storage
          .from('audit-notices')
          .createSignedUrl(caseData.file_path, 3600);
        setNoticeUrl(data?.signedUrl || null);
      }

      // Get signed URL for tax return
      if (caseData.tax_return_path) {
        const { data } = await supabase.storage
          .from('audit-notices')
          .createSignedUrl(caseData.tax_return_path, 3600);
        setTaxReturnUrl(data?.signedUrl || null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load case details',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  const remindClientForTaxReturn = async () => {
    if (!caseDetail || !profileId) return;

    setSendingReminder(true);
    try {
      // Check if a tax return request already exists
      const { data: existingRequest } = await supabase
        .from('document_requests')
        .select('id')
        .eq('case_id', caseDetail.id)
        .ilike('document_name', '%Tax Return%')
        .eq('status', 'pending')
        .maybeSingle();

      if (!existingRequest) {
        // Create a document request for the tax return
        await supabase.from('document_requests').insert({
          case_id: caseDetail.id,
          document_name: `Tax Return ${caseDetail.tax_year}`,
          description: `Please upload your 1040 Tax Return for ${caseDetail.tax_year}`,
          status: 'pending',
          requested_by: profileId,
        });
      }

      // Send reminder email
      await supabase.functions.invoke('send-document-request', {
        body: {
          case_id: caseDetail.id,
          document_name: `Tax Return ${caseDetail.tax_year}`,
          description: `Please upload your 1040 Tax Return for ${caseDetail.tax_year} to help us with your case.`,
          agent_profile_id: profileId,
        },
      });

      toast({
        title: 'Reminder Sent',
        description: 'Client has been notified to upload their tax return.',
      });
    } catch (error) {
      console.error('Reminder error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reminder',
        variant: 'destructive',
      });
    } finally {
      setSendingReminder(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!caseDetail || !profileId) return;

    setUpdating(true);
    const oldStatus = caseDetail.status;

    try {
      const { error } = await supabase
        .from('cases')
        .update({ status: newStatus })
        .eq('id', caseDetail.id);

      if (error) throw error;

      await supabase.from('case_status_history').insert({
        case_id: caseDetail.id,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: profileId,
      });

      try {
        await supabase.functions.invoke('send-status-update', {
          body: {
            case_id: caseDetail.id,
            new_status: newStatus,
            agent_profile_id: profileId,
          },
        });
      } catch (emailErr) {
        console.error('Email function error:', emailErr);
      }

      toast({
        title: 'Status Updated',
        description: 'Client has been notified of the status change.',
      });

      // Log security event
      securityLog.statusChanged(caseDetail.id, oldStatus, newStatus);

      setCaseDetail({ ...caseDetail, status: newStatus });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const unassignCase = async () => {
    if (!caseDetail || !profileId) return;

    setUnassigning(true);
    try {
      const { error } = await supabase
        .from('cases')
        .update({ 
          assigned_agent_id: null, 
          status: 'triage' 
        })
        .eq('id', caseDetail.id);

      if (error) throw error;

      await supabase.from('case_status_history').insert({
        case_id: caseDetail.id,
        old_status: caseDetail.status,
        new_status: 'triage',
        changed_by: profileId,
      });

      // Log security event
      securityLog.caseUnassigned(caseDetail.id);

      toast({
        title: 'Case Unassigned',
        description: 'Case has been returned to the queue.',
      });

      navigate('/caseload');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to unassign case',
        variant: 'destructive',
      });
    } finally {
      setUnassigning(false);
    }
  };

  const handleViewDocument = (documentType: string, url: string) => {
    // Log security event
    securityLog.viewedDocument(caseDetail?.id || '', documentType);
    window.open(url, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'triage':
        return 'bg-info/10 text-info border-info/20';
      case 'agent_action':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'client_action':
        return 'bg-accent/10 text-accent-foreground border-accent/20';
      case 'resolved':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted';
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!caseDetail || !profileId) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/caseload')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Case Workspace
              </h1>
              <p className="text-muted-foreground">
                {caseDetail.notice_type} • {caseDetail.notice_agency}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ResponseDrafter
              caseId={caseDetail.id}
              noticeType={caseDetail.notice_type}
              taxYear={caseDetail.tax_year}
              clientName={caseDetail.client_name}
              summary={caseDetail.summary}
              agency={caseDetail.notice_agency}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={unassigning}
                  className="text-destructive hover:bg-destructive/10"
                >
                  {unassigning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserMinus className="h-4 w-4 mr-2" />
                  )}
                  Unassign Case
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unassign this case?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will return the case to the queue where it can be picked up by another agent. 
                    Any notes you've added will remain on the case.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={unassignCase}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Unassign Case
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Case Details */}
          <div className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Case Details</CardTitle>
                  <Select
                    value={caseDetail.status}
                    onValueChange={updateStatus}
                    disabled={updating}
                  >
                    <SelectTrigger className="w-[140px]">
                      {updating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Badge variant="outline" className={getStatusColor(caseDetail.status)}>
                          {caseDetail.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="triage">Triage</SelectItem>
                      <SelectItem value="agent_action">Agent Action</SelectItem>
                      <SelectItem value="client_action">Client Action</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-primary mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="text-sm font-medium">{caseDetail.client_name || 'Unknown'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-primary mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tax Year</p>
                    <p className="text-sm font-medium">{caseDetail.tax_year}</p>
                  </div>
                </div>

                {caseDetail.response_due_date && caseDetail.status !== 'resolved' && (
                  <div className="p-3 rounded-lg bg-secondary/50 border">
                    <p className="text-xs text-muted-foreground mb-1">Response Deadline</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {new Date(caseDetail.response_due_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <DeadlineBadge dueDate={caseDetail.response_due_date} status={caseDetail.status} />
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Building className="h-4 w-4 text-primary mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Agency</p>
                    <p className="text-sm font-medium">{caseDetail.notice_agency}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-primary mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Notice Type</p>
                    <p className="text-sm font-medium">{caseDetail.notice_type}</p>
                  </div>
                </div>

                {caseDetail.summary && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">AI Summary</p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {caseDetail.summary}
                    </p>
                  </div>
                )}

                {/* Key Documents Section */}
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-3 uppercase font-medium">Key Documents</p>
                  <div className="space-y-3">
                    {/* Notice Document */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Notice</span>
                      {noticeUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument('Notice', noticeUrl)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Not uploaded</Badge>
                      )}
                    </div>

                    {/* Tax Return Document */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tax Return</span>
                      {caseDetail.tax_return_path && taxReturnUrl ? (
                        <div className="flex items-center gap-2">
                          <CaseRiskAssessment
                            caseId={caseDetail.id}
                            clientId={caseDetail.client_id}
                            taxReturnUrl={taxReturnUrl}
                            clientName={caseDetail.client_name}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument('Tax Return', taxReturnUrl)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={remindClientForTaxReturn}
                            disabled={sendingReminder}
                          >
                            {sendingReminder ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Bell className="h-3 w-3 mr-1" />
                                Remind
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Activity & Notes */}
          <div className="space-y-4">
            <CaseNotes caseId={caseId!} agentId={profileId} />
            <CaseTimeline caseId={caseId!} caseCreatedAt={caseDetail.created_at} />
          </div>

          {/* Right Column - Document Requests */}
          <div>
            <DocumentRequests caseId={caseId!} agentId={profileId} noticeUrl={noticeUrl} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
