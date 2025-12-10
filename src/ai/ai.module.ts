import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { RecommenderService } from '../recommender/recommender.service';

@Module({
  providers: [AiService, RecommenderService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
