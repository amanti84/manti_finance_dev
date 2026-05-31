import type { FC } from 'react'
import { useState, useEffect } from 'react'
import type { KindergartenConfig } from '../../types'

interface Props {
  config: KindergartenConfig | null
  onSave: (config: Omit<KindergartenConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<unknown>
}

export const KindergartenBudgetConfig: FC<Props> = ({ config, onSave }) => {
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0)
  const [alertOnOverBudget, setAlertOnOverBudget] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (config) {
      setMonthlyBudget(config.monthlyBudget)
      setAlertOnOverBudget(config.alertOnOverBudget)
    }
  }, [config])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      await onSave({
        monthlyBudget,
        alertOnOverBudget,
      })
      setMessage({ type: 'success', text: 'Configurazione salvata con successo!' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Errore durante il salvataggio' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">Configurazione Budget</h2>

      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Budget Mensile (€)
          </label>
          <div className="relative rounded-md shadow-sm max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">€</span>
            </div>
            <input
              type="number"
              step="1"
              value={monthlyBudget}
              onChange={(e) => { setMonthlyBudget(parseInt(e.target.value) || 0) }}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
              placeholder="0"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Importo massimo mensile pianificato per le spese kindergarten.
          </p>
        </div>

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="alertOnOverBudget"
              type="checkbox"
              checked={alertOnOverBudget}
              onChange={(e) => { setAlertOnOverBudget(e.target.checked) }}
              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="alertOnOverBudget" className="font-medium text-gray-700">Attiva Alert Sforamento</label>
            <p className="text-gray-500">Ricevi una notifica se le spese del mese superano il budget configurato.</p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full md:w-auto px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {submitting ? 'Salvataggio...' : 'Salva Configurazione'}
          </button>
        </div>
      </form>
    </div>
  )
}
