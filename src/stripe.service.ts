import { updateManyAs } from './../node_modules/effect/src/FiberRefs';
import {Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Subscription } from 'rxjs';


@Injectable()
export class StripeService {
  constructor(
  private readonly stripe: Stripe,
  private prisma: PrismaService,) {}


  async upsertFromCheckout(session: Stripe.Checkout.Session) {
    // TODO: connect Prisma and persist member/sub info
    const email = session.customer_details?.email;
    if (!email) return;

    const customerId = session.customer as string | null;
    const subId = session.subscription as string | null;

    await this.prisma.member.upsert({
      where: {email},
      update: {stripeCustomerId: customerId ?? undefined, 
        stripeSubId: subId ?? undefined, 
        status:'active'},
      create: {
        email,
        stripeCustomerId: customerId ?? undefined,
        stripeSubId: subId ?? undefined,
        status:'active'
      },
    });
  }

  async markFromInvoice(inv: Stripe.Invoice): Promise<void> {
    const customerId = inv.customer as string | undefined;
    if (!customerId) return;

    let periodEnd: Date | undefined;

    // 1️⃣ Try extracting from invoice lines first (most accurate)
    const lines = inv.lines?.data ?? [];
    if (lines.length > 0) {
      const latestEndSec = Math.max(
        ...lines
          .map((l) => l.period?.end)
          .filter((v): v is number => typeof v === 'number'),
      );
      if (Number.isFinite(latestEndSec)) {
        periodEnd = new Date(latestEndSec * 1000);
      }
    }
    function getInvoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  type InvoiceWithSub = Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };

  const s = (inv as InvoiceWithSub).subscription;
  return typeof s === 'string' ? s : s?.id ?? null;
}
    // 2️⃣ Fallback — if no period info in lines, check subscription
    if (!periodEnd) {
      // Safely extract subscription ID from the invoice
      const subId = getInvoiceSubscriptionId(inv);

      if (subId) {
        const subResp = await this.stripe.subscriptions.retrieve(subId);

        // Stripe typings may wrap in Response<T>, so we use a loose cast
        const sub = subResp as any;
        const endSec = sub?.current_period_end as number | undefined;

        if (typeof endSec === 'number') {
          periodEnd = new Date(endSec * 1000);
        }
      }
    }

    // 3️⃣ Update your Member record in the DB
    await this.prisma.member.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        status: 'active',
        currentPeriodEnd: periodEnd ?? null,
      },
    });

  await this.prisma.member.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      status: 'active',
      currentPeriodEnd: periodEnd ?? null,
    },
  });
  }
  
  async syncFromSub(sub: Stripe.Subscription) {
    // Normalize customer id
    const customerId = (typeof sub.customer === 'string'? sub.customer: sub.customer?.id) ?? null;
    if (!customerId) return;
    
    const subAny = sub as any;
    const periodEnd = subAny.current_period_end? new Date(subAny.current_period_end * 1000): undefined;
    
    //MAP STRIPE status to app status
    let status: 'active' | 'canceled' | 'past_due';
    switch (sub.status){
      case 'active':
      case 'trialing':
        status = 'active';
        break;
      case 'past_due':
        status = 'past_due';
        break;
      default:
        status = 'canceled';
        break;
    }
    await this.prisma.member.updateMany({
    where:{stripeCustomerId: customerId},
    data: {status, currentPeriodEnd: periodEnd ?? null},
  });
  }

  
}
