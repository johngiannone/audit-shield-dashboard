import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Wand2, Loader2, Copy, Download, RefreshCw, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ResponseDrafterProps {
  caseId: string;
  noticeType: string;
  taxYear: number;
  clientName: string | null;
  summary: string | null;
  agency: string;
}

export function ResponseDrafter({
  caseId,
  noticeType,
  taxYear,
  clientName,
  summary,
  agency,
}: ResponseDrafterProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);

  const generateDraft = async () => {
    setLoading(true);
    setDraft('');

    try {
      const { data, error } = await supabase.functions.invoke('draft-response', {
        body: {
          noticeType,
          taxYear,
          clientName,
          summary,
          agency,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setDraft(data.draft);
      toast.success('Response draft generated');
    } catch (error: any) {
      console.error('Draft generation error:', error);
      toast.error(error.message || 'Failed to generate draft');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !draft) {
      generateDraft();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const downloadAsTxt = () => {
    const blob = new Blob([draft], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response-${noticeType}-${taxYear}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded as text file');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Wand2 className="h-4 w-4" />
          Draft Response Letter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AI Response Drafter
          </DialogTitle>
          <DialogDescription>
            Generated response for {noticeType} • Tax Year {taxYear} • {clientName || 'Client'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating response draft...</p>
            </div>
          ) : (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Your drafted response will appear here..."
              className="min-h-[400px] font-mono text-sm resize-none"
            />
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={generateDraft}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
          <Button
            variant="outline"
            onClick={copyToClipboard}
            disabled={!draft || loading}
          >
            {copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            variant="default"
            onClick={downloadAsTxt}
            disabled={!draft || loading}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
