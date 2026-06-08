import { useState, useEffect } from 'react'
import type { FC } from 'react'
import { Badge } from '../../components/ui'
import { formatCurrency, formatPercent } from '../../utils/format'
import type { Investment } from '../../types'
import { AlertCircle } from 'lucide-react'
import type { Timestamp } from 'firebase/firestore'

interface InvestmentTableProps {
  investments: Investment[]
  onRowClick: (investment: Investment) => void
}

export const InvestmentTable: FC<InvestmentTableProps> = ({ investments, onRowClick }) => {
  const [sevenDaysAgo, setSevenDaysAgo] = useState(0)

  useEffect(() => {
    setSevenDaysAgo(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }, [])

  const isPriceStale = (lastUpdate: Timestamp | undefined) => {
    if (!lastUpdate) return true
    const millis = lastUpdate.toMillis()
    return millis < sevenDaysAgo
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-bg/50 border-b border-border">
            <th className="px-4 py-3 font-semibold text-sm">Nome / ISIN</th>
            <th className="px-4 py-3 font-semibold text-sm">Asset Class</th>
            <th className="px-4 py-3 font-semibold text-sm">Broker</th>
            <th className="px-4 py-3 font-semibold text-sm text-right">Quantità</th>
            <th className="px-4 py-3 font-semibold text-sm text-right">Costo Medio</th>
            <th className="px-4 py-3 font-semibold text-sm text-right">Valore Attuale</th>
            <th className="px-4 py-3 font-semibold text-sm text-right">P&L</th>
            <th className="px-4 py-3 font-semibold text-sm text-center">PAC</th>
          </tr>
        </thead>
        <tbody>
          {investments.map((inv) => {
            const costBasis = inv.quantity * inv.avgCost
            const pnl = inv.currentValue - costBasis
            const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0
            const pnlColor = pnl >= 0 ? 'text-success' : 'text-error'
            const stale = isPriceStale(inv.lastPriceUpdate)

            return (
              <tr
                key={inv.id}
                onClick={() => onRowClick(inv)}
                className="border-b border-border hover:bg-bg/30 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-text">{inv.name}</div>
                  <div className="text-xs text-text-muted flex items-center gap-1">
                    {inv.isin ?? inv.ticker ?? '-'}
                    {stale && (
                      <Badge variant="warning" size="sm" className="ml-2 flex items-center gap-1 py-0 px-1">
                        <AlertCircle size={10} /> Prezzo non aggiornato
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="default" className="capitalize">
                    {inv.assetClass}
                  </Badge>
                </td>
                <td className="px-4 py-3 capitalize text-sm">{inv.broker}</td>
                <td className="px-4 py-3 text-right text-sm">{inv.quantity}</td>
                <td className="px-4 py-3 text-right text-sm">{formatCurrency(inv.avgCost, inv.currency)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="font-medium">{formatCurrency(inv.currentValue, inv.currency)}</div>
                  <div className="text-xs text-text-muted">{formatCurrency(inv.currentPrice, inv.currency)}</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className={`font-medium ${pnlColor}`}>
                    {pnl >= 0 ? '+' : ''}
                    {formatCurrency(pnl, inv.currency)}
                  </div>
                  <div className={`text-xs ${pnlColor}`}>
                    {pnlPct >= 0 ? '+' : ''}
                    {formatPercent(pnlPct)}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {inv.isPac ? (
                    <Badge variant="info" size="sm">PAC</Badge>
                  ) : (
                    <span className="text-text-muted">-</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
