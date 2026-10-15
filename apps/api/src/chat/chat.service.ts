import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmService } from '../llm/llm.service.js';
import { RetrievalService } from '../retrieval/retrieval.service.js';
import type { ChatRequest, ChatResponse, ChatSource } from './chat.dto.js';
import { buildMessages, NO_CONTEXT_ANSWER } from './prompt.js';

@Injectable()
export class ChatService {
  private readonly topK: number;
  private readonly minScore: number;

  constructor(
    private readonly retrieval: RetrievalService,
    private readonly llm: LlmService,
    config: ConfigService,
  ) {
    this.topK = Number(config.get('RAG_TOP_K', 5));
    this.minScore = Number(config.get('RAG_MIN_SCORE', 0.5));
  }

  async ask({
    question,
    history,
    documentIds,
  }: ChatRequest): Promise<ChatResponse> {
    const sources = await this.retrieve(question, documentIds);
    if (sources.length === 0) {
      return { answer: NO_CONTEXT_ANSWER, sources };
    }

    const answer = await this.llm.chat(
      buildMessages(question, sources, history),
    );
    return { answer, sources };
  }

  private async retrieve(
    question: string,
    documentIds?: string[],
  ): Promise<ChatSource[]> {
    const chunks = await this.retrieval.search(question, {
      limit: this.topK,
      documentIds,
    });
    return chunks
      .filter((c) => c.score >= this.minScore)
      .map((c, i) => ({
        n: i + 1,
        documentId: c.documentId,
        documentName: c.documentName,
        page: c.page,
        content: c.content,
        score: c.score,
      }));
  }
}
