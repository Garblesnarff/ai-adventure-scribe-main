import express, { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth';
import Stripe from 'stripe';

export default function stripeRouter(db: Pool) {
  const router = Router();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

  router.use(requireAuth);

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

export function billingWebhookRouter(db: Pool) {
  const router = Router();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

  // Stripe webhook must use raw body parser
  router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const skipVerify = process.env.STRIPE_WEBHOOK_SKIP_VERIFY === 'true';
    let event: Stripe.Event;
    if (skipVerify) {
      try {
        const raw = req.body instanceof Buffer ? req.body.toString('utf8') : (req.body as any);
        event = JSON.parse(raw);
      } catch (err: any) {
        return res.status(400).send(`Invalid JSON: ${err.message}`);
      }
    } else {
      const signature = req.headers['stripe-signature'] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
      try {
        event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
      } catch (err: any) {
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    }

    // Handle the event
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const subscription = event.data.object as Stripe.Subscription;
      // Subscription object may not include email; in a real app, map customer ID to user in DB
      const email = (subscription as any).customer_email as string | undefined;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId ? priceId : 'unknown';
      const client = await db.connect();
      try {
        if (email) {
          await client.query('UPDATE users SET plan=$1 WHERE email=$2', [plan, email]);
        }
      } finally {
        client.release();
      }
    }

    res.json({ received: true });
  });

  return router;
}

