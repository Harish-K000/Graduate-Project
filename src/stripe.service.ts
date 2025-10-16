import {Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from './database/prisma/prisma.service';



@Injectable()
export class StripeService {
  constructor(
  private stripe: Stripe,
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

  async markFromInvoice(inv: Stripe.Invoice) {
    // TODO
  //   const customerId = (inv.customer as string) ?? null;
  //   if (!customerId) return;

  //   // subscription
  //   const subId =
  //     typeof inv.subscription === 'string'
  //       ? inv.subscription
  //       : inv.subscription?.id;

  //   let end: Date | undefined;
  //   if (subId) {
  //     const sub = await this.stripe.subscriptions.retrieve(subId);
  //     // `retrieve` returns Stripe.Response<Stripe.Subscription>, which
  //     // is structurally the Subscription object. Access props directly:
  //     if (sub.current_period_end) {
  //       end = new Date(sub.current_period_end * 1000);
  //     }
  //   }else {
  //   // fallback: use the first invoice line's period end if available
  //   const first = inv.lines?.data?.[0];
  //   const ts = first?.period?.end;
  //   if (ts) end = new Date(ts * 1000);
  // }

  //   await this.prisma.member.updateMany({
  //     where: { stripeCustomerId: customerId },
  //     data: { status: 'active', currentPeriodEnd: end },
  //   });

  }

  async syncFromSub(_sub: Stripe.Subscription) {
    // TODO
  }
}
