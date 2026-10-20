import { useCallback, useRef, useState } from 'react'
import { api } from '../api/client'
import type { ChatSource, HistoryMessage } from '../api/types'

export type MessageStatus = 'streaming' | 'done' | 'stopped' | 'error'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
  status: MessageStatus
  error?: string
}

export function useChat(documentIds: string[]) {
  const [messages, setMessages] = useState<Message[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const isStreaming = messages.some((m) => m.status === 'streaming')

  const update = (id: string, patch: (m: Message) => Partial<Message>) =>
    setMessages((msgs) =>
      msgs.map((m) => (m.id === id ? { ...m, ...patch(m) } : m)),
    )

  const send = useCallback(
    async (question: string) => {
      // Only completed turns go back to the model as history.
      const history: HistoryMessage[] = messages
        .filter((m) => m.status === 'done' && m.content)
        .map(({ role, content }) => ({ role, content }))

      const assistantId = crypto.randomUUID()
      setMessages((msgs) => [
        ...msgs,
        { id: crypto.randomUUID(), role: 'user', content: question, status: 'done' },
        { id: assistantId, role: 'assistant', content: '', status: 'streaming' },
      ])

      const abort = new AbortController()
      abortRef.current = abort
      try {
        const stream = api.streamChat(
          {
            question,
            history,
            documentIds: documentIds.length ? documentIds : undefined,
          },
          abort.signal,
        )
        for await (const event of stream) {
          if (event.type === 'sources') update(assistantId, () => ({ sources: event.sources }))
          else if (event.type === 'token') update(assistantId, (m) => ({ content: m.content + event.text }))
          else if (event.type === 'error') throw new Error(event.message)
        }
        update(assistantId, () => ({ status: 'done' }))
      } catch (err) {
        if (abort.signal.aborted) {
          update(assistantId, () => ({ status: 'stopped' }))
        } else {
          update(assistantId, () => ({ status: 'error', error: (err as Error).message }))
        }
      } finally {
        if (abortRef.current === abort) abortRef.current = null
      }
    },
    [messages, documentIds],
  )

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
  }, [])

  return { messages, isStreaming, send, stop, reset }
}
