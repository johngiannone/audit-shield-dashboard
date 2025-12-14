import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, Loader2, Upload, FileText, Calendar, Building, 
  User, Clock, CheckCircle, AlertTriangle, File
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CaseMessages } from '@/components/cases/CaseMessages';
import { ClientDocumentRequests } from '@/components/cases/ClientDocumentRequests';

interface CaseDetail {
  id: string;
  status: string;
  notice_agency: string;
  notice_type: string;
  tax_year: number;
  summary: string | null;
  file_path: string | null;
  created_at: string;
  agent_name: string | null;
}

interface StatusHistory {
  id: string;
  old_status: string | null;
  new_status: string;
  created_at: string;
  changed_by_name: string | null;
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

export default function ClientCaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role === 'agent') {
      navigate('/dashboard');
    }
  }, [user, loading, role, navigate]);

  useEffect(() => {
    if (user && role === 'client' && caseId) {
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
        navigate('/my-cases');
        return;
      }

      // Fetch agent name if assigned
      let agentName = null;
      if (caseData.assigned_agent_id) {
        const { data: agentProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', caseData.assigned_agent_id)
          .maybeSingle();
        agentName = agentProfile?.full_name || null;
      }

      setCaseDetail({ ...caseData, agent_name: agentName });

      // Fetch status history
      const { data: historyData } = await supabase
        .from('case_status_history')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      // Get names for each history entry
      const historyWithNames = await Promise.all(
        (historyData || []).map(async (h) => {
          let changedByName = null;
          if (h.changed_by) {
            const { data: changerProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', h.changed_by)
              .maybeSingle();
            changedByName = changerProfile?.full_name || null;
          }
          return { ...h, changed_by_name: changedByName };
        })
      );

      setStatusHistory(historyWithNames);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profileId || !caseId) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${caseId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('notices')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: docError } = await supabase
        .from('case_documents')
        .insert({
          case_id: caseId,
          uploaded_by: profileId,
          file_name: file.name,
          file_path: filePath,
          document_type: 'supporting',
        });

      if (docError) throw docError;

      toast({
        title: 'Document Uploaded',
        description: 'Your document has been uploaded successfully.',
      });

      fetchCaseData();
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <AlertTriangle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'pending_info':
        return <AlertTriangle className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'text-info bg-info/10 border-info/20';
      case 'in_progress':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'pending_info':
        return 'text-accent-foreground bg-accent/10 border-accent/20';
      case 'resolved':
        return 'text-success bg-success/10 border-success/20';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case 'new': return 25;
      case 'in_progress': return 50;
      case 'pending_info': return 60;
      case 'resolved': return 100;
      default: return 0;
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/my-cases')}>
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

        {/* Progress Bar */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Case Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge className={getStatusColor(caseDetail.status)}>
                  {getStatusIcon(caseDetail.status)}
                  <span className="ml-1">{STATUS_LABELS[caseDetail.status] || caseDetail.status}</span>
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className="bg-primary h-3 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage(caseDetail.status)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Submitted</span>
                <span>In Review</span>
                <span>Resolved</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <User className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Assigned Agent</p>
                  <p className="font-medium">{caseDetail.agent_name || 'Pending Assignment'}</p>
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

          {/* Status Timeline */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Status History</CardTitle>
              <CardDescription>Track your case progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current status */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(caseDetail.status)}`}>
                      {getStatusIcon(caseDetail.status)}
                    </div>
                    {statusHistory.length > 0 && (
                      <div className="w-0.5 h-full bg-border mt-2" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="font-medium">{STATUS_LABELS[caseDetail.status] || caseDetail.status}</p>
                    <p className="text-sm text-muted-foreground">Current Status</p>
                  </div>
                </div>

                {/* History */}
                {statusHistory.map((history, index) => (
                  <div key={history.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        {getStatusIcon(history.new_status)}
                      </div>
                      {index < statusHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-medium">
                        {history.old_status 
                          ? `Changed to ${STATUS_LABELS[history.new_status] || history.new_status}`
                          : `Case Created`
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(history.created_at).toLocaleDateString()} at{' '}
                        {new Date(history.created_at).toLocaleTimeString()}
                        {history.changed_by_name && ` by ${history.changed_by_name}`}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Case created */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Case Submitted</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(caseDetail.created_at).toLocaleDateString()} at{' '}
                      {new Date(caseDetail.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Requests from Agent */}
        {profileId && (
          <ClientDocumentRequests 
            caseId={caseId!} 
            profileId={profileId} 
            onDocumentUploaded={fetchCaseData}
          />
        )}

        {/* Documents */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Documents</CardTitle>
                <CardDescription>Upload supporting documents for your case</CardDescription>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="document-upload"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Document
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents uploaded yet</p>
                <p className="text-sm">Upload any supporting documents for your case</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div 
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{doc.document_type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        {profileId && caseId && caseDetail.agent_name && (
          <CaseMessages caseId={caseId} profileId={profileId} />
        )}
      </div>
    </DashboardLayout>
  );
}
