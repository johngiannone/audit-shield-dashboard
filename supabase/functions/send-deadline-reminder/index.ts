import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

// CORS headers are now dynamic - see getCorsHeaders()

serve(async (req) => {
  const corsPreflightResponse = handleCorsPreflightIfNeeded(req);
  if (corsPreflightResponse) return corsPreflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate the date 3 days from now
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    const targetDate = threeDaysFromNow.toISOString().split('T')[0];

    console.log(`Checking for cases with deadline on: ${targetDate}`);

    // Find cases with response_due_date = 3 days from now and not resolved
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select(`
        id,
        notice_type,
        tax_year,
        response_due_date,
        status,
        client_id,
        assigned_agent_id
      `)
      .eq('response_due_date', targetDate)
      .neq('status', 'resolved');

    if (casesError) {
      console.error('Error fetching cases:', casesError);
      throw casesError;
    }

    console.log(`Found ${cases?.length || 0} cases with upcoming deadlines`);

    if (!cases || cases.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No cases with upcoming deadlines', emailsSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailsSent = 0;

    for (const caseItem of cases) {
      // Get client profile
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', caseItem.client_id)
        .single();

      // Get agent profile if assigned
      let agentProfile = null;
      if (caseItem.assigned_agent_id) {
        const { data: agent } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', caseItem.assigned_agent_id)
          .single();
        agentProfile = agent;
      }

      const formattedDueDate = new Date(caseItem.response_due_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Send email to client
      if (clientProfile?.email) {
        const clientEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Urgent: Response Due Soon</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${clientProfile.full_name || 'there'},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Your <strong>${caseItem.notice_type}</strong> case for Tax Year <strong>${caseItem.tax_year}</strong> has a response deadline in <strong style="color: #dc2626;">3 days</strong>.
              </p>
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #991b1b; font-size: 18px; font-weight: bold; margin: 0;">
                  📅 Response Due: ${formattedDueDate}
                </p>
              </div>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Please log in to your Return Shield portal to review your case and ensure all required documents have been submitted.
              </p>
              ${agentProfile ? `
                <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                  Your assigned agent, ${agentProfile.full_name}, is working on your case.
                </p>
              ` : ''}
              <div style="text-align: center; margin-top: 30px;">
                <a href="${SUPABASE_URL.replace('.supabase.co', '.lovable.app')}/cases/${caseItem.id}" 
                   style="background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  View Your Case
                </a>
              </div>
            </div>
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p>Return Shield - Professional Audit Defense</p>
            </div>
          </div>
        `;

        const clientEmailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Return Shield <onboarding@resend.dev>',
            to: [clientProfile.email],
            subject: `⚠️ Urgent: Response Due in 3 Days - ${caseItem.notice_type}`,
            html: clientEmailHtml,
          }),
        });

        if (clientEmailRes.ok) {
          emailsSent++;
          console.log(`Sent deadline reminder to client: ${clientProfile.email}`);
        } else {
          const errorText = await clientEmailRes.text();
          console.error(`Failed to send email to client: ${errorText}`);
        }
      }

      // Send email to agent
      if (agentProfile?.email) {
        const agentEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Case Deadline Approaching</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${agentProfile.full_name || 'Agent'},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                A case assigned to you has a response deadline in <strong style="color: #dc2626;">3 days</strong>.
              </p>
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Client:</strong> ${clientProfile?.full_name || 'Unknown'}</p>
                <p style="margin: 5px 0;"><strong>Notice Type:</strong> ${caseItem.notice_type}</p>
                <p style="margin: 5px 0;"><strong>Tax Year:</strong> ${caseItem.tax_year}</p>
                <p style="margin: 5px 0; color: #dc2626;"><strong>Due Date:</strong> ${formattedDueDate}</p>
              </div>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Please ensure the response is prepared and submitted before the deadline.
              </p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${SUPABASE_URL.replace('.supabase.co', '.lovable.app')}/agent/cases/${caseItem.id}" 
                   style="background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  View Case Details
                </a>
              </div>
            </div>
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p>Return Shield Agent Portal</p>
            </div>
          </div>
        `;

        const agentEmailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Return Shield <onboarding@resend.dev>',
            to: [agentProfile.email],
            subject: `⚠️ Case Deadline in 3 Days - ${clientProfile?.full_name || 'Client'} - ${caseItem.notice_type}`,
            html: agentEmailHtml,
          }),
        });

        if (agentEmailRes.ok) {
          emailsSent++;
          console.log(`Sent deadline reminder to agent: ${agentProfile.email}`);
        } else {
          const errorText = await agentEmailRes.text();
          console.error(`Failed to send email to agent: ${errorText}`);
        }
      }
    }

    console.log(`Total emails sent: ${emailsSent}`);

    return new Response(
      JSON.stringify({ 
        message: 'Deadline reminders processed', 
        casesProcessed: cases.length,
        emailsSent 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-deadline-reminder function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
