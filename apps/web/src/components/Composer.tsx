import { useState, type FormEvent, type KeyboardEvent } from 'react'

interface Props {
  disabled: boolean
  isStreaming: boolean
  placeholder: string
  onSend: (question: string) => void
  onStop: () => void
}

export function Composer({ disabled, isStreaming, placeholder, onSend, onStop }: Props) {
  const [value, setValue] = useState('')
  const canSend = !disabled && !isStreaming && value.trim().length > 0

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!canSend) return
    onSend(value.trim())
    setValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        maxLength={2000}
        aria-label="Your question"
        autoFocus
      />
      {isStreaming ? (
        <button type="button" className="button button--secondary" onClick={onStop}>
          Stop
        </button>
      ) : (
        <button type="submit" className="button" disabled={!canSend}>
          Send
        </button>
      )}
    </form>
  )
}
