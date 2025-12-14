import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, Plus, Download, File, CheckCircle, Clock } from 'lucide-react';
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
      .select('id, document_name, description, status, created_at')
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

  const requestDocument = async () => {
    if (!requestName.trim()) return;

    setSending(true);
    try {
      // Save request to database
      const { error: insertError } = await supabase
        .from('document_requests')
        .insert({
          case_id: caseId,
          requested_by: agentId,
          document_name: requestName.trim(),
          description: requestDescription.trim() || null,
        });

      if (insertError) throw insertError;

      // Send email notification
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

  return (
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
                    placeholder="Document name (e.g., W-2 for 2023)"
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
            {/* Pending Requests */}
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Requests</p>
                {requests.filter(r => r.status === 'pending').map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{request.document_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Requested {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Received Documents */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Received</p>
              
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
                  className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-success" />
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

              {!noticeUrl && documents.length === 0 && (
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
  );
}
