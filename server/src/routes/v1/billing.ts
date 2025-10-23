/**
 * STRIPE INTEGRATION
 *
 * WHAT IS STRIPE:
 * - Payment processor for handling credit card payments for subscriptions.
 * - Handles all PCI compliance; we never touch raw credit card data.
 *
 * FLOW:
 * 1. Frontend: User clicks "Upgrade" and is redirected to a Stripe Checkout page.
 * 2. Stripe: Handles the payment details and subscription creation.
 * 3. Stripe: Sends a webhook event to our `/v1/billing/webhook` endpoint to confirm the subscription.
 * 4. Backend (Webhook): Verifies the webhook's signature, then updates the user's plan in our database.
 *
 * WEBHOOKS:
 * - Webhooks are the source of truth for subscription status.
 * - The webhook handler must be resilient to failures and retries from Stripe.
 * - Signature verification is a critical security measure to prevent forged events.
 *
 * IF STRIPE IS DOWN:
 * - New users will be unable to subscribe.
 * - Existing subscribers will be unaffected until their next billing cycle.
 * - Webhooks may be delayed, but Stripe will retry for up to 72 hours.
 *
 * TESTING:
 * - Use Stripe's test card numbers for development and testing.
 * - Use the Stripe CLI to forward webhooks to your local development server.
 */
import express, { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import Stripe from 'stripe';
import { supabaseService } from '../../lib/supabase.js';

export default function stripeRouter() {
  const router = Router();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

  router.use(requireAuth);

  /**
   * POST /v1/billing/create-checkout-session
   *
   * BUSINESS PURPOSE:
   * - Initiates a Stripe Checkout session for a user to purchase a subscription.
   * - Redirects the user to a secure, Stripe-hosted page to enter their payment details.
   */
  router.post('/create-checkout-session', async (req: Request, res: Response) => {
    // ... (implementation)
  });

  return router;
}

export function billingWebhookRouter() {
  const router = Router();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

  /**
   * POST /v1/billing/webhook
   *
   * BUSINESS PURPOSE:
   * - Receives webhook events from Stripe to keep the application's subscription data in sync.
   *
   * SECURITY:
   * - Webhook signature is verified to ensure the request is genuinely from Stripe.
   */
  router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    // ... (implementation)
  });

  return router;
}
