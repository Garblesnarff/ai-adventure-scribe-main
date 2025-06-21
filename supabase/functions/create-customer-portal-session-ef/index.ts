import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@14.12.0";
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"; // Not needed if not interacting with Supabase DB directly
import { corsHeaders } from "../_shared/cors.ts";

// Initialize Stripe
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// No Supabase client needed here if we just take customerId and returnUrl

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { customerId, returnUrl } = await req.json();

    if (!customerId) {
      return new Response(JSON.stringify({ error: "Missing required parameter: customerId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!returnUrl) {
      console.warn("returnUrl not provided for customer portal session. Stripe will use default configured in dashboard.");
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl, // returnUrl is optional for Stripe API but recommended
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in create-customer-portal-session-ef:", error.message ? error.message : error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
