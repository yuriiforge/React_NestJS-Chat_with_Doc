import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { LlmService, OLLAMA_CLIENT } from './llm.service.js';

@Global()
@Module({
  providers: [
    {
      provide: OLLAMA_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Ollama({
          host: config.get('OLLAMA_HOST', 'http://localhost:11434'),
        }),
    },
    LlmService,
  ],
  exports: [LlmService],
})
export class LlmModule {}
