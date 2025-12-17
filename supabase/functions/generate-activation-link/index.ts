import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateLinkRequest {
  profile_id: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { profile_id }: GenerateLinkRequest = await req.json();

    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: "profile_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get profile and linked user_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id, full_name")
      .eq("id", profile_id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Profile lookup error:", profileError);
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.user_id) {
      return new Response(
        JSON.stringify({ error: "Profile has no linked user account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already activated
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);

    if (userError) {
      console.error("User lookup error:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to lookup user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userData.user?.email_confirmed_at) {
      return new Response(
        JSON.stringify({ error: "User is already activated", activated: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing unused activation code
    const { data: existingCode } = await supabaseAdmin
      .from("client_activation_codes")
      .select("code, expires_at")
      .eq("profile_id", profile_id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let activationCode: string;

    if (existingCode) {
      // Use existing valid code
      activationCode = existingCode.code;
      console.log("Using existing activation code for profile:", profile_id);
    } else {
      // Generate new activation code
      const { data: newCode, error: codeError } = await supabaseAdmin.rpc("generate_client_activation_code");

      if (codeError || !newCode) {
        console.error("Code generation error:", codeError);
        return new Response(
          JSON.stringify({ error: "Failed to generate activation code" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      activationCode = newCode;

      // Get the tax preparer's profile_id from authorization header
      const authHeader = req.headers.get("Authorization");
      let createdBy: string | null = null;

      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          const { data: creatorProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
          createdBy = creatorProfile?.id || null;
        }
      }

      // Store the new activation code
      const { error: insertError } = await supabaseAdmin
        .from("client_activation_codes")
        .insert({
          code: activationCode,
          profile_id: profile_id,
          user_id: profile.user_id,
          created_by: createdBy || profile_id, // Fallback to profile_id if no creator
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        });

      if (insertError) {
        console.error("Code storage error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to store activation code" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Generated new activation code for profile:", profile_id);
    }

    // Build activation URL
    const baseUrl = Deno.env.get("SITE_URL") || "https://zpolliyfxojotuszomhj.lovableproject.com";
    const activationUrl = `${baseUrl}/activate?code=${activationCode}`;

    return new Response(
      JSON.stringify({
        success: true,
        activation_url: activationUrl,
        activation_code: activationCode,
        client_name: profile.full_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
