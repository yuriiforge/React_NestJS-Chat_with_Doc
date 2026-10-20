import { useMemo, useState } from 'react'
import type { ChatSource } from '../api/types'
import { citedNumbers, splitCitations } from './citations'

interface Props {
  content: string
  sources: ChatSource[]
  streaming: boolean
}

export function AssistantAnswer({ content, sources, streaming }: Props) {
  const [openN, setOpenN] = useState<number | null>(null)
  const known = useMemo(() => new Set(sources.map((s) => s.n)), [sources])
  const parts = splitCitations(content, known)

  // Show what the answer cited; if it cited nothing, show what it was given.
  const cited = citedNumbers(content, known)
  const listed = cited.length
    ? cited.map((n) => sources.find((s) => s.n === n)!)
    : sources
  const open = sources.find((s) => s.n === openN)

  const toggle = (n: number) => setOpenN((current) => (current === n ? null : n))

  return (
    <>
      <p className="message__text">
        {parts.map((part, i) =>
          part.type === 'text' ? (
            part.text
          ) : (
            <button
              key={i}
              type="button"
              className={`cite${openN === part.n ? ' cite--active' : ''}`}
              onClick={() => toggle(part.n)}
              aria-label={`Show source ${part.n}`}
            >
              {part.n}
            </button>
          ),
        )}
      </p>

      {!streaming && listed.length > 0 && (
        <div className="sources">
          <p className="sources__title muted">
            {cited.length ? 'Sources' : 'Related passages'}
          </p>
          <ul className="sources__list">
            {listed.map((s) => (
              <li key={s.n}>
                <button
                  type="button"
                  className={`source${openN === s.n ? ' source--active' : ''}`}
                  onClick={() => toggle(s.n)}
                  aria-expanded={openN === s.n}
                >
                  <span className="cite">{s.n}</span>
                  <span className="source__name">{s.documentName}</span>
                  {s.page && <span className="muted">p. {s.page}</span>}
                </button>
              </li>
            ))}
          </ul>
          {open && (
            <blockquote className="passage">
              <header className="muted">
                {open.documentName}
                {open.page ? `, page ${open.page}` : ''} · {Math.round(open.score * 100)}% match
              </header>
              <p>{open.content}</p>
            </blockquote>
          )}
        </div>
      )}
    </>
  )
}
