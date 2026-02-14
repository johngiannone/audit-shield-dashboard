import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// CORS headers are now dynamic - see getCorsHeaders()

interface PartnerInvitePayload {
  emails: string[];
  inviter_name: string;
  referral_code: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsPreflightResponse = handleCorsPreflightIfNeeded(req);
  if (corsPreflightResponse) return corsPreflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { emails, inviter_name, referral_code }: PartnerInvitePayload = await req.json();

    console.log("Processing partner invites from:", inviter_name, "to", emails.length, "recipients");

    if (!emails || emails.length === 0) {
      throw new Error("No email addresses provided");
    }

    if (emails.length > 20) {
      throw new Error("Maximum 20 invites per request");
    }

    // Build the referral link
    const baseUrl = "https://returnshield.com";
    const referralLink = `${baseUrl}/auth?ref=${referral_code}`;

    const results: { email: string; success: boolean; error?: string }[] = [];

    // Send invites to each email
    for (const email of emails) {
      const trimmedEmail = email.trim().toLowerCase();
      
      // Basic email validation
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        results.push({ email: trimmedEmail, success: false, error: "Invalid email format" });
        continue;
      }

      try {
        console.log("Sending invite to:", trimmedEmail);

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Return Shield <onboarding@resend.dev>",
            to: [trimmedEmail],
            subject: `${inviter_name} has invited you to join the Return Shield network`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🛡️ You're Invited!</h1>
                  <p style="color: #b8d4f0; margin: 10px 0 0 0; font-size: 16px;">Join the Return Shield Network</p>
                </div>
                
                <!-- Main Content -->
                <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
                  <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                    Hello,
                  </p>
                  
                  <p style="font-size: 16px; line-height: 1.6; color: #555;">
                    <strong>${inviter_name}</strong> has invited you to join the Return Shield network – a community of tax professionals offering premium audit defense services to their clients.
                  </p>
                  
                  <!-- Benefits Box -->
                  <div style="background-color: #f0f7ff; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1e3a5f;">
                    <h3 style="color: #1e3a5f; margin: 0 0 15px 0;">Why Join Return Shield?</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #333; line-height: 1.8;">
                      <li>Earn revenue by offering audit protection to your clients</li>
                      <li>Our Enrolled Agents handle all IRS/State correspondence</li>
                      <li>Build client loyalty with year-round protection</li>
                      <li>No extra work for your staff – we handle everything</li>
                    </ul>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${referralLink}" 
                       style="display: inline-block; background-color: #1e3a5f; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Join the Network
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; line-height: 1.6; color: #888; text-align: center;">
                    Or copy this link: <br>
                    <a href="${referralLink}" style="color: #1e3a5f;">${referralLink}</a>
                  </p>
                  
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
                  
                  <p style="font-size: 16px; color: #333; margin-bottom: 0;">
                    Best regards,<br>
                    <strong>The Return Shield Team</strong>
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f5f5f5; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
                  <p style="font-size: 12px; color: #888; margin: 0;">
                    You received this email because ${inviter_name} thought you'd be interested in Return Shield.
                  </p>
                </div>
              </div>
            `,
          }),
        });

        const emailResult = await emailResponse.json();

        if (!emailResponse.ok) {
          console.error("Resend API error for", trimmedEmail, ":", emailResult);
          results.push({ email: trimmedEmail, success: false, error: emailResult.message || "Failed to send" });
        } else {
          console.log("Invite sent successfully to:", trimmedEmail);
          results.push({ email: trimmedEmail, success: true });
        }
      } catch (emailError: any) {
        console.error("Error sending to", trimmedEmail, ":", emailError);
        results.push({ email: trimmedEmail, success: false, error: emailError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log("Invites complete:", successCount, "sent,", failCount, "failed");

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successCount,
      failed: failCount,
      results 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-partner-invites:", error);
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
