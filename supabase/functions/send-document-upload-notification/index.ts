import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentUploadPayload {
  case_id: string;
  document_name: string;
  client_profile_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { case_id, document_name, client_profile_id }: DocumentUploadPayload = await req.json();

    console.log("Processing document upload notification for case:", case_id);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get case details including assigned agent
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from("cases")
      .select("notice_type, tax_year, assigned_agent_id")
      .eq("id", case_id)
      .single();

    if (caseError || !caseData) {
      console.error("Failed to fetch case:", caseError);
      throw new Error("Case not found");
    }

    if (!caseData.assigned_agent_id) {
      console.log("No agent assigned to this case, skipping notification");
      return new Response(JSON.stringify({ success: true, message: "No agent assigned" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Case data:", caseData);

    // Get client profile name
    const { data: clientProfile, error: clientError } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", client_profile_id)
      .single();

    if (clientError) {
      console.error("Failed to fetch client profile:", clientError);
    }

    const clientName = clientProfile?.full_name || "A client";

    // Get agent profile and email
    const { data: agentProfile, error: agentError } = await supabaseAdmin
      .from("profiles")
      .select("full_name, user_id")
      .eq("id", caseData.assigned_agent_id)
      .single();

    if (agentError || !agentProfile) {
      console.error("Failed to fetch agent profile:", agentError);
      throw new Error("Agent profile not found");
    }

    // Get agent email from auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      agentProfile.user_id
    );

    if (userError || !userData?.user?.email) {
      console.error("Failed to fetch agent email:", userError);
      throw new Error("Agent email not found");
    }

    const agentEmail = userData.user.email;
    const agentName = agentProfile.full_name || "Agent";

    console.log("Agent:", agentName, agentEmail);

    // Send email notification using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Audit Defense <onboarding@resend.dev>",
        to: [agentEmail],
        subject: `Document Uploaded: ${document_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e3a5f;">Document Uploaded</h2>
            <p>Hello ${agentName},</p>
            <p>Your client <strong>${clientName}</strong> has uploaded a document for their case:</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Case:</strong> ${caseData.notice_type} (${caseData.tax_year})</p>
              <p style="margin: 0;"><strong>Document:</strong> ${document_name}</p>
            </div>

            <p>Please log in to your dashboard to review the document.</p>
            
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
    console.error("Error in send-document-upload-notification:", error);
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
