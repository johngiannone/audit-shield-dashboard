import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IntroEmailRequest {
  case_id: string;
  agent_profile_id: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { case_id, agent_profile_id }: IntroEmailRequest = await req.json();
    
    console.log("Processing intro email for case:", case_id, "agent:", agent_profile_id);

    // Create Supabase client with service role for fetching user data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch case details
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("notice_type, tax_year, client_id")
      .eq("id", case_id)
      .single();

    if (caseError || !caseData) {
      console.error("Error fetching case:", caseError);
      throw new Error("Case not found");
    }

    console.log("Case data:", caseData);

    // Fetch client profile and email
    const { data: clientProfile, error: clientError } = await supabase
      .from("profiles")
      .select("full_name, user_id")
      .eq("id", caseData.client_id)
      .single();

    if (clientError || !clientProfile) {
      console.error("Error fetching client profile:", clientError);
      throw new Error("Client profile not found");
    }

    // Fetch client's email from auth.users
    const { data: { user: clientUser }, error: clientUserError } = await supabase.auth.admin.getUserById(
      clientProfile.user_id
    );

    if (clientUserError || !clientUser) {
      console.error("Error fetching client user:", clientUserError);
      throw new Error("Client user not found");
    }

    console.log("Client:", clientProfile.full_name, clientUser.email);

    // Fetch agent profile
    const { data: agentProfile, error: agentError } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", agent_profile_id)
      .single();

    if (agentError || !agentProfile) {
      console.error("Error fetching agent profile:", agentError);
      throw new Error("Agent profile not found");
    }

    console.log("Agent:", agentProfile.full_name);

    const clientName = clientProfile.full_name || "Valued Client";
    const agentName = agentProfile.full_name || "Your Enrolled Agent";
    const clientEmail = clientUser.email;

    if (!clientEmail) {
      throw new Error("Client email not available");
    }

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "Audit Defense <onboarding@resend.dev>",
      to: [clientEmail],
      subject: `Case Assigned: ${caseData.notice_type}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1e3a5f; margin-bottom: 20px;">Your Case Has Been Assigned</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Hello ${clientName},
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            I am <strong>${agentName}</strong>, your dedicated Enrolled Agent. I have reviewed your notice 
            regarding the <strong>${caseData.tax_year}</strong> tax year.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Please log in to your dashboard to provide the following missing information and to track 
            the progress of your case.
          </p>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f5f7fa; border-radius: 8px;">
            <h3 style="color: #1e3a5f; margin-top: 0;">Case Details</h3>
            <p style="margin: 5px 0;"><strong>Notice Type:</strong> ${caseData.notice_type}</p>
            <p style="margin: 5px 0;"><strong>Tax Year:</strong> ${caseData.tax_year}</p>
            <p style="margin: 5px 0;"><strong>Assigned Agent:</strong> ${agentName}</p>
            ${agentProfile.phone ? `<p style="margin: 5px 0;"><strong>Agent Phone:</strong> ${agentProfile.phone}</p>` : ''}
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            If you have any questions, please don't hesitate to reach out.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Best regards,<br>
            <strong>${agentName}</strong><br>
            Enrolled Agent
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
          
          <p style="font-size: 12px; color: #888;">
            This email was sent by Audit Defense. Please do not reply directly to this email.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-intro-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
