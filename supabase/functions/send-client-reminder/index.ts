import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// CORS headers are now dynamic - see getCorsHeaders()

interface ReminderPayload {
  case_id: string;
  agent_profile_id: string;
  days_waiting: number;
}

const handler = async (req: Request): Promise<Response> => {
  const corsPreflightResponse = handleCorsPreflightIfNeeded(req);
  if (corsPreflightResponse) return corsPreflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { case_id, agent_profile_id, days_waiting }: ReminderPayload = await req.json();

    console.log("Processing reminder for case:", case_id, "days waiting:", days_waiting);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get case details
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from("cases")
      .select("notice_type, tax_year, client_id")
      .eq("id", case_id)
      .single();

    if (caseError || !caseData) {
      console.error("Failed to fetch case:", caseError);
      throw new Error("Case not found");
    }

    console.log("Case data:", caseData);

    // Get pending document requests for this case
    const { data: pendingRequests } = await supabaseAdmin
      .from("document_requests")
      .select("document_name")
      .eq("case_id", case_id)
      .eq("status", "pending");

    // Get client profile and email
    const { data: clientProfile, error: clientError } = await supabaseAdmin
      .from("profiles")
      .select("full_name, user_id")
      .eq("id", caseData.client_id)
      .single();

    if (clientError || !clientProfile) {
      console.error("Failed to fetch client profile:", clientError);
      throw new Error("Client profile not found");
    }

    // Get client email from auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      clientProfile.user_id
    );

    if (userError || !userData?.user?.email) {
      console.error("Failed to fetch client email:", userError);
      throw new Error("Client email not found");
    }

    const clientEmail = userData.user.email;
    const clientName = clientProfile.full_name || "Valued Client";

    console.log("Client:", clientName, clientEmail);

    // Get agent name
    const { data: agentProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", agent_profile_id)
      .single();

    const agentName = agentProfile?.full_name || "Your Agent";

    console.log("Agent:", agentName);

    // Build pending documents list
    const pendingDocsList = pendingRequests?.length 
      ? pendingRequests.map(r => `<li>${r.document_name}</li>`).join("")
      : "<li>Requested documents</li>";

    // Send reminder email
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Return Shield <onboarding@resend.dev>",
        to: [clientEmail],
        subject: `Reminder: Action Needed on Your ${caseData.notice_type} Case`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e3a5f;">Friendly Reminder</h2>
            <p>Hello ${clientName},</p>
            <p>This is a friendly reminder that your <strong>${caseData.notice_type}</strong> case (Tax Year ${caseData.tax_year}) is waiting on your response.</p>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404;"><strong>⏰ Your case has been waiting for ${days_waiting} days</strong></p>
            </div>

            <p>We still need the following from you:</p>
            <ul style="background-color: #f5f5f5; padding: 20px 20px 20px 40px; border-radius: 8px;">
              ${pendingDocsList}
            </ul>

            <p>Please log in to your account to upload the requested documents. Timely responses help us resolve your case faster!</p>
            
            <p style="margin-top: 30px;">Best regards,<br><strong>${agentName}</strong><br>Return Shield Team</p>
          </div>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Reminder email sent:", emailResult);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-client-reminder:", error);
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
