import type { FC } from 'react'
import type { KindergartenExpense, KindergartenCategory } from '../../types'
import { formatCurrency } from '../../utils/format'

interface Props {
  expenses: KindergartenExpense[]
  onEdit: (expense: KindergartenExpense) => void
  onDelete: (id: string) => void
}

export const KindergartenExpenseList: FC<Props> = ({ expenses, onEdit, onDelete }) => {
  const getMonthName = (month?: number | null) => {
    if (!month) return '-'
    const date = new Date(2000, month - 1, 1)
    return date.toLocaleString('it-IT', { month: 'long' })
  }

  const categoryLabels: Record<KindergartenCategory, string> = {
    retta: 'Retta',
    mensa: 'Mensa',
    attivita_extra: 'Attività Extra',
    materiale: 'Materiale',
    altro: 'Altro',
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center border border-gray-200">
        <p className="text-gray-500">Nessuna spesa registrata per questo anno.</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrizione</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Importo</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {expenses.map((expense) => (
            <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <span className="capitalize">{getMonthName(expense.month)}</span> {expense.year}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium uppercase">
                  {categoryLabels[expense.category]}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                <p className="font-medium">{expense.description}</p>
                {expense.note && <p className="text-xs text-gray-500 truncate max-w-xs">{expense.note}</p>}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                {formatCurrency(expense.amount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium">
                <button
                  onClick={() => onEdit(expense)}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => { if (confirm('Sei sicuro?')) onDelete(expense.id) }}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
