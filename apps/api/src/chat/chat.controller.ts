import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { chatRequestSchema, type ChatRequest } from './chat.dto.js';
import { ChatService } from './chat.service.js';

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  @HttpCode(200)
  ask(@Body(new ZodValidationPipe(chatRequestSchema)) body: ChatRequest) {
    return this.chat.ask(body);
  }
}
