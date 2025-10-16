import { Controller, Header, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
  constructor(
    private cfg: ConfigService,
    private stripe: Stripe,
    private svc: StripeService,
  ) {}

  @Post('webhook')
  @Header('content-type', 'application/json')
  async handle(@Req() req: Request & { rawBody?: Buffer }, @Res() res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    const secret = this.cfg.get<string>('STRIPE_WEBHOOK_SECRET');
    console.log('[webhook] hasSig?', !!sig, 'hasSecrect?', !!secret, 'rawLen', (req as any).rawBody?.length);
    
    let event: Stripe.Event;
    try {
      // IMPORTANT: use rawBody for signature verification
      event = this.stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        sig,
        secret!,
      );
    } catch (e) {
      console.error('[webhook] verify fail', (e as Error).message);
      return res.status(400).send(`Webhook error: ${(e as Error).message}`);
    }

    console.log('[webhook] type:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.svc.upsertFromCheckout(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.paid':
        await this.svc.markFromInvoice(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated':
        await this.svc.syncFromSub(event.data.object as Stripe.Subscription);
        break;
      default:
        // You can log unhandled events if needed
        break;
    }

    return res.json({ received: true });
  }
}
