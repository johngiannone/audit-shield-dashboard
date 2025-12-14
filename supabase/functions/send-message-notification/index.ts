import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MessageNotificationRequest {
  case_id: string;
  sender_profile_id: string;
  message_preview: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { case_id, sender_profile_id, message_preview }: MessageNotificationRequest = await req.json();
    
    console.log("Processing message notification for case:", case_id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch case details
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("notice_type, tax_year, client_id, assigned_agent_id")
      .eq("id", case_id)
      .single();

    if (caseError || !caseData) {
      console.error("Error fetching case:", caseError);
      throw new Error("Case not found");
    }

    // Fetch sender profile
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", sender_profile_id)
      .single();

    const senderName = senderProfile?.full_name || "Someone";

    // Determine recipient (the other party)
    const recipientProfileId = sender_profile_id === caseData.client_id 
      ? caseData.assigned_agent_id 
      : caseData.client_id;

    if (!recipientProfileId) {
      console.log("No recipient to notify (case may not be assigned yet)");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch recipient profile and email
    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("full_name, user_id")
      .eq("id", recipientProfileId)
      .single();

    if (!recipientProfile) {
      throw new Error("Recipient profile not found");
    }

    const { data: { user: recipientUser } } = await supabase.auth.admin.getUserById(
      recipientProfile.user_id
    );

    if (!recipientUser?.email) {
      throw new Error("Recipient email not found");
    }

    const recipientName = recipientProfile.full_name || "there";
    const isRecipientAgent = recipientProfileId === caseData.assigned_agent_id;

    // Truncate message preview
    const truncatedMessage = message_preview.length > 150 
      ? message_preview.substring(0, 150) + "..." 
      : message_preview;

    const emailResponse = await resend.emails.send({
      from: "Audit Defense <onboarding@resend.dev>",
      to: [recipientUser.email],
      subject: `New Message: ${caseData.notice_type} Case`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1e3a5f; margin-bottom: 20px;">New Message Received</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Hello ${recipientName},
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            You have received a new message from <strong>${senderName}</strong> regarding your 
            <strong>${caseData.notice_type}</strong> case (Tax Year ${caseData.tax_year}).
          </p>
          
          <div style="margin: 25px 0; padding: 20px; background-color: #f5f7fa; border-radius: 8px; border-left: 4px solid #1e3a5f;">
            <p style="margin: 0; font-style: italic; color: #555;">
              "${truncatedMessage}"
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Please log in to your dashboard to view the full message and respond.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Best regards,<br>
            <strong>Audit Defense Team</strong>
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
          
          <p style="font-size: 12px; color: #888;">
            This is an automated notification. Please do not reply directly to this email.
          </p>
        </div>
      `,
    });

    console.log("Message notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-message-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
