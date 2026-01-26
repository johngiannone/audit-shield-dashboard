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

/**
 * IRS Action Steps - Specific recommended actions for each transaction code.
 * These provide actionable guidance when critical or high-severity codes appear.
 */
const IRS_ACTION_STEPS: Record<string, string> = {
  // Audit & Examination Codes
  '420': 'Do NOT file an amended return at this time. Wait for the official IRS examination letter (Letter 2205 or 566). Gather all supporting documentation for the items likely under review. Do not contact the IRS until you receive written correspondence.',
  '421': 'The IRS has reversed its audit decision. No action required, but retain all documentation in case of future review.',
  '424': 'Prepare for a correspondence or office audit. Organize receipts, bank statements, and any records supporting deductions claimed. Consider consulting an Enrolled Agent or CPA before responding.',
  '914': 'An active audit is underway. Do NOT make any changes to your return or file amendments. Wait for the Revenue Agent to contact you. Keep detailed records of all IRS communications.',
  '922': 'This is a Criminal Investigation Division (CID) flag - extremely serious. STOP all communication with the IRS immediately. Contact a tax attorney (not just a CPA) before taking any action. Do not destroy any documents.',
  
  // Hold & Freeze Codes
  '570': 'Your refund or credit is on hold. This is often temporary. Wait 60 days before calling the IRS. If you have moved, ensure your address is updated. Do not file duplicate returns.',
  '571': 'The hold on your account has been released. Your refund should process within 2-3 weeks. No action required unless you do not receive it.',
  '810': 'Your refund is frozen - this is serious. Do NOT call the IRS repeatedly as this will not speed up the process. Wait for a notice explaining the reason. Common causes: identity verification, offset for debt, or examination hold.',
  '811': 'The refund freeze has been reversed. Your refund should be released within 1-2 weeks. Monitor your bank account for direct deposit.',
  
  // Notice Codes
  '971': 'A notice has been mailed to you. Check your mail daily including any forwarding addresses. Respond by the deadline shown on the notice. Keep a copy of your response and send via certified mail.',
  '972': 'This is a placeholder indicating no response was received to a prior notice. Check if you missed correspondence. Contact the IRS to request a copy of the original notice.',
  
  // Identity & Fraud Codes
  '976': 'A duplicate return was filed - possible identity theft. File Form 14039 (Identity Theft Affidavit) immediately. Request an Identity Protection PIN for future returns. Monitor your credit reports.',
  '977': 'An amended return (1040-X) was filed. If you did not file this amendment, report identity theft immediately using Form 14039.',
  
  // Collection & Balance Due
  '290': 'Additional tax has been assessed. Review the notice for accuracy. If correct, pay within 21 days to minimize interest. If incorrect, file Form 843 or respond to the notice with documentation.',
  '300': 'Additional tax assessed with interest. Pay the balance or contact the IRS to set up an installment agreement within 30 days to avoid further collection action.',
  '196': 'Interest has been computed on your balance. This is routine. Pay the balance to stop interest from accruing.',
  
  // Payment & Refund Codes
  '846': 'Great news - your refund was approved. It should arrive within 5 business days for direct deposit, or 4 weeks for paper check. No action needed.',
  '840': 'A refund was issued via paper check. Allow 4-6 weeks for delivery. If not received, you can request a trace after 6 weeks.',
  '826': 'Part or all of your refund was applied to another debt (offset). This could be federal tax debt, state debt, or child support. Contact the Bureau of Fiscal Service for details.',
  
  // Penalty Codes
  '160': 'A penalty has been assessed. Review the penalty type on your notice. If you have reasonable cause (first-time, disaster, serious illness), request abatement using Form 843 or IRS.gov.',
  '161': 'Penalty relief was granted. No action needed. The amount will be credited to your account.',
  '166': 'Interest has been removed from your account. This is a positive adjustment. No action required.',
  
  // Return Processing
  '150': 'Your return was accepted and processed. This is routine - no action needed unless you expected a different outcome.',
  '806': 'Withholding credits from W-2s and 1099s have been applied. Verify this matches your records. If discrepancies exist, contact your employer.',
  '766': 'A credit was applied to your account. Review to ensure it matches expected refundable credits (EIC, Child Tax Credit, etc.).',
};

/**
 * Get the recommended action for a given IRS code.
 * Falls back to database recommendedAction or generic message.
 */
export function getActionStep(code: string, fallback?: string): string {
  return IRS_ACTION_STEPS[code] || fallback || 'Review your IRS account transcript carefully and consult a tax professional if you have questions about this code.';
}

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

      // Plain English description
      const plainEnglish = PLAIN_ENGLISH[entry.code] || entry.explanation || entry.description;
      const descLines = doc.splitTextToSize(plainEnglish, contentWidth - 80);
      
      // Get action step from dictionary or fallback to entry's recommendedAction
      const actionText = getActionStep(entry.code, entry.recommendedAction);
      const showActionBox = (entry.severity === 'critical' || entry.severity === 'high') && actionText;
      const actionLines = showActionBox ? doc.splitTextToSize(actionText, contentWidth - 40) : [];
      
      // Calculate height needed including red action box
      const actionBoxHeight = showActionBox ? (actionLines.length * 4.5) + 18 : 0;
      const entryHeight = 25 + (descLines.length * 5) + actionBoxHeight;
      
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

      // RED ACTION BOX for critical/high severity codes
      if (showActionBox) {
        const actionBoxY = yPos + 20 + (descLines.length * 5) + 5;
        const actionBoxInnerHeight = (actionLines.length * 4.5) + 10;
        
        // Red background box
        doc.setFillColor(254, 226, 226); // red-100 background
        doc.setDrawColor(239, 68, 68);   // red-500 border
        doc.setLineWidth(0.5);
        doc.roundedRect(margin + 5, actionBoxY - 2, contentWidth - 10, actionBoxInnerHeight, 2, 2, 'FD');
        
        // Red left accent bar
        doc.setFillColor(239, 68, 68); // red-500
        doc.rect(margin + 5, actionBoxY - 2, 3, actionBoxInnerHeight, 'F');
        
        // Action header
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(185, 28, 28); // red-700
        doc.text('⚠ RECOMMENDED ACTION:', margin + 12, actionBoxY + 5);
        
        // Action text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(127, 29, 29); // red-900
        doc.text(actionLines, margin + 12, actionBoxY + 11);
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