import { useEffect, useRef } from 'react'
import type { Message } from '../hooks/useChat'
import { AssistantAnswer } from './AssistantAnswer'
import { Composer } from './Composer'
import './ChatView.css'

const EXAMPLES = [
  'Summarize the key points',
  'What are the main rules or requirements?',
  'What does it say about deadlines?',
]

interface Props {
  messages: Message[]
  isStreaming: boolean
  hasDocuments: boolean
  scopeLabel: string
  onSend: (question: string) => void
  onStop: () => void
  onReset: () => void
}

export function ChatView({
  messages,
  isStreaming,
  hasDocuments,
  scopeLabel,
  onSend,
  onStop,
  onReset,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const lastContent = messages.at(-1)?.content

  // Follow the answer as it streams, unless the user scrolled up to read.
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom || isStreaming) el.scrollTo({ top: el.scrollHeight })
  }, [messages.length, lastContent, isStreaming])

  return (
    <section className="chat">
      <header className="chat__header">
        <div>
          <h1>Chat with your docs</h1>
          <p className="muted">{scopeLabel}</p>
        </div>
        {messages.length > 0 && (
          <button className="button button--secondary" onClick={onReset}>
            New chat
          </button>
        )}
      </header>

      <div className="chat__messages" ref={listRef}>
        {messages.length === 0 ? (
          <div className="chat__empty">
            {hasDocuments ? (
              <>
                <p>Ask anything about your documents. Answers cite their sources.</p>
                <div className="chat__examples">
                  {EXAMPLES.map((q) => (
                    <button key={q} className="chip" onClick={() => onSend(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p>Upload a PDF, TXT or Markdown file to start asking questions.</p>
            )}
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>

      <Composer
        disabled={!hasDocuments}
        isStreaming={isStreaming}
        placeholder={hasDocuments ? 'Ask a question…  (Shift+Enter for a new line)' : 'Upload a document first'}
        onSend={onSend}
        onStop={onStop}
      />
    </section>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const waiting = message.status === 'streaming' && !message.content

  return (
    <article className={`message message--${message.role}`}>
      <div className="message__bubble">
        {waiting ? (
          <span className="typing" aria-label="Thinking">
            <span />
            <span />
            <span />
          </span>
        ) : message.role === 'assistant' ? (
          <AssistantAnswer
            content={message.content}
            sources={message.sources ?? []}
            streaming={message.status === 'streaming'}
          />
        ) : (
          <p className="message__text">{message.content}</p>
        )}
        {message.status === 'stopped' && <p className="message__note muted">Stopped</p>}
        {message.status === 'error' && (
          <p className="message__note message__note--error">{message.error}</p>
        )}
      </div>
    </article>
  )
}
