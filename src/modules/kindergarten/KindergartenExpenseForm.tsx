import type { FC } from 'react'
import { useState, useEffect } from 'react'
import type { KindergartenExpense, KindergartenCategory, KindergartenFrequency, Month } from '../../types'

interface Props {
  expense?: KindergartenExpense | null
  onSubmit: (data: Omit<KindergartenExpense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<unknown>
  onCancel: () => void
}

export const KindergartenExpenseForm: FC<Props> = ({ expense, onSubmit, onCancel }) => {
  const [category, setCategory] = useState<KindergartenCategory>('retta')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [frequency, setFrequency] = useState<KindergartenFrequency>('monthly')
  const [month, setMonth] = useState<Month>((new Date().getMonth() + 1) as Month)
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (expense) {
      setCategory(expense.category)
      setDescription(expense.description)
      setAmount(expense.amount)
      setFrequency(expense.frequency)
      if (expense.month) setMonth(expense.month)
      setYear(expense.year)
      setNote(expense.note ?? '')
    }
  }, [expense])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({
        category,
        description,
        amount,
        frequency,
        month: (frequency === 'annual' ? 1 : month) as Month,
        year,
        note,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const months: { value: Month; label: string }[] = [
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

  const categories: { value: KindergartenCategory; label: string }[] = [
    { value: 'retta', label: 'Retta' },
    { value: 'mensa', label: 'Mensa' },
    { value: 'attivita_extra', label: 'Attività Extra' },
    { value: 'materiale', label: 'Materiale' },
    { value: 'altro', label: 'Altro' },
  ]

  const frequencies: { value: KindergartenFrequency; label: string }[] = [
    { value: 'monthly', label: 'Mensile' },
    { value: 'annual', label: 'Annuale' },
    { value: 'once', label: 'Una tantum' },
  ]

  return (
    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">
        {expense ? 'Modifica Spesa' : 'Aggiungi Nuova Spesa'}
      </h2>

      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value as KindergartenCategory) }}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequenza</label>
            <select
              value={frequency}
              onChange={(e) => { setFrequency(e.target.value as KindergartenFrequency) }}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {frequencies.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
          <input
            type="text"
            value={description}
            onChange={(e) => { setDescription(e.target.value) }}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="es. Retta mese di Gennaio"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => { setAmount(parseFloat(e.target.value)) }}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mese</label>
            <select
              value={month}
              onChange={(e) => { setMonth(parseInt(e.target.value) as Month) }}
              disabled={frequency === 'annual'}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              required={frequency !== 'annual'}
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anno</label>
            <input
              type="number"
              value={year}
              onChange={(e) => { setYear(parseInt(e.target.value)) }}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
          <textarea
            value={note}
            onChange={(e) => { setNote(e.target.value) }}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            rows={2}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {submitting ? 'Salvataggio...' : 'Salva Spesa'}
          </button>
        </div>
      </form>
    </div>
  )
}
