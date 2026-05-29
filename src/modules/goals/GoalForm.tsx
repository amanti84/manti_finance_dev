import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { createGoal } from '../../services/goal'
import type { GoalType } from '../../types'

interface GoalFormProps {
  onSuccess: () => void
}

export const GoalForm: React.FC<GoalFormProps> = ({ onSuccess }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: 'PATRIMONIO_TARGET' as GoalType,
    name: '',
    targetAmount: 0,
    targetDate: '',
    baselineAmount: 0,
    note: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    const result = await createGoal(user.uid, {
      ...formData,
      targetDate: new Date(formData.targetDate),
    })

    if (result.success) {
      onSuccess()
    } else {
      alert('Errore nella creazione: ' + result.error)
    }
    setLoading(false)
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e)
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome Obiettivo</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="es. Estingui mutuo entro 2030"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as GoalType })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="ESTINZIONE_MUTUO">Estinzione Mutuo</option>
            <option value="PATRIMONIO_TARGET">Patrimonio Target</option>
            <option value="FONDO_PENSIONE">Fondo Pensione</option>
            <option value="RISERVA_LIQUIDITA">Riserva Liquidità</option>
            <option value="OBIETTIVO_KINDERGARTEN">Obiettivo Kindergarten</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Importo Target (€)</label>
          <input
            type="number"
            required
            min="0"
            value={formData.targetAmount || ''}
            onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Target</label>
          <input
            type="date"
            required
            value={formData.targetDate}
            onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Baseline (€)</label>
          <input
            type="number"
            required
            min="0"
            value={formData.baselineAmount || ''}
            onChange={(e) => setFormData({ ...formData, baselineAmount: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            rows={2}
          />
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold transition-colors"
        >
          {loading ? 'Salvataggio...' : 'Crea Obiettivo'}
        </button>
      </div>
    </form>
  )
}
