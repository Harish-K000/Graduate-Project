import { Body, Controller, Post } from '@nestjs/common';
import { AiService, ChatResponse } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { TriageDto } from './dto/triage.dto';
import { RecommendDto } from './dto/recommend.dto';
import { RecommenderService } from '../recommender/recommender.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly recommender: RecommenderService,
  ) {}

  @Post('chat')
  async chat(@Body() dto: ChatDto): Promise<ChatResponse> {
    return this.aiService.chat({
      message: dto.message,
      page: dto.page,
      context: dto.context,
      history: dto.history,
    });
  }

  @Post('diagnostic')
  async diagnostic(@Body() dto: TriageDto) {
    const reply = await this.aiService.triage({
      bodyArea: dto.bodyArea,
      painType: dto.painType,
      duration: dto.duration,
      goals: dto.goals,
    });

    return {
      bodyArea: dto.bodyArea,
      advice: reply,
    };
  }

  @Post('recommend')
  recommend(@Body() dto: RecommendDto) {
    const result = this.recommender.recommend(dto);

    const message = [
      `Based on what you've told me, **${result.topService.name}** is the best first step.`,
      '',
      result.topService.why,
      '',
      '**Next steps:**',
      ...result.topService.nextSteps.map((step) => `- ${step}`),
    ].join('\n');

    return {
      message,
      raw: result,
    };
  }
}
