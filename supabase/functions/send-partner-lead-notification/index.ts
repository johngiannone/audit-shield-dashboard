import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// CORS headers are now dynamic - see getCorsHeaders()

interface PartnerLeadRequest {
  firmName: string;
  contactPerson: string;
  email: string;
  annualReturns: string;
  taxSoftware: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsPreflightResponse = handleCorsPreflightIfNeeded(req);
  if (corsPreflightResponse) return corsPreflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { firmName, contactPerson, email, annualReturns, taxSoftware }: PartnerLeadRequest = await req.json();

    console.log("[PARTNER-LEAD] New application received:", { firmName, contactPerson, email });

    // Send notification email to admin
    const emailResponse = await resend.emails.send({
      from: "Return Shield <onboarding@resend.dev>",
      to: ["admin@returnshield.com"], // Update with actual admin email
      subject: `New Partner Application: ${firmName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; }
            .field { margin-bottom: 20px; }
            .label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
            .value { font-size: 16px; color: #1e3a5f; }
            .highlight { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #d4af37; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">🤝 New Partner Application</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">A tax professional has applied to join the partner program</p>
            </div>
            <div class="content">
              <div class="highlight">
                <div class="field">
                  <div class="label">Firm Name</div>
                  <div class="value" style="font-size: 20px; font-weight: 600;">${firmName}</div>
                </div>
              </div>
              
              <div class="field" style="margin-top: 25px;">
                <div class="label">Contact Person</div>
                <div class="value">${contactPerson}</div>
              </div>
              
              <div class="field">
                <div class="label">Email Address</div>
                <div class="value"><a href="mailto:${email}" style="color: #2d5a87;">${email}</a></div>
              </div>
              
              <div class="field">
                <div class="label">Approximate Annual Returns</div>
                <div class="value">${annualReturns}</div>
              </div>
              
              <div class="field">
                <div class="label">Tax Software Used</div>
                <div class="value">${taxSoftware}</div>
              </div>
              
              <hr style="margin: 25px 0; border: none; border-top: 1px solid #e0e0e0;">
              
              <p style="font-size: 14px; color: #666;">
                This application was submitted on ${new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("[PARTNER-LEAD] Admin notification sent:", emailResponse);

    // Send confirmation email to applicant
    await resend.emails.send({
      from: "Return Shield <onboarding@resend.dev>",
      to: [email],
      subject: "We received your partner application!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🛡️ Return Shield</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Partner Program</p>
            </div>
            <div class="content">
              <h2 style="color: #1e3a5f; margin-top: 0;">Thank you for your interest, ${contactPerson}!</h2>
              
              <p>We've received your partner application for <strong>${firmName}</strong> and are excited about the possibility of working together.</p>
              
              <p>Here's what happens next:</p>
              <ol>
                <li><strong>Review</strong> – Our partnerships team will review your application within 1-2 business days.</li>
                <li><strong>Call</strong> – We'll schedule a brief call to discuss the program and answer any questions.</li>
                <li><strong>Onboarding</strong> – Once approved, you'll receive access to our partner portal and marketing materials.</li>
              </ol>
              
              <p>In the meantime, if you have any questions, feel free to reply to this email.</p>
              
              <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>The Return Shield Team</strong>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("[PARTNER-LEAD] Confirmation email sent to applicant");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[PARTNER-LEAD] Error:", error);
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
