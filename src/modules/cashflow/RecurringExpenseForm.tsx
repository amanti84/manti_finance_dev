import type { FC, FormEvent } from 'react'
import { useState, useEffect } from 'react'
import type { RecurringExpense, Account, RecurringExpenseFrequency, RecurringExpenseCategory } from '../../types'
import { saveRecurringExpense } from '../../services/cashflow'

interface RecurringExpenseFormProps {
  uid: string
  accounts: Account[]
  existingExpense?: RecurringExpense | null
  onSuccess: () => void
  onError: (message: string | null) => void
  onCancel: () => void
}

export const RecurringExpenseForm: FC<RecurringExpenseFormProps> = ({
  uid,
  accounts,
  existingExpense,
  onSuccess,
  onError,
  onCancel,
}) => {
  const [name, setName] = useState(existingExpense?.name ?? '')
  const [amount, setAmount] = useState(existingExpense?.amount?.toString() ?? '0')
  const [frequency, setFrequency] = useState<RecurringExpenseFrequency>(existingExpense?.frequency ?? 'monthly')
  const [category, setCategory] = useState<RecurringExpenseCategory>(existingExpense?.category ?? 'bollette')
  const [accountId, setAccountId] = useState(existingExpense?.accountId ?? (accounts[0]?.id ?? ''))
  const [dayOfMonth, setDayOfMonth] = useState(existingExpense?.dayOfMonth?.toString() ?? '1')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (existingExpense) {
      setName(existingExpense.name)
      setAmount(existingExpense.amount.toString())
      setFrequency(existingExpense.frequency)
      setCategory(existingExpense.category)
      setAccountId(existingExpense.accountId)
      setDayOfMonth(existingExpense.dayOfMonth?.toString() ?? '1')
    }
  }, [existingExpense])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const parsedAmount = parseFloat(amount)
      if (isNaN(parsedAmount)) {
        onError('Importo non valido')
        setIsSubmitting(false)
        return
      }

      const parsedDay = parseInt(dayOfMonth)
      if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
        onError('Giorno del mese non valido (1-31)')
        setIsSubmitting(false)
        return
      }

      if (!accountId) {
        onError('Seleziona un conto')
        setIsSubmitting(false)
        return
      }

      const result = await saveRecurringExpense(uid, {
        ...(existingExpense?.id ? { id: existingExpense.id } : {}),
        name,
        amount: parsedAmount,
        frequency,
        category,
        accountId,
        dayOfMonth: parsedDay,
      } as any)

      if (result.success) {
        onSuccess()
      } else {
        onError(result.error)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
      <h3>{existingExpense ? 'Modifica Spesa' : 'Nuova Spesa Ricorrente'}</h3>

      <label>
        Descrizione *
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          placeholder="es. Affitto casa"
        />
      </label>

      <label>
        Importo (EUR) *
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
      </label>

      <label>
        Frequenza *
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as RecurringExpenseFrequency)}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        >
          <option value="monthly">Mensile</option>
          <option value="quarterly">Trimestrale</option>
          <option value="annual">Annuale</option>
        </select>
      </label>

      <label>
        Categoria *
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as RecurringExpenseCategory)}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        >
          <option value="affitto">Affitto</option>
          <option value="mutuo">Mutuo</option>
          <option value="bollette">Bollette</option>
          <option value="abbonamenti">Abbonamenti</option>
          <option value="altro">Altro</option>
        </select>
      </label>

      <label>
        Conto di Addebito *
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        >
          <option value="">Seleziona un conto</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.name} ({acc.bank})</option>
          ))}
        </select>
      </label>

      <label>
        Giorno Scadenza (1-31)
        <input
          type="number"
          min="1"
          max="31"
          value={dayOfMonth}
          onChange={(e) => setDayOfMonth(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
      </label>

      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: isSubmitting ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Salvataggio...' : 'Salva'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Annulla
        </button>
      </div>
    </form>
  )
}
