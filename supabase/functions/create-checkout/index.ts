import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe price IDs
const PRICES = {
  individual: "price_1SeN4N06ckHJVNGXYRmCmQtB",
  business: "price_1SeN4n06ckHJVNGXyYZGe5Wa",
  retroactive: "price_1SeN5D06ckHJVNGX1ossCCKO",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { planType, retroactiveYears } = await req.json();
    logStep("Request params", { planType, retroactiveYears });

    if (!planType || !["individual", "business"].includes(planType)) {
      throw new Error("Invalid plan type");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: PRICES[planType as keyof typeof PRICES],
        quantity: 1,
      },
    ];

    // Add retroactive years as one-time purchases
    const years: number[] = retroactiveYears || [];
    if (years.length > 0) {
      lineItems.push({
        price: PRICES.retroactive,
        quantity: years.length,
      });
      logStep("Added retroactive coverage", { years, count: years.length });
    }

    // Calculate covered years for metadata
    const coveredYears = [2024, ...years].sort((a, b) => b - a);

    const origin = req.headers.get("origin") || "https://your-app.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/?checkout=canceled`,
      metadata: {
        user_id: user.id,
        plan_type: planType,
        covered_years: JSON.stringify(coveredYears),
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_type: planType,
          covered_years: JSON.stringify(coveredYears),
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
