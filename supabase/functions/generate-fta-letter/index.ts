import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  saveToDatabase?: boolean;
}

interface IRSServiceCenter {
  service_center_name: string;
  address_line_1: string;
  address_line_2: string;
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

function generateInstructionSheet(irsAddress: IRSServiceCenter, data: FTALetterRequest): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
              FIRST-TIME PENALTY ABATEMENT REQUEST
                     MAILING INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

Taxpayer: ${data.userName}
Tax Year: ${data.taxYear}
Notice #: ${data.noticeNumber}
Penalty:  ${formatCurrency(data.penaltyAmount)}

───────────────────────────────────────────────────────────────────────────────

STEP 1: SIGN THE LETTER
        Review the penalty abatement request letter on the following page(s).
        Sign and date the letter on the signature line.

───────────────────────────────────────────────────────────────────────────────

STEP 2: MAKE A COPY
        Make a copy of the signed letter for your records.

───────────────────────────────────────────────────────────────────────────────

STEP 3: MAIL VIA CERTIFIED MAIL (Return Receipt Requested)

        Mail your signed letter to:

        ┌─────────────────────────────────────────────────────────────────────┐
        │                                                                     │
        │     ${irsAddress.address_line_1.padEnd(50)}│
        │     ${irsAddress.address_line_2.padEnd(50)}│
        │     Attn: Penalty Abatement Request                                 │
        │                                                                     │
        └─────────────────────────────────────────────────────────────────────┘

        Based on your state (${data.state}), your request will be processed by
        the ${irsAddress.service_center_name}.

───────────────────────────────────────────────────────────────────────────────

STEP 4: KEEP YOUR RECEIPT
        Keep your Certified Mail receipt as proof of mailing.
        The receipt number can be used to track delivery at usps.com.

───────────────────────────────────────────────────────────────────────────────

IMPORTANT NOTES:

  • Do NOT include payment with this request unless you owe additional tax.
  
  • The IRS typically responds within 30-60 days.
  
  • If approved, any penalty amount already paid will be refunded or credited.
  
  • If denied, you may still have other options including Reasonable Cause.

═══════════════════════════════════════════════════════════════════════════════
                         (Letter begins on next page)
═══════════════════════════════════════════════════════════════════════════════
`;
}

function generateLetterContent(data: FTALetterRequest, irsAddress: IRSServiceCenter): string {
  const currentDate = formatDate(new Date());
  const formattedPenalty = formatCurrency(data.penaltyAmount);
  
  // Remove redundant "penalty" if penaltyType already contains it
  const penaltyTypeFormatted = data.penaltyType.toLowerCase().includes('penalty') 
    ? data.penaltyType 
    : `${data.penaltyType} penalty`;
  
  // For inline references, avoid "penalty penalty"
  const penaltyTypeClean = data.penaltyType.toLowerCase().includes('penalty')
    ? data.penaltyType
    : data.penaltyType;
  
  return `
${data.userName}
${data.address}
${data.city}, ${data.state} ${data.zip}

${currentDate}

CERTIFIED MAIL - RETURN RECEIPT REQUESTED

${irsAddress.address_line_1}
${irsAddress.address_line_2}
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
I respectfully request that the IRS abate the ${penaltyTypeClean} of ${formattedPenalty} assessed for Tax Year ${data.taxYear} based on my history of tax compliance. I also request the abatement of any associated interest.

QUALIFICATION FOR FIRST-TIME ABATEMENT:
I meet all requirements for the First-Time Abatement administrative waiver:

1. CLEAN COMPLIANCE HISTORY: I have not been assessed any penalties (except estimated tax penalties) for the 3 tax years prior to the tax year in which I received this penalty.

2. CURRENT FILING COMPLIANCE: I have filed all currently required returns or filed a valid extension of time to file.

3. PAYMENT COMPLIANCE: I have paid, or arranged to pay, any tax due.

LEGAL BASIS:
Under IRM 20.1.1.3.3.2.1, the IRS provides penalty relief to taxpayers who have a clean compliance history. This administrative waiver recognizes that taxpayers who have consistently complied with tax obligations should receive consideration for relief when facing penalties for the first time.

REQUEST:
Based on the above, I respectfully request that you:
1. Abate the ${penaltyTypeClean} of ${formattedPenalty}
2. Abate any associated interest that accrued on the penalty amount
3. Adjust my account accordingly

Thank you for your consideration of this request. If you require any additional information, please contact me at the address above.

Sincerely,



_______________________________
${data.userName}

Date: ${currentDate}
`;
}

// Generate multi-page PDF with proper margins and page numbers
function generatePDFBytes(instructionSheet: string, letterContent: string): Uint8Array {
  const page1Lines = instructionSheet.split('\n');
  const page2Lines = letterContent.split('\n');
  
  // PDF structure
  let pdf = '%PDF-1.4\n';
  let objects: string[] = [];
  let objectOffsets: number[] = [];
  
  // Standard letter margins: 1 inch = 72 points
  const leftMargin = 72;
  const rightMargin = 72;
  const topMargin = 72;
  const bottomMargin = 72;
  const pageWidth = 612; // Letter size
  const pageHeight = 792;
  const usableWidth = pageWidth - leftMargin - rightMargin; // 468 points
  
  // Helper to wrap text to fit within margins
  function wrapText(text: string, maxCharsPerLine: number): string[] {
    if (text.length <= maxCharsPerLine) return [text];
    
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }
  
  // Helper to build content stream for a page with page number
  function buildContentStream(
    lines: string[], 
    fontSize: number, 
    lineSpacing: number,
    maxCharsPerLine: number,
    pageNumber: number,
    totalPages: number
  ): string {
    let contentStream = `BT\n/F1 ${fontSize} Tf\n`;
    let y = pageHeight - topMargin; // Start from top margin
    const lineHeight = fontSize + lineSpacing;
    
    for (const line of lines) {
      if (y < bottomMargin + 30) break; // Leave room for page number
      
      // Wrap long lines
      const wrappedLines = wrapText(line, maxCharsPerLine);
      
      for (const wrappedLine of wrappedLines) {
        if (y < bottomMargin + 30) break;
        
        const escapedLine = wrappedLine
          .replace(/\\/g, '\\\\')
          .replace(/\(/g, '\\(')
          .replace(/\)/g, '\\)');
        
        contentStream += `1 0 0 1 ${leftMargin} ${y} Tm\n(${escapedLine}) Tj\n`;
        y -= lineHeight;
      }
    }
    
    // Add page number at bottom center
    const pageNumberText = `Page ${pageNumber} of ${totalPages}`;
    const pageNumberX = (pageWidth - (pageNumberText.length * 5)) / 2; // Approximate centering
    contentStream += `/F1 9 Tf\n`;
    contentStream += `1 0 0 1 ${pageNumberX} ${bottomMargin - 10} Tm\n(${pageNumberText}) Tj\n`;
    
    contentStream += 'ET';
    return contentStream;
  }
  
  const totalPages = 2;
  
  // Build content streams with improved line spacing
  // Page 1: Instruction sheet - tighter spacing for dense content
  const page1Content = buildContentStream(page1Lines, 9, 3, 78, 1, totalPages);
  // Page 2: Letter - more generous spacing for readability
  const page2Content = buildContentStream(page2Lines, 11, 6, 68, 2, totalPages);
  
  // Object 1: Catalog
  objectOffsets.push(0);
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  
  // Object 2: Pages (now with 2 pages)
  objectOffsets.push(0);
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>\nendobj\n');
  
  // Object 3: Page 1 (Instruction Sheet)
  objectOffsets.push(0);
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n');
  
  // Object 4: Page 1 Content stream
  objectOffsets.push(0);
  objects.push(`4 0 obj\n<< /Length ${page1Content.length} >>\nstream\n${page1Content}\nendstream\nendobj\n`);
  
  // Object 5: Font (Helvetica for cleaner look)
  objectOffsets.push(0);
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  
  // Object 6: Page 2 (FTA Letter)
  objectOffsets.push(0);
  objects.push('6 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 7 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n');
  
  // Object 7: Page 2 Content stream
  objectOffsets.push(0);
  objects.push(`7 0 obj\n<< /Length ${page2Content.length} >>\nstream\n${page2Content}\nendstream\nendobj\n`);
  
  // Build PDF with object offsets
  let currentOffset = pdf.length;
  for (let i = 0; i < objects.length; i++) {
    objectOffsets[i] = currentOffset;
    pdf += objects[i];
    currentOffset = pdf.length;
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

async function getIRSServiceCenter(state: string): Promise<IRSServiceCenter> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from('irs_service_centers')
    .select('service_center_name, address_line_1, address_line_2')
    .eq('state_code', state.toUpperCase())
    .eq('submission_type', 'penalty_abatement')
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching IRS service center:', error);
  }
  
  // Default to Ogden if state not found
  if (!data) {
    console.log(`No IRS service center found for state ${state}, using Ogden default`);
    return {
      service_center_name: 'Ogden Service Center',
      address_line_1: 'Internal Revenue Service',
      address_line_2: 'Ogden, UT 84201-0045'
    };
  }
  
  return data;
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

    console.log(`Generating FTA letter for ${data.userName}, Tax Year ${data.taxYear}, State: ${data.state}`);

    // Lookup IRS service center based on state
    const irsAddress = await getIRSServiceCenter(data.state || 'CA');
    console.log(`Using IRS Service Center: ${irsAddress.service_center_name}`);

    // Generate instruction sheet (page 1)
    const instructionSheet = generateInstructionSheet(irsAddress, data);
    
    // Generate letter content (page 2+)
    const letterContent = generateLetterContent(data, irsAddress);
    
    // Generate multi-page PDF
    const pdfBytes = generatePDFBytes(instructionSheet, letterContent);
    
    console.log(`Generated 2-page PDF with ${pdfBytes.length} bytes`);

    // Save to database if requested and user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (data.saveToDatabase && authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        
        // Create admin client for storage operations
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        // Create user client to get the user
        const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
          global: { headers: { Authorization: authHeader } }
        });
        
        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        
        if (user && !userError) {
          // Get profile_id for the user
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();
          
          if (profile) {
            const fileName = `${user.id}/${Date.now()}_FTA_${data.taxYear}_${data.noticeNumber}.pdf`;
            
            // Upload PDF to storage
            const { error: uploadError } = await supabaseAdmin.storage
              .from('fta-letters')
              .upload(fileName, pdfBytes, {
                contentType: 'application/pdf',
                upsert: false
              });
            
            if (!uploadError) {
              // Save record to database
              await supabaseAdmin.from('fta_letters').insert({
                profile_id: profile.id,
                tax_year: parseInt(data.taxYear),
                penalty_amount: data.penaltyAmount,
                notice_number: data.noticeNumber,
                taxpayer_name: data.userName,
                file_path: fileName
              });
              
              console.log(`Saved FTA letter to database for user ${user.id}`);
            } else {
              console.error('Storage upload error:', uploadError);
            }
          }
        }
      } catch (saveError) {
        // Don't fail the request if saving fails, just log it
        console.error('Error saving to database:', saveError);
      }
    }

    // Return PDF as downloadable file
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
