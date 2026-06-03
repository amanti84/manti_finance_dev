import type { FC } from 'react'
import type { InboxItem, InboxItemStatus } from '../../types'

interface InboxItemCardProps {
  item: InboxItem
  onReview: (item: InboxItem) => void
  onDelete: (itemId: string) => void
}

const getStatusBadgeColor = (status: InboxItemStatus) => {
  switch (status) {
    case 'RICEVUTO':
      return { bg: '#f8f9fa', text: '#6c757d', border: '#dee2e6' }
    case 'IN_ELABORAZIONE':
    case 'ESTRATTO':
      return { bg: '#e7f1ff', text: '#0d6efd', border: '#b6d4fe' }
    case 'IN_REVIEW':
      return { bg: '#fff3cd', text: '#856404', border: '#ffeeba' }
    case 'CONFERMATO':
      return { bg: '#d4edda', text: '#155724', border: '#c3e6cb' }
    case 'ERRORE':
      return { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' }
    default:
      return { bg: '#f8f9fa', text: '#333', border: '#ddd' }
  }
}

export const InboxItemCard: FC<InboxItemCardProps> = ({ item, onReview, onDelete }) => {
  const statusColors = getStatusBadgeColor(item.status)
  const hasLowConfidence = Array.isArray(item.confidenceFields)
    ? item.confidenceFields.some((f) => typeof f === 'object' && f !== null && f.confidence < 80)
    : Object.values(item.confidenceFields).some((conf) => (conf as number) < 80)
  const canReview = item.status !== 'CONFERMATO' && (item.status === 'IN_REVIEW' || item.status === 'ESTRATTO' || hasLowConfidence)

  return (
    <div
      style={{
        border: `1px solid ${statusColors.border}`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        backgroundColor: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>{item.fileName}</h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: statusColors.bg,
                color: statusColors.text,
                border: `1px solid ${statusColors.border}`,
                fontWeight: 'bold',
              }}
            >
              {item.status}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#6c757d',
                backgroundColor: '#f1f3f5',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {item.source}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>
              {item.createdAt.toDate().toLocaleDateString('it-IT')}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {canReview && (
            <button
              onClick={() => onReview(item)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Revisiona
            </button>
          )}
          <button
            onClick={() => {
              if (window.confirm('Sei sicuro di voler eliminare questo elemento?')) {
                onDelete(item.id)
              }
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              color: '#dc3545',
              border: '1px solid #dc3545',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Elimina
          </button>
        </div>
      </div>

      {item.errorMessage && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: '#fff5f5',
            color: '#c92a2a',
            borderRadius: '4px',
            fontSize: '0.875rem',
            border: '1px solid #ffc9c9',
          }}
        >
          <strong>Errore:</strong> {item.errorMessage}
        </div>
      )}

      {item.status !== 'CONFERMATO' && hasLowConfidence && (
        <div
          style={{
            marginTop: '12px',
            fontSize: '0.875rem',
            color: '#856404',
            backgroundColor: '#fff3cd',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #ffeeba',
          }}
        >
          ⚠ Richiede revisione: alcuni campi hanno bassa confidenza.
        </div>
      )}
    </div>
  )
}
