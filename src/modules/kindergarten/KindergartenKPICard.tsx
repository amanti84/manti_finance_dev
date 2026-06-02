/**
 * KindergartenKPICard — KPI aggregati del portafoglio bambini.
 * Mostra: investimenti + PAC + totale complessivo.
 * Nessun dato proveniente dal portafoglio principale.
 */
import React from 'react'
import type { KindergartenKPIs } from '../../types/kindergarten'

type InvKPIs = Pick<KindergartenKPIs, 'totalInvested' | 'currentValue' | 'gainLoss' | 'gainLossPercent'>
type PACKPIs = Pick<KindergartenKPIs, 'totalPACMonthly' | 'totalPACInvested' | 'totalPACValue' | 'pacGainLoss' | 'pacGainLossPercent'>
type GrandKPIs = Pick<KindergartenKPIs, 'grandTotalInvested' | 'grandTotalValue' | 'grandTotalGainLoss' | 'grandTotalGainLossPercent'>

interface Props {
  invKPIs: InvKPIs
  pacKPIs: PACKPIs
  grandKPIs: GrandKPIs
}

function fmt(n: number) {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

export default function KindergartenKPICard({ invKPIs, pacKPIs, grandKPIs }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Investimenti diretti */}
      <div className="rounded-lg border p-4 bg-white shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Investimenti Diretti</h3>
        <p className="text-xl font-bold">{fmt(invKPIs.currentValue)}</p>
        <p className="text-sm text-gray-400">Investito: {fmt(invKPIs.totalInvested)}</p>
        <p className={`text-sm font-medium mt-1 ${invKPIs.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {fmt(invKPIs.gainLoss)} ({pct(invKPIs.gainLossPercent)})
        </p>
      </div>

      {/* PAC */}
      <div className="rounded-lg border p-4 bg-white shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-2">PAC</h3>
        <p className="text-xl font-bold">{fmt(pacKPIs.totalPACValue)}</p>
        <p className="text-sm text-gray-400">Versato: {fmt(pacKPIs.totalPACInvested)}</p>
        <p className={`text-sm font-medium mt-1 ${pacKPIs.pacGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {fmt(pacKPIs.pacGainLoss)} ({pct(pacKPIs.pacGainLossPercent)})
        </p>
        <p className="text-xs text-gray-400 mt-1">Rata mensile: {fmt(pacKPIs.totalPACMonthly)}</p>
      </div>

      {/* Totale complessivo */}
      <div className="rounded-lg border p-4 bg-primary/5 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Portafoglio Totale</h3>
        <p className="text-2xl font-bold">{fmt(grandKPIs.grandTotalValue)}</p>
        <p className="text-sm text-gray-400">Totale investito: {fmt(grandKPIs.grandTotalInvested)}</p>
        <p className={`text-sm font-medium mt-1 ${grandKPIs.grandTotalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {fmt(grandKPIs.grandTotalGainLoss)} ({pct(grandKPIs.grandTotalGainLossPercent)})
        </p>
      </div>
    </div>
  )
}
