import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { APIError } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  page?: string;
  context?: string;
  history?: ChatHistoryMessage[];
}

export interface ChatResponse {
  reply: string;
  meta: {
    source: 'openrouter';
    model: string;
    fallback?: boolean;
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  private client: OpenAI;
  private readonly model: string;
  private readonly timeoutMs = 20000;
  private readonly fallbackReply =
    "Sorry, I'm having trouble right now. Please try again in a moment.";

  constructor(private readonly config: ConfigService) {
    const apiKey =
      this.config.get<string>('OPENROUTER_API_KEY') ??
      process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      this.logger.error('OPENROUTER_API_KEY is not set');
      throw new Error('OPENROUTER_API_KEY is required');
    }

    this.model =
      this.config.get<string>('OPENROUTER_MODEL') ??
      process.env.OPENROUTER_MODEL ??
      'mistralai/mistral-7b-instruct:free';

    const referer =
      this.config.get<string>('OPENROUTER_SITE_URL') ??
      process.env.OPENROUTER_SITE_URL ??
      'http://localhost:3000';

    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': referer,
        'X-Title': 'Depth Training Assistant',
      },
    });

    this.logger.debug(
      `AiService configured for OpenRouter (hasKey=${
        apiKey ? 'yes' : 'no'
      }, model=${this.model}, referer=${referer})`,
    );
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { message, page, context, history } = request;
    this.logger.debug(
      `Chat request len=${message.length}, page=${
        page ?? 'general'
      }, history=${history?.length ?? 0}`,
    );

    const systemPrompt = `
You are the Depth Training & Physiotherapy assistant.

IMPORTANT BEHAVIOUR RULES:
- You are the ASSISTANT, not the user.
- Never write messages as if you were the user (for example: "I've been having some pain...").
- Never invent or simulate user messages or a dialogue between two people.
- Always answer in your own voice, giving guidance, education, and clear next steps.
- If you see tokens like "<s>" or other separators in the input, ignore them.

CLINICAL / SERVICE CONTEXT:
- Focus on physiotherapy, rehabilitation, strength &amp; conditioning, and performance training guidance.
- You are not a doctor—never give a medical diagnosis or prescribe medication.
- Encourage in-person assessments when symptoms persist, worsen, or sound serious.
- If red-flag symptoms appear (severe or sudden pain, chest pain, shortness of breath, loss of consciousness, major head injury, etc.), tell the user to seek urgent medical care or call emergency services.
- Do not invent prices or guarantees; instead, suggest contacting the clinic directly or visiting the booking page for details.
- Be concise, professional, and reference Depth services (physiotherapy, rehab, personal training, small-group training, massage / recovery options) when relevant.

Current page/context: ${page ?? 'general'} ${context ? `| ${context}` : ''}
    `.trim();

    const trimmedHistory = (history ?? []).slice(-6);
    const historyMessages: ChatCompletionMessageParam[] = trimmedHistory.map(
      (entry) => ({
        role: entry.role,
        content: entry.content,
      }),
    );

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: message },
    ];

    const payload = {
      model: this.model,
      messages,
      temperature: 0.4,
      max_tokens: 450,
    };

    this.logger.debug(
      `OpenRouter payload summary: ${JSON.stringify({
        model: payload.model,
        messageCount: payload.messages.length,
        temperature: payload.temperature,
      })}`,
    );

    try {
      const completion = await this.resolveWithTimeout(
        this.client.chat.completions.create(payload),
      );

      this.logger.debug(
        `OpenRouter response summary: ${JSON.stringify({
          id: completion.id,
          created: completion.created,
          finishReason: completion.choices[0]?.finish_reason,
          usage: completion.usage,
        })}`,
      );

      const raw = completion.choices[0]?.message?.content ?? '';
      const cleaned = raw
        .replace(/\[B_INST\]/g, '')
        .replace(/\[\/B_INST\]/g, '')
        .replace(/<\|im_start\|>/g, '')
        .replace(/<\|im_end\|>/g, '')
        .replace(/^\s*(\[\/s\]|<\/s>|<s>)\s*/i, '')
        .trim();

      return {
        reply: cleaned.length ? cleaned : this.fallbackReply,
        meta: {
          source: 'openrouter',
          model: this.model,
        },
      };
    } catch (error) {
      this.logOpenAIError(error);
      return {
        reply: this.fallbackReply,
        meta: {
          source: 'openrouter',
          model: this.model,
          fallback: true,
        },
      };
    }
  }

  async triage(input: {
    bodyArea: string;
    painType?: string;
    duration?: string;
    goals?: string;
  }): Promise<string> {
    const { bodyArea, painType, duration, goals } = input;

    const systemPrompt = `
You are an AI triage assistant for a physiotherapy &amp; performance centre.
Your job:
- Help users choose which *type of service* might fit (e.g., physiotherapy, rehab, strength training, massage).
- Be conservative and safe: for serious symptoms, suggest seeing a doctor / ER.
- Reply in 2–3 short paragraphs, plus a bullet list of recommended services at the end.
Do NOT claim you are giving a medical diagnosis.
    `.trim();

    const userContent = `
Body Area: ${bodyArea}
Pain Type: ${painType || 'not specified'}
Duration: ${duration || 'not specified'}
Goals: ${goals || 'not specified'}

Based on this, which type of service at a clinic like Depth Training would you suggest and why?
    `.trim();

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      max_tokens: 450,
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    const cleaned = raw
      .replace(/\[B_INST\]/g, '')
      .replace(/\[\/B_INST\]/g, '')
      .replace(/<\|im_start\|>/g, '')
      .replace(/<\|im_end\|>/g, '')
      .replace(/^\s*(\[\/s\]|<\/s>|<s>)\s*/i, '')
      .trim();

    return cleaned;
  }

  private async resolveWithTimeout<T>(promise: Promise<T>): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error('OpenRouter request timed out'));
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private logOpenAIError(error: unknown) {
    if (error instanceof APIError) {
      this.logger.error(
        `OpenRouter API error status=${error.status} type=${
          error.type ?? 'unknown'
        } body=${JSON.stringify(error.error)}`,
      );
      return;
    }

    if (error instanceof Error) {
      this.logger.error(`OpenRouter chat error: ${error.message}`, error.stack);
      return;
    }

    this.logger.error(`OpenRouter chat error: ${JSON.stringify(error)}`);
  }
}
