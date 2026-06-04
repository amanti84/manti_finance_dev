/**
 * KindergartenPACList — lista PAC del portafoglio bambini.
 * Props-driven: riceve dati e callbacks da KindergartenPage.
 * Nessun import da src/services/pac.ts o moduli PAC principali.
 */
import { useState } from 'react'
import type { KindergartenPAC } from '../../types/kindergarten'

interface Props {
  pacs: KindergartenPAC[]
  onAdd: (pac: Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'>) => Promise<unknown>
  onUpdate: (id: string, data: Partial<Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
}

function fmt(n: number) {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

export default function KindergartenPACList({ pacs, onDelete }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!window.confirm('Eliminare questo PAC dal portafoglio bambini?')) return
    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
  }

  if (pacs.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-gray-400">
        <p>Nessun PAC nel portafoglio bambini.</p>
        <p className="text-sm mt-1">Configura il primo piano di accumulo con il pulsante in alto.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Nome PAC</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Rata mensile</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Totale Versato</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Valore Attuale</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">G/P</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Orizzonte</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {pacs.map(pac => {
            const gp = pac.currentValue - pac.totalInvested
            const gpPct = pac.totalInvested > 0 ? (gp / pac.totalInvested) * 100 : 0
            return (
              <tr key={pac.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{pac.name}{pac.ticker ? <span className="ml-1 text-xs text-gray-400">{pac.ticker}</span> : null}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(pac.monthlyAmount)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(pac.totalInvested)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(pac.currentValue)}</td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium ${gp >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(gp)} ({gp >= 0 ? '+' : ''}{gpPct.toFixed(2)}%)
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{pac.targetYears} anni</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => void handleDelete(pac.id)}
                    disabled={deletingId === pac.id}
                    className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                    aria-label={`Elimina PAC ${pac.name}`}
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
