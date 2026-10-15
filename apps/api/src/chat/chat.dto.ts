import { z } from 'zod';

export const chatRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  /** Previous turns, oldest first. */
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(8000),
      }),
    )
    .max(50)
    .default([]),
  /** Restrict retrieval to these documents. */
  documentIds: z.array(z.uuid()).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export interface ChatSource {
  /** Citation number used in the answer, e.g. [1]. */
  n: number;
  documentId: string;
  documentName: string;
  page: number | null;
  content: string;
  score: number;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}
