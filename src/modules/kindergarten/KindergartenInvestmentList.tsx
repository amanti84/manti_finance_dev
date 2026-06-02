/**
 * KindergartenInvestmentList — lista investimenti diretti bambini.
 * Props-driven: riceve dati e callbacks da KindergartenPage.
 * Nessun accesso diretto a Firestore, nessun import da moduli investment principali.
 */
import React, { useState } from 'react'
import type { KindergartenInvestment } from '../../types/kindergarten'

interface Props {
  investments: KindergartenInvestment[]
  onAdd: (inv: Omit<KindergartenInvestment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<unknown>
  onUpdate: (id: string, data: Partial<Omit<KindergartenInvestment, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
}

function fmt(n: number) {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

export default function KindergartenInvestmentList({ investments, onDelete }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!window.confirm('Eliminare questo investimento dal portafoglio bambini?')) return
    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
  }

  if (investments.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-gray-400">
        <p>Nessun investimento nel portafoglio bambini.</p>
        <p className="text-sm mt-1">Aggiungi il primo investimento con il pulsante in alto.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Nome</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Categoria</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Prezzo Acquisto</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Prezzo Attuale</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Quantità</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Valore</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">G/P</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {investments.map(inv => {
            const invested = inv.purchasePrice * inv.quantity
            const value = inv.currentPrice * inv.quantity
            const gp = value - invested
            const gpPct = invested > 0 ? (gp / invested) * 100 : 0
            return (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{inv.name}{inv.ticker ? <span className="ml-1 text-xs text-gray-400">{inv.ticker}</span> : null}</td>
                <td className="px-4 py-3 text-gray-500 capitalize">{inv.category}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(inv.purchasePrice)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(inv.currentPrice)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{inv.quantity}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(value)}</td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium ${gp >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(gp)} ({gp >= 0 ? '+' : ''}{gpPct.toFixed(2)}%)
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => void handleDelete(inv.id)}
                    disabled={deletingId === inv.id}
                    className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                    aria-label={`Elimina ${inv.name}`}
                  >
                    Elimina
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
