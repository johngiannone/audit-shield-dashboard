import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("Missing stripe-signature header");
      return new Response("Missing signature", { status: 400 });
    }

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("CRITICAL: STRIPE_WEBHOOK_SECRET is not configured - rejecting webhook");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Event verified with webhook secret", { type: event.type });
    } catch (verifyError) {
      logStep("Webhook signature verification failed", { error: String(verifyError) });
      return new Response("Invalid signature", { status: 403 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Processing checkout.session.completed", { sessionId: session.id });

      const userId = session.metadata?.user_id;
      const planType = session.metadata?.plan_type;
      const coveredYearsStr = session.metadata?.covered_years;
      const referralCode = session.metadata?.referral_code || session.client_reference_id;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const amountTotal = session.amount_total || 0; // Amount in cents

      if (!userId || !planType) {
        logStep("Missing metadata", { userId, planType });
        return new Response("Missing metadata", { status: 400 });
      }

      // Validate plan_type against allowed values
      const allowedPlanTypes = ["individual", "business", "retroactive"];
      if (!allowedPlanTypes.includes(planType)) {
        logStep("Invalid plan type in metadata", { planType });
        return new Response("Invalid plan type", { status: 400 });
      }

      // Verify subscription price matches the claimed plan type (server-side metadata validation)
      if (subscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const actualPriceId = subscription.items.data[0]?.price?.id;
          const EXPECTED_PRICES: Record<string, string> = {
            individual: "price_1SeN4N06ckHJVNGXYRmCmQtB",
            business: "price_1SeN4n06ckHJVNGXyYZGe5Wa",
          };
          const expectedPrice = EXPECTED_PRICES[planType];
          if (expectedPrice && actualPriceId !== expectedPrice) {
            logStep("SECURITY: Price mismatch detected - possible metadata tampering", {
              claimed: planType,
              actualPriceId,
              expectedPrice,
            });
            return new Response("Plan type does not match subscription price", { status: 400 });
          }
        } catch (subError) {
          logStep("Warning: Could not verify subscription price", { error: String(subError) });
        }
      }

      const coveredYears = coveredYearsStr ? JSON.parse(coveredYearsStr) : [2025];
      logStep("Metadata parsed", { userId, planType, coveredYears, customerId, subscriptionId, referralCode });

      // Get profile_id from user_id
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError || !profile) {
        logStep("Error finding profile", { error: profileError?.message, userId });
        return new Response("Profile not found", { status: 400 });
      }

      logStep("Found profile", { profileId: profile.id });

      // Handle referral attribution
      if (referralCode) {
        logStep("Processing referral attribution", { referralCode });

        // Find the affiliate with this referral code
        const { data: affiliate, error: affiliateError } = await supabaseAdmin
          .from("affiliates")
          .select("id, profile_id, commission_rate, total_earnings")
          .eq("referral_code", referralCode)
          .maybeSingle();

        if (affiliateError) {
          logStep("Error finding affiliate", { error: affiliateError.message });
        } else if (affiliate) {
          // Prevent self-referrals: check if affiliate owns this purchase
          if (affiliate.profile_id === profile.id) {
            logStep("SECURITY: Self-referral detected and blocked", {
              affiliateId: affiliate.id,
              profileId: profile.id,
              referralCode
            });
          } else {
          // Calculate commission (amount is in cents, convert to dollars for storage)
          const commissionRate = affiliate.commission_rate || 0.20;
          const commissionAmount = (amountTotal / 100) * commissionRate;
          const newTotalEarnings = (parseFloat(affiliate.total_earnings) || 0) + commissionAmount;

          logStep("Calculating commission", { 
            amountTotal, 
            commissionRate, 
            commissionAmount, 
            newTotalEarnings 
          });

          // Update affiliate earnings
          const { error: updateError } = await supabaseAdmin
            .from("affiliates")
            .update({ 
              total_earnings: newTotalEarnings,
              updated_at: new Date().toISOString()
            })
            .eq("id", affiliate.id);

          if (updateError) {
            logStep("Error updating affiliate earnings", { error: updateError.message });
          } else {
            logStep("Updated affiliate earnings", { affiliateId: affiliate.id, newTotalEarnings });
          }

          // Mark referral visit as converted
          const { error: visitError } = await supabaseAdmin
            .from("referral_visits")
            .update({ converted: true })
            .eq("referral_code", referralCode)
            .eq("converted", false);

          if (visitError) {
            logStep("Error updating referral visit", { error: visitError.message });
          } else {
            logStep("Marked referral visit as converted");
          }
          } // end self-referral else block
        } else {
          logStep("No affiliate found for referral code", { referralCode });
        }
      }

      // Check if plan already exists
      const { data: existingPlan } = await supabaseAdmin
        .from("audit_plans")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("tax_year", 2025)
        .maybeSingle();

      if (existingPlan) {
        // Update existing plan
        const { error: updateError } = await supabaseAdmin
          .from("audit_plans")
          .update({
            status: "active",
            plan_level: planType,
            covered_years: coveredYears,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPlan.id);

        if (updateError) {
          logStep("Error updating plan", { error: updateError.message });
          return new Response("Error updating plan", { status: 500 });
        }
        logStep("Updated existing plan", { planId: existingPlan.id });
      } else {
        // Create new plan
        const { error: insertError } = await supabaseAdmin
          .from("audit_plans")
          .insert({
            profile_id: profile.id,
            tax_year: 2025,
            status: "active",
            plan_level: planType,
            covered_years: coveredYears,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          });

        if (insertError) {
          logStep("Error inserting plan", { error: insertError.message });
          return new Response("Error inserting plan", { status: 500 });
        }
        logStep("Created new plan");
      }

      // Send welcome email
      try {
        const { data: profileData } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", profile.id)
          .single();

        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);

        await supabaseAdmin.functions.invoke("send-welcome-email", {
          body: {
            email: userData.user?.email,
            name: profileData?.full_name || "Valued Member",
            planLevel: planType,
          },
        });
        logStep("Welcome email sent");
      } catch (emailError) {
        logStep("Error sending welcome email", { error: String(emailError) });
        // Don't fail the webhook for email errors
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
