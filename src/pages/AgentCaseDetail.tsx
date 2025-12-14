import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, Loader2, FileText, Calendar, Building, 
  User, Clock, CheckCircle, AlertTriangle, File, Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CaseMessages } from '@/components/cases/CaseMessages';

interface CaseDetail {
  id: string;
  status: string;
  notice_agency: string;
  notice_type: string;
  tax_year: number;
  summary: string | null;
  file_path: string | null;
  created_at: string;
  client_id: string;
  client_name: string | null;
  client_email: string | null;
}

interface CaseDocument {
  id: string;
  file_name: string;
  file_path: string;
  document_type: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  in_progress: 'In Progress',
  pending_info: 'Pending Information',
  resolved: 'Resolved',
};

export default function AgentCaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [noticeUrl, setNoticeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role === 'client') {
      navigate('/dashboard');
    }
  }, [user, loading, role, navigate]);

  useEffect(() => {
    if (user && role === 'agent' && caseId) {
      fetchCaseData();
    }
  }, [user, role, caseId]);

  const fetchCaseData = async () => {
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

      // Fetch case details
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

      // Fetch client info
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('full_name, user_id')
        .eq('id', caseData.client_id)
        .maybeSingle();

      let clientEmail = null;
      if (clientProfile?.user_id) {
        const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(
          clientProfile.user_id
        ).catch(() => ({ data: { user: null } }));
        clientEmail = clientUser?.email || null;
      }

      setCaseDetail({
        ...caseData,
        client_name: clientProfile?.full_name || null,
        client_email: clientEmail,
      });

      // Get signed URL for notice
      if (caseData.file_path) {
        const { data } = await supabase.storage
          .from('notices')
          .createSignedUrl(caseData.file_path, 3600);
        setNoticeUrl(data?.signedUrl || null);
      }

      // Fetch documents
      const { data: docsData } = await supabase
        .from('case_documents')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      setDocuments(docsData || []);
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

      // Log status history
      await supabase
        .from('case_status_history')
        .insert({
          case_id: caseDetail.id,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by: profileId,
        });

      // Send status update email
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

  const downloadDocument = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage
      .from('notices')
      .createSignedUrl(filePath, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-info/10 text-info border-info/20';
      case 'in_progress':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'pending_info':
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

  if (!caseDetail) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/caseload')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {caseDetail.notice_type}
              </h1>
              <p className="text-muted-foreground">
                {caseDetail.notice_agency} • Tax Year {caseDetail.tax_year}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={caseDetail.status}
              onValueChange={updateStatus}
              disabled={updating}
            >
              <SelectTrigger className="w-[180px]">
                {updating ? (
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
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Client Info */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{caseDetail.client_name || 'Unknown'}</p>
                  </div>
                </div>
                {caseDetail.client_email && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{caseDetail.client_email}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Case Details */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Case Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Agency</p>
                    <p className="font-medium">{caseDetail.notice_agency}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Notice Type</p>
                    <p className="font-medium">{caseDetail.notice_type}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tax Year</p>
                    <p className="font-medium">{caseDetail.tax_year}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="font-medium">
                      {new Date(caseDetail.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {caseDetail.summary && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">AI Summary</p>
                    <p className="text-sm">{caseDetail.summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documents */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Documents</CardTitle>
                <CardDescription>Uploaded documents for this case</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {noticeUrl && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Original Notice</p>
                          <p className="text-xs text-muted-foreground">Primary document</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(noticeUrl, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  )}
                  
                  {documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <File className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadDocument(doc.file_path, doc.file_name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {!noticeUrl && documents.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No documents yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Messages */}
          <div>
            {profileId && caseId && (
              <CaseMessages caseId={caseId} profileId={profileId} isAgent />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
