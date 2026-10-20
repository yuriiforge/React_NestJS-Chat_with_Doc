import { useMemo, useState } from 'react'
import type { DocumentSummary } from './api/types'
import { ChatView } from './components/ChatView'
import { DocumentsPanel } from './components/DocumentsPanel'
import { useChat } from './hooks/useChat'
import { useDocuments } from './hooks/useDocuments'
import './App.css'

const App = () => {
  const docs = useDocuments()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const selectedList = useMemo(() => [...selectedIds], [selectedIds])
  const chat = useChat(selectedList)

  const selectedNames = docs.documents
    .filter((d) => selectedIds.has(d.id))
    .map((d) => d.name)
  const count = docs.documents.length
  const scopeLabel = selectedNames.length
    ? `Searching ${selectedNames.join(', ')}`
    : count === 1
      ? 'Searching 1 document'
      : `Searching all ${count} documents`

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
      <main className="main">
        <ChatView
          messages={chat.messages}
          isStreaming={chat.isStreaming}
          hasDocuments={docs.documents.length > 0}
          scopeLabel={scopeLabel}
          onSend={chat.send}
          onStop={chat.stop}
          onReset={chat.reset}
        />
      </main>
    </div>
  )
}

export default App
