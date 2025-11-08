import express, { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import Stripe from 'stripe';
import { supabaseService } from '../../lib/supabase.js';

export default function stripeRouter() {
  const router = Router();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

  router.use(requireAuth);
  router.use(planRateLimit('default'));

  router.post('/create-checkout-session', async (req: Request, res: Response) => {
    const { priceId, successUrl, cancelUrl } = req.body as { priceId: string; successUrl: string; cancelUrl: string };
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: req.user!.email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return res.json({ id: session.id, url: session.url });
    } catch (e) {
      console.error('Stripe checkout error', e);
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  return router;
}

export function billingWebhookRouter() {
  const router = Router();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

  // Stripe webhook must use raw body parser
  router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response): Promise<void> => {
    // SECURITY: Always verify webhook signature - no bypass allowed
    const signature = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    if (!endpointSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      res.status(500).send('Webhook secret not configured');
      return;
    }

    if (!signature) {
      res.status(400).send('Missing stripe-signature header');
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed.', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const subscription = event.data.object as Stripe.Subscription;
      // Subscription object may not include email; in a real app, map customer ID to user in DB
      const email = (subscription as any).customer_email as string | undefined;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId ? priceId : 'unknown';
      try {
        if (email) {
          // Upsert into user_profiles table (user-scoped profile data)
          await supabaseService
            .from('user_profiles')
            .upsert({ email, plan }, { onConflict: 'email' });
        }
      } catch (err) {
        console.error('Failed to update user profile plan:', err);
      }
    }

    res.json({ received: true });
  });

  return router;
}

