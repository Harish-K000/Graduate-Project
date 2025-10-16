import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { StripeModule } from './stripe/stripe.module';
import { MembersModule } from './members/members.module';
import { DatabaseModule } from './database/database.module';


@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), StripeModule, MembersModule, DatabaseModule],
  controllers: [HealthController],
})
export class AppModule {}
