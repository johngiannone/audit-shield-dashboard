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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Wand2, Loader2, Copy, Download, RefreshCw, Check, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

type LetterTemplateType = 'ai_draft' | 'fta' | 'reasonable_cause' | 'audit_reconsideration';

const LETTER_TEMPLATES: { value: LetterTemplateType; label: string; description: string }[] = [
  { value: 'ai_draft', label: 'AI-Generated Response', description: 'Custom response letter drafted by AI' },
  { value: 'fta', label: 'First-Time Abatement (FTA)', description: 'Request penalty waiver under IRM 20.1.1.3.3.2.1' },
  { value: 'reasonable_cause', label: 'Reasonable Cause', description: 'Request abatement based on circumstances beyond control' },
  { value: 'audit_reconsideration', label: 'Audit Reconsideration', description: 'Request IRS to review prior audit findings' },
];

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
  const [templateType, setTemplateType] = useState<LetterTemplateType>('ai_draft');

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

  const generateTemplateDraft = (type: LetterTemplateType) => {
    const templates: Record<Exclude<LetterTemplateType, 'ai_draft'>, string> = {
      fta: `# Request for First-Time Penalty Abatement

**To:** Internal Revenue Service  
**From:** ${clientName || '[Client Name]'}  
**Re:** Notice ${noticeType} - Tax Year ${taxYear}  
**Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

---

Dear Sir or Madam:

I am writing to respectfully request abatement of the penalty assessed for tax year ${taxYear}. I am requesting this abatement under the IRS First-Time Penalty Abatement (FTA) administrative waiver.

## Legal Basis for Request

Under Internal Revenue Manual (IRM) Section 20.1.1.3.3.2.1, the IRS provides for the administrative waiver of penalties for taxpayers who meet the following criteria:

1. The taxpayer has not been required to file a return, or has no prior penalties (except the estimated tax penalty) for the preceding 3 tax years;
2. The taxpayer has filed all currently required returns or filed a valid extension of time to file; and
3. The taxpayer has paid, or arranged to pay, any tax due.

## My Compliance History

I certify that I have maintained a clean compliance history with the Internal Revenue Service for the three tax years preceding ${taxYear}. During this period, I have filed all required tax returns timely and have not been assessed any penalties other than the estimated tax penalty (if any).

## Request

Based on my clean compliance history and in accordance with IRM 20.1.1.3.3.2.1, I respectfully request that the penalty be abated in full under the First-Time Penalty Abatement waiver.

Thank you for your consideration of this request.

Respectfully submitted,

_______________________________  
${clientName || '[Client Name]'}

---
*Reference: Internal Revenue Manual (IRM) 20.1.1.3.3.2.1 - First Time Abate (FTA) Administrative Waiver*`,

      reasonable_cause: `# Request for Penalty Abatement Based on Reasonable Cause

**To:** Internal Revenue Service  
**From:** ${clientName || '[Client Name]'}  
**Re:** Notice ${noticeType} - Tax Year ${taxYear}  
**Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

---

Dear Sir or Madam:

I am writing to respectfully request abatement of the penalty assessed for tax year ${taxYear}. I am requesting this abatement based on reasonable cause as provided under Internal Revenue Code Section 6651(a) and Treasury Regulation Section 301.6651-1(c).

## Legal Basis for Reasonable Cause

Under IRM 20.1.1.3.2, reasonable cause is established when the taxpayer exercised ordinary business care and prudence in meeting their tax obligations but was nevertheless unable to comply. The IRS considers:

1. The nature and circumstances that caused the failure to comply
2. Whether the taxpayer attempted to meet obligations but was unable due to circumstances beyond their control
3. The taxpayer's history of compliance with tax obligations
4. Steps taken to rectify the situation once circumstances allowed

## Explanation of Circumstances

**[PLEASE DESCRIBE YOUR SPECIFIC CIRCUMSTANCES HERE]**

*Include details such as:*
- What event or circumstance prevented timely compliance
- When this occurred and how long it lasted
- What steps you took to try to comply despite the circumstances
- What documentation you are enclosing as evidence

## Exercise of Ordinary Business Care

Despite these circumstances, I exercised ordinary business care and prudence in attempting to meet my tax obligations. Once I was able to address the situation, I immediately took steps to file/pay the required taxes.

## Request

Based on the foregoing, I respectfully request that the penalty be abated in full due to reasonable cause.

Thank you for your consideration of this request.

Respectfully submitted,

_______________________________  
${clientName || '[Client Name]'}

---
*Reference: IRM 20.1.1.3.2 - Reasonable Cause | IRC §6651(a) | Treas. Reg. §301.6651-1(c)*`,

      audit_reconsideration: `# Request for Audit Reconsideration

**To:** Internal Revenue Service  
**From:** ${clientName || '[Client Name]'}  
**Re:** Notice ${noticeType} - Tax Year ${taxYear}  
**Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

---

Dear Sir or Madam:

I am writing to formally request an audit reconsideration for tax year ${taxYear}. I believe the assessment resulting from the prior audit was incorrect and I am providing additional documentation and information to support my position.

## Basis for Audit Reconsideration

Under IRM 4.13.1.1, audit reconsideration is the process the IRS uses to reevaluate the results of a prior audit. I qualify for reconsideration for one or more of the following reasons:

1. I have new information or documentation that was not previously considered
2. I did not appear for the original audit and can now provide supporting documentation
3. The IRS made a computational or processing error in the assessment
4. I disagree with the findings and have documentation to support my position

## Issues for Reconsideration

**[PLEASE DESCRIBE THE SPECIFIC AUDIT FINDINGS YOU ARE DISPUTING]**

*Include details such as:*
- Which specific adjustments you are disputing
- Why you believe the adjustments are incorrect
- What documentation supports your position
- Any new evidence not previously considered

## Enclosed Documentation

I am enclosing the following documentation in support of my request:

- Copy of the original notice or assessment
- Supporting documentation for each disputed item
- Any correspondence related to the original audit
- Additional records not previously available

## Request

Based on the enclosed documentation, I respectfully request that the IRS reconsider the audit findings and adjust the assessment accordingly.

Thank you for your consideration of this request.

Respectfully submitted,

_______________________________  
${clientName || '[Client Name]'}

---
*Reference: IRM 4.13.1 - Audit Reconsideration | Publication 3598*`,
    };

    return templates[type as Exclude<LetterTemplateType, 'ai_draft'>] || '';
  };

  const handleTemplateChange = (type: LetterTemplateType) => {
    setTemplateType(type);
    if (type !== 'ai_draft') {
      setDraft(generateTemplateDraft(type));
    } else {
      setDraft('');
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !draft && templateType === 'ai_draft') {
      generateDraft();
    } else if (isOpen && templateType !== 'ai_draft') {
      setDraft(generateTemplateDraft(templateType));
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

        <div className="flex-1 min-h-0 py-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="template-type" className="text-sm font-medium mb-1.5 block">
                Letter Template
              </Label>
              <Select value={templateType} onValueChange={(v) => handleTemplateChange(v as LetterTemplateType)}>
                <SelectTrigger id="template-type" className="w-full">
                  <SelectValue placeholder="Select template type" />
                </SelectTrigger>
                <SelectContent>
                  {LETTER_TEMPLATES.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      <div className="flex flex-col">
                        <span>{template.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {LETTER_TEMPLATES.find(t => t.value === templateType)?.description}
              </p>
            </div>
          </div>

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
              className="min-h-[350px] font-mono text-sm resize-none"
            />
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2">
          {templateType === 'ai_draft' && (
            <Button
              variant="outline"
              onClick={generateDraft}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          )}
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
