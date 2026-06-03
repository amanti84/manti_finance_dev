import type { FC } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { listInboxItems, confirmInboxItem, deleteInboxItem } from '../../services/inbox'
import type { InboxItem, InboxItemStatus } from '../../types'
import { InboxItemCard } from './InboxItemCard'
import { ConfidenceReviewForm } from './ConfidenceReviewForm'

export const InboxPage: FC = () => {
  const { user } = useAuth()
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<InboxItemStatus | 'TUTTI'>('TUTTI')
  const [reviewingItem, setReviewingItem] = useState<InboxItem | null>(null)

  const fetchItems = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const result = await listInboxItems(user.uid)
    if (result.success) {
      setItems(result.data)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    void fetchItems()
  }, [fetchItems])

  const handleDelete = async (itemId: string) => {
    if (!user) return
    const result = await deleteInboxItem(user.uid, itemId)
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== itemId))
    } else {
      alert(`Errore durante l'eliminazione: ${result.error}`)
    }
  }

  const handleReviewSubmit = async (itemId: string, values: Record<string, unknown>) => {
    if (!user) return
    const result = await confirmInboxItem(user.uid, itemId, values)
    if (result.success) {
      setReviewingItem(null)
      void fetchItems()
    } else {
      throw new Error(result.error)
    }
  }

  const handleSvuotaConfermati = async () => {
    if (!user) return
    const confermati = items.filter((i) => i.status === 'CONFERMATO')
    if (confermati.length === 0) return
    if (!window.confirm(`Stai per eliminare ${confermati.length} elementi confermati. Continuare?`)) return

    setLoading(true)
    for (const item of confermati) {
      await deleteInboxItem(user.uid, item.id)
    }
    void fetchItems()
  }

  const filteredItems = items.filter((item) => {
    if (filter === 'TUTTI') return true
    return item.status === filter
  })

  const stats = {
    all: items.length,
    daRivedere: items.filter((i) => {
      const hasLowConf = Array.isArray(i.confidenceFields)
        ? i.confidenceFields.some((f) => typeof f === 'object' && f !== null && f.confidence < 80)
        : Object.values(i.confidenceFields).some((conf) => conf < 80)
      return i.status !== 'CONFERMATO' && hasLowConf
    }).length,
    confermati: items.filter((i) => i.status === 'CONFERMATO').length,
    errori: items.filter((i) => i.status === 'ERRORE').length,
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Financial Inbox</h1>
        <button
          onClick={() => void fetchItems()}
          style={{ padding: '8px 16px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
        >
          Aggiorna
        </button>
      </div>

      {reviewingItem ? (
        <ConfidenceReviewForm
          item={reviewingItem}
          onSubmit={handleReviewSubmit}
          onCancel={() => setReviewingItem(null)}
        />
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {(['TUTTI', 'RICEVUTO', 'ESTRATTO', 'IN_REVIEW', 'CONFERMATO', 'ERRORE'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setFilter(s) }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid #ddd',
                  backgroundColor: filter === s ? '#007bff' : '#fff',
                  color: filter === s ? '#fff' : '#333',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                {s} ({items.filter(i => s === 'TUTTI' ? true : i.status === s).length})
              </button>
            ))}
          </div>

          {stats.confermati > 0 && (
            <button
              onClick={() => { void handleSvuotaConfermati() }}
              style={{
                marginBottom: '16px',
                padding: '6px 12px',
                backgroundColor: 'transparent',
                color: '#6c757d',
                border: '1px solid #6c757d',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              Svuota confermati
            </button>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Caricamento...</div>
          ) : error ? (
            <div style={{ padding: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px' }}>{error}</div>
          ) : filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed #ddd', borderRadius: '8px', color: '#666' }}>
              Nessun documento in questa categoria.
            </div>
          ) : (
            <div>
              {filteredItems.map((item) => (
                <InboxItemCard
                  key={item.id}
                  item={item}
                  onReview={(itemToReview) => { setReviewingItem(itemToReview) }}
                  onDelete={(itemId) => { void handleDelete(itemId) }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
