import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// CORS headers are now dynamic - see getCorsHeaders()

interface DocumentRejectionPayload {
  case_id: string;
  document_name: string;
  rejection_reason: string;
  agent_profile_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsPreflightResponse = handleCorsPreflightIfNeeded(req);
  if (corsPreflightResponse) return corsPreflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { case_id, document_name, rejection_reason, agent_profile_id }: DocumentRejectionPayload = await req.json();

    console.log("Processing document rejection notification for case:", case_id);

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

    // Get agent name
    const { data: agentProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", agent_profile_id)
      .single();

    const agentName = agentProfile?.full_name || "Your Agent";

    console.log("Sending rejection email to:", clientEmail);

    // Send email notification
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Return Shield <onboarding@resend.dev>",
        to: [clientEmail],
        subject: `Action Required: Please Re-upload ${document_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Document Needs Re-upload</h2>
            <p>Hello ${clientName},</p>
            <p>Your agent <strong>${agentName}</strong> has reviewed the document you uploaded and needs you to re-submit it.</p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p style="margin: 0 0 10px 0;"><strong>Document:</strong> ${document_name}</p>
              <p style="margin: 0 0 10px 0;"><strong>Case:</strong> ${caseData.notice_type} (${caseData.tax_year})</p>
              <p style="margin: 0;"><strong>Reason:</strong> ${rejection_reason}</p>
            </div>

            <p>Please log in to your account to upload a new version of this document.</p>
            
            <p style="margin-top: 30px;">Best regards,<br>The Return Shield Team</p>
          </div>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent:", emailResult);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-document-rejection:", error);
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
