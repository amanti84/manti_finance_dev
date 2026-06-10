/**
 * KindergartenKPICard — KPI card per i PAC del portafoglio bambini.
 * Export: default (aggiunto per compatibilità con KindergartenPage import).
 */
import type { KindergartenPAC } from '../../types/kindergarten'
import { scheduleSummary } from '../../types/pacFrequency'

interface KPIs {
  totalPACMonthly: number
  totalPACInvested: number
  totalPACValue: number
  pacGainLoss: number
  pacGainLossPercent: number
}

interface Props {
  pacs: KindergartenPAC[]
  kpis: KPIs
}

function fmt(n: number) {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

export default function KindergartenKPICard({ pacs, kpis }: Props) {
  const { totalPACMonthly, totalPACInvested, totalPACValue, pacGainLoss, pacGainLossPercent } = kpis

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-base font-semibold text-gray-700">Piano di Accumulo (PAC)</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-400">Rata totale mensile</p>
          <p className="text-xl font-bold">{fmt(totalPACMonthly)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Totale versato</p>
          <p className="text-xl font-bold">{fmt(totalPACInvested)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Valore attuale</p>
          <p className="text-xl font-bold">{fmt(totalPACValue)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">G/P complessivo</p>
          <p className={`text-xl font-bold ${pacGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmt(pacGainLoss)} ({pacGainLoss >= 0 ? '+' : ''}{pacGainLossPercent.toFixed(2)}%)
          </p>
        </div>
      </div>

      {pacs.length > 0 && (
        <div className="space-y-1 border-t pt-3">
          <p className="text-xs font-medium text-gray-400 uppercase">PAC attivi</p>
          {pacs.map(pac => (
            <div key={pac.id} className="flex items-center justify-between text-sm">
              <span className="font-medium truncate max-w-[55%]">{pac.name}</span>
              <span className="text-gray-400 text-xs">
                {pac.schedule ? scheduleSummary(pac.schedule) : '—'}
              </span>
              <span className="tabular-nums">{fmt(pac.monthlyAmount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// named export per retrocompatibilità con eventuali import named esistenti
export { KindergartenKPICard }
