import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Body } from '@nestjs/common';
import * as express from 'express';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

async function bootstrap() {
  // IMPORTANT: rawBody must be enabled at app creation
  const app = await NestFactory.create(AppModule, { 
    bodyParser: false,
  });

  // Use raw parser ONLY for the Stripe webhook endpoint
  app.use('/stripe/webhook',
    express.raw({ type: 'application/json' }),
    (req, _res, next) => {
      (req as any).rawBody = (req as any).body;
      next();
    },
  );

  // JSON parser for everthing else
  app.use(express.json());

  //Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validateCustomDecorators: true,
    }));
  
  app.useGlobalFilters(new PrismaExceptionFilter());
  // If you add global pipes/middlewares later, keep them AFTER the raw parser line above
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
  console.log(`listening on port 3001 right =>`);
  
}
bootstrap();

