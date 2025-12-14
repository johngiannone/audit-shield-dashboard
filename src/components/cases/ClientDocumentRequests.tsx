import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Clock, CheckCircle, FileText, AlertCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentRequest {
  id: string;
  document_name: string;
  description: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

interface ClientDocumentRequestsProps {
  caseId: string;
  profileId: string;
  onDocumentUploaded?: () => void;
}

export function ClientDocumentRequests({ caseId, profileId, onDocumentUploaded }: ClientDocumentRequestsProps) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel(`client-requests-${caseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'document_requests', filter: `case_id=eq.${caseId}` },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('document_requests')
        .select('id, document_name, description, status, rejection_reason, created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = (requestId: string) => {
    setSelectedRequestId(requestId);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedRequestId) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingFor(selectedRequestId);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${caseId}/${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('notices')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('notices')
        .getPublicUrl(filePath);

      // Create document record
      const { error: docError } = await supabase
        .from('case_documents')
        .insert({
          case_id: caseId,
          uploaded_by: profileId,
          file_name: file.name,
          file_path: filePath,
          document_type: 'requested',
        });

      if (docError) throw docError;

      // Update request status to 'uploaded' and store file_url
      const { error: updateError } = await supabase
        .from('document_requests')
        .update({ 
          status: 'uploaded',
          file_url: filePath,
          fulfilled_at: new Date().toISOString()
        })
        .eq('id', selectedRequestId);

      if (updateError) throw updateError;

      if (updateError) throw updateError;

      toast({
        title: 'Document Uploaded',
        description: 'Your document has been submitted successfully.',
      });

      onDocumentUploaded?.();
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploadingFor(null);
      setSelectedRequestId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const uploadedRequests = requests.filter(r => r.status === 'uploaded' || r.status === 'approved');

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-warning" />
          Document Requests
        </CardTitle>
        <CardDescription>
          Your agent has requested the following documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-warning">Action Required ({pendingRequests.length})</p>
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className={`p-4 rounded-lg ${request.rejection_reason ? 'bg-destructive/5 border border-destructive/20' : 'bg-warning/5 border border-warning/20'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${request.rejection_reason ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                      {request.rejection_reason ? (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      ) : (
                        <Clock className="h-5 w-5 text-warning" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{request.document_name}</p>
                      {request.rejection_reason && (
                        <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                          <p className="text-xs font-medium text-destructive">Please re-upload:</p>
                          <p className="text-sm text-destructive/90 mt-1">{request.rejection_reason}</p>
                        </div>
                      )}
                      {request.description && !request.rejection_reason && (
                        <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Requested {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={request.rejection_reason ? "destructive" : "default"}
                    onClick={() => handleUploadClick(request.id)}
                    disabled={uploadingFor === request.id}
                  >
                    {uploadingFor === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {request.rejection_reason ? 'Re-upload' : 'Upload'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Uploaded/Approved Requests */}
        {uploadedRequests.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-success">Completed ({uploadedRequests.length})</p>
            {uploadedRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 rounded-lg bg-success/5 border border-success/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{request.document_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={
                    request.status === 'approved' 
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-info/10 text-info border-info/20'
                  }>
                    {request.status === 'approved' ? 'Approved' : 'Under Review'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
