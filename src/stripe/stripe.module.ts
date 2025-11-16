import { PrismaService } from 'src/database/prisma/prisma.service';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StripeController } from 'src/stripe.controller';
import { StripeService } from 'src/stripe.service';
import Stripe from 'stripe';

@Module({
    imports: [ConfigModule],
    controllers:[StripeController],
    providers:[
        PrismaService,
        StripeService,
        {
            provide: Stripe,
            useFactory: (cfg: ConfigService) =>
                new Stripe(cfg.get<string>('STRIPE_SECRET_KEY')!,{
                    //apiVersion: '2024-06-20',
                }),
                inject:[ConfigService],
        },
    ],
    exports:[Stripe, StripeService],
})
export class StripeModule {}
