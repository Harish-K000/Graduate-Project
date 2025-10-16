import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StripeController } from 'src/stripe.controller';
import { StripeService } from 'src/stripe.service';
import { DatabaseModule } from 'src/database/database.module';
import Stripe from 'stripe';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [StripeController],
  providers: [
    StripeService,
    {
      provide: Stripe,
      useFactory: (cfg: ConfigService) =>
        new Stripe(cfg.get<string>('STRIPE_SECRET_KEY')!, {
          apiVersion: cfg.get<string>('STRIPE_API_VERSION') as Stripe.LatestApiVersion | undefined,
        }),
      inject: [ConfigService],
    },
  ],
  exports: [Stripe, StripeService],
})
export class StripeModule {}
