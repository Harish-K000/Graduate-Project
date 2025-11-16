import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsString,
  Matches,
} from 'class-validator';

class CheckoutDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^price_/i, { message: 'priceId must be a valid Stripe price id (starts with "price_")' })
  priceId!: string;

  @IsString()
  @IsIn(['3-month', '6-month', '8-month', '12-month'])
  planLabel!: string;

  @IsInt()
  @IsIn([3, 6, 8, 12])
  intervalMonths!: number;
}

@Controller('billing')
export class BillingController {
  constructor(
    private readonly stripe: Stripe,
    private readonly cfg: ConfigService,
  ) {}

  @Post('checkout')
  async createCheckout(@Body() dto: CheckoutDto) {
    console.log('checkout dto ->', dto);
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: dto.email,
      line_items: [{ price: dto.priceId, quantity: 1 }],
      metadata: {
        priceId: dto.priceId,
        planLabel: dto.planLabel,
        intervalMonths: String(dto.intervalMonths),
      },
      subscription_data: {
        metadata: {
          priceId: dto.priceId,
          planLabel: dto.planLabel,
          intervalMonths: String(dto.intervalMonths),
        },
      },
      success_url:
        this.cfg.get<string>('SUCCESS_URL') ??
        'http://localhost:3001/health',
      cancel_url:
        this.cfg.get<string>('CANCEL_URL') ?? 'http://localhost:3001/health',
    });
    
    return { id: session.id, url: session.url };
    }
}
