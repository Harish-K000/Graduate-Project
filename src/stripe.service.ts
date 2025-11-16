import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from './database/prisma/prisma.service';


@Injectable()
export class StripeService {
  constructor(
  private readonly stripe: Stripe,
  private prisma: PrismaService,) {}


  async upsertFromCheckout(session: Stripe.Checkout.Session) {
    // TODO: connect Prisma and persist member/sub info
    const email = session.customer_details?.email;
    if (!email) return;
    
    // GET customerId and subscriptionId
    const customerId = (typeof session.customer === 'string'
      ? session.customer
      :session.customer?.id) ?? null;

    const subId = (typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as any)?.id) ?? null;
    
    // Fetch subscription details
    let priceId: string | undefined;
    let intervalMonths: number | undefined;
    let planLabel: string | undefined;
    let currentPeriodEnd: Date | undefined;

    if(subId){
      const sub: any = await this.stripe.subscriptions.retrieve(subId);

      if(sub?.current_period_end) {
        currentPeriodEnd = new Date(sub.current_period_end * 1000);
      }

      const price = sub.items?.data?.[0]?.price;
      if(price){
        priceId = price.id;
        const intervalCount = price.recurring?.interval_count ?? 1;
        intervalMonths = price.recurring?.interval === 'month'? intervalCount : undefined;
        planLabel= intervalMonths ? `${intervalMonths}-month` : 'custom';
      } 
    }else {
    // One-time payment checkout (no subscription)
    // Try to read the price from the session’s line items
    const fullSession: any = await this.stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items.data.price'],
    });
    const price = fullSession?.line_items?.data?.[0]?.price;
    if (price) {
      priceId = price.id;
      const count = price.recurring?.interval_count ?? 1;
      intervalMonths = price.recurring?.interval === 'month' ? count : undefined;
      planLabel = intervalMonths ? `${intervalMonths}-month` : 'one-time';
      // no subscription → no currentPeriodEnd
    }
  }
    await this.prisma.member.upsert({
    where: { email },
    update: {
      stripeCustomerId: customerId ?? undefined,
      stripeSubId: subId ?? undefined,
      stripePriceId: priceId,
      intervalMonths,   
      planLabel,         
      currentPeriodEnd,
      status: 'active',
    },
    create: {
      email,
      stripeCustomerId: customerId ?? undefined,
      stripeSubId: subId ?? undefined,
      stripePriceId: priceId,
      intervalMonths,   
      planLabel,        
      currentPeriodEnd,
      status: 'active',
    },
  });
  console.log('[checkout.completed md]', session.metadata);
console.log('[checkout.completed derived]', { priceId, intervalMonths, planLabel, currentPeriodEnd });
  }

  async markFromInvoice(inv: Stripe.Invoice): Promise<void> {
  // Normalize customer id and email
  const customerId =
    (typeof inv.customer === 'string' ? inv.customer : inv.customer?.id) ?? null;

  let email: string | null =
    (inv.customer_email as string | undefined) ?? null;

  if (!email && customerId) {
    const cust = await this.stripe.customers.retrieve(customerId);
    const cAny = cust as any;
    email = (cAny?.email as string | undefined) ?? null;
  }

  // 1) Determine currentPeriodEnd
  let periodEnd: Date | undefined;

  // Prefer invoice line periods
  const lines = inv.lines?.data ?? [];
  if (lines.length > 0) {
    const latestEndSec = Math.max(
      ...lines
        .map(l => l.period?.end)
        .filter((v): v is number => typeof v === 'number'),
    );
    if (Number.isFinite(latestEndSec)) {
      periodEnd = new Date(latestEndSec * 1000);
    }
  }
  function getInvoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  // Some SDK versions don’t type `invoice.subscription`; read it via loose cast
  const anyInv = inv as any;
  const s = anyInv?.subscription;
  if (!s) return null;
  return typeof s === 'string' ? s : s.id ?? null;
}
  // Fallback: read from subscription via loose cast helper
  if (!periodEnd) {
    const subId = getInvoiceSubscriptionId(inv); // <— your helper
    if (subId) {
      const subResp = await this.stripe.subscriptions.retrieve(subId);
      const subAny = subResp as any;
      const endSec = subAny?.current_period_end as number | undefined;
      if (typeof endSec === 'number') {
        periodEnd = new Date(endSec * 1000);
      }
    }
  }

  // 2) Capture price/plan info where possible (from first line)
  let stripePriceId: string | undefined;
  let intervalMonths: number | undefined;
  let planLabel: string | undefined;

  const priceFromLine = (lines?.[0] as any)?.price;
  if (priceFromLine) {
    stripePriceId = priceFromLine.id;
    const count = priceFromLine.recurring?.interval_count ?? 1;
    intervalMonths =
      priceFromLine.recurring?.interval === 'month' ? count : undefined;
    planLabel = intervalMonths ? `${intervalMonths}-month` : 'one-time';
  }

  // 3) Update your Member by OR (customerId OR email) to backfill missing mapping
  await this.prisma.member.updateMany({
    where: {
      OR: [
        customerId ? { stripeCustomerId: customerId } : undefined,
        email ? { email } : undefined,
      ].filter(Boolean) as any,
    },
    data: {
      status: 'active',
      currentPeriodEnd: periodEnd ?? null,
      stripeCustomerId: customerId ?? undefined,
      stripePriceId: stripePriceId ?? undefined,
      intervalMonths: intervalMonths ?? undefined,
      planLabel: planLabel ?? undefined,
    },
  });
  console.log('[invoice]', { customerId, email: inv.customer_email, lines: inv.lines?.data?.length });
}
  
  async syncFromSub(sub: Stripe.Subscription) {
  const customerId =
    (typeof sub.customer === 'string' ? sub.customer : sub.customer?.id) ?? null;
  if (!customerId) return;

  // Fetch customer email so we can match even if stripeCustomerId wasn't set yet
  let email: string | null = null;
  const cust = await this.stripe.customers.retrieve(customerId);
  const cAny = cust as any;
  email = (cAny?.email as string | undefined) ?? null;

  const sAny = sub as any;
  const periodEnd = sAny.current_period_end
    ? new Date(sAny.current_period_end * 1000)
    : undefined;

  let status: 'active' | 'canceled' | 'past_due';
  switch (sub.status) {
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

  // Grab price/interval from the first subscription item
  let stripePriceId: string | undefined;
  let intervalMonths: number | undefined;
  let planLabel: string | undefined;
  const price = (sub.items?.data?.[0] as any)?.price;
  if (price) {
    stripePriceId = price.id;
    const count = price.recurring?.interval_count ?? 1;
    intervalMonths = price.recurring?.interval === 'month' ? count : undefined;
    planLabel = intervalMonths ? `${intervalMonths}-month` : 'custom';
  }

  await this.prisma.member.updateMany({
    where: {
      OR: [
        customerId ? { stripeCustomerId: customerId } : undefined,
        email ? { email } : undefined,
      ].filter(Boolean) as any,
    },
    data: {
      status,
      currentPeriodEnd: periodEnd ?? null,
      stripeCustomerId: customerId ?? undefined,
      stripePriceId: stripePriceId ?? undefined,
      intervalMonths: intervalMonths ?? undefined,
      planLabel: planLabel ?? undefined,
    },
  });
  console.log('[subscription]', { customer: sub.customer, status: sub.status });
}

  
}
