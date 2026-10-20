import { useState } from 'react'
import type { DocumentSummary } from './api/types'
import { DocumentsPanel } from './components/DocumentsPanel'
import { useDocuments } from './hooks/useDocuments'
import './App.css'

const App = () => {
  const docs = useDocuments()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setSelectedIds((ids) => {
      const next = new Set(ids)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const remove = async (doc: DocumentSummary) => {
    if (!confirm(`Delete "${doc.name}"? Its chunks are removed from search.`)) return
    try {
      await docs.remove(doc.id)
      setSelectedIds((ids) => {
        const next = new Set(ids)
        next.delete(doc.id)
        return next
      })
    } catch (err) {
      alert((err as Error).message)
    }
  }

  return (
    <div className="layout">
      <DocumentsPanel
        documents={docs.documents}
        loading={docs.loading}
        loadError={docs.loadError}
        uploading={docs.uploading}
        uploadErrors={docs.uploadErrors}
        selectedIds={selectedIds}
        onUpload={docs.upload}
        onDelete={remove}
        onToggle={toggle}
        onClearSelection={() => setSelectedIds(new Set())}
        onDismissErrors={docs.dismissUploadErrors}
        onRetry={docs.refresh}
      />
      <main className="main" />
    </div>
  )
}

export default App
