/**
 * KindergartenSummaryCard — KPI patrimoniali aggregati del portafoglio bambini.
 *
 * Mostra esclusivamente dati di investimento:
 * - Totale investito (investimenti diretti + PAC)
 * - Valore corrente
 * - Gain/Loss totale e percentuale
 * - Breakdown investimenti vs PAC
 *
 * NON contiene: budget, spese, cashflow, categorie di uscita.
 * Dominio: solo investimenti + PAC bambini.
 */
import type { FC } from 'react'
import { formatCurrency, formatPercent } from '../../utils/format'

interface InvKPIs {
  totalInvested: number
  currentValue: number
  gainLoss: number
  gainLossPercent: number
}

interface PacKPIs {
  totalPACInvested: number
  totalPACValue: number
  totalPACGainLoss: number
  totalPACGainLossPercent: number
}

interface GrandKPIs {
  grandTotalInvested: number
  grandTotalValue: number
  grandTotalGainLoss: number
  grandTotalGainLossPercent: number
}

interface Props {
  invKPIs: InvKPIs
  pacKPIs: PacKPIs
  grandKPIs: GrandKPIs
}

const GainBadge: FC<{ value: number; percent: number }> = ({ value, percent }) => {
  const positive = value >= 0
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
        positive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}
    >
      {positive ? '+' : ''}{formatCurrency(value)}
      <span className="opacity-75">({positive ? '+' : ''}{formatPercent(percent)})</span>
    </span>
  )
}

export const KindergartenSummaryCard: FC<Props> = ({ invKPIs, pacKPIs, grandKPIs }) => {
  const isPositive = grandKPIs.grandTotalGainLoss >= 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Portafoglio Bambini</h2>
        <GainBadge
          value={grandKPIs.grandTotalGainLoss}
          percent={grandKPIs.grandTotalGainLossPercent}
        />
      </div>

      {/* KPI principali */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Totale Investito</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(grandKPIs.grandTotalInvested)}</p>
        </div>
        <div className={`rounded-lg p-4 ${
          isPositive ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Valore Attuale</p>
          <p className={`text-2xl font-bold ${
            isPositive ? 'text-green-900' : 'text-red-900'
          }`}>{formatCurrency(grandKPIs.grandTotalValue)}</p>
        </div>
      </div>

      {/* Breakdown: Investimenti diretti vs PAC */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Breakdown</h3>

        {/* Investimenti diretti */}
        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-blue-900">Investimenti Diretti</p>
            <p className="text-xs text-blue-600">
              Investito: {formatCurrency(invKPIs.totalInvested)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-blue-900">{formatCurrency(invKPIs.currentValue)}</p>
            <GainBadge value={invKPIs.gainLoss} percent={invKPIs.gainLossPercent} />
          </div>
        </div>

        {/* PAC */}
        <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-indigo-900">Piani di Accumulo (PAC)</p>
            <p className="text-xs text-indigo-600">
              Investito: {formatCurrency(pacKPIs.totalPACInvested)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-indigo-900">{formatCurrency(pacKPIs.totalPACValue)}</p>
            <GainBadge value={pacKPIs.totalPACGainLoss} percent={pacKPIs.totalPACGainLossPercent} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default KindergartenSummaryCard
