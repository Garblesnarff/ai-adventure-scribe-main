import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@14.12.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

// Initialize Stripe
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase Admin client
const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { priceId, userId, successUrl, cancelUrl } = await req.json();

    if (!priceId || !userId || !successUrl || !cancelUrl) {
      return new Response(JSON.stringify({ error: "Missing required parameters: priceId, userId, successUrl, cancelUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let customerId: string | undefined;
    const { data: existingSubscription, error: fetchError } = await supabaseAdmin
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .neq("stripe_customer_id", null)
      .maybeSingle();

    if (fetchError) console.error("Error fetching existing customer ID:", fetchError?.message);

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id;
    } else {
      const { data: user, error: userError } = await supabaseAdmin
        .from('auth.users')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError || !user) {
          console.error(`Error fetching user email for ${userId}:`, userError?.message);
          return new Response(JSON.stringify({ error: "User not found or could not fetch email." }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
      }

      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      const { error: updateCustomerError } = await supabaseAdmin
          .from('user_subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', userId);

      if (updateCustomerError) {
          console.warn(`Could not immediately update stripe_customer_id for user ${userId}: ${updateCustomerError.message}. Webhook handles primary update.`);
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      subscription_data: { metadata: { supabase_user_id: userId } },
    });

    return new Response(JSON.stringify({ sessionId: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in create-checkout-session-ef:", error.message ? error.message : error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
