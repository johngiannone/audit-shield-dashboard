import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentRequestPayload {
  case_id: string;
  document_name: string;
  description?: string;
  agent_profile_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { case_id, document_name, description, agent_profile_id }: DocumentRequestPayload = await req.json();

    console.log("Processing document request notification for case:", case_id);

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

    // Send email notification using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Audit Defense <onboarding@resend.dev>",
        to: [clientEmail],
        subject: `Document Request for Your ${caseData.notice_type} Case`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e3a5f;">Document Request</h2>
            <p>Hello ${clientName},</p>
            <p>Your agent <strong>${agentName}</strong> has requested a document for your case:</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Case:</strong> ${caseData.notice_type} (${caseData.tax_year})</p>
              <p style="margin: 0 0 10px 0;"><strong>Document Needed:</strong> ${document_name}</p>
              ${description ? `<p style="margin: 0;"><strong>Details:</strong> ${description}</p>` : ""}
            </div>

            <p>Please log in to your account to upload this document at your earliest convenience.</p>
            
            <p style="margin-top: 30px;">Best regards,<br>The Audit Defense Team</p>
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
    console.error("Error in send-document-request:", error);
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
