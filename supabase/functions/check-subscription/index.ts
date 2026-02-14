import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

// CORS headers are now dynamic - see getCorsHeaders()

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsPreflightResponse = handleCorsPreflightIfNeeded(req);
  if (corsPreflightResponse) return corsPreflightResponse;
  const corsHeaders = getCorsHeaders(req);

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        subscription: null,
        invoices: []
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Fetch subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
      expand: ["data.default_payment_method"],
    });

    // Fetch invoices
    const invoicesResponse = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
    });

    const invoices = invoicesResponse.data.map((invoice: Stripe.Invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      created: new Date(invoice.created * 1000).toISOString(),
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      invoicePdf: invoice.invoice_pdf,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
    }));

    logStep("Fetched invoices", { count: invoices.length });

    if (subscriptions.data.length === 0) {
      logStep("No subscriptions found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        subscription: null,
        invoices
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const isActive = subscription.status === "active" || subscription.status === "trialing";
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;
    
    // Get plan details from the subscription
    const priceId = subscription.items.data[0]?.price?.id;
    const productId = subscription.items.data[0]?.price?.product as string;
    
    // Get product name for display
    let planName = "Unknown Plan";
    if (productId) {
      try {
        const product = await stripe.products.retrieve(productId);
        planName = product.name;
      } catch (e) {
        logStep("Could not retrieve product", { productId });
      }
    }

    // Get payment method details if available
    let paymentMethodDetails = null;
    const paymentMethod = subscription.default_payment_method;
    if (paymentMethod && typeof paymentMethod !== 'string' && paymentMethod.card) {
      paymentMethodDetails = {
        last4: paymentMethod.card.last4,
        brand: paymentMethod.card.brand,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
      };
    }

    logStep("Subscription details retrieved", { 
      status: subscription.status, 
      cancelAtPeriodEnd,
      currentPeriodEnd,
      planName 
    });

    return new Response(JSON.stringify({
      subscribed: isActive,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planName,
        priceId,
        productId,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        paymentMethod: paymentMethodDetails,
      },
      invoices
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});