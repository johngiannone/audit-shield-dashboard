import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivateRequest {
  code: string;
  password: string;
}

interface ValidateRequest {
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "activate";

    if (action === "validate") {
      // Validate code and return client info
      const { code }: ValidateRequest = await req.json();

      if (!code || code.length !== 8) {
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid code format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Validating activation code: ${code}`);

      // Find the activation code
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from("client_activation_codes")
        .select(`
          id, code, user_id, used_at, expires_at,
          profiles:profile_id (id, full_name, email)
        `)
        .eq("code", code.toUpperCase())
        .single();

      if (codeError || !codeData) {
        console.log(`Code not found: ${code}`);
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid activation code" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already used
      if (codeData.used_at) {
        return new Response(
          JSON.stringify({ valid: false, error: "This code has already been used" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if expired
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ valid: false, error: "This code has expired" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const profile = codeData.profiles as any;

      return new Response(
        JSON.stringify({
          valid: true,
          clientName: profile?.full_name || "Client",
          clientEmail: profile?.email || "",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default action: activate account
    const { code, password }: ActivateRequest = await req.json();

    if (!code || code.length !== 8) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid code format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!password || password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Activating account with code: ${code}`);

    // Find the activation code
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from("client_activation_codes")
      .select("id, code, user_id, profile_id, used_at, expires_at")
      .eq("code", code.toUpperCase())
      .single();

    if (codeError || !codeData) {
      console.log(`Code not found: ${code}`);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid activation code" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already used
    if (codeData.used_at) {
      return new Response(
        JSON.stringify({ success: false, error: "This code has already been used" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "This code has expired. Please contact your tax preparer for a new code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Update user password
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      codeData.user_id,
      { password }
    );

    if (passwordError) {
      console.error("Password update error:", passwordError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to set password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Password set for user: ${codeData.user_id}`);

    // Step 2: Confirm email
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      codeData.user_id,
      { email_confirm: true }
    );

    if (confirmError) {
      console.error("Email confirm error:", confirmError);
      // Don't fail the whole operation, password is set
    } else {
      console.log(`Email confirmed for user: ${codeData.user_id}`);
    }

    // Step 3: Mark code as used
    const { error: markUsedError } = await supabaseAdmin
      .from("client_activation_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", codeData.id);

    if (markUsedError) {
      console.error("Mark used error:", markUsedError);
      // Don't fail, account is activated
    }

    // Step 4: Ensure client role exists
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: codeData.user_id,
        role: "client"
      }, {
        onConflict: "user_id"
      });

    if (roleError) {
      console.error("Role upsert error:", roleError);
      // Don't fail, account is activated
    }

    // Get the user's email for login
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(codeData.user_id);

    console.log(`Account activated successfully for: ${userData?.user?.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        email: userData?.user?.email,
        message: "Account activated successfully! You can now log in."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Activation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
