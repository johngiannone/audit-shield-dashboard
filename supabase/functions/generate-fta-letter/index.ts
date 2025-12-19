import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FTALetterRequest {
  userName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  ssnLast4: string;
  taxYear: string;
  penaltyAmount: number;
  noticeNumber: string;
  penaltyType: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(amount);
}

function generateLetterContent(data: FTALetterRequest): string {
  const currentDate = formatDate(new Date());
  const formattedPenalty = formatCurrency(data.penaltyAmount);
  
  return `
CERTIFIED MAIL - RETURN RECEIPT REQUESTED

${currentDate}

Internal Revenue Service
[IRS Service Center Address based on your location]
Attn: Penalty Abatement Request

Re: Request for First-Time Abatement (FTA) Under IRM 20.1.1.3.3.2.1
    Notice: ${data.noticeNumber}
    Tax Year: ${data.taxYear}
    SSN: XXX-XX-${data.ssnLast4}
    Taxpayer: ${data.userName}

Dear Sir or Madam:

I am writing to request an abatement of penalties assessed for Tax Year ${data.taxYear} pursuant to the IRS First-Time Abatement (FTA) administrative waiver under Internal Revenue Manual Section 20.1.1.3.3.2.1.

PENALTY INFORMATION:
- Notice Number: ${data.noticeNumber}
- Tax Year: ${data.taxYear}
- Penalty Type: ${data.penaltyType}
- Penalty Amount: ${formattedPenalty}

REQUEST FOR ABATEMENT:
I respectfully request that the IRS abate the ${data.penaltyType} penalty of ${formattedPenalty} assessed for Tax Year ${data.taxYear} based on my history of tax compliance.

QUALIFICATION FOR FIRST-TIME ABATEMENT:
I meet all requirements for the First-Time Abatement administrative waiver:

1. CLEAN COMPLIANCE HISTORY: I have not been assessed any penalties (except estimated tax penalties) for the 3 tax years prior to the tax year in which I received this penalty.

2. CURRENT FILING COMPLIANCE: I have filed all currently required returns or filed a valid extension of time to file.

3. PAYMENT COMPLIANCE: I have paid, or arranged to pay, any tax due.

LEGAL BASIS:
Under IRM 20.1.1.3.3.2.1, the IRS provides penalty relief to taxpayers who have a clean compliance history. This administrative waiver recognizes that taxpayers who have consistently complied with tax obligations should receive consideration for relief when facing penalties for the first time.

REQUEST:
Based on the above, I respectfully request that you:
1. Abate the ${data.penaltyType} penalty of ${formattedPenalty}
2. Abate any associated interest that accrued on the penalty amount
3. Adjust my account accordingly

Thank you for your consideration of this request. If you require any additional information, please contact me at the address above.

Sincerely,


_______________________________
${data.userName}
${data.address}
${data.city}, ${data.state} ${data.zip}

Date: ${currentDate}
`;
}

// Generate PDF using basic text formatting (no external library needed)
function generatePDFBytes(content: string): Uint8Array {
  // Create a simple PDF document manually
  const lines = content.split('\n');
  
  // PDF structure
  let pdf = '%PDF-1.4\n';
  let objects: string[] = [];
  let objectOffsets: number[] = [];
  
  // Object 1: Catalog
  objectOffsets.push(pdf.length);
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  
  // Object 2: Pages
  objectOffsets.push(0); // Will be set later
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  
  // Object 3: Page
  objectOffsets.push(0);
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n');
  
  // Build content stream
  let contentStream = 'BT\n/F1 10 Tf\n';
  let y = 750;
  const leftMargin = 72;
  const lineHeight = 12;
  
  for (const line of lines) {
    if (y < 50) {
      y = 750; // Simple page break handling (won't create new page in this simple version)
    }
    
    // Escape special PDF characters
    const escapedLine = line
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .trim();
    
    if (escapedLine.length > 0) {
      contentStream += `1 0 0 1 ${leftMargin} ${y} Tm\n(${escapedLine}) Tj\n`;
    }
    y -= lineHeight;
  }
  contentStream += 'ET';
  
  // Object 4: Content stream
  objectOffsets.push(0);
  objects.push(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`);
  
  // Object 5: Font
  objectOffsets.push(0);
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n');
  
  // Build PDF
  for (let i = 0; i < objects.length; i++) {
    objectOffsets[i] = pdf.length;
    pdf += objects[i];
  }
  
  // Cross-reference table
  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of objectOffsets) {
    pdf += offset.toString().padStart(10, '0') + ' 00000 n \n';
  }
  
  // Trailer
  pdf += 'trailer\n';
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF';
  
  return new TextEncoder().encode(pdf);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: FTALetterRequest = await req.json();
    
    // Validate required fields
    if (!data.userName || !data.taxYear || !data.penaltyAmount || !data.noticeNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userName, taxYear, penaltyAmount, noticeNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating FTA letter for ${data.userName}, Tax Year ${data.taxYear}`);

    // Generate letter content
    const letterContent = generateLetterContent(data);
    
    // Generate PDF bytes
    const pdfBytes = generatePDFBytes(letterContent);
    
    console.log(`Generated PDF with ${pdfBytes.length} bytes`);

    // Return PDF as downloadable file (convert Uint8Array to ReadableStream)
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(pdfBytes);
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="FTA_Request_${data.taxYear}_${data.noticeNumber}.pdf"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating FTA letter:', error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate letter' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
