/**
 * IRS Form 2848 (Power of Attorney) Generator
 * Generates pre-filled Form 2848 PDFs for tax representation
 */

import jsPDF from 'jspdf';

export interface AgentData {
  name: string;
  address: string;
  phone: string;
  firmName?: string;
  cafNumber?: string;
  ptin?: string;
}

export interface ClientData {
  name: string;
  address: string;
  phone?: string;
  ssn?: string;
  taxYear: number;
  taxFormType?: string;
}

/**
 * Generates IRS Form 2848 as a PDF
 */
export function generateForm2848(agentData: AgentData, clientData: ClientData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  const lineHeight = 5;
  const sectionSpacing = 8;

  // Helper to draw a box with label
  const drawField = (label: string, value: string, x: number, y: number, width: number, height: number = 10) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(x, y, width, height);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + 1, y + 3);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '', x + 2, y + height - 2);
    return y + height;
  };

  // Helper for checkbox
  const drawCheckbox = (label: string, checked: boolean, x: number, y: number) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(x, y, 4, 4);
    if (checked) {
      doc.setFont('helvetica', 'bold');
      doc.text('X', x + 0.8, y + 3.2);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(label, x + 6, y + 3);
    return x + 6 + doc.getTextWidth(label) + 4;
  };

  // Form Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Form 2848', margin, yPos);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('(Rev. January 2021)', margin, yPos + 5);
  doc.text('Department of the Treasury', margin, yPos + 9);
  doc.text('Internal Revenue Service', margin, yPos + 13);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const titleText = 'Power of Attorney and Declaration of Representative';
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, (pageWidth - titleWidth) / 2, yPos + 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const instructionText = 'Go to www.irs.gov/Form2848 for instructions and the latest information.';
  doc.text(instructionText, pageWidth - margin - doc.getTextWidth(instructionText), yPos + 5);

  yPos += 22;

  // Divider line
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;

  // Part I - Power of Attorney
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, contentWidth, 7, 'F');
  doc.text('Part I', margin + 2, yPos + 5);
  doc.text('Power of Attorney', margin + 20, yPos + 5);
  yPos += 10;

  // Line 1 - Taxpayer Information
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('1', margin, yPos + 3);
  doc.text('Taxpayer information. Taxpayer(s) must sign and date this form on page 2, line 7.', margin + 8, yPos + 3);
  yPos += 6;

  // Taxpayer name and address fields
  const fieldHeight = 12;
  const halfWidth = (contentWidth - 4) / 2;

  doc.setFont('helvetica', 'normal');
  yPos = drawField('Taxpayer name and address', clientData.name + (clientData.address ? '\n' + clientData.address : ''), margin, yPos, halfWidth + 20, 20);
  
  // Reset yPos for right side fields
  const rightStartY = yPos - 20;
  drawField('Daytime telephone number', clientData.phone || '[Enter phone number]', margin + halfWidth + 24, rightStartY, halfWidth - 20, fieldHeight);
  
  // SSN/EIN
  drawField('Taxpayer identification number(s) (SSN or EIN)', clientData.ssn || '[Enter SSN/EIN]', margin + halfWidth + 24, rightStartY + fieldHeight + 1, halfWidth - 20, fieldHeight);

  yPos += 6;

  // Part II - Representative(s)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, contentWidth, 7, 'F');
  doc.text('Part II', margin + 2, yPos + 5);
  doc.text("Representative(s)", margin + 20, yPos + 5);
  yPos += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('2', margin, yPos + 3);
  doc.text('Representative(s) must sign and date this form on page 2, Part II.', margin + 8, yPos + 3);
  yPos += 8;

  // Representative fields
  const repBoxWidth = contentWidth;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, repBoxWidth, 35);

  // Inner field labels
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Name and address', margin + 2, yPos + 4);
  doc.setFontSize(9);
  doc.text(agentData.name || '[Representative name]', margin + 4, yPos + 10);
  doc.text(agentData.address || '[Representative address]', margin + 4, yPos + 15);
  if (agentData.firmName) {
    doc.text(agentData.firmName, margin + 4, yPos + 20);
  }

  // Right side rep info
  const repRightX = margin + repBoxWidth - 60;
  doc.setFontSize(7);
  doc.text('CAF No.', repRightX, yPos + 4);
  doc.setFontSize(9);
  doc.text(agentData.cafNumber || '[CAF Number]', repRightX, yPos + 9);

  doc.setFontSize(7);
  doc.text('PTIN', repRightX, yPos + 14);
  doc.setFontSize(9);
  doc.text(agentData.ptin || '[PTIN]', repRightX, yPos + 19);

  doc.setFontSize(7);
  doc.text('Telephone No.', repRightX, yPos + 24);
  doc.setFontSize(9);
  doc.text(agentData.phone || '[Phone]', repRightX, yPos + 29);

  yPos += 40;

  // Designation checkboxes
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Check if applicable:', margin, yPos);
  yPos += 5;

  let checkX = margin;
  checkX = drawCheckbox('Attorney', false, checkX, yPos);
  checkX = drawCheckbox('CPA', false, checkX + 8, yPos);
  checkX = drawCheckbox('Enrolled Agent', true, checkX + 8, yPos);
  checkX = drawCheckbox('Officer', false, checkX + 8, yPos);
  checkX = drawCheckbox('Enrolled Actuary', false, checkX + 8, yPos);

  yPos += 10;

  // Part III - Tax Matters
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, contentWidth, 7, 'F');
  doc.text('Part III', margin + 2, yPos + 5);
  doc.text('Tax Matters', margin + 22, yPos + 5);
  yPos += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('3', margin, yPos + 3);
  doc.setFont('helvetica', 'normal');
  doc.text('Tax matters. The representative(s) are authorized to represent the taxpayer(s) before the IRS for the following matters:', margin + 8, yPos + 3);
  yPos += 8;

  // Tax matters table header
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const colWidths = [50, 70, 50];
  const tableX = margin;
  
  doc.rect(tableX, yPos, colWidths[0], 8);
  doc.rect(tableX + colWidths[0], yPos, colWidths[1], 8);
  doc.rect(tableX + colWidths[0] + colWidths[1], yPos, colWidths[2], 8);
  
  doc.text('(a) Type of Tax', tableX + 2, yPos + 5);
  doc.text('(b) Tax Form Number', tableX + colWidths[0] + 2, yPos + 5);
  doc.text('(c) Year(s) or Period(s)', tableX + colWidths[0] + colWidths[1] + 2, yPos + 5);
  yPos += 8;

  // Tax matters row
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.rect(tableX, yPos, colWidths[0], 10);
  doc.rect(tableX + colWidths[0], yPos, colWidths[1], 10);
  doc.rect(tableX + colWidths[0] + colWidths[1], yPos, colWidths[2], 10);
  
  doc.text('Income', tableX + 4, yPos + 7);
  doc.text(clientData.taxFormType || '1040', tableX + colWidths[0] + 4, yPos + 7);
  doc.text(String(clientData.taxYear), tableX + colWidths[0] + colWidths[1] + 4, yPos + 7);
  yPos += 15;

  // Part IV - Specific Acts
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, contentWidth, 7, 'F');
  doc.text('Part IV', margin + 2, yPos + 5);
  doc.text('Specific Acts Authorized', margin + 22, yPos + 5);
  yPos += 10;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const actsText = 'The representative(s) are authorized to perform the following acts (unless checked, the acts are authorized):';
  doc.text(actsText, margin, yPos);
  yPos += 6;

  // Authorization checkboxes
  checkX = margin;
  yPos += 2;
  drawCheckbox('Access IRS records via Intermediate Service Providers', true, checkX, yPos);
  yPos += 6;
  drawCheckbox('Authorize disclosure to third parties', true, checkX, yPos);
  yPos += 6;
  drawCheckbox('Substitute or add representative(s)', false, checkX, yPos);
  yPos += 6;
  drawCheckbox('Sign a return', false, checkX, yPos);
  yPos += 10;

  // Part V - Declaration (if we have room, otherwise new page)
  if (yPos > 230) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, contentWidth, 7, 'F');
  doc.text('Part V', margin + 2, yPos + 5);
  doc.text('Declaration of Representative', margin + 22, yPos + 5);
  yPos += 12;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const declarationText = 'Under penalties of perjury, by my signature below I declare that:';
  doc.text(declarationText, margin, yPos);
  yPos += 5;

  const bulletPoints = [
    '• I am not currently suspended or disbarred from practice before the IRS;',
    '• I am aware of regulations contained in Circular 230;',
    '• I am authorized to represent the taxpayer(s) identified in Part I for the matter(s) specified in Part III; and',
    '• I am one of the following: (check the applicable designation)',
  ];

  bulletPoints.forEach(point => {
    doc.text(point, margin + 4, yPos);
    yPos += 4;
  });

  yPos += 4;
  
  // Designation for signature
  drawCheckbox('c. Enrolled Agent — enrolled as an agent by the IRS per the requirements of Circular 230', true, margin + 8, yPos);
  yPos += 12;

  // Signature line
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, margin + 90, yPos);
  doc.line(margin + 100, yPos, margin + 140, yPos);

  doc.setFontSize(7);
  doc.text('Signature', margin, yPos + 4);
  doc.text('Date', margin + 100, yPos + 4);

  yPos += 10;

  // Print name
  doc.line(margin, yPos, margin + 90, yPos);
  doc.text('Print name of representative', margin, yPos + 4);
  doc.setFontSize(9);
  doc.text(agentData.name || '', margin + 2, yPos - 2);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Form 2848 (Rev. 1-2021)', margin, footerY);
  doc.text('Catalog Number 11980J', pageWidth / 2 - 20, footerY);
  doc.text('www.irs.gov', pageWidth - margin - 20, footerY);

  // Instructions note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Note: Fields marked with [brackets] must be completed manually before submission.', margin, footerY + 5);

  return doc;
}

/**
 * Downloads the Form 2848 as a PDF
 */
export function downloadForm2848(agentData: AgentData, clientData: ClientData): void {
  const doc = generateForm2848(agentData, clientData);
  const clientNameClean = (clientData.name || 'Client').replace(/\s+/g, '_');
  doc.save(`Form_2848_${clientNameClean}_${clientData.taxYear}.pdf`);
}
