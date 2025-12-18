import jsPDF from 'jspdf';

interface ScanJobData {
  original_filename: string;
  risk_score: number | null;
  extracted_data: {
    clientName?: string;
    taxYear?: number;
    agi?: number;
    scheduleCNetProfit?: number;
    totalItemizedDeductions?: number;
    charitableContributions?: number;
  } | null;
  detected_issues: Array<{
    flag: string;
    severity: string;
    details: string;
  }> | null;
  created_at: string;
}

interface GeneratePDFOptions {
  job: ScanJobData;
  firmName?: string;
}

export function generateRiskScorecardPDF({ job, firmName = 'Return Shield' }: GeneratePDFOptions): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  // Colors
  const primaryColor = [30, 58, 95]; // Navy
  const textColor = [51, 51, 51];
  const mutedColor = [107, 114, 128];

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`${firmName}`, margin, 20);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Audit Risk Assessment', margin, 32);

  yPos = 60;

  // Client Info Section
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Information', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  
  const clientName = job.extracted_data?.clientName || 'Not Available';
  const taxYear = job.extracted_data?.taxYear || 'N/A';
  const agi = job.extracted_data?.agi 
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(job.extracted_data.agi)
    : 'N/A';
  const reportDate = new Date(job.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  doc.text(`Client: ${clientName}`, margin, yPos);
  doc.text(`Report Date: ${reportDate}`, pageWidth - margin - 60, yPos);
  yPos += 6;
  doc.text(`Tax Year: ${taxYear}`, margin, yPos);
  doc.text(`Source: ${job.original_filename}`, pageWidth - margin - 60, yPos);
  yPos += 6;
  doc.text(`Adjusted Gross Income: ${agi}`, margin, yPos);
  yPos += 15;

  // Risk Score Section
  const score = job.risk_score || 0;
  
  // Draw gauge background
  const gaugeX = pageWidth / 2;
  const gaugeY = yPos + 35;
  const gaugeRadius = 30;

  // Background arc
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(8);
  drawArc(doc, gaugeX, gaugeY, gaugeRadius, Math.PI, 0);

  // Score arc with color based on risk level
  let scoreColor: [number, number, number];
  if (score >= 65) {
    scoreColor = [220, 38, 38]; // Red
  } else if (score >= 35) {
    scoreColor = [217, 119, 6]; // Amber
  } else {
    scoreColor = [22, 163, 74]; // Green
  }
  
  doc.setDrawColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  const scoreAngle = Math.PI - (score / 100) * Math.PI;
  drawArc(doc, gaugeX, gaugeY, gaugeRadius, Math.PI, scoreAngle);

  // Score text
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(`${score}%`, gaugeX, gaugeY + 5, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Audit Risk Score', gaugeX, gaugeY + 15, { align: 'center' });

  // Risk level label
  let riskLabel = 'Low Risk';
  if (score >= 65) riskLabel = 'High Risk';
  else if (score >= 35) riskLabel = 'Medium Risk';
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(riskLabel, gaugeX, gaugeY + 25, { align: 'center' });

  yPos = gaugeY + 45;

  // Risk Flags Section
  if (job.detected_issues && job.detected_issues.length > 0) {
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Identified Risk Factors', margin, yPos);
    yPos += 10;

    job.detected_issues.forEach((flag, index) => {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = margin;
      }

      // Severity indicator
      let severityColor: [number, number, number];
      if (flag.severity === 'high') {
        severityColor = [220, 38, 38];
      } else if (flag.severity === 'medium') {
        severityColor = [217, 119, 6];
      } else {
        severityColor = [59, 130, 246];
      }

      // Bullet point
      doc.setFillColor(severityColor[0], severityColor[1], severityColor[2]);
      doc.circle(margin + 3, yPos - 2, 2, 'F');

      // Flag text
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(flag.flag, margin + 10, yPos);
      
      // Severity badge
      doc.setFontSize(8);
      doc.setTextColor(severityColor[0], severityColor[1], severityColor[2]);
      doc.text(`[${flag.severity.toUpperCase()}]`, margin + 10 + doc.getTextWidth(flag.flag) + 5, yPos);
      
      yPos += 5;

      // Details
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      const detailLines = doc.splitTextToSize(flag.details, pageWidth - margin * 2 - 10);
      detailLines.forEach((line: string) => {
        doc.text(line, margin + 10, yPos);
        yPos += 4;
      });
      
      yPos += 6;
    });
  } else {
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('No significant risk factors identified.', margin, yPos);
    yPos += 15;
  }

  // Disclaimer Section
  yPos = Math.max(yPos + 10, 230);
  
  if (yPos > 250) {
    doc.addPage();
    yPos = margin;
  }

  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const disclaimer = 'DISCLAIMER: This is an automated analysis based on statistical data benchmarks and IRS guidelines. It is not an official IRS determination, does not constitute legal or tax advice, and does not guarantee that an audit will or will not occur. For professional guidance, please consult with a licensed tax professional or enrolled agent.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - margin * 2);
  disclaimerLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 4;
  });

  yPos += 10;

  // Call to Action
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommended: Enrollment in Audit Defense Program', pageWidth / 2, yPos + 10, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Get professional Enrolled Agent representation if audited. Zero extra fees.', pageWidth / 2, yPos + 18, { align: 'center' });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(8);
  doc.text(`Generated by ${firmName} • ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY, { align: 'center' });

  // Save the PDF
  const fileName = `Risk_Scorecard_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${taxYear}.pdf`;
  doc.save(fileName);
}

// Helper function to draw an arc
function drawArc(doc: jsPDF, x: number, y: number, radius: number, startAngle: number, endAngle: number): void {
  const segments = 50;
  const angleStep = (endAngle - startAngle) / segments;
  
  for (let i = 0; i < segments; i++) {
    const angle1 = startAngle + i * angleStep;
    const angle2 = startAngle + (i + 1) * angleStep;
    
    const x1 = x + radius * Math.cos(angle1);
    const y1 = y - radius * Math.sin(angle1);
    const x2 = x + radius * Math.cos(angle2);
    const y2 = y - radius * Math.sin(angle2);
    
    doc.line(x1, y1, x2, y2);
  }
}
