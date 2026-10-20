import { parseSse } from './sse'
import type { ChatRequest, ChatStreamEvent, DocumentSummary } from './types'

const BASE = '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init)
  if (!res.ok) throw await toApiError(res)
  return (res.status === 204 ? undefined : await res.json()) as T
}

async function toApiError(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status})`
  try {
    const body = await res.json()
    if (Array.isArray(body.message)) message = body.message.join(', ')
    else if (typeof body.message === 'string') message = body.message
  } catch {
    // not JSON, e.g. the dev proxy can't reach the API
  }
  if (res.status === 502 || res.status === 504) {
    message = 'Cannot reach the API. Is the backend running?'
  }
  return new ApiError(res.status, message)
}

export const api = {
  listDocuments: () => request<DocumentSummary[]>('/documents'),

  uploadDocument(file: File) {
    const body = new FormData()
    body.append('file', file)
    return request<DocumentSummary>('/documents', { method: 'POST', body })
  },

  deleteDocument: (id: string) =>
    request<void>(`/documents/${id}`, { method: 'DELETE' }),

  async *streamChat(
    body: ChatRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent> {
    const res = await fetch(`${BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok || !res.body) throw await toApiError(res)

    for await (const { event, data } of parseSse(res.body)) {
      yield { type: event, ...JSON.parse(data) } as ChatStreamEvent
    }
  },
}
