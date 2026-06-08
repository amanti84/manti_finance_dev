import type { FC } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui'
import { formatCurrency, formatPercent } from '../../utils/format'
import type { PortfolioSummary } from '../../services/investment'

interface InvestmentKPIsProps {
  summary: PortfolioSummary | null
  loading?: boolean
}

export const InvestmentKPIs: FC<InvestmentKPIsProps> = ({ summary, loading }) => {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-border rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-border rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const pnlColor = summary.totalPnL >= 0 ? 'text-success' : 'text-error'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-muted">Valore Portafoglio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-muted">Totale Investito</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalCostBasis)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-muted">P&L Totale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${pnlColor}`}>
            {summary.totalPnL >= 0 ? '+' : ''}
            {formatCurrency(summary.totalPnL)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-muted">P&L %</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${pnlColor}`}>
            {summary.totalPnLPct >= 0 ? '+' : ''}
            {formatPercent(summary.totalPnLPct)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
