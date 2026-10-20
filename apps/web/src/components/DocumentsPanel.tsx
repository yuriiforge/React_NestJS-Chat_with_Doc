import { useRef, useState, type DragEvent } from 'react'
import type { DocumentSummary } from '../api/types'
import type { UploadError } from '../hooks/useDocuments'
import './DocumentsPanel.css'

const ACCEPT = '.pdf,.txt,.md'

interface Props {
  documents: DocumentSummary[]
  loading: boolean
  loadError: string | null
  uploading: string[]
  uploadErrors: UploadError[]
  selectedIds: Set<string>
  onUpload: (files: File[]) => void
  onDelete: (doc: DocumentSummary) => void
  onToggle: (id: string) => void
  onClearSelection: () => void
  onDismissErrors: () => void
  onRetry: () => void
}

export function DocumentsPanel({
  documents,
  loading,
  loadError,
  uploading,
  uploadErrors,
  selectedIds,
  onUpload,
  onDelete,
  onToggle,
  onClearSelection,
  onDismissErrors,
  onRetry,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = [...e.dataTransfer.files]
    if (files.length) onUpload(files)
  }

  return (
    <aside className="docs">
      <header className="docs__header">
        <h2>Documents</h2>
        {selectedIds.size > 0 && (
          <button className="link-button" onClick={onClearSelection}>
            Clear selection
          </button>
        )}
      </header>

      <button
        type="button"
        className={`dropzone${dragging ? ' dropzone--active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <strong>Drop files here</strong> or click to upload
        <span className="muted">PDF, TXT or MD · up to 20 MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          if (files.length) onUpload(files)
        }}
      />

      {uploadErrors.length > 0 && (
        <div className="alert" role="alert">
          {uploadErrors.map((err) => (
            <p key={err.fileName}>
              <strong>{err.fileName}:</strong> {err.message}
            </p>
          ))}
          <button className="link-button" onClick={onDismissErrors}>
            Dismiss
          </button>
        </div>
      )}

      <p className="docs__hint muted">
        {selectedIds.size === 0
          ? 'Questions search all documents. Tick some to narrow it down.'
          : `Questions search ${selectedIds.size} selected document${selectedIds.size > 1 ? 's' : ''}.`}
      </p>

      <ul className="docs__list">
        {uploading.map((name, i) => (
          <li key={`uploading-${i}`} className="doc doc--pending">
            <span className="spinner" aria-hidden />
            <span className="doc__body">
              <span className="doc__name">{name}</span>
              <span className="muted">Reading and indexing…</span>
            </span>
          </li>
        ))}

        {documents.map((doc) => (
          <li key={doc.id} className="doc">
            <input
              type="checkbox"
              aria-label={`Ask about ${doc.name}`}
              checked={selectedIds.has(doc.id)}
              onChange={() => onToggle(doc.id)}
            />
            <span className="doc__body" title={doc.name}>
              <span className="doc__name">{doc.name}</span>
              <span className="muted">
                {formatSize(doc.sizeBytes)} · {doc.chunkCount}{' '}
                {doc.chunkCount === 1 ? 'chunk' : 'chunks'}
              </span>
            </span>
            <button
              className="icon-button"
              aria-label={`Delete ${doc.name}`}
              title="Delete"
              onClick={() => onDelete(doc)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {loading && <p className="muted docs__empty">Loading…</p>}
      {loadError && (
        <div className="alert" role="alert">
          <p>{loadError}</p>
          <button className="link-button" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
      {!loading && !loadError && documents.length === 0 && uploading.length === 0 && (
        <p className="muted docs__empty">No documents yet.</p>
      )}
    </aside>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
