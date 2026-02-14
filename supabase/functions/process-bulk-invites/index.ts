import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// CORS headers are now dynamic - see getCorsHeaders()

interface ClientRow {
  firstName?: string;
  lastName?: string;
  full_name?: string;
  email: string;
  phone?: string;
  taxYear?: string;
}

interface BulkInviteRequest {
  clients: ClientRow[];
  agentName?: string;
  agentProfileId?: string;
  planLevel: string;
}

const PLAN_LABELS: Record<string, string> = {
  silver: "Silver Shield",
  gold: "Gold Shield",
  platinum: "Platinum Business",
};

function getCoveredYears(planLevel: string, taxYear: number): number[] {
  if (planLevel === "silver") {
    return [taxYear];
  }
  return [2021, 2022, 2023, 2024];
}

interface InviteResult {
  email: string;
  success: boolean;
  error?: string;
  activationCode?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsPreflightResponse = handleCorsPreflightIfNeeded(req);
  if (corsPreflightResponse) return corsPreflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the caller's profile ID from the auth header
    const authHeader = req.headers.get("Authorization");
    let callerProfileId: string | null = null;
    let callerName = "Your Tax Professional";

    if (authHeader) {
      const supabaseClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name")
          .eq("user_id", user.id)
          .single();
        if (profile) {
          callerProfileId = profile.id;
          callerName = profile.full_name || callerName;
        }
      }
    }

    const { clients, agentName, agentProfileId, planLevel }: BulkInviteRequest = await req.json();

    // Use provided agentProfileId/agentName or fall back to caller's info
    const effectiveProfileId = agentProfileId || callerProfileId;
    const effectiveName = agentName || callerName;

    console.log(`Processing bulk invite for ${clients.length} clients from: ${effectiveName}, plan: ${planLevel}`);

    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No clients provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!effectiveProfileId) {
      return new Response(
        JSON.stringify({ error: "Could not determine tax preparer profile" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: InviteResult[] = [];
    const siteUrl = Deno.env.get("SITE_URL") || "https://returnshield.com";

    for (const client of clients) {
      try {
        // Support both firstName/lastName and full_name formats
        const fullName = client.full_name || `${client.firstName || ''} ${client.lastName || ''}`.trim();
        const firstName = client.firstName || fullName.split(' ')[0] || 'Client';
        const taxYear = client.taxYear || new Date().getFullYear().toString();

        console.log(`Processing invite for: ${client.email}`);

        // Step 1: Create user with Supabase Admin API
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: client.email,
          email_confirm: false,
          user_metadata: {
            full_name: fullName,
            invited_by: effectiveProfileId,
          },
        });

        if (createError) {
          if (createError.message.includes("already been registered")) {
            console.log(`User ${client.email} already exists`);
            
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === client.email);
            
            if (existingUser) {
              await supabaseAdmin
                .from("profiles")
                .update({ managed_by: effectiveProfileId })
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

        // Step 2: Create profile
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            user_id: userData.user.id,
            full_name: fullName,
            email: client.email,
            phone: client.phone || null,
            managed_by: effectiveProfileId,
          }, {
            onConflict: "user_id",
          })
          .select("id")
          .single();

        if (profileError) {
          console.error(`Profile creation error for ${client.email}:`, profileError);
        }

        // Step 3: Create audit_plans record
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
            });

          if (planError) {
            console.error(`Audit plan creation error for ${client.email}:`, planError);
          } else {
            console.log(`Audit plan created for ${client.email}: ${planLevel}`);
          }
        }

        // Step 4: Generate activation code
        const { data: activationCode, error: codeGenError } = await supabaseAdmin.rpc('generate_client_activation_code');
        
        if (codeGenError) {
          console.error(`Activation code generation error for ${client.email}:`, codeGenError);
        }

        // Step 5: Store activation code
        if (activationCode && profileData?.id) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

          const { error: codeInsertError } = await supabaseAdmin
            .from("client_activation_codes")
            .insert({
              code: activationCode,
              profile_id: profileData.id,
              user_id: userData.user.id,
              created_by: effectiveProfileId,
              expires_at: expiresAt.toISOString(),
            });

          if (codeInsertError) {
            console.error(`Activation code insert error for ${client.email}:`, codeInsertError);
          } else {
            console.log(`Activation code stored for ${client.email}: ${activationCode}`);
          }
        }

        // Step 6: Generate magic link
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

        // Step 7: Send branded email with activation code as fallback
        const activationUrl = `${siteUrl}/activate?code=${activationCode}`;
        
        const { error: emailError } = await resend.emails.send({
          from: "Return Shield <onboarding@resend.dev>",
          to: [client.email],
          subject: `Audit Defense Activated: Compliments of ${effectiveName}`,
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
                  Hello ${firstName},
                </p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">
                  Great news! Your tax professional <strong>${effectiveName}</strong> has enrolled you in 
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
                
                <div style="background-color: #fef3cd; border: 1px solid #ffc107; padding: 15px 20px; margin: 25px 0; border-radius: 8px;">
                  <p style="font-size: 14px; color: #856404; margin: 0;">
                    <strong>Link not working?</strong> Use this activation code instead:<br>
                    <span style="font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #1e3a5f;">${activationCode}</span><br>
                    Visit <a href="${activationUrl}" style="color: #1e3a5f;">${siteUrl}/activate</a> and enter your code.
                  </p>
                </div>
                
                <p style="font-size: 14px; color: #718096; text-align: center;">
                  This link will expire in 24 hours. The activation code expires in 30 days.
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
          // Still mark as success since we have the activation code as fallback
          results.push({ 
            email: client.email, 
            success: true, 
            activationCode,
            error: "Email delivery may have failed - use activation code"
          });
          continue;
        }

        console.log(`Invite email sent to ${client.email}`);
        results.push({ email: client.email, success: true, activationCode });

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
