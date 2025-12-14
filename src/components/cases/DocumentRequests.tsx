import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, Plus, Download, File, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  document_type: string | null;
  created_at: string;
}

interface DocumentRequestsProps {
  caseId: string;
  noticeUrl: string | null;
}

export function DocumentRequests({ caseId, noticeUrl }: DocumentRequestsProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestType, setRequestType] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchDocuments();

    const channel = supabase
      .channel(`docs-${caseId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'case_documents', filter: `case_id=eq.${caseId}` },
        (payload) => {
          setDocuments((prev) => [payload.new as Document, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('case_documents')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('notices')
      .createSignedUrl(filePath, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const requestDocument = () => {
    if (!requestType.trim()) return;
    
    // For now, just show a toast. In a real app, this would create a request record
    toast({
      title: 'Document Requested',
      description: `Requested: ${requestType}. Client will be notified.`,
    });
    setRequestType('');
    setDialogOpen(false);
  };

  return (
    <Card className="border-0 shadow-md h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Document Requests
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Request Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request a Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="e.g., W-2 for 2023, Bank statements"
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                />
                <Button onClick={requestDocument} className="w-full" disabled={!requestType.trim()}>
                  Send Request to Client
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Original Notice */}
            {noticeUrl && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Original Notice</p>
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

            {/* Uploaded Documents */}
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-sm truncate max-w-[150px]">{doc.file_name}</p>
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
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No documents yet</p>
                <p className="text-xs mt-1">Click "+ Request Document" to ask the client</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
