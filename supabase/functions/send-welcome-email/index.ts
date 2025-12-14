import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailPayload {
  profile_id: string;
  plan_level: string;
  tax_year: number;
}

const getPlanDetails = (planLevel: string) => {
  switch (planLevel.toLowerCase()) {
    case "silver":
      return {
        name: "Silver Shield",
        description: "Essential protection for your 2024 tax return",
        yearsProtected: ["2024"],
      };
    case "gold":
      return {
        name: "Gold Shield",
        description: "Complete peace of mind for all open tax years",
        yearsProtected: ["2021", "2022", "2023", "2024"],
      };
    case "platinum":
      return {
        name: "Platinum Business",
        description: "Full protection for freelancers, contractors & LLCs",
        yearsProtected: ["2021", "2022", "2023", "2024"],
      };
    default:
      return {
        name: "Return Shield Membership",
        description: "Audit defense protection",
        yearsProtected: ["2024"],
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profile_id, plan_level, tax_year }: WelcomeEmailPayload = await req.json();

    console.log("Processing welcome email for profile:", profile_id, "plan:", plan_level);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get profile details
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("full_name, user_id")
      .eq("id", profile_id)
      .single();

    if (profileError || !profile) {
      console.error("Failed to fetch profile:", profileError);
      throw new Error("Profile not found");
    }

    // Get user email from auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      profile.user_id
    );

    if (userError || !userData?.user?.email) {
      console.error("Failed to fetch user email:", userError);
      throw new Error("User email not found");
    }

    const userEmail = userData.user.email;
    const userName = profile.full_name || "Valued Member";
    const planDetails = getPlanDetails(plan_level);

    console.log("Sending welcome email to:", userName, userEmail);

    // Build years protected list
    const yearsHtml = planDetails.yearsProtected
      .map(year => `<li style="margin: 5px 0;">✓ Tax Year ${year}</li>`)
      .join("");

    // Send welcome email
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Return Shield <onboarding@resend.dev>",
        to: [userEmail],
        subject: `Welcome to Return Shield - Your ${planDetails.name} Membership is Active!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🛡️ Welcome to Return Shield</h1>
              <p style="color: #b8d4f0; margin: 10px 0 0 0; font-size: 16px;">${planDetails.name} Member</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
              <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                Hello ${userName},
              </p>
              
              <p style="font-size: 16px; line-height: 1.6; color: #555;">
                Congratulations! Your <strong>${planDetails.name}</strong> membership is now active. You're now protected with professional audit defense coverage.
              </p>
              
              <!-- Plan Details Box -->
              <div style="background-color: #f0f7ff; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1e3a5f;">
                <h3 style="color: #1e3a5f; margin: 0 0 15px 0;">Your Coverage Includes:</h3>
                <p style="margin: 0 0 10px 0; color: #555;">${planDetails.description}</p>
                <ul style="margin: 15px 0; padding-left: 20px; color: #333;">
                  ${yearsHtml}
                </ul>
              </div>
              
              <!-- Call to Action -->
              <div style="background-color: #fff8e6; padding: 25px; border-radius: 8px; margin: 25px 0; border: 1px solid #ffc107;">
                <h3 style="color: #856404; margin: 0 0 15px 0;">📁 Next Step: Upload Your Tax Returns</h3>
                <p style="margin: 0; color: #6b5a00; line-height: 1.6;">
                  For faster case resolution if you ever receive a notice, we recommend uploading copies of your protected tax returns now. This allows our Enrolled Agents to begin work immediately if the IRS contacts you.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://zpolliyfxojotuszomhj.lovableproject.com/dashboard" 
                   style="display: inline-block; background-color: #1e3a5f; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Go to My Dashboard
                </a>
              </div>
              
              <!-- What Happens Next -->
              <h3 style="color: #1e3a5f; margin: 30px 0 15px 0;">What Happens If You Get Audited?</h3>
              <ol style="color: #555; line-height: 1.8; padding-left: 20px;">
                <li><strong>Upload Your Notice</strong> – Snap a photo or upload the PDF of any IRS/State letter</li>
                <li><strong>AI Analysis</strong> – Our system extracts key details and assigns your case</li>
                <li><strong>Expert Defense</strong> – A dedicated Enrolled Agent handles everything for you</li>
              </ol>
              
              <p style="font-size: 16px; line-height: 1.6; color: #555; margin-top: 25px;">
                Remember: Your membership covers <strong>100% of professional defense fees</strong>. No hidden costs, no hourly rates, no surprises.
              </p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
              
              <p style="font-size: 16px; color: #333;">
                Thank you for trusting Return Shield with your tax protection.
              </p>
              
              <p style="font-size: 16px; color: #333; margin-bottom: 0;">
                Best regards,<br>
                <strong>The Return Shield Team</strong>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f5f5f5; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
              <p style="font-size: 12px; color: #888; margin: 0;">
                This email was sent by Return Shield. Questions? Reply to this email or log in to your dashboard.
              </p>
            </div>
          </div>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Welcome email sent:", emailResult);

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      throw new Error(emailResult.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email:", error);
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
