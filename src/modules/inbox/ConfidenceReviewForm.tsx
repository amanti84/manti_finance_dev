import type { FC } from 'react'
import { useState } from 'react'
import type { InboxItem } from '../../types'

interface ConfidenceReviewFormProps {
  item: InboxItem
  onSubmit: (itemId: string, values: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}

export const ConfidenceReviewForm: FC<ConfidenceReviewFormProps> = ({ item, onSubmit, onCancel }) => {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {}
    item.confidenceFields.forEach((f) => {
      initial[f.fieldName] = f.confirmedValue ?? f.extractedValue
    })
    return initial
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (fieldName: string, value: string) => {
    const field = item.confidenceFields.find((f) => f.fieldName === fieldName)
    const originalValue = field?.extractedValue

    let finalValue: unknown = value
    if (typeof originalValue === 'number') {
      const num = parseFloat(value.replace(',', '.'))
      if (!isNaN(num)) {
        finalValue = num
      }
    }

    setValues((prev) => ({ ...prev, [fieldName]: finalValue }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await onSubmit(item.id, values)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Revisione Documento: {item.fileName}</h3>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Verifica i dati estratti automaticamente. I campi evidenziati in arancione hanno una bassa confidenza di estrazione.
      </p>

      <form onSubmit={(e) => { void handleSubmit(e) }}>
        {item.confidenceFields.map((field) => {
          const isLowConfidence = field.confidence < 80
          return (
            <div key={field.fieldName} style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                }}
              >
                {field.fieldName}
                {isLowConfidence && (
                  <span style={{ color: '#856404', marginLeft: '8px', fontWeight: 'normal', fontSize: '0.75rem' }}>
                    (Confidenza: {field.confidence}%)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={(values[field.fieldName] as string | number) || ''}
                onChange={(e) => handleChange(field.fieldName, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: `2px solid ${isLowConfidence ? '#ffc107' : '#28a745'}`,
                  outline: 'none',
                }}
              />
            </div>
          )
        })}

        {error && (
          <div
            style={{
              padding: '10px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              flex: 1,
            }}
          >
            {loading ? 'Salvataggio...' : 'Conferma tutto'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f8f9fa',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  )
}
