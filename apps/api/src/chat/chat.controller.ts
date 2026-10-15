import { Body, Controller, HttpCode, Logger, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  chatRequestSchema,
  type ChatRequest,
  type ChatStreamEvent,
} from './chat.dto.js';
import { ChatService } from './chat.service.js';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chat: ChatService) {}

  @Post()
  @HttpCode(200)
  ask(@Body(new ZodValidationPipe(chatRequestSchema)) body: ChatRequest) {
    return this.chat.ask(body);
  }

  /**
   * Streams the answer as Server-Sent Events. It is a POST (the question and
   * history go in the body), so clients read it with fetch(), not EventSource.
   */
  @Post('stream')
  async stream(
    @Body(new ZodValidationPipe(chatRequestSchema)) body: ChatRequest,
    @Res() res: Response,
  ): Promise<void> {
    res.status(200).set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    const abort = new AbortController();
    res.on('close', () => abort.abort());

    const send = (event: ChatStreamEvent) => {
      const { type, ...data } = event;
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      for await (const event of this.chat.askStream(body, abort.signal)) {
        if (abort.signal.aborted) break;
        send(event);
      }
    } catch (err) {
      if (!abort.signal.aborted) {
        this.logger.error((err as Error).message, (err as Error).stack);
        send({ type: 'error', message: 'Failed to generate an answer' });
      }
    } finally {
      res.end();
    }
  }
}
