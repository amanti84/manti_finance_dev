import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { listDocuments } from '../../services/document'
import type { FinancialDocument } from '../../types'
import { withRetry } from '../../utils/withRetry'
import { ErrorCard } from '../../components/ui'
import { DocumentUploader } from './DocumentUploader'
import { DocumentList } from './DocumentList'
import { DocumentLinkModal } from './DocumentLinkModal'

export const DocumentiPage: React.FC = () => {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<FinancialDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [linkingDocument, setLinkingDocument] = useState<FinancialDocument | null>(null)

  const fetchDocuments = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const result = await withRetry(() => listDocuments(user.uid))
    if (result.success) {
      setDocuments(result.data ?? [])
    } else {
      setError(result.error)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    void fetchDocuments()
  }, [fetchDocuments])

  if (!user) return null

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Documenti</h1>
        <button
          onClick={() => {
            void fetchDocuments()
          }}
          className="text-sm text-blue-600 hover:underline"
        >
          Aggiorna lista
        </button>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorCard message={error} onRetry={() => { void fetchDocuments(); }} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <DocumentUploader
            uid={user.uid}
            onUploadSuccess={() => {
              void fetchDocuments()
            }}
          />

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="text-sm font-bold text-blue-800 mb-2">Informazioni</h3>
            <ul className="text-xs text-blue-700 space-y-2 list-disc list-inside">
              <li>Formati supportati: PDF, JPEG, PNG</li>
              <li>Dimensione massima: 10MB per file</li>
              <li>I documenti vengono classificati manualmente dopo l&apos;upload</li>
              <li>È possibile collegare i documenti a cedolini o investimenti</li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2">
          <DocumentList
            uid={user.uid}
            documents={documents}
            loading={loading}
            onUpdate={() => {
              void fetchDocuments()
            }}
            onLink={setLinkingDocument}
          />
        </div>
      </div>

      {linkingDocument && (
        <DocumentLinkModal
          uid={user.uid}
          document={linkingDocument}
          onClose={() => setLinkingDocument(null)}
          onSuccess={() => {
            setLinkingDocument(null)
            void fetchDocuments()
          }}
        />
      )}
    </div>
  )
}
