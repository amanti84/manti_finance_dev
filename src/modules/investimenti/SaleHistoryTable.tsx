import type { FC } from 'react'
import { formatCurrency } from '../../utils/format'
import type { SaleRecord } from '../../types'
import { Badge } from '../../components/ui/Badge'

interface SaleHistoryTableProps {
  sales: SaleRecord[]
}

export const SaleHistoryTable: FC<SaleHistoryTableProps> = ({ sales }) => {
  if (sales.length === 0) {
    return (
      <div className="text-center py-8 bg-surface rounded-lg border border-border">
        <p className="text-text-muted">Nessuna vendita registrata.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border text-xs font-semibold text-text-muted uppercase tracking-wider">
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Investimento</th>
            <th className="px-4 py-3">Quantità</th>
            <th className="px-4 py-3">Prezzo</th>
            <th className="px-4 py-3 text-right">Plus/Minus</th>
            <th className="px-4 py-3 text-right">Tasse</th>
            <th className="px-4 py-3 text-right">Netto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sales.map((sale) => (
            <tr key={sale.id} className="hover:bg-primary/5 transition-colors">
              <td className="px-4 py-3 text-sm">
                {sale.saleDate.toDate().toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-text">{sale.investmentName}</div>
                <div className="text-xs text-text-muted uppercase">{sale.broker}</div>
              </td>
              <td className="px-4 py-3 text-sm">{sale.sellQuantity}</td>
              <td className="px-4 py-3 text-sm">{formatCurrency(sale.sellPrice, 'EUR')}</td>
              <td className="px-4 py-3 text-right">
                <Badge variant={sale.grossGain >= 0 ? 'success' : 'error'}>
                  {sale.grossGain >= 0 ? '+' : ''}{formatCurrency(sale.grossGain, 'EUR')}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right text-sm text-error">
                {sale.taxAmount > 0 ? `-${formatCurrency(sale.taxAmount, 'EUR')}` : '-'}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-text">
                {formatCurrency(sale.netProceeds, 'EUR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
