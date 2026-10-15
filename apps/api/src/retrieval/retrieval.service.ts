import { Injectable } from '@nestjs/common';
import { toPgVector } from '../common/pgvector.js';
import { DatabaseService } from '../database/database.service.js';
import { LlmService } from '../llm/llm.service.js';

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentName: string;
  page: number | null;
  content: string;
  /** Cosine similarity, 1 = identical. */
  score: number;
}

export interface SearchOptions {
  limit?: number;
  /** Restrict the search to these documents. */
  documentIds?: string[];
}

@Injectable()
export class RetrievalService {
  constructor(
    private readonly db: DatabaseService,
    private readonly llm: LlmService,
  ) {}

  async search(
    query: string,
    { limit = 5, documentIds }: SearchOptions = {},
  ): Promise<RetrievedChunk[]> {
    const embedding = toPgVector(await this.llm.embedQuery(query));

    const { rows } = await this.db.query<RetrievedChunk>(
      `SELECT c.id AS "chunkId", c.document_id AS "documentId",
              d.name AS "documentName", c.page, c.content,
              1 - (c.embedding <=> $1::vector) AS score
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE $3::uuid[] IS NULL OR c.document_id = ANY($3::uuid[])
       ORDER BY c.embedding <=> $1::vector
       LIMIT $2`,
      [embedding, limit, documentIds?.length ? documentIds : null],
    );
    return rows;
  }
}
