import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { DocumentSummary } from '../api/types'

export interface UploadError {
  fileName: string
  message: string
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string[]>([])
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([])

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .listDocuments()
      .then((docs) => {
        if (cancelled) return
        setDocuments(docs)
        setLoadError(null)
      })
      .catch((err: Error) => !cancelled && setLoadError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const refresh = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    setReloadKey((k) => k + 1)
  }, [])

  const upload = useCallback(async (files: File[]) => {
    setUploadErrors([])
    setUploading((names) => [...names, ...files.map((f) => f.name)])
    // One at a time: embedding runs on the local CPU anyway.
    for (const file of files) {
      try {
        const doc = await api.uploadDocument(file)
        setDocuments((docs) => [doc, ...docs])
      } catch (err) {
        setUploadErrors((errors) => [
          ...errors,
          { fileName: file.name, message: (err as Error).message },
        ])
      } finally {
        setUploading((names) => {
          const i = names.indexOf(file.name)
          return i === -1 ? names : names.toSpliced(i, 1)
        })
      }
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    await api.deleteDocument(id)
    setDocuments((docs) => docs.filter((d) => d.id !== id))
  }, [])

  return {
    documents,
    loading,
    loadError,
    uploading,
    uploadErrors,
    dismissUploadErrors: () => setUploadErrors([]),
    refresh,
    upload,
    remove,
  }
}
