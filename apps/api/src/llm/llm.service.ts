import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';

export const OLLAMA_CLIENT = Symbol('OLLAMA_CLIENT');

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// nomic-embed-text is trained with task prefixes; omitting them hurts retrieval.
const DOCUMENT_PREFIX = 'search_document: ';
const QUERY_PREFIX = 'search_query: ';
const EMBED_BATCH_SIZE = 32;

@Injectable()
export class LlmService {
  private readonly chatModel: string;
  private readonly embedModel: string;

  constructor(
    @Inject(OLLAMA_CLIENT) private readonly ollama: Ollama,
    config: ConfigService,
  ) {
    this.chatModel = config.get('OLLAMA_CHAT_MODEL', 'llama3.2:3b');
    this.embedModel = config.get('OLLAMA_EMBED_MODEL', 'nomic-embed-text');
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const result: number[][] = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
      const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
      const { embeddings } = await this.ollama.embed({
        model: this.embedModel,
        input: batch.map((t) => DOCUMENT_PREFIX + t),
      });
      result.push(...embeddings);
    }
    return result;
  }

  async embedQuery(query: string): Promise<number[]> {
    const { embeddings } = await this.ollama.embed({
      model: this.embedModel,
      input: QUERY_PREFIX + query,
    });
    return embeddings[0];
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const response = await this.ollama.chat({
      model: this.chatModel,
      messages,
    });
    return response.message.content;
  }

  async *chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
    const stream = await this.ollama.chat({
      model: this.chatModel,
      messages,
      stream: true,
    });
    for await (const part of stream) {
      if (part.message.content) yield part.message.content;
    }
  }
}
