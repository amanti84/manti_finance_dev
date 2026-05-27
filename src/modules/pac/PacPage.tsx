import type { FC } from 'react'
import { useState, useCallback } from 'react'
import type { Investment } from '../../types'
import { PacForm } from './PacForm'
import { PacList } from './PacList'
import { PacDetail } from './PacDetail'

type ViewMode = 'list' | 'detail' | 'new' | 'add-payment'

interface PacPageProps {
  uid: string
}

export const PacPage: FC<PacPageProps> = ({ uid }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedPac, setSelectedPac] = useState<Investment | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleSuccess = useCallback(
    (message?: string) => {
      showToast('success', message ?? 'Operazione completata')
      setViewMode('list')
      setSelectedPac(null)
      setRefreshTrigger((prev) => prev + 1)
    },
    [showToast]
  )

  const handleError = useCallback(
    (message: string) => {
      showToast('error', message)
    },
    [showToast]
  )

  const handleSelectPac = useCallback((investment: Investment) => {
    setSelectedPac(investment)
    setViewMode('detail')
  }, [])

  const handleAddPayment = useCallback((investment: Investment) => {
    setSelectedPac(investment)
    setViewMode('add-payment')
  }, [])

  const handleEditPac = useCallback((investment: Investment) => {
    setSelectedPac(investment)
    setViewMode('detail')
  }, [])

  const handleBack = useCallback(() => {
    setViewMode('list')
    setSelectedPac(null)
  }, [])

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>Piani di Accumulo (PAC)</h1>
        {viewMode === 'list' && (
          <button
            onClick={() => setViewMode('new')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1em',
            }}
          >
            + Nuovo PAC
          </button>
        )}
      </div>

      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '16px 24px',
            backgroundColor: toast.type === 'success' ? '#28a745' : '#dc3545',
            color: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 1000,
          }}
        >
          {toast.message}
        </div>
      )}

      {viewMode === 'list' && (
        <PacList
          uid={uid}
          onSelectPac={handleSelectPac}
          onAddPayment={handleAddPayment}
          onEditPac={handleEditPac}
          onError={handleError}
          onSuccess={(msg) => showToast('success', msg)}
          refreshTrigger={refreshTrigger}
        />
      )}

      {viewMode === 'new' && (
        <div>
          <button
            onClick={handleBack}
            style={{
              marginBottom: '16px',
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ← Indietro
          </button>
          <PacForm uid={uid} onSuccess={() => handleSuccess('PAC creato con successo')} onError={handleError} />
        </div>
      )}

      {viewMode === 'add-payment' && selectedPac && (
        <div>
          <button
            onClick={handleBack}
            style={{
              marginBottom: '16px',
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ← Indietro
          </button>
          <PacForm
            uid={uid}
            existingInvestmentId={selectedPac.id}
            existingInvestmentName={selectedPac.name}
            onSuccess={() => handleSuccess('Versamento aggiunto con successo')}
            onError={handleError}
          />
        </div>
      )}

      {viewMode === 'detail' && selectedPac && (
        <PacDetail uid={uid} investment={selectedPac} onBack={handleBack} onError={handleError} />
      )}
    </div>
  )
}
