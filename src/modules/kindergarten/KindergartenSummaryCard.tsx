import type { FC } from 'react'
import type { KindergartenSummary } from '../../types'
import { formatCurrency } from '../../utils/format'

interface Props {
  summary: KindergartenSummary
}

export const KindergartenSummaryCard: FC<Props> = ({ summary }) => {
  return (
    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Riepilogo {summary.year}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600 font-medium uppercase mb-1">Totale Annuo</p>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.totalAnnual)}</p>
        </div>

        <div className="bg-indigo-50 p-4 rounded-lg">
          <p className="text-sm text-indigo-600 font-medium uppercase mb-1">Media Mensile</p>
          <p className="text-2xl font-bold text-indigo-900">{formatCurrency(summary.totalMonthly)}</p>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${summary.isOverBudget ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex justify-between items-center mb-2">
          <p className={`text-sm font-medium uppercase ${summary.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
            Stato Budget Mensile
          </p>
          <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${summary.isOverBudget ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
            {summary.isOverBudget ? 'Sforato' : 'In Linea'}
          </span>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-gray-500 uppercase">Spesa Mese Corrente</p>
            <p className={`text-xl font-bold ${summary.isOverBudget ? 'text-red-900' : 'text-green-900'}`}>
              {formatCurrency(summary.currentMonthTotal)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase">Budget</p>
            <p className="text-lg font-semibold text-gray-700">
              {formatCurrency(summary.budgetMonthly)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Breakdown per Categoria</h3>
        <div className="space-y-3">
          {Object.entries(summary.byCategory).map(([cat, amount]) => (
            <div key={cat} className="flex items-center">
              <div className="w-32 text-sm text-gray-600 capitalize">{cat.replace('_', ' ')}</div>
              <div className="flex-1 h-2 bg-gray-100 rounded-full mx-3">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${summary.totalAnnual > 0 ? (amount / summary.totalAnnual) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="w-24 text-right text-sm font-semibold text-gray-800">
                {formatCurrency(amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
