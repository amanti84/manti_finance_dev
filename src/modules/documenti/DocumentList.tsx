import React, { useState } from 'react'
import type { FinancialDocument, DocumentType, DocumentStatus } from '../../types'
import { DocumentCard } from './DocumentCard'

interface DocumentListProps {
  uid: string
  documents: FinancialDocument[]
  loading: boolean
  onUpdate: () => void
  onLink: (doc: FinancialDocument) => void
}

export const DocumentList: React.FC<DocumentListProps> = ({
  uid,
  documents,
  loading,
  onUpdate,
  onLink,
}) => {
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | 'all'>('all')

  const filteredDocuments = documents.filter((doc) => {
    const typeMatch = filterType === 'all' || doc.type === filterType
    const statusMatch = filterStatus === 'all' || doc.status === filterStatus
    return typeMatch && statusMatch
  })

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 h-32 rounded-lg"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tipo</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as DocumentType | 'all')}
            className="text-sm border border-gray-300 rounded p-1"
          >
            <option value="all">Tutti</option>
            <option value="cedolino">Cedolino</option>
            <option value="estratto_conto">Estratto Conto</option>
            <option value="conferma_investimento">Conferma Investimento</option>
            <option value="altro">Altro</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Stato</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as DocumentStatus | 'all')}
            className="text-sm border border-gray-300 rounded p-1"
          >
            <option value="all">Tutti</option>
            <option value="uploaded">Caricato</option>
            <option value="classified">Classificato</option>
            <option value="linked">Collegato</option>
          </select>
        </div>
        <div className="flex-1 text-right self-end text-xs text-gray-500">
          Mostrando {filteredDocuments.length} di {documents.length} documenti
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-12 text-center text-gray-500">
          <p>Nessun documento trovato.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              uid={uid}
              document={doc}
              onUpdate={onUpdate}
              onLink={onLink}
            />
          ))}
        </div>
      )}
    </div>
  )
}
