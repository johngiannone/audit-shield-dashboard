import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FTAEmailRequest {
  recipientEmail: string;
  recipientName: string;
  taxpayerName: string;
  taxYear: string;
  penaltyAmount: number;
  penaltyType: string;
  noticeType: string;
  noticeDate: string;
  letterPdfBase64: string;
  sendToTaxPro?: boolean;
  taxProEmail?: string;
  taxProName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipientEmail,
      recipientName,
      taxpayerName,
      taxYear,
      penaltyAmount,
      penaltyType,
      noticeType,
      noticeDate,
      letterPdfBase64,
      sendToTaxPro,
      taxProEmail,
      taxProName
    }: FTAEmailRequest = await req.json();

    console.log("Sending FTA letter to:", recipientEmail);
    if (sendToTaxPro && taxProEmail) {
      console.log("Also sending to tax professional:", taxProEmail);
    }

    const formattedAmount = penaltyAmount.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    });

    // Email to taxpayer
    const taxpayerEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
            .highlight { background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6; }
            .steps { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .step { display: flex; margin-bottom: 12px; }
            .step-number { background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px; font-weight: bold; }
            h1 { margin: 0; font-size: 24px; }
            h2 { color: #1f2937; font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your FTA Request Letter is Ready</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">First-Time Penalty Abatement Request</p>
            </div>
            <div class="content">
              <p>Dear ${recipientName},</p>
              
              <p>Your First-Time Abatement (FTA) request letter has been generated and is attached to this email as a PDF.</p>
              
              <div class="highlight">
                <strong>Letter Details:</strong><br>
                Tax Year: ${taxYear}<br>
                Notice Type: ${noticeType}<br>
                Penalty Type: ${penaltyType}<br>
                Penalty Amount: ${formattedAmount}
              </div>
              
              <h2>Next Steps:</h2>
              <div class="steps">
                <div class="step">
                  <div class="step-number">1</div>
                  <div>Print the attached letter</div>
                </div>
                <div class="step">
                  <div class="step-number">2</div>
                  <div>Sign and date where indicated</div>
                </div>
                <div class="step">
                  <div class="step-number">3</div>
                  <div>Mail to the IRS address shown on your notice</div>
                </div>
                <div class="step">
                  <div class="step-number">4</div>
                  <div>Keep a copy for your records</div>
                </div>
                <div class="step">
                  <div class="step-number">5</div>
                  <div>Allow 30-60 days for IRS response</div>
                </div>
              </div>
              
              <p><strong>Important:</strong> This letter cites IRM 20.1.1.3.3.2.1, which establishes the First-Time Abatement administrative waiver. The IRS grants this waiver to taxpayers with a clean compliance history for the prior 3 tax years.</p>
              
              <p>Best regards,<br>Return Shield Team</p>
            </div>
            <div class="footer">
              This email was sent by Return Shield. Please do not reply directly to this email.<br>
              © ${new Date().getFullYear()} Return Shield. All rights reserved.
            </div>
          </div>
        </body>
      </html>
    `;

    const emails: Promise<any>[] = [];

    // Send to taxpayer
    emails.push(
      resend.emails.send({
        from: "Return Shield <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `Your FTA Request Letter for Tax Year ${taxYear}`,
        html: taxpayerEmailHtml,
        attachments: [
          {
            filename: `FTA_Request_${taxYear}_${taxpayerName.replace(/\s+/g, '_')}.pdf`,
            content: letterPdfBase64,
          }
        ]
      })
    );

    // Send to tax professional if requested
    if (sendToTaxPro && taxProEmail) {
      const taxProEmailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
              .highlight { background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6; }
              h1 { margin: 0; font-size: 24px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Client FTA Request Letter</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">First-Time Penalty Abatement Request</p>
              </div>
              <div class="content">
                <p>Dear ${taxProName || 'Tax Professional'},</p>
                
                <p>Your client <strong>${taxpayerName}</strong> has generated a First-Time Abatement (FTA) request letter using Return Shield. A copy is attached for your records.</p>
                
                <div class="highlight">
                  <strong>Client Information:</strong><br>
                  Client Name: ${taxpayerName}<br>
                  Tax Year: ${taxYear}<br>
                  Notice Type: ${noticeType} (dated ${noticeDate})<br>
                  Penalty Type: ${penaltyType}<br>
                  Penalty Amount: ${formattedAmount}
                </div>
                
                <p>The letter cites IRM 20.1.1.3.3.2.1 for First-Time Abatement eligibility. Your client has indicated they have a clean compliance history for the prior 3 tax years.</p>
                
                <p>Please review the attached letter and advise your client as needed.</p>
                
                <p>Best regards,<br>Return Shield Team</p>
              </div>
              <div class="footer">
                This email was sent by Return Shield on behalf of your client.<br>
                © ${new Date().getFullYear()} Return Shield. All rights reserved.
              </div>
            </div>
          </body>
        </html>
      `;

      emails.push(
        resend.emails.send({
          from: "Return Shield <onboarding@resend.dev>",
          to: [taxProEmail],
          subject: `Client FTA Request: ${taxpayerName} - Tax Year ${taxYear}`,
          html: taxProEmailHtml,
          attachments: [
            {
              filename: `FTA_Request_${taxYear}_${taxpayerName.replace(/\s+/g, '_')}.pdf`,
              content: letterPdfBase64,
            }
          ]
        })
      );
    }

    const results = await Promise.all(emails);
    console.log("Emails sent successfully:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: sendToTaxPro && taxProEmail 
          ? "Letter sent to you and your tax professional" 
          : "Letter sent successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending FTA letter:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
