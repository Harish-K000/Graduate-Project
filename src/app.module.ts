import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { StripeModule } from './stripe/stripe.module';
import { MembersModule } from './members/members.module';
import { DatabaseModule } from './database/database.module';
import { BillingController } from './billing/billing.controller';
import { PrismaService } from './database/prisma/prisma.service';


@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), StripeModule, MembersModule, DatabaseModule],
  controllers: [HealthController, BillingController],
  providers: [PrismaService],
})
export class AppModule {}
