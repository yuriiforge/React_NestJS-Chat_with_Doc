import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { ChatModule } from './chat/chat.module.js';
import { DatabaseModule } from './database/database.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { LlmModule } from './llm/llm.module.js';
import { RetrievalModule } from './retrieval/retrieval.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    LlmModule,
    DocumentsModule,
    RetrievalModule,
    ChatModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
