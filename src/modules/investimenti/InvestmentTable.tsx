import { useState, useEffect } from 'react'
import type { FC } from 'react'
import { Badge } from '../../components/ui'
import { formatCurrency, formatPercent, formatDate } from '../../utils/format'
import { toDateSafe } from '../../utils/date'
import type { Investment } from '../../types'
import { AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react'
import type { Timestamp } from 'firebase/firestore'

interface InvestmentTableProps {
  investments: Investment[]
  onRowClick: (investment: Investment) => void
  onUpdatePrice: (investment: Investment) => Promise<void>
  updatingId?: string | null
}

export const InvestmentTable: FC<InvestmentTableProps> = ({
  investments,
  onRowClick,
  onUpdatePrice,
  updatingId
}) => {
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
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-surface">
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
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-text">{inv.name}</div>
                      {inv.lastUpdateError && (
                        <div className="text-error" title={inv.lastUpdateError}>
                          <AlertTriangle size={14} />
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-text-muted flex items-center gap-1">
                      {inv.isin ?? inv.ticker ?? '-'}
                      {stale && (
                        <Badge
                          variant="warning"
                          size="sm"
                          className="ml-2 flex items-center gap-1 py-0 px-1 cursor-pointer hover:opacity-80"
                          onClick={(e) => {
                            e.stopPropagation()
                            void onUpdatePrice(inv)
                          }}
                        >
                          <AlertCircle size={10} /> Aggiorna
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
                  <td className="px-4 py-3 text-right group">
                    <div className="flex items-center justify-end gap-2">
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(inv.currentValue, inv.currency)}</div>
                        <div
                          className="text-xs text-text-muted"
                          title={toDateSafe(inv.lastPriceUpdate) ? `Ultimo aggiornamento: ${formatDate(toDateSafe(inv.lastPriceUpdate)!.toISOString())}` : undefined}
                        >
                          {formatCurrency(inv.currentPrice, inv.currency)}
                        </div>
                      </div>
                      <button
                        className={`p-1.5 rounded-full hover:bg-bg/50 text-text-muted hover:text-primary transition-colors ${updatingId === inv.id ? 'animate-spin text-primary' : 'opacity-0 group-hover:opacity-100'}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          void onUpdatePrice(inv)
                        }}
                        disabled={updatingId === inv.id}
                        title="Aggiorna prezzo"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
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

      {/* Mobile Card List View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {investments.map((inv) => {
          const costBasis = inv.quantity * inv.avgCost
          const pnl = inv.currentValue - costBasis
          const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0
          const pnlColor = pnl >= 0 ? 'text-success' : 'text-error'
          const stale = isPriceStale(inv.lastPriceUpdate)

          return (
            <div
              key={inv.id}
              onClick={() => onRowClick(inv)}
              className="bg-surface rounded-lg border border-border p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-text">{inv.name}</div>
                  <div className="text-xs text-text-muted flex items-center gap-1">
                    {inv.isin ?? inv.ticker ?? '-'}
                  </div>
                </div>
                <Badge variant={inv.isPac ? 'info' : 'default'} size="sm" className="capitalize">
                  {inv.assetClass}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-text-muted uppercase font-semibold tracking-wider">Broker</div>
                  <div className="capitalize">{inv.broker}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase font-semibold tracking-wider">Quantità</div>
                  <div>{inv.quantity}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase font-semibold tracking-wider">Valore Attuale</div>
                  <div className="font-bold">{formatCurrency(inv.currentValue, inv.currency)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-text-muted uppercase font-semibold tracking-wider">P&L</div>
                  <div className={`font-bold ${pnlColor}`}>
                    {pnl >= 0 ? '+' : ''}{formatPercent(pnlPct)}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-border">
                {stale ? (
                  <Badge
                    variant="warning"
                    size="sm"
                    className="flex items-center gap-1 py-1 px-2 cursor-pointer hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation()
                      void onUpdatePrice(inv)
                    }}
                  >
                    <AlertCircle size={12} /> Aggiorna Prezzo
                  </Badge>
                ) : (
                  <div className="text-[10px] text-text-muted">
                    Aggiornato: {toDateSafe(inv.lastPriceUpdate) ? formatDate(toDateSafe(inv.lastPriceUpdate)!.toISOString()) : '-'}
                  </div>
                )}
                <button
                  className={`p-1.5 rounded-full bg-bg/50 text-text-muted hover:text-primary transition-colors ${updatingId === inv.id ? 'animate-spin text-primary' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    void onUpdatePrice(inv)
                  }}
                  disabled={updatingId === inv.id}
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
