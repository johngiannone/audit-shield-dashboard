import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, Plus, Download, File, CheckCircle, Clock, Check, Upload, X, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  document_type: string | null;
  created_at: string;
}

interface DocumentRequest {
  id: string;
  document_name: string;
  description: string | null;
  status: string;
  file_url: string | null;
  rejection_reason: string | null;
  created_at: string;
}

interface DocumentRequestsProps {
  caseId: string;
  agentId: string;
  noticeUrl: string | null;
}

export function DocumentRequests({ caseId, agentId, noticeUrl }: DocumentRequestsProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestName, setRequestName] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  
  // Review modal state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchData();

    const docsChannel = supabase
      .channel(`docs-${caseId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'case_documents', filter: `case_id=eq.${caseId}` },
        (payload) => {
          setDocuments((prev) => [payload.new as Document, ...prev]);
        }
      )
      .subscribe();

    const requestsChannel = supabase
      .channel(`requests-${caseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'document_requests', filter: `case_id=eq.${caseId}` },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(docsChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, [caseId]);

  const fetchData = async () => {
    await Promise.all([fetchDocuments(), fetchRequests()]);
    setLoading(false);
  };

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('case_documents')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });
    setDocuments(data || []);
  };

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('document_requests')
      .select('id, document_name, description, status, file_url, rejection_reason, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });
    setRequests(data || []);
  };

  const downloadDocument = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('notices')
      .createSignedUrl(filePath, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from('notices')
      .createSignedUrl(filePath, 3600);
    return data?.signedUrl || null;
  };

  const requestDocument = async () => {
    if (!requestName.trim()) return;

    setSending(true);
    try {
      const { error: insertError } = await supabase
        .from('document_requests')
        .insert({
          case_id: caseId,
          requested_by: agentId,
          document_name: requestName.trim(),
          description: requestDescription.trim() || null,
        });

      if (insertError) throw insertError;

      const { error: emailError } = await supabase.functions.invoke('send-document-request', {
        body: {
          case_id: caseId,
          document_name: requestName.trim(),
          description: requestDescription.trim() || null,
          agent_profile_id: agentId,
        },
      });

      if (emailError) {
        console.error('Failed to send notification:', emailError);
      }

      toast({
        title: 'Document Requested',
        description: 'The client has been notified via email.',
      });

      setRequestName('');
      setRequestDescription('');
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to request document:', error);
      toast({
        title: 'Error',
        description: 'Failed to create document request',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const openReviewDialog = async (request: DocumentRequest) => {
    setSelectedRequest(request);
    setReviewDialogOpen(true);
    
    if (request.file_url) {
      const url = await getSignedUrl(request.file_url);
      setPreviewUrl(url);
    }
  };

  const approveDocument = async () => {
    if (!selectedRequest) return;
    
    setApprovingId(selectedRequest.id);
    try {
      const { error } = await supabase
        .from('document_requests')
        .update({ status: 'approved' })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: 'Document Approved',
        description: 'The document has been approved.',
      });
      
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setPreviewUrl(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve document',
        variant: 'destructive',
      });
    } finally {
      setApprovingId(null);
    }
  };

  const openRejectDialog = () => {
    setRejectDialogOpen(true);
    setRejectionReason('');
  };

  const rejectDocument = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;
    
    setRejectingId(selectedRequest.id);
    try {
      // Update status back to pending with rejection reason
      const { error } = await supabase
        .from('document_requests')
        .update({ 
          status: 'pending',
          file_url: null,
          rejection_reason: rejectionReason.trim(),
          fulfilled_at: null
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Send rejection notification email
      const { error: emailError } = await supabase.functions.invoke('send-document-rejection', {
        body: {
          case_id: caseId,
          document_name: selectedRequest.document_name,
          rejection_reason: rejectionReason.trim(),
          agent_profile_id: agentId,
        },
      });

      if (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }

      toast({
        title: 'Document Rejected',
        description: 'The client has been notified and asked to re-upload.',
      });
      
      setRejectDialogOpen(false);
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setPreviewUrl(null);
      setRejectionReason('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject document',
        variant: 'destructive',
      });
    } finally {
      setRejectingId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const uploadedRequests = requests.filter(r => r.status === 'uploaded');
  const approvedRequests = requests.filter(r => r.status === 'approved');

  return (
    <>
      <Card className="border-0 shadow-md h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Documents
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Request
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request a Document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Input
                      placeholder="Document name (e.g., 2023 1040 Schedule C)"
                      value={requestName}
                      onChange={(e) => setRequestName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="Additional details (optional)"
                      value={requestDescription}
                      onChange={(e) => setRequestDescription(e.target.value)}
                      className="resize-none"
                    />
                  </div>
                  <Button 
                    onClick={requestDocument} 
                    className="w-full" 
                    disabled={!requestName.trim() || sending}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Send Request to Client
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Uploaded - Needs Review */}
              {uploadedRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-info uppercase tracking-wide">Needs Review ({uploadedRequests.length})</p>
                  {uploadedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-3 rounded-lg bg-info/5 border border-info/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                            <Upload className="h-4 w-4 text-info" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{request.document_name}</p>
                            <p className="text-xs text-muted-foreground">Client uploaded</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => openReviewDialog(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Awaiting Client ({pendingRequests.length})</p>
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-3 rounded-lg bg-warning/5 border border-warning/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-warning" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{request.document_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {request.rejection_reason 
                                ? `Rejected: ${request.rejection_reason}`
                                : `Requested ${new Date(request.created_at).toLocaleDateString()}`
                              }
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          {request.rejection_reason ? 'Re-upload' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Approved Documents */}
              {approvedRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-success uppercase tracking-wide">Approved ({approvedRequests.length})</p>
                  {approvedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{request.document_name}</p>
                          <p className="text-xs text-muted-foreground">Approved</p>
                        </div>
                      </div>
                      {request.file_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadDocument(request.file_url!)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Original Notice & Other Documents */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Case Documents</p>
                
                {noticeUrl && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Original Notice</p>
                        <Badge variant="outline" className="text-xs mt-1">Primary</Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(noticeUrl, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <File className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[140px]">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadDocument(doc.file_path)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {!noticeUrl && documents.length === 0 && requests.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <File className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No documents yet</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Review: {selectedRequest?.document_name}
            </DialogTitle>
            <DialogDescription>
              Review the uploaded document and approve or reject it.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-[400px] rounded-lg border bg-muted/30 overflow-hidden">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full min-h-[400px]"
                title="Document Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => previewUrl && window.open(previewUrl, '_blank')}
              disabled={!previewUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <div className="flex-1" />
            <Button
              variant="destructive"
              onClick={openRejectDialog}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={approveDocument}
              disabled={approvingId === selectedRequest?.id}
            >
              {approvingId === selectedRequest?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Reject Document</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this document. The client will be notified and asked to re-upload.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              placeholder="e.g., Image is too blurry, please upload a clearer version"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={rejectDocument}
                disabled={!rejectionReason.trim() || rejectingId === selectedRequest?.id}
              >
                {rejectingId === selectedRequest?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Send Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
