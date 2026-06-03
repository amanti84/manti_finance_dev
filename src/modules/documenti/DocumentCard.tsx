import React, { useState, useEffect } from 'react'
import { Timestamp } from 'firebase/firestore'
import type { FinancialDocument, DocumentType } from '../../types'
import { classifyDocument, deleteDocument, updateDocumentNote } from '../../services/document'

interface DocumentCardProps {
  uid: string
  document: FinancialDocument
  onUpdate: () => void
  onLink: (doc: FinancialDocument) => void
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ uid, document, onUpdate, onLink }) => {
  const [isClassifying, setIsClassifying] = useState(false)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [newType, setNewType] = useState<DocumentType>(document.type)
  const [newNote, setNewNote] = useState(document.note ?? '')
  const [docDate, setDocDate] = useState(
    document.documentDate
      ? (document.documentDate instanceof Timestamp
          ? document.documentDate.toDate()
          : new Date(document.documentDate)
        ).toISOString().split('T')[0]
      : ''
  )

  // Sync state when document prop changes
  useEffect(() => {
    setNewType(document.type)
    setNewNote(document.note ?? '')
    setDocDate(
      document.documentDate
        ? (document.documentDate instanceof Timestamp
            ? document.documentDate.toDate()
            : new Date(document.documentDate)
          ).toISOString().split('T')[0]
        : ''
    )
  }, [document])

  const handleClassify = async () => {
    const result = await classifyDocument(
      uid,
      document.id,
      newType,
      docDate ? new Date(docDate) : undefined
    )
    if (result.success) {
      setIsClassifying(false)
      onUpdate()
    }
  }

  const handleSaveNote = async () => {
    const result = await updateDocumentNote(uid, document.id, newNote)
    if (result.success) {
      setIsEditingNote(false)
      onUpdate()
    }
  }

  const handleDelete = async () => {
    if (window.confirm(`Sei sicuro di voler eliminare "${document.fileName}"?`)) {
      const result = await deleteDocument(uid, document.id)
      if (result.success) {
        onUpdate()
      }
    }
  }

  const getStatusBadge = () => {
    switch (document.status) {
      case 'linked':
        return (
          <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded uppercase">
            Collegato
          </span>
        )
      case 'classified':
        return (
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded uppercase">
            Classificato
          </span>
        )
      default:
        return (
          <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-0.5 rounded uppercase">
            Caricato
          </span>
        )
    }
  }

  const getTypeLabel = (type: DocumentType) => {
    switch (type) {
      case 'cedolino':
        return 'Cedolino'
      case 'estratto_conto':
        return 'Estratto Conto'
      case 'conferma_investimento':
        return 'Conferma Investimento'
      default:
        return 'Altro'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate" title={document.fileName}>
            {document.fileName}
          </h3>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs text-gray-500">{getTypeLabel(document.type)}</span>
            {getStatusBadge()}
          </div>
        </div>
        <div className="flex space-x-2">
          <a
            href={document.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
            title="Download"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </a>
          <button
            onClick={() => {
              void handleDelete()
            }}
            className="text-red-600 hover:text-red-800"
            title="Elimina"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        {document.documentDate ? (
          <p>
            Data documento:{' '}
            {(document.documentDate instanceof Timestamp
              ? document.documentDate.toDate()
              : new Date(document.documentDate)
            ).toLocaleDateString('it-IT')}
          </p>
        ) : (
          <p>Caricato il: {document.createdAt.toDate().toLocaleDateString('it-IT')}</p>
        )}
        <p>Dimensione: {(document.fileSize / 1024).toFixed(1)} KB</p>
      </div>

      {isEditingNote ? (
        <div className="mb-3">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded p-1"
            rows={2}
            placeholder="Aggiungi una nota..."
          />
          <div className="flex justify-end space-x-1 mt-1">
            <button
              onClick={() => setIsEditingNote(false)}
              className="text-xs text-gray-500"
            >
              Annulla
            </button>
            <button
              onClick={() => {
                void handleSaveNote()
              }}
              className="text-xs text-blue-600 font-bold"
            >
              Salva
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3 group relative">
          <p className="text-xs text-gray-700 italic">
            {document.note ?? 'Nessuna nota'}
            <button
              onClick={() => setIsEditingNote(true)}
              className="ml-2 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Modifica
            </button>
          </p>
        </div>
      )}

      {document.linkedEntityType && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
          <span className="font-bold uppercase text-[10px] text-gray-400 block">Collegato a:</span>
          {document.linkedEntityType}: {document.linkedEntityId}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => setIsClassifying(!isClassifying)}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          {isClassifying ? 'Chiudi' : 'Classifica'}
        </button>
        <button
          onClick={() => onLink(document)}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Collega entità
        </button>
      </div>

      {isClassifying && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Tipo</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as DocumentType)}
              className="w-full text-xs border border-gray-300 rounded p-1"
            >
              <option value="altro">Altro</option>
              <option value="cedolino">Cedolino</option>
              <option value="estratto_conto">Estratto Conto</option>
              <option value="conferma_investimento">Conferma Investimento</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">
              Data Documento
            </label>
            <input
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded p-1"
            />
          </div>
          <button
            onClick={() => {
              void handleClassify()
            }}
            className="w-full bg-blue-600 text-white text-xs font-bold py-1.5 rounded hover:bg-blue-700"
          >
            Aggiorna Classificazione
          </button>
        </div>
      )}
    </div>
  )
}
