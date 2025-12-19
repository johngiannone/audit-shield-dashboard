import jsPDF from 'jspdf';

interface TimelineEntry {
  code: string;
  date: string;
  description: string;
  severity: string;
  category: string;
  explanation: string;
  recommendedAction: string;
}

interface DecodeResult {
  timeline: TimelineEntry[];
  statusSummary: {
    status: string;
    riskLevel: string;
    criticalCodes: string[];
    highCodes: string[];
    message: string;
  };
}

const PLAIN_ENGLISH: Record<string, string> = {
  '150': 'Your tax return was received and processed by the IRS.',
  '420': 'The IRS has flagged this return for review (audit examination).',
  '424': 'The IRS has requested an examination of your return.',
  '570': 'There is a hold on your account preventing any credits or refunds.',
  '810': 'Your refund has been frozen pending IRS review.',
  '846': 'Your refund has been approved and sent.',
  '914': 'Active audit examination is in progress on your account.',
  '922': 'Criminal investigation division is involved with your account.',
  '971': 'The IRS has sent you a notice - check your mail.',
  '976': 'A duplicate return was filed - possible identity theft.',
};

export function generateTranscriptReport(result: DecodeResult, fileName?: string): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 20;

  // Helper to add new page if needed
  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > 270) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('IRS Transcript Analysis Report', margin, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 35);
  if (fileName) {
    doc.text(`File: ${fileName}`, pageWidth - margin - doc.getTextWidth(`File: ${fileName}`), 35);
  }

  yPos = 55;
  doc.setTextColor(0, 0, 0);

  // Status Summary Box
  const riskColors: Record<string, [number, number, number]> = {
    critical: [239, 68, 68],   // red
    high: [249, 115, 22],     // orange
    medium: [245, 158, 11],   // amber
    low: [34, 197, 94],       // green
    clear: [34, 197, 94],     // green
  };

  const riskColor = riskColors[result.statusSummary.riskLevel] || [100, 100, 100];
  
  // Status box background
  doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(result.statusSummary.status, margin + 10, yPos + 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const messageLines = doc.splitTextToSize(result.statusSummary.message, contentWidth - 20);
  doc.text(messageLines, margin + 10, yPos + 25);

  yPos += 45;
  doc.setTextColor(0, 0, 0);

  // Risk Level Badge
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Risk Level: ', margin, yPos);
  doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.text(result.statusSummary.riskLevel.toUpperCase(), margin + doc.getTextWidth('Risk Level: '), yPos);
  
  yPos += 15;
  doc.setTextColor(0, 0, 0);

  // Critical/High codes summary
  if (result.statusSummary.criticalCodes.length > 0) {
    doc.setTextColor(239, 68, 68);
    doc.setFont('helvetica', 'bold');
    doc.text(`Critical Codes Found: ${result.statusSummary.criticalCodes.join(', ')}`, margin, yPos);
    yPos += 8;
  }
  
  if (result.statusSummary.highCodes.length > 0) {
    doc.setTextColor(249, 115, 22);
    doc.setFont('helvetica', 'bold');
    doc.text(`High Priority Codes Found: ${result.statusSummary.highCodes.join(', ')}`, margin, yPos);
    yPos += 8;
  }

  yPos += 10;
  doc.setTextColor(0, 0, 0);

  // Timeline Section Header
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, yPos, contentWidth, 12, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction Timeline', margin + 5, yPos + 9);
  yPos += 20;

  // Timeline entries
  if (result.timeline.length === 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('No transaction codes were detected in this transcript.', margin, yPos);
    yPos += 15;
  } else {
    result.timeline.forEach((entry, index) => {
      checkPageBreak(50);

      const severityColors: Record<string, [number, number, number]> = {
        critical: [254, 226, 226],  // red-100
        high: [255, 237, 213],      // orange-100
        medium: [254, 249, 195],    // yellow-100
        routine: [220, 252, 231],   // green-100
      };
      
      const bgColor = severityColors[entry.severity] || [241, 245, 249];
      const textColors: Record<string, [number, number, number]> = {
        critical: [185, 28, 28],    // red-700
        high: [194, 65, 12],        // orange-700
        medium: [161, 98, 7],       // yellow-700
        routine: [21, 128, 61],     // green-700
      };
      const textColor = textColors[entry.severity] || [51, 65, 85];

      // Entry background
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      
      // Calculate height needed
      const plainEnglish = PLAIN_ENGLISH[entry.code] || entry.explanation || entry.description;
      const descLines = doc.splitTextToSize(plainEnglish, contentWidth - 80);
      const actionLines = entry.recommendedAction ? doc.splitTextToSize(entry.recommendedAction, contentWidth - 30) : [];
      const entryHeight = 25 + (descLines.length * 5) + (actionLines.length > 0 ? actionLines.length * 5 + 10 : 0);
      
      checkPageBreak(entryHeight + 10);
      
      doc.roundedRect(margin, yPos, contentWidth, entryHeight, 2, 2, 'F');

      // Code and severity
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(`Code ${entry.code}`, margin + 5, yPos + 10);

      // Category badge
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const categoryX = margin + 5 + doc.getTextWidth(`Code ${entry.code}`) + 5;
      doc.text(`[${entry.category}]`, categoryX, yPos + 10);

      // Date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(entry.date, pageWidth - margin - doc.getTextWidth(entry.date) - 5, yPos + 10);

      // Plain English description
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(descLines, margin + 5, yPos + 20);

      // Recommended action for critical/high
      if ((entry.severity === 'critical' || entry.severity === 'high') && entry.recommendedAction) {
        const actionY = yPos + 20 + (descLines.length * 5) + 5;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin + 5, actionY - 3, contentWidth - 10, actionLines.length * 5 + 6, 1, 1, 'F');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text('Action:', margin + 8, actionY + 3);
        doc.setFont('helvetica', 'normal');
        doc.text(actionLines, margin + 8 + doc.getTextWidth('Action: '), actionY + 3);
      }

      yPos += entryHeight + 5;
    });
  }

  // Footer on last page
  checkPageBreak(30);
  yPos = 270;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  doc.text('This report is for informational purposes only and does not constitute tax or legal advice.', margin, yPos + 8);
  doc.text('Consult a qualified tax professional for guidance specific to your situation.', margin, yPos + 14);

  return doc;
}

export function downloadTranscriptReport(result: DecodeResult, fileName?: string) {
  const doc = generateTranscriptReport(result, fileName);
  const reportName = `Transcript-Analysis-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(reportName);
}