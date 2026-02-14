import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// CORS headers are now dynamic - see getCorsHeaders()

interface StatusUpdateRequest {
  case_id: string;
  new_status: string;
  agent_profile_id: string;
}

const STATUS_LABELS: Record<string, string> = {
  triage: "Triage",
  agent_action: "Agent Action",
  client_action: "Client Action",
  resolved: "Resolved",
};

const STATUS_MESSAGES: Record<string, { subject: string; body: string }> = {
  agent_action: {
    subject: "Your Case is Being Reviewed",
    body: "Your case is now actively being reviewed by your assigned Enrolled Agent. We are working on analyzing your notice and preparing the best course of action.",
  },
  client_action: {
    subject: "Action Required: Additional Information Needed",
    body: "We need additional information from you to proceed with your case. Please log in to your dashboard to view the requested documents and upload them as soon as possible.",
  },
  resolved: {
    subject: "Your Case Has Been Resolved",
    body: "Great news! Your case has been successfully resolved. Please log in to your dashboard to view the resolution details and any final documentation.",
  },
};

serve(async (req: Request): Promise<Response> => {
  const corsPreflightResponse = handleCorsPreflightIfNeeded(req);
  if (corsPreflightResponse) return corsPreflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { case_id, new_status, agent_profile_id }: StatusUpdateRequest = await req.json();
    
    console.log("Processing status update email for case:", case_id, "new status:", new_status);

    // Only send emails for specific status changes
    if (!STATUS_MESSAGES[new_status]) {
      console.log("No email template for status:", new_status);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

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

    // Fetch client profile
    const { data: clientProfile, error: clientError } = await supabase
      .from("profiles")
      .select("full_name, user_id")
      .eq("id", caseData.client_id)
      .single();

    if (clientError || !clientProfile) {
      console.error("Error fetching client profile:", clientError);
      throw new Error("Client profile not found");
    }

    // Fetch client's email
    const { data: { user: clientUser }, error: clientUserError } = await supabase.auth.admin.getUserById(
      clientProfile.user_id
    );

    if (clientUserError || !clientUser?.email) {
      console.error("Error fetching client user:", clientUserError);
      throw new Error("Client email not found");
    }

    // Fetch agent profile
    const { data: agentProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", agent_profile_id)
      .single();

    const clientName = clientProfile.full_name || "Valued Client";
    const agentName = agentProfile?.full_name || "Your Enrolled Agent";
    const statusInfo = STATUS_MESSAGES[new_status];

    const emailResponse = await resend.emails.send({
      from: "Return Shield <onboarding@resend.dev>",
      to: [clientUser.email],
      subject: `${statusInfo.subject}: ${caseData.notice_type}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1e3a5f; margin-bottom: 20px;">Case Status Update</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Hello ${clientName},
          </p>
          
          <div style="margin: 20px 0; padding: 15px; background-color: ${new_status === 'resolved' ? '#e8f5e9' : new_status === 'pending_info' ? '#fff3e0' : '#e3f2fd'}; border-radius: 8px; border-left: 4px solid ${new_status === 'resolved' ? '#4caf50' : new_status === 'pending_info' ? '#ff9800' : '#2196f3'};">
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #333;">
              Status: ${STATUS_LABELS[new_status] || new_status}
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            ${statusInfo.body}
          </p>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f5f7fa; border-radius: 8px;">
            <h3 style="color: #1e3a5f; margin-top: 0;">Case Details</h3>
            <p style="margin: 5px 0;"><strong>Notice Type:</strong> ${caseData.notice_type}</p>
            <p style="margin: 5px 0;"><strong>Tax Year:</strong> ${caseData.tax_year}</p>
            <p style="margin: 5px 0;"><strong>Current Status:</strong> ${STATUS_LABELS[new_status] || new_status}</p>
            <p style="margin: 5px 0;"><strong>Your Agent:</strong> ${agentName}</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Best regards,<br>
            <strong>${agentName}</strong><br>
            Enrolled Agent
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
          
          <p style="font-size: 12px; color: #888;">
            This email was sent by Return Shield. Please do not reply directly to this email.
          </p>
        </div>
      `,
    });

    console.log("Status update email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-status-update function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
