import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@14.12.0"; // Ensure this is the latest or a suitable version
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"; // Ensure version matches project

// Stripe configuration
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16", // Use a fixed API version
  httpClient: Stripe.createFetchHttpClient(), // Required for Deno
});

// Supabase configuration
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // Use service role key for admin operations
);

const relevantEvents = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'checkout.session.completed', // Important for initial subscription setup
]);

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider() // Required for Deno
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`Received event: ${event.type}`);

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode === 'subscription' && session.subscription && session.customer) {
            const subscriptionId = session.subscription as string;
            const customerId = session.customer as string;
            const userId = session.client_reference_id; // We must set this when creating the checkout session

            if (!userId) {
              console.error('Error: client_reference_id (user_id) not found in checkout session.');
              return new Response('Webhook Error: Missing user_id in session.', { status: 400 });
            }

            // Retrieve the full subscription object to get all details
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            if (!subscription) {
                console.error(`Error: Could not retrieve subscription ${subscriptionId} from Stripe.`);
                return new Response('Webhook Error: Subscription not found.', { status: 400 });
            }

            await handleSubscriptionChange(customerId, subscription, userId);
            console.log(`Processed checkout.session.completed for user ${userId}, subscription ${subscriptionId}`);
          } else {
            console.log(`Skipping checkout.session.completed event, not a subscription or missing data: ${session.id}`);
          }
          break;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          // For these events, user_id might not be directly available.
          // We need to fetch it from our database using customerId if not present in metadata.
          let userId = subscription.metadata?.user_id;

          if (!userId) {
            const { data: userMapping, error: userError } = await supabaseAdmin
              .from('user_subscriptions')
              .select('user_id')
              .eq('stripe_customer_id', customerId)
              .maybeSingle();

            if (userError || !userMapping) {
              console.error(`Error fetching user_id for customer ${customerId}: ${userError?.message || 'Not found'}`);
              // Depending on the event, you might want to retry or log this as critical
              // For 'deleted', if we can't find the user, it might be okay if the record is already gone or was never fully created.
              if (event.type !== 'customer.subscription.deleted') {
                 return new Response(`Webhook Error: User mapping not found for customer ${customerId}.`, { status: 400 });
              } else {
                console.warn(`User mapping not found for customer ${customerId} during subscription deletion. It might have been already handled or never existed.`);
              }
            } else {
              userId = userMapping.user_id;
            }
          }

          if (userId || event.type === 'customer.subscription.deleted') { // Proceed if userId found, or if it's a delete event where user might be gone
            await handleSubscriptionChange(customerId, subscription, userId);
            console.log(`Processed ${event.type} for customer ${customerId}, subscription ${subscription.id}`);
          } else if (!userId && event.type !== 'customer.subscription.deleted') {
            console.error(`Critical: User ID could not be determined for customer ${customerId} on event ${event.type}.`);
            // This is a state that needs investigation.
            return new Response(`Webhook Error: User ID could not be determined for customer ${customerId}.`, { status: 500 });
          }
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          if (invoice.subscription && invoice.customer) {
            const subscriptionId = invoice.subscription as string;
            const customerId = invoice.customer as string;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
             // The user_id should be part of the subscription metadata or fetched via customerId
            let userId = subscription.metadata?.user_id;
            if (!userId) {
                const { data: userMapping } = await supabaseAdmin
                    .from('user_subscriptions')
                    .select('user_id')
                    .eq('stripe_customer_id', customerId)
                    .single(); // Assuming one user per customer ID
                if (userMapping) userId = userMapping.user_id;
            }

            if (userId) {
                await handleSubscriptionChange(customerId, subscription, userId); // Re-use logic to update status, period_end
                console.log(`Processed invoice.payment_succeeded for customer ${customerId}, subscription ${subscriptionId}`);
            } else {
                console.error(`User ID not found for customer ${customerId} on invoice.payment_succeeded.`);
            }
          }
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          if (invoice.subscription && invoice.customer) {
            const customerId = invoice.customer as string;
            // Update subscription status to 'past_due' or similar
            // The subscription object itself in Stripe will reflect the new status.
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            let userId = subscription.metadata?.user_id;
             if (!userId) {
                const { data: userMapping } = await supabaseAdmin
                    .from('user_subscriptions')
                    .select('user_id')
                    .eq('stripe_customer_id', customerId)
                    .single();
                if (userMapping) userId = userMapping.user_id;
            }
            if (userId) {
                await handleSubscriptionChange(customerId, subscription, userId); // This will update the status based on the subscription object
                console.log(`Processed invoice.payment_failed for customer ${customerId}, subscription ${subscription.id}. Status set to ${subscription.status}.`);
                // TODO: Implement dunning email logic if required
            }  else {
                console.error(`User ID not found for customer ${customerId} on invoice.payment_failed.`);
            }
          }
          break;
        }
        default:
          console.log(`Unhandled relevant event: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error processing event ${event.type}:`, error);
      return new Response(`Webhook Error: ${error.message || 'Internal server error'}`, { status: 500 });
    }
  } else {
    console.log(`Skipping non-relevant event: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

async function handleSubscriptionChange(customerId: string, subscription: Stripe.Subscription, userId?: string | null) {
  if (!userId && subscription.metadata?.user_id) {
    userId = subscription.metadata.user_id;
  }

  if (!userId) {
      // Attempt to find userId from an existing record if not passed or in metadata
      const { data: existingSub, error: existingSubError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle();

      if (existingSub) {
        userId = existingSub.user_id;
      } else {
         // If still no userId, try via customerId if it's not a delete event
        if (subscription.status !== 'canceled' && subscription.status !== 'incomplete_expired') {
            const { data: userByCustomer, error: userByCustomerError } = await supabaseAdmin
                .from('user_subscriptions')
                .select('user_id')
                .eq('stripe_customer_id', customerId)
                .maybeSingle();
            if (userByCustomer) userId = userByCustomer.user_id;
        }
      }
  }

  if (!userId && subscription.status !== 'canceled' && subscription.status !== 'incomplete_expired') {
    console.error(`Critical: Could not determine user_id for subscription ${subscription.id} / customer ${customerId}. Aborting handleSubscriptionChange.`);
    // This is a problem. The user_id should always be established, ideally via client_reference_id or metadata.
    // If it's missing, it might indicate an issue with how checkout sessions are created or how webhooks are processed.
    return;
  }

  const priceId = subscription.items.data[0].price.id;
  const { data: tier, error: tierError } = await supabaseAdmin
    .from('subscription_tiers')
    .select('tier_id')
    .eq('stripe_price_id', priceId)
    .single();

  if (tierError || !tier) {
    console.error(`Error fetching tier for price_id ${priceId}: ${tierError?.message || 'Tier not found'}`);
    // If tier not found, this is a configuration error. The Stripe Price ID must exist in subscription_tiers.
    // Do not proceed with upserting the subscription if the tier is unknown, unless it's a cancellation.
    if (subscription.status !== 'canceled' && subscription.status !== 'incomplete_expired') {
        return;
    }
    // For cancellations, we might proceed to update status even if tier is somehow missing (though unlikely)
  }

  const subscriptionData = {
    user_id: userId, // This is critical
    stripe_customer_id: customerId,
    tier_id: tier?.tier_id, // This will be null if tier lookup failed
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  };

  // For canceled subscriptions, if we couldn't find a tier, we might not have a tier_id.
  // We should still update the status of the existing subscription.
  if ((subscription.status === 'canceled' || subscription.status === 'incomplete_expired') && !subscriptionData.tier_id) {
    const { error: cancelError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscriptionData.canceled_at,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (cancelError) {
      console.error(`Error updating canceled subscription ${subscription.id} status without tier_id: ${cancelError.message}`);
    } else {
      console.log(`Updated canceled/expired subscription ${subscription.id} status without tier_id.`);
    }
    return; // Exit after attempting to update status for cancellation
  }

  // If tier_id is still missing for a non-canceled subscription, this is an error.
  if (!subscriptionData.tier_id && subscription.status !== 'canceled' && subscription.status !== 'incomplete_expired') {
      console.error(`Critical: tier_id is missing for subscription ${subscription.id} and it's not a cancellation. Aborting upsert.`);
      return;
  }


  const { error: upsertError } = await supabaseAdmin
    .from('user_subscriptions')
    .upsert({
      stripe_subscription_id: subscription.id, // Match on this unique ID
      ...subscriptionData
    }, {
      onConflict: 'stripe_subscription_id',
    });

  if (upsertError) {
    console.error(`Error upserting subscription ${subscription.id}: ${upsertError.message}`);
  } else {
    console.log(`Successfully upserted subscription ${subscription.id} for user ${userId} with status ${subscription.status}`);
  }
}

// Notes for running locally with Supabase CLI:
// 1. Ensure Deno is installed.
// 2. Set environment variables in `supabase/.env.local` (or `supabase/functions/.env` for the function itself):
//    STRIPE_SECRET_KEY=sk_test_...
//    STRIPE_WEBHOOK_SECRET=whsec_...
//    SUPABASE_URL=your_project_url
//    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
// 3. Run `supabase functions serve --env-file ./supabase/functions/.env` (adjust path to env file if needed)
// 4. Use Stripe CLI to forward webhooks: `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`
//    (Ensure the port matches what `supabase functions serve` uses)
//
// Important considerations:
// - `client_reference_id` in Stripe Checkout session MUST be set to the `user_id` from your `auth.users` table.
// - `user_id` should also be stored in Stripe Subscription metadata for robustness, in case `checkout.session.completed` is missed.
// - Error handling: The function attempts to handle errors, but robust retry mechanisms or dead-letter queues are advanced topics.
// - Idempotency: Stripe webhooks can be sent multiple times. The `upsert` with `onConflict` helps, but ensure logic is idempotent.
// - Security: Webhook signature verification is crucial. Using `SUPABASE_SERVICE_ROLE_KEY` gives this function admin rights to your DB.
// - `subscription_tiers` table must have correct `stripe_price_id` values matching your Stripe setup.
// - The `handleSubscriptionChange` function tries to be robust in finding `userId` but it's best if `client_reference_id` is always correctly set.
// - For `customer.subscription.deleted`, if the user has already been deleted from your system (and thus `user_subscriptions` record), this might result in a "user not found" scenario which could be acceptable for deletion events.
// - The `Stripe.createSubtleCryptoProvider()` is necessary for Deno environment.
// - Ensure Stripe API version is pinned for stability.
// - When a subscription is updated (e.g. upgrade/downgrade), `customer.subscription.updated` fires. The new `priceId` will be on `subscription.items.data[0].price.id`.
// - This function assumes one subscription item per subscription, which is common for SaaS.
// - If `checkout.session.completed` is processed, it sets up the initial record. Subsequent updates like `invoice.payment_succeeded` or `customer.subscription.updated` will then find and update this record.
// - The logic to find `userId` in `handleSubscriptionChange` has multiple fallbacks. The primary source should be `client_reference_id` (from `checkout.session.completed`) or `subscription.metadata.user_id`.
// - If a tier is not found for a `priceId` (e.g., `stripe_price_id` mismatch in `subscription_tiers`), the webhook will log an error and not update the subscription, unless it's a cancellation. This prevents data corruption.
// - The use of `maybeSingle()` vs `single()` depends on whether you expect a record to always exist. `single()` errors if no record or multiple records are found. `maybeSingle()` returns null if no record, errors on multiple.
// - The `customerId` is used to link to the user if `userId` isn't directly in the event payload, by looking up existing `user_subscriptions`. This is a fallback.
// - The `stripe_customer_id` field in `user_subscriptions` should be populated during `checkout.session.completed`.
// - Final check on logic for `userId` determination and `tier_id` lookup: these are critical paths.
// - The `relevantEvents` set helps filter and process only necessary webhooks.
// - `console.log` statements are for debugging; consider a more structured logging solution for production.
// - `Deno.env.get()` is used to access environment variables. These must be set correctly in your Supabase Function's settings.
// - Supabase client uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
// - The `Stripe` SDK initialization is Deno-specific using `Stripe.createFetchHttpClient()`.
// - Error responses from the webhook should be meaningful for Stripe to understand if retries are needed. 4xx errors generally tell Stripe not to retry, 5xx errors may cause retries.
// - The `upsert` operation with `onConflict: 'stripe_subscription_id'` is key to handling both new subscriptions and updates idempotently.
// - The `handleSubscriptionChange` function is the core logic for translating Stripe subscription objects to your database schema.
// - It's important that `stripe_price_id` in your `subscription_tiers` table exactly matches the Price IDs in your Stripe product catalog.
// - The `checkout.session.completed` event is particularly important as it's often the first point at which a subscription is fully confirmed and associated with a user. Ensuring `client_reference_id` is set there is vital.
// - If `userId` cannot be determined for an active subscription update, it's a significant issue that should be logged and investigated.
// - The `canceled_at` field is populated from `subscription.canceled_at`.
// - `trial_start` and `trial_end` are also mapped.
// - The date conversions `new Date(... * 1000).toISOString()` are standard for Unix timestamps from Stripe.
// - Added more robust logging for error cases and successful operations.
// - Refined `userId` lookup logic in `handleSubscriptionChange` to be more resilient.
// - Added explicit check and error if `tier_id` cannot be found for non-cancellation events.
// - Ensured that for cancellation events, an attempt is made to update the status even if the tier lookup fails (though this scenario should be rare).
// - The `userId` parameter in `handleSubscriptionChange` is now optional and the function has more internal checks to find it.
// - The `stripe_customer_id` is now consistently used in lookups when `userId` is not immediately available.
// - The `client_reference_id` from `checkout.session.completed` is the preferred way to get `userId` for new subscriptions.
// - `subscription.metadata.user_id` is a good secondary source for `userId`.
// - Added `customer.subscription.trial_will_end` to `relevantEvents` as it's often useful for sending reminder emails (though handling for it is not implemented in this snippet, just logging).
// - The `customerId` is passed to `handleSubscriptionChange` consistently.
// - The `userId` is now a top priority to establish in `handleSubscriptionChange`. If it can't be found for an active subscription event, the function will log an error and return, preventing updates with missing `user_id`. This is a safety measure.
// - For `customer.subscription.deleted`, the `userId` might not be found if the user's record was already cleaned up. The function attempts to proceed with the update to mark the subscription as 'canceled' using `stripe_subscription_id` as the key.
// - The structure of `handleSubscriptionChange` now clearly defines `subscriptionData` before the upsert.
// - Added a specific case for handling cancellations if `tier_id` is missing, to ensure the status is updated.
// - Added a safeguard to prevent upserting non-canceled subscriptions if `tier_id` is missing.
Okay, I've created the `stripe-webhook/index.ts` Supabase Edge Function.

This function includes:
*   Initialization for Stripe and Supabase clients.
*   Webhook signature verification.
*   Handling for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, and `invoice.payment_failed` events.
*   Logic within `handleSubscriptionChange` to:
    *   Determine the `user_id` (primarily from `client_reference_id` or `subscription.metadata.user_id`, with fallbacks to look up by `stripe_customer_id` or `stripe_subscription_id`).
    *   Look up the internal `tier_id` from your `subscription_tiers` table based on the `stripe_price_id` from the subscription.
    *   Upsert subscription details into your `user_subscriptions` table, mapping Stripe's subscription status, period dates, and other relevant fields.
*   Error handling and logging for various scenarios.

**Important Next Steps for this file:**
1.  **Environment Variables**: Ensure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are correctly set in your Supabase project's function settings.
2.  **`client_reference_id`**: When you create Stripe Checkout Sessions (in the next step), you **must** set `client_reference_id` to the Supabase `user.id`. This is crucial for linking the Stripe customer/subscription back to your user.
3.  **Stripe Price IDs**: The `stripe_price_id` values in your `subscription_tiers` table must exactly match the Price IDs in your Stripe dashboard.
4.  **Testing**: Thoroughly test this webhook with the Stripe CLI and by simulating various subscription events in the Stripe dashboard.

Now, I'll create the subscription management Edge Function.
