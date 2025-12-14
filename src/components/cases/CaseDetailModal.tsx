import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Building, FileText, Calendar, User } from 'lucide-react';

interface CaseData {
  id: string;
  status: string;
  notice_agency: string;
  notice_type: string;
  tax_year: number;
  summary: string | null;
  file_path: string | null;
  created_at: string;
  client_name: string | null;
}

interface CaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: CaseData | null;
  fileUrl: string | null;
  onAssign: () => void;
  isAssigning: boolean;
}

export function CaseDetailModal({
  isOpen,
  onClose,
  caseData,
  fileUrl,
  onAssign,
  isAssigning,
}: CaseDetailModalProps) {
  if (!caseData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Case Review</span>
            <Button onClick={onAssign} disabled={isAssigning} size="lg">
              {isAssigning ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Assign to Me
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          {/* Left: AI Extracted Data */}
          <div className="space-y-6 overflow-y-auto pr-2">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground">Extracted Information</h3>
              
              <div className="grid gap-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <User className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Client Name</p>
                    <p className="font-medium text-foreground">{caseData.client_name || 'Unknown'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <Building className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Agency</p>
                    <Badge variant="outline" className="mt-1">{caseData.notice_agency}</Badge>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Notice Type</p>
                    <p className="font-medium text-foreground">{caseData.notice_type}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tax Year</p>
                    <p className="font-medium text-foreground">{caseData.tax_year}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-2">AI Summary</p>
                <p className="text-foreground leading-relaxed">
                  {caseData.summary || 'No summary available'}
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                Submitted: {new Date(caseData.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Right: PDF Viewer */}
          <div className="flex flex-col overflow-hidden rounded-lg border bg-muted/30">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold text-foreground">Uploaded Notice</h3>
            </div>
            <div className="flex-1 overflow-hidden">
              {fileUrl ? (
                <iframe
                  src={fileUrl}
                  className="w-full h-full"
                  title="Notice Document"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No document available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
