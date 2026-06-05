import React, { useState, useEffect } from 'react'
import type { FinancialDocument, Payslip, Investment, PatrimonioSnapshot } from '../../types'
import { getPayslips } from '../../services/payroll'
import { getAllInvestments } from '../../services/investment'
import { listSnapshots } from '../../services/snapshot'
import { linkDocument } from '../../services/document'

interface DocumentLinkModalProps {
  uid: string
  document: FinancialDocument
  onClose: () => void
  onSuccess: () => void
}

type EntityType = 'payslip' | 'investment' | 'snapshot'
type LinkableEntity = Payslip | Investment | PatrimonioSnapshot

export const DocumentLinkModal: React.FC<DocumentLinkModalProps> = ({
  uid,
  document,
  onClose,
  onSuccess,
}) => {
  const [entityType, setEntityType] = useState<EntityType>('payslip')
  const [entities, setEntities] = useState<LinkableEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState('')

  useEffect(() => {
    const fetchEntities = async () => {
      setLoading(true)
      setEntities([])
      setSelectedEntityId('')

      try {
        if (entityType === 'payslip') {
          const result = await getPayslips(uid)
          if (result.success) setEntities(result.data)
        } else if (entityType === 'investment') {
          const result = await getAllInvestments(uid)
          if (result.success) setEntities(result.data)
        } else if (entityType === 'snapshot') {
          const result = await listSnapshots(uid)
          if (result.success) setEntities(result.data)
        }
      } catch (error) {
        console.error('Error fetching entities:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchEntities()
  }, [uid, entityType])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleLink = async () => {
    if (!selectedEntityId) return

    const result = await linkDocument(uid, document.id, entityType, selectedEntityId)
    if (result.success) {
      onSuccess()
    }
  }

  const renderEntityOption = (entity: LinkableEntity) => {
    if (entityType === 'payslip') {
      const p = entity as Payslip
      return `Cedolino ${p.month}/${p.year} - Netto: €${p.netSalary.toLocaleString('it-IT')}`
    } else if (entityType === 'investment') {
      const i = entity as Investment
      return `${i.name} (${i.broker}) - Valore: €${i.currentValue.toLocaleString('it-IT')}`
    } else if (entityType === 'snapshot') {
      const s = entity as PatrimonioSnapshot
      return `Snapshot ${s.month}/${s.year} - Patrimonio: €${s.patrimonioNetto.toLocaleString('it-IT')}`
    }
    return entity.id
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold">Collega Documento</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-3 rounded text-xs text-blue-800">
            Stai collegando: <strong>{document.fileName}</strong>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo Entità</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
              className="w-full border border-gray-300 rounded p-2 text-sm"
            >
              <option value="payslip">Cedolino</option>
              <option value="investment">Investimento</option>
              <option value="snapshot">Snapshot</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seleziona Elemento</label>
            {loading ? (
              <div className="text-sm text-gray-500 italic py-2">Caricamento...</div>
            ) : (
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 text-sm"
                size={5}
              >
                <option value="">-- Seleziona --</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {renderEntityOption(e)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Annulla
          </button>
          <button
            onClick={() => { void handleLink(); }}
            disabled={!selectedEntityId || loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Conferma Collegamento
          </button>
        </div>
      </div>
    </div>
  )
}
