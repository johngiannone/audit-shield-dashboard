/**
 * First-Time Abatement (FTA) Letter Generator
 * Generates formal IRS penalty abatement request letters
 */

import jsPDF from 'jspdf';

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
}

/**
 * Generates an FTA letter as a PDF
 */
export function generateFTALetter(data: FTALetterData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 25;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;
  
  const lineHeight = 6;
  const paragraphSpacing = 12;

  // Helper to add wrapped text
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineH: number): number => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineH);
  };

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
  yPos = addWrappedText(openingParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing;

  // Legal basis paragraph
  doc.setFont('helvetica', 'bold');
  doc.text('Legal Basis for Request:', margin, yPos);
  yPos += lineHeight + 2;
  doc.setFont('helvetica', 'normal');
  
  const legalParagraph = `Under Internal Revenue Manual (IRM) Section 20.1.1.3.3.2.1, the IRS provides for the administrative waiver of penalties for taxpayers who meet the following criteria:`;
  yPos = addWrappedText(legalParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += lineHeight;

  // Criteria list
  const criteria = [
    'The taxpayer has not been required to file a return, or has no prior penalties (except the estimated tax penalty) for the preceding 3 tax years;',
    'The taxpayer has filed all currently required returns or filed a valid extension of time to file; and',
    'The taxpayer has paid, or arranged to pay, any tax due.'
  ];

  criteria.forEach((item, index) => {
    doc.text(`${index + 1}.`, margin + 6, yPos);
    yPos = addWrappedText(item, margin + 14, yPos, contentWidth - 14, lineHeight);
    yPos += lineHeight / 2;
  });
  yPos += paragraphSpacing / 2;

  // Compliance history statement
  doc.setFont('helvetica', 'bold');
  doc.text('My Compliance History:', margin, yPos);
  yPos += lineHeight + 2;
  doc.setFont('helvetica', 'normal');

  const complianceParagraph = `I certify that I have maintained a clean compliance history with the Internal Revenue Service for the three tax years preceding ${data.taxYear}. During this period, I have filed all required tax returns timely and have not been assessed any penalties other than the estimated tax penalty (if any). I have also filed all currently required returns and have paid or made arrangements to pay any tax due.`;
  yPos = addWrappedText(complianceParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing;

  // Request statement
  const requestParagraph = `Based on my clean compliance history and in accordance with IRM 20.1.1.3.3.2.1, I respectfully request that the ${data.penaltyType.toLowerCase()} penalty of $${data.penaltyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} be abated in full under the First-Time Penalty Abatement waiver.`;
  yPos = addWrappedText(requestParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing;

  // Closing
  const closingParagraph = `Thank you for your consideration of this request. If you require any additional information or documentation, please contact me at the address above. I appreciate your time and assistance in resolving this matter.`;
  yPos = addWrappedText(closingParagraph, margin, yPos, contentWidth, lineHeight);
  yPos += paragraphSpacing * 2;

  // Signature block
  doc.text('Respectfully submitted,', margin, yPos);
  yPos += paragraphSpacing * 3;

  doc.text('_______________________________', margin, yPos);
  yPos += lineHeight;
  doc.text(data.taxpayerName, margin, yPos);
  yPos += lineHeight;
  doc.text(`Date: ${formattedDate}`, margin, yPos);
  yPos += paragraphSpacing * 2;

  // Footer with IRM reference
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  const footer = 'Reference: Internal Revenue Manual (IRM) 20.1.1.3.3.2.1 - First Time Abate (FTA) Administrative Waiver';
  doc.text(footer, margin, doc.internal.pageSize.getHeight() - 15);

  return doc;
}

/**
 * Downloads the FTA letter as a PDF
 */
export function downloadFTALetter(data: FTALetterData): void {
  const doc = generateFTALetter(data);
  doc.save(`FTA_Request_${data.taxYear}_${data.taxpayerName.replace(/\s+/g, '_')}.pdf`);
}
