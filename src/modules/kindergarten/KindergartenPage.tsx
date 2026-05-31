import type { FC } from 'react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useKindergarten } from './useKindergarten'
import { KindergartenSummaryCard } from './KindergartenSummaryCard'
import { KindergartenExpenseList } from './KindergartenExpenseList'
import { KindergartenExpenseForm } from './KindergartenExpenseForm'
import { KindergartenBudgetConfig } from './KindergartenBudgetConfig'
import type { KindergartenExpense } from '../../types'

export const KindergartenPage: FC = () => {
  const { user } = useAuth()
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<KindergartenExpense | null>(null)

  const {
    expenses,
    config,
    summary,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    setConfig,
  } = useKindergarten(user?.uid ?? '', selectedYear)

  if (!user) return null

  const handleAddExpense = () => {
    setEditingExpense(null)
    setIsFormOpen(true)
  }

  const handleEditExpense = (expense: KindergartenExpense) => {
    setEditingExpense(expense)
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (data: Omit<KindergartenExpense, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, data)
    } else {
      await addExpense(data)
    }
    setIsFormOpen(false)
    setEditingExpense(null)
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kindergarten</h1>
          <p className="text-gray-500">Gestione isolata delle spese per i figli</p>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={selectedYear}
            onChange={(e) => { setSelectedYear(parseInt(e.target.value)) }}
            className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={() => { void handleAddExpense() }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Aggiungi Spesa
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Caricamento in corso...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            {summary && <KindergartenSummaryCard summary={summary} />}
            <KindergartenBudgetConfig config={config} onSave={setConfig} />
          </div>

          <div className="lg:col-span-2">
            {isFormOpen ? (
              <div className="mb-8">
                <KindergartenExpenseForm
                  expense={editingExpense}
                  onSubmit={handleFormSubmit}
                  onCancel={() => { setIsFormOpen(false); setEditingExpense(null) }}
                />
              </div>
            ) : null}

            <KindergartenExpenseList
              expenses={expenses}
              onEdit={handleEditExpense}
              onDelete={deleteExpense}
            />
          </div>
        </div>
      )}
    </div>
  )
}
