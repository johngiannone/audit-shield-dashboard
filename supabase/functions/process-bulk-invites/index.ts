import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClientRow {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  taxYear: string;
}

interface BulkInviteRequest {
  clients: ClientRow[];
  agentName: string;
  agentProfileId: string;
  planLevel: string;
}

const PLAN_LABELS: Record<string, string> = {
  silver: "Silver Shield",
  gold: "Gold Shield",
  platinum: "Platinum Business",
};

function getCoveredYears(planLevel: string, taxYear: number): number[] {
  // Silver covers only the specified year
  if (planLevel === "silver") {
    return [taxYear];
  }
  // Gold and Platinum cover all open years (2021-2024)
  return [2021, 2022, 2023, 2024];
}

interface InviteResult {
  email: string;
  success: boolean;
  error?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { clients, agentName, agentProfileId, planLevel }: BulkInviteRequest = await req.json();

    console.log(`Processing bulk invite for ${clients.length} clients from agent: ${agentName}, plan: ${planLevel}`);

    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No clients provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: InviteResult[] = [];
    const siteUrl = Deno.env.get("SITE_URL") || "https://returnshield.com";

    for (const client of clients) {
      try {
        const fullName = `${client.firstName} ${client.lastName}`.trim();
        const taxYear = client.taxYear || new Date().getFullYear().toString();

        console.log(`Processing invite for: ${client.email}`);

        // Step 1: Create user with Supabase Admin API (no email sent)
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: client.email,
          email_confirm: false, // Don't auto-confirm, we'll send magic link
          user_metadata: {
            full_name: fullName,
            invited_by: agentProfileId,
          },
        });

        if (createError) {
          // Check if user already exists
          if (createError.message.includes("already been registered")) {
            console.log(`User ${client.email} already exists, generating invite link`);
            
            // Get existing user and generate magic link
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === client.email);
            
            if (existingUser) {
              // Update profile with managed_by if not set
              await supabaseAdmin
                .from("profiles")
                .update({ managed_by: agentProfileId })
                .eq("user_id", existingUser.id)
                .is("managed_by", null);
            }

            results.push({ email: client.email, success: false, error: "User already registered" });
            continue;
          }
          
          throw createError;
        }

        if (!userData.user) {
          throw new Error("User creation returned no user data");
        }

        console.log(`User created: ${userData.user.id}`);

        // Step 2: Create profile with managed_by and email
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            user_id: userData.user.id,
            full_name: fullName,
            email: client.email,
            phone: client.phone || null,
            managed_by: agentProfileId,
          }, {
            onConflict: "user_id",
          })
          .select("id")
          .single();

        if (profileError) {
          console.error(`Profile creation error for ${client.email}:`, profileError);
        }

        // Step 2b: Create audit_plans record (comped membership)
        if (profileData?.id) {
          const taxYearNum = parseInt(taxYear);
          const coveredYears = getCoveredYears(planLevel, taxYearNum);
          
          const { error: planError } = await supabaseAdmin
            .from("audit_plans")
            .insert({
              profile_id: profileData.id,
              plan_level: planLevel,
              tax_year: taxYearNum,
              covered_years: coveredYears,
              status: "active",
              // No stripe_subscription_id = comped plan
            });

          if (planError) {
            console.error(`Audit plan creation error for ${client.email}:`, planError);
          } else {
            console.log(`Audit plan created for ${client.email}: ${planLevel}`);
          }
        }

        // Step 3: Generate magic link for the user
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: client.email,
          options: {
            redirectTo: `${siteUrl}/dashboard`,
          },
        });

        if (linkError) {
          console.error(`Magic link generation error for ${client.email}:`, linkError);
          throw linkError;
        }

        const magicLink = linkData.properties?.action_link;

        if (!magicLink) {
          throw new Error("Failed to generate magic link");
        }

        console.log(`Magic link generated for ${client.email}`);

        // Step 4: Send branded email via Resend
        const { error: emailError } = await resend.emails.send({
          from: "Return Shield <onboarding@resend.dev>",
          to: [client.email],
          subject: `Audit Defense Activated: Compliments of ${agentName}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🛡️ You're Protected!</h1>
                <p style="color: #b8d4f0; margin: 10px 0 0 0; font-size: 16px;">Audit Defense Has Been Activated</p>
              </div>
              
              <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 20px;">
                  Hello ${client.firstName},
                </p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">
                  Great news! Your tax professional <strong>${agentName}</strong> has enrolled you in 
                  <strong>Return Shield ${PLAN_LABELS[planLevel] || "Audit Defense"}</strong> for the <strong>${taxYear}</strong> tax year.
                </p>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #1e3a5f; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                  <h3 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 16px;">Your ${PLAN_LABELS[planLevel] || "Plan"} Includes:</h3>
                  <ul style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
                    <li>Professional representation if audited by the IRS or state</li>
                    <li>Expert Enrolled Agents handle all correspondence</li>
                    <li>Zero additional fees - everything is covered</li>
                    ${planLevel !== "silver" ? "<li>Retroactive coverage for tax years 2021-2024</li>" : ""}
                    ${planLevel === "platinum" ? "<li>Business and Schedule C defense included</li>" : ""}
                    <li>Peace of mind for your tax return</li>
                  </ul>
                </div>
                
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${magicLink}" 
                     style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); 
                            color: #ffffff; text-decoration: none; padding: 16px 40px; font-size: 16px; 
                            font-weight: bold; border-radius: 8px; box-shadow: 0 4px 12px rgba(30, 58, 95, 0.3);">
                    Activate Your Account
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #718096; text-align: center;">
                  This link will expire in 24 hours. If you have any questions, contact your tax professional.
                </p>
              </div>
              
              <div style="text-align: center; padding: 20px; color: #718096; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Return Shield. All rights reserved.</p>
                <p style="margin: 5px 0 0 0;">Professional Audit Defense Services</p>
              </div>
            </body>
            </html>
          `,
        });

        if (emailError) {
          console.error(`Email send error for ${client.email}:`, emailError);
          results.push({ email: client.email, success: false, error: "Email send failed" });
          continue;
        }

        console.log(`Invite email sent to ${client.email}`);
        results.push({ email: client.email, success: true });

      } catch (error: any) {
        console.error(`Error processing ${client.email}:`, error);
        results.push({ 
          email: client.email, 
          success: false, 
          error: error.message || "Unknown error" 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    console.log(`Bulk invite complete: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failCount,
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Bulk invite error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);
