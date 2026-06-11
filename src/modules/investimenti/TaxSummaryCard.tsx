import type { FC } from 'react'
import { Card } from '../../components/ui/Card'
import { formatCurrency } from '../../utils/format'
import type { TaxSummary, TaxWallet } from '../../types'
import { Badge } from '../../components/ui/Badge'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

interface TaxSummaryCardProps {
  summary: TaxSummary | null
  wallet: TaxWallet | null
  year: number
}

export const TaxSummaryCard: FC<TaxSummaryCardProps> = ({ summary, wallet, year }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Plusvalenze {year}</span>
          <TrendingUp className="text-success" size={20} />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-text">
            {summary ? formatCurrency(summary.totalGrossGain, 'EUR') : '€0,00'}
          </div>
          <p className="text-xs text-text-muted mt-1">Lorde da compensazioni</p>
        </div>
      </Card>

      <Card className="p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Imposta Pagata {year}</span>
          <TrendingDown className="text-error" size={20} />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-text">
            {summary ? formatCurrency(summary.totalTaxPaid, 'EUR') : '€0,00'}
          </div>
          <p className="text-xs text-text-muted mt-1">Aliquota 26% su {summary ? formatCurrency(summary.totalTaxableGain, 'EUR') : '€0,00'} netti</p>
        </div>
      </Card>

      <Card className="p-4 flex flex-col justify-between bg-primary/5 border-primary/20">
        <div className="flex justify-between items-start">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Zainetto Fiscale</span>
          <Wallet className="text-primary" size={20} />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-primary">
            {wallet ? formatCurrency(wallet.totalAvailableLosses, 'EUR') : '€0,00'}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-text-muted">Minusvalenze compensabili</p>
            {wallet && wallet.totalAvailableLosses > 0 && (
                <Badge variant="info" className="text-[10px] px-1 py-0">FIFO</Badge>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
