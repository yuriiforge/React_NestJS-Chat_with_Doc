import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { toPgVector } from '../common/pgvector.js';
import { DatabaseService } from '../database/database.service.js';
import { LlmService } from '../llm/llm.service.js';
import { chunkPages } from './ingestion/chunk-text.js';
import {
  extractText,
  UnsupportedFileTypeError,
} from './ingestion/extract-text.js';

export interface DocumentSummary {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  chunkCount: number;
  createdAt: Date;
}

export interface UploadedDocument {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

const SELECT_SUMMARY = `
  SELECT d.id, d.name, d.mime_type AS "mimeType", d.size_bytes AS "sizeBytes",
         d.created_at AS "createdAt", count(c.id)::int AS "chunkCount"
  FROM documents d
  LEFT JOIN chunks c ON c.document_id = d.id`;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly llm: LlmService,
  ) {}

  async ingest(file: UploadedDocument): Promise<DocumentSummary> {
    const pages = await this.extract(file);
    const chunks = await chunkPages(pages);
    if (chunks.length === 0) {
      throw new UnprocessableEntityException(
        'No extractable text found. Scanned PDFs (images only) are not supported.',
      );
    }

    // Embed before opening the transaction: it is by far the slowest step.
    const started = Date.now();
    const embeddings = await this.llm.embedDocuments(
      chunks.map((c) => c.content),
    );
    this.logger.log(
      `Embedded ${chunks.length} chunks of "${file.originalName}" in ${Date.now() - started}ms`,
    );

    const id = await this.db.transaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO documents (name, mime_type, size_bytes)
         VALUES ($1, $2, $3) RETURNING id`,
        [file.originalName, file.mimeType, file.buffer.length],
      );
      const documentId = rows[0].id;

      await client.query(
        `INSERT INTO chunks (document_id, chunk_index, page, content, embedding)
         SELECT $1, t.chunk_index, t.page, t.content, t.embedding::vector
         FROM unnest($2::int[], $3::int[], $4::text[], $5::text[])
           AS t(chunk_index, page, content, embedding)`,
        [
          documentId,
          chunks.map((c) => c.chunkIndex),
          chunks.map((c) => c.page),
          chunks.map((c) => c.content),
          embeddings.map(toPgVector),
        ],
      );
      return documentId;
    });

    return this.findOne(id);
  }

  async findAll(): Promise<DocumentSummary[]> {
    const { rows } = await this.db.query<DocumentSummary>(
      `${SELECT_SUMMARY} GROUP BY d.id ORDER BY d.created_at DESC`,
    );
    return rows;
  }

  async findOne(id: string): Promise<DocumentSummary> {
    const { rows } = await this.db.query<DocumentSummary>(
      `${SELECT_SUMMARY} WHERE d.id = $1 GROUP BY d.id`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('Document not found');
    return rows[0];
  }

  async remove(id: string): Promise<void> {
    const { rowCount } = await this.db.query(
      'DELETE FROM documents WHERE id = $1',
      [id],
    );
    if (!rowCount) throw new NotFoundException('Document not found');
  }

  private async extract(file: UploadedDocument) {
    try {
      return await extractText(file.originalName, file.buffer);
    } catch (err) {
      if (err instanceof UnsupportedFileTypeError) {
        throw new UnsupportedMediaTypeException(err.message);
      }
      throw new UnprocessableEntityException(
        `Could not read "${file.originalName}": ${(err as Error).message}`,
      );
    }
  }
}
