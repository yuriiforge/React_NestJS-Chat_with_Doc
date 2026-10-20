// Mirrors the response shapes of apps/api (documents.service.ts, chat.dto.ts).

export interface DocumentSummary {
  id: string
  name: string
  mimeType: string
  sizeBytes: number
  chunkCount: number
  createdAt: string
}

export interface ChatSource {
  /** Citation number used in the answer, e.g. [1]. */
  n: number
  documentId: string
  documentName: string
  page: number | null
  content: string
  score: number
}

export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  question: string
  history?: HistoryMessage[]
  documentIds?: string[]
}

export type ChatStreamEvent =
  | { type: 'sources'; sources: ChatSource[] }
  | { type: 'token'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
