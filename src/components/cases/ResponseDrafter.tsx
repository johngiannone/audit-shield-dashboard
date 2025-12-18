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
import { Wand2, Loader2, Copy, Download, RefreshCw, Check, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

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

  const downloadAsPdf = () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 25;
    const contentWidth = pageWidth - margin * 2;
    let yPosition = margin;

    // Letterhead
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Return Shield', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Professional Audit Defense Services', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    pdf.text('Enrolled Agent Representation', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    // Divider line
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Date
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    pdf.text(today, margin, yPosition);
    yPosition += 12;

    // Reference info
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`RE: ${noticeType} - Tax Year ${taxYear}`, margin, yPosition);
    yPosition += 5;
    if (clientName) {
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Client: ${clientName}`, margin, yPosition);
      yPosition += 10;
    } else {
      yPosition += 5;
    }

    // Body content
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);

    // Clean up markdown formatting for PDF
    const cleanedDraft = draft
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/---/g, '')
      .trim();

    const lines = pdf.splitTextToSize(cleanedDraft, contentWidth);

    for (const line of lines) {
      if (yPosition > pageHeight - margin - 20) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += 5.5;
    }

    // Footer
    yPosition = pageHeight - 15;
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('This document was prepared by Return Shield on behalf of the client.', pageWidth / 2, yPosition, { align: 'center' });

    pdf.save(`response-${noticeType}-${taxYear}.pdf`);
    toast.success('Downloaded as PDF');
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
            variant="outline"
            onClick={downloadAsTxt}
            disabled={!draft || loading}
          >
            <Download className="h-4 w-4 mr-2" />
            Text
          </Button>
          <Button
            variant="default"
            onClick={downloadAsPdf}
            disabled={!draft || loading}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
