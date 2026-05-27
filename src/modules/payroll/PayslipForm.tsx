import type { FC, FormEvent } from 'react'
import { useState } from 'react'
import type { Payslip, Month } from '../../types'

interface PayslipFormData {
  year: number
  month: Month
  grossSalary: number
  netSalary: number
  irpef: number
  inps: number
  tfr: number
  fondoPensione: number
  bonus?: number
  rimborsiSpese?: number
}

interface Props {
  onSubmit: (data: Omit<Payslip, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | null>
  onSuccess?: () => void
  onError?: (error: string) => void
}

const MONTHS: { value: Month; label: string }[] = [
  { value: 1, label: 'Gennaio' },
  { value: 2, label: 'Febbraio' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Aprile' },
  { value: 5, label: 'Maggio' },
  { value: 6, label: 'Giugno' },
  { value: 7, label: 'Luglio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Settembre' },
  { value: 10, label: 'Ottobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Dicembre' },
]

const currentYear = new Date().getFullYear()

const emptyForm = (): PayslipFormData => ({
  year: currentYear,
  month: (new Date().getMonth() + 1) as Month,
  grossSalary: 0,
  netSalary: 0,
  irpef: 0,
  inps: 0,
  tfr: 0,
  fondoPensione: 0,
})

export const PayslipForm: FC<Props> = ({ onSubmit, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState<PayslipFormData>(emptyForm())

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const handleChange = (field: keyof PayslipFormData, value: string) => {
    if (field === 'month') {
      setForm(prev => ({ ...prev, [field]: Number(value) as Month }))
    } else if (field === 'year') {
      setForm(prev => ({ ...prev, [field]: Number(value) }))
    } else {
      if (value === '') {
        setForm(prev => {
          const next = { ...prev }
          delete next[field as 'bonus' | 'rimborsiSpese']
          return next
        })
      } else {
        const numValue = Math.round(Number(value) * 100) / 100
        setForm(prev => ({ ...prev, [field]: numValue }))
      }
    }
  }

  const validate = (): string | null => {
    if (!form.year || form.year < 2000 || form.year > 2100) return 'Anno non valido'
    if (!form.month || form.month < 1 || form.month > 12) return 'Mese non valido'
    if (form.grossSalary <= 0) return 'Lordo obbligatorio e maggiore di 0'
    if (form.netSalary <= 0) return 'Netto obbligatorio e maggiore di 0'
    if (form.irpef < 0) return 'IRPEF non può essere negativo'
    if (form.inps < 0) return 'INPS non può essere negativo'
    if (form.tfr < 0) return 'TFR non può essere negativo'
    if (form.fondoPensione < 0) return 'Fondo Pensione non può essere negativo'
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      showToast('error', validationError)
      onError?.(validationError)
      return
    }

    setLoading(true)
    try {
      const payslipData: Omit<Payslip, 'id' | 'createdAt' | 'updatedAt'> = {
        year: form.year,
        month: form.month,
        grossSalary: form.grossSalary,
        netSalary: form.netSalary,
        irpef: form.irpef,
        inps: form.inps,
        tfr: form.tfr,
        fondoPensione: form.fondoPensione,
        parsed: false,
        ...(form.bonus !== undefined && { bonus: form.bonus }),
        ...(form.rimborsiSpese !== undefined && { rimborsiSpese: form.rimborsiSpese }),
      }

      const result = await onSubmit(payslipData)
      if (result) {
        showToast('success', 'Cedolino salvato con successo')
        onSuccess?.()
        setForm(emptyForm())
      } else {
        showToast('error', 'Errore nel salvataggio del cedolino')
        onError?.('Errore nel salvataggio del cedolino')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto'
      showToast('error', errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
      {toast && (
        <div
          style={{
            padding: '12px',
            borderRadius: '4px',
            backgroundColor: toast.type === 'success' ? '#d4edda' : '#f8d7da',
            color: toast.type === 'success' ? '#155724' : '#721c24',
          }}
        >
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="year">Anno *</label>
          <input
            id="year"
            type="number"
            value={form.year}
            onChange={e => handleChange('year', e.target.value)}
            min={2000}
            max={2100}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="month">Mese *</label>
          <select
            id="month"
            value={form.month}
            onChange={e => handleChange('month', e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="grossSalary">Lordo *</label>
          <input
            id="grossSalary"
            type="number"
            step="0.01"
            value={form.grossSalary || ''}
            onChange={e => handleChange('grossSalary', e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="netSalary">Netto *</label>
          <input
            id="netSalary"
            type="number"
            step="0.01"
            value={form.netSalary || ''}
            onChange={e => handleChange('netSalary', e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="irpef">IRPEF *</label>
          <input
            id="irpef"
            type="number"
            step="0.01"
            value={form.irpef || ''}
            onChange={e => handleChange('irpef', e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="inps">INPS *</label>
          <input
            id="inps"
            type="number"
            step="0.01"
            value={form.inps || ''}
            onChange={e => handleChange('inps', e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="tfr">TFR *</label>
          <input
            id="tfr"
            type="number"
            step="0.01"
            value={form.tfr || ''}
            onChange={e => handleChange('tfr', e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="fondoPensione">Fondo Pensione *</label>
          <input
            id="fondoPensione"
            type="number"
            step="0.01"
            value={form.fondoPensione || ''}
            onChange={e => handleChange('fondoPensione', e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="bonus">Bonus</label>
          <input
            id="bonus"
            type="number"
            step="0.01"
            value={form.bonus ?? ''}
            onChange={e => handleChange('bonus', e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="rimborsiSpese">Rimborsi Spese</label>
          <input
            id="rimborsiSpese"
            type="number"
            step="0.01"
            value={form.rimborsiSpese ?? ''}
            onChange={e => handleChange('rimborsiSpese', e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '12px 24px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Salvataggio...' : 'Salva Cedolino'}
      </button>
    </form>
  )
}
