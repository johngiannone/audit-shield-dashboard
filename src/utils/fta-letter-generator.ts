/**
 * IRS Letter Generator
 * Generates formal IRS penalty abatement and audit reconsideration letters
 */

import jsPDF from 'jspdf';

export type LetterType = 'fta' | 'reasonable_cause' | 'audit_reconsideration';

export interface FTALetterData {
  taxpayerName: string;
  taxpayerAddress: string;
  taxpayerCity: string;
  taxpayerState: string;
  taxpayerZip: string;
  ssn: string; // Last 4 digits only for display
  noticeType: string; // CP14, CP503, etc.
  noticeDate: string;
  taxYear: string;
  penaltyAmount: number;
  penaltyType: string; // Failure to file, failure to pay, etc.
  letterType?: LetterType;
  reasonableCauseReason?: string; // For reasonable cause letters
  auditIssue?: string; // For audit reconsideration letters
}

// Helper to add wrapped text
const addWrappedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineH: number): number => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + (lines.length * lineH);
};

/**
 * Generates header section common to all letters
 */
function generateLetterHeader(doc: jsPDF, data: FTALetterData, margin: number, lineHeight: number, paragraphSpacing: number): number {
  let yPos = margin;

  // Date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(formattedDate, margin, yPos);
  yPos += paragraphSpacing * 2;

  // Taxpayer info block
  doc.text(data.taxpayerName, margin, yPos);
  yPos += lineHeight;
  doc.text(data.taxpayerAddress, margin, yPos);
  yPos += lineHeight;
  doc.text(`${data.taxpayerCity}, ${data.taxpayerState} ${data.taxpayerZip}`, margin, yPos);
  yPos += paragraphSpacing * 2;

  // IRS Address
  doc.text('Internal Revenue Service', margin, yPos);
  yPos += lineHeight;
  doc.text('Penalty Abatement Coordinator', margin, yPos);
  yPos += lineHeight;
  doc.text('[See Notice for Correct IRS Address]', margin, yPos);
  yPos += paragraphSpacing * 2;

  return yPos;
}

/**
 * Generates signature block common to all letters
 */
function generateSignatureBlock(doc: jsPDF, data: FTALetterData, margin: number, yPos: number, lineHeight: number, paragraphSpacing: number): number {
  const formattedDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  doc.text('Respectfully submitted,', margin, yPos);
  yPos += paragraphSpacing * 3;

  doc.text('_______________________________', margin, yPos);
  yPos += lineHeight;
  doc.text(data.taxpayerName, margin, yPos);
  yPos += lineHeight;
  doc.text(`Date: ${formattedDate}`, margin, yPos);

  return yPos;
}

/**
 * Generates an FTA letter as a PDF
 */
export function generateFTALetter(data: FTALetterData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 25;
  const contentWidth = pageWidth - (margin * 2);
  const lineHeight = 6;
  const paragraphSpacing = 12;

  let yPos = generateLetterHeader(doc, data, margin, lineHeight, paragraphSpacing);

  // RE: Line
  doc.setFont('helvetica', 'bold');
  doc.text('RE: Request for First-Time Penalty Abatement', margin, yPos);
  yPos += lineHeight;
  doc.setFont('helvetica', 'normal');
  doc.text(`SSN: XXX-XX-${data.ssn}`, margin + 6, yPos);
  yPos += lineHeight;
  doc.text(`Tax Year: ${data.taxYear}`, margin + 6, yPos);
  yPos += lineHeight;
  doc.text(`Notice: ${data.noticeType} dated ${data.noticeDate}`, margin + 6, yPos);
  yPos += lineHeight;
  doc.text(`Penalty Amount: $${data.penaltyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 6, yPos);
  yPos += paragraphSpacing * 1.5;

  // Salutation
  doc.text('Dear Sir or Madam:', margin, yPos);
  yPos += paragraphSpacing;

  // Opening paragraph
  const openingParagraph = `I am writing to respectfully request abatement of the ${data.penaltyType.toLowerCase()} penalty assessed for tax year ${data.taxYear} in the amount of $${data.penaltyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}. I am requesting this abatement under the IRS First-Time Penalty Abatement (FTA) administrative waiver.`;
  yPos = addWrappedText(doc, openingParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing;

  // Legal basis paragraph
  doc.setFont('helvetica', 'bold');
  doc.text('Legal Basis for Request:', margin, yPos);
  yPos += lineHeight + 2;
  doc.setFont('helvetica', 'normal');
  
  const legalParagraph = `Under Internal Revenue Manual (IRM) Section 20.1.1.3.3.2.1, the IRS provides for the administrative waiver of penalties for taxpayers who meet the following criteria:`;
  yPos = addWrappedText(doc, legalParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += lineHeight;

  // Criteria list
  const criteria = [
    'The taxpayer has not been required to file a return, or has no prior penalties (except the estimated tax penalty) for the preceding 3 tax years;',
    'The taxpayer has filed all currently required returns or filed a valid extension of time to file; and',
    'The taxpayer has paid, or arranged to pay, any tax due.'
  ];

  criteria.forEach((item, index) => {
    doc.text(`${index + 1}.`, margin + 6, yPos);
    yPos = addWrappedText(doc, item, margin + 14, yPos, contentWidth - 14, lineHeight);
    yPos += lineHeight / 2;
  });
  yPos += paragraphSpacing / 2;

  // Compliance history statement
  doc.setFont('helvetica', 'bold');
  doc.text('My Compliance History:', margin, yPos);
  yPos += lineHeight + 2;
  doc.setFont('helvetica', 'normal');

  const complianceParagraph = `I certify that I have maintained a clean compliance history with the Internal Revenue Service for the three tax years preceding ${data.taxYear}. During this period, I have filed all required tax returns timely and have not been assessed any penalties other than the estimated tax penalty (if any). I have also filed all currently required returns and have paid or made arrangements to pay any tax due.`;
  yPos = addWrappedText(doc, complianceParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing;

  // Request statement
  const requestParagraph = `Based on my clean compliance history and in accordance with IRM 20.1.1.3.3.2.1, I respectfully request that the ${data.penaltyType.toLowerCase()} penalty of $${data.penaltyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} be abated in full under the First-Time Penalty Abatement waiver.`;
  yPos = addWrappedText(doc, requestParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing;

  // Closing
  const closingParagraph = `Thank you for your consideration of this request. If you require any additional information or documentation, please contact me at the address above. I appreciate your time and assistance in resolving this matter.`;
  yPos = addWrappedText(doc, closingParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing * 2;

  // Signature block
  yPos = generateSignatureBlock(doc, data, margin, yPos, lineHeight, paragraphSpacing);

  // Footer with IRM reference
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  const footer = 'Reference: Internal Revenue Manual (IRM) 20.1.1.3.3.2.1 - First Time Abate (FTA) Administrative Waiver';
  doc.text(footer, margin, doc.internal.pageSize.getHeight() - 15);

  return doc;
}

/**
 * Generates a Reasonable Cause letter as a PDF
 */
export function generateReasonableCauseLetter(data: FTALetterData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 25;
  const contentWidth = pageWidth - (margin * 2);
  const lineHeight = 6;
  const paragraphSpacing = 12;

  let yPos = generateLetterHeader(doc, data, margin, lineHeight, paragraphSpacing);

  // RE: Line
  doc.setFont('helvetica', 'bold');
  doc.text('RE: Request for Penalty Abatement Based on Reasonable Cause', margin, yPos);
  yPos += lineHeight;
  doc.setFont('helvetica', 'normal');
  doc.text(`SSN: XXX-XX-${data.ssn}`, margin + 6, yPos);
  yPos += lineHeight;
  doc.text(`Tax Year: ${data.taxYear}`, margin + 6, yPos);
  yPos += lineHeight;
  doc.text(`Notice: ${data.noticeType} dated ${data.noticeDate}`, margin + 6, yPos);
  yPos += lineHeight;
  doc.text(`Penalty Amount: $${data.penaltyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 6, yPos);
  yPos += paragraphSpacing * 1.5;

  // Salutation
  doc.text('Dear Sir or Madam:', margin, yPos);
  yPos += paragraphSpacing;

  // Opening paragraph
  const openingParagraph = `I am writing to respectfully request abatement of the ${data.penaltyType.toLowerCase()} penalty assessed for tax year ${data.taxYear} in the amount of $${data.penaltyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}. I am requesting this abatement based on reasonable cause as provided under Internal Revenue Code Section 6651(a) and Treasury Regulation Section 301.6651-1(c).`;
  yPos = addWrappedText(doc, openingParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing;

  // Legal basis paragraph
  doc.setFont('helvetica', 'bold');
  doc.text('Legal Basis for Reasonable Cause:', margin, yPos);
  yPos += lineHeight + 2;
  doc.setFont('helvetica', 'normal');
  
  const legalParagraph = `Under IRM 20.1.1.3.2, reasonable cause is established when the taxpayer exercised ordinary business care and prudence in meeting their tax obligations but was nevertheless unable to comply. The IRS considers the following factors:`;
  yPos = addWrappedText(doc, legalParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += lineHeight;

  // Factors list
  const factors = [
    'The nature and circumstances that caused the failure to comply',
    'Whether the taxpayer attempted to meet obligations but was unable due to circumstances beyond their control',
    'The taxpayer\'s history of compliance with tax obligations',
    'Steps taken to rectify the situation once circumstances allowed'
  ];

  factors.forEach((item, index) => {
    doc.text(`${index + 1}.`, margin + 6, yPos);
    yPos = addWrappedText(doc, item, margin + 14, yPos, contentWidth - 14, lineHeight);
    yPos += lineHeight / 2;
  });
  yPos += paragraphSpacing / 2;

  // Explanation of circumstances
  doc.setFont('helvetica', 'bold');
  doc.text('Explanation of Circumstances:', margin, yPos);
  yPos += lineHeight + 2;
  doc.setFont('helvetica', 'normal');

  const reasonText = data.reasonableCauseReason || '[Please describe the specific circumstances that prevented timely compliance, including dates, events, and any supporting documentation you are enclosing.]';
  yPos = addWrappedText(doc, reasonText, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing;

  // Ordinary care statement
  doc.setFont('helvetica', 'bold');
  doc.text('Exercise of Ordinary Business Care:', margin, yPos);
  yPos += lineHeight + 2;
  doc.setFont('helvetica', 'normal');

  const careParagraph = `Despite these circumstances, I exercised ordinary business care and prudence in attempting to meet my tax obligations. Once I was able to address the situation, I immediately took steps to file/pay the required taxes. I have a history of compliance with tax laws and this situation was an isolated incident caused by factors beyond my control.`;
  yPos = addWrappedText(doc, careParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing;

  // Request statement
  const requestParagraph = `Based on the foregoing, I respectfully request that the ${data.penaltyType.toLowerCase()} penalty of $${data.penaltyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} be abated in full due to reasonable cause. I have enclosed supporting documentation as indicated above.`;
  yPos = addWrappedText(doc, requestParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing;

  // Closing
  const closingParagraph = `Thank you for your consideration of this request. If you require any additional information or documentation, please contact me at the address above. I appreciate your time and assistance in resolving this matter.`;
  yPos = addWrappedText(doc, closingParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing * 2;

  // Signature block
  yPos = generateSignatureBlock(doc, data, margin, yPos, lineHeight, paragraphSpacing);

  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  const footer = 'Reference: IRM 20.1.1.3.2 - Reasonable Cause | IRC §6651(a) | Treas. Reg. §301.6651-1(c)';
  doc.text(footer, margin, doc.internal.pageSize.getHeight() - 15);

  return doc;
}

/**
 * Generates an Audit Reconsideration letter as a PDF
 */
export function generateAuditReconsiderationLetter(data: FTALetterData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - (margin * 2);
  const lineHeight = 6;
  const paragraphSpacing = 12;

  let yPos = generateLetterHeader(doc, data, margin, lineHeight, paragraphSpacing);

  // RE: Line
  doc.setFont('helvetica', 'bold');
  doc.text('RE: Request for Audit Reconsideration', margin, yPos);
  yPos += lineHeight;
  doc.setFont('helvetica', 'normal');
  doc.text(`SSN: XXX-XX-${data.ssn}`, margin + 6, yPos);
  yPos += lineHeight;
  doc.text(`Tax Year: ${data.taxYear}`, margin + 6, yPos);
  yPos += lineHeight;
  doc.text(`Notice: ${data.noticeType} dated ${data.noticeDate}`, margin + 6, yPos);
  yPos += lineHeight;
  doc.text(`Amount in Dispute: $${data.penaltyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 6, yPos);
  yPos += paragraphSpacing * 1.5;

  // Salutation
  doc.text('Dear Sir or Madam:', margin, yPos);
  yPos += paragraphSpacing;

  // Opening paragraph
  const openingParagraph = `I am writing to formally request an audit reconsideration for tax year ${data.taxYear}. I believe the assessment resulting from the prior audit was incorrect and I am providing additional documentation and information to support my position.`;
  yPos = addWrappedText(doc, openingParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing;

  // Legal basis paragraph
  doc.setFont('helvetica', 'bold');
  doc.text('Basis for Audit Reconsideration:', margin, yPos);
  yPos += lineHeight + 2;
  doc.setFont('helvetica', 'normal');
  
  const legalParagraph = `Under IRM 4.13.1.1, audit reconsideration is the process the IRS uses to reevaluate the results of a prior audit where additional tax was assessed and remains unpaid, or a tax credit was reversed. I qualify for reconsideration for one or more of the following reasons:`;
  yPos = addWrappedText(doc, legalParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += lineHeight;

  // Reasons list
  const reasons = [
    'I have new information or documentation that was not previously considered',
    'I did not appear for the original audit and can now provide supporting documentation',
    'The IRS made a computational or processing error in the assessment',
    'I disagree with the findings and have documentation to support my position'
  ];

  reasons.forEach((item, index) => {
    doc.text(`${index + 1}.`, margin + 6, yPos);
    yPos = addWrappedText(doc, item, margin + 14, yPos, contentWidth - 14, lineHeight);
    yPos += lineHeight / 2;
  });
  yPos += paragraphSpacing / 2;

  // Check for page break
  if (yPos > pageHeight - 100) {
    doc.addPage();
    yPos = margin;
  }

  // Specific issue
  doc.setFont('helvetica', 'bold');
  doc.text('Issues for Reconsideration:', margin, yPos);
  yPos += lineHeight + 2;
  doc.setFont('helvetica', 'normal');

  const issueText = data.auditIssue || '[Please describe the specific audit findings you are disputing, including the adjustments made and why you believe they are incorrect. Reference any documentation you are enclosing.]';
  yPos = addWrappedText(doc, issueText, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing;

  // Documentation section
  doc.setFont('helvetica', 'bold');
  doc.text('Enclosed Documentation:', margin, yPos);
  yPos += lineHeight + 2;
  doc.setFont('helvetica', 'normal');

  const docList = [
    'Copy of the original notice or assessment',
    'Supporting documentation for each disputed item',
    'Any correspondence related to the original audit',
    'Additional records not previously available'
  ];

  docList.forEach((item) => {
    doc.text('•', margin + 6, yPos);
    doc.text(item, margin + 14, yPos);
    yPos += lineHeight;
  });
  yPos += paragraphSpacing / 2;

  // Request statement
  const requestParagraph = `Based on the enclosed documentation, I respectfully request that the IRS reconsider the audit findings and adjust the assessment accordingly. The amount currently in dispute is $${data.penaltyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`;
  yPos = addWrappedText(doc, requestParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing;

  // Closing
  const closingParagraph = `Thank you for your consideration of this request. I am willing to provide any additional information needed to resolve this matter. Please contact me at the address above if you have any questions.`;
  yPos = addWrappedText(doc, closingParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing * 2;

  // Signature block
  yPos = generateSignatureBlock(doc, data, margin, yPos, lineHeight, paragraphSpacing);

  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  const footer = 'Reference: IRM 4.13.1 - Audit Reconsideration | Publication 3598';
  doc.text(footer, margin, pageHeight - 15);

  return doc;
}

/**
 * Downloads the appropriate letter type as a PDF
 */
export function downloadFTALetter(data: FTALetterData): void {
  const letterType = data.letterType || 'fta';
  let doc: jsPDF;
  let filename: string;

  switch (letterType) {
    case 'reasonable_cause':
      doc = generateReasonableCauseLetter(data);
      filename = `Reasonable_Cause_${data.taxYear}_${data.taxpayerName.replace(/\s+/g, '_')}.pdf`;
      break;
    case 'audit_reconsideration':
      doc = generateAuditReconsiderationLetter(data);
      filename = `Audit_Reconsideration_${data.taxYear}_${data.taxpayerName.replace(/\s+/g, '_')}.pdf`;
      break;
    case 'fta':
    default:
      doc = generateFTALetter(data);
      filename = `FTA_Request_${data.taxYear}_${data.taxpayerName.replace(/\s+/g, '_')}.pdf`;
      break;
  }

  doc.save(filename);
}
