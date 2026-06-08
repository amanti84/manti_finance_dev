import { useState } from 'react'
import type { FC } from 'react'
import { Modal, Button, Badge } from '../../components/ui'
import { formatCurrency, formatPercent, formatDate } from '../../utils/format'
import type { Investment } from '../../types'
import { Edit2, Trash2, Tag, Briefcase, Calendar, TrendingUp, TrendingDown, ShoppingBag } from 'lucide-react'

interface InvestmentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  investment: Investment | null
  onEdit: (investment: Investment) => void
  onDelete: (investment: Investment) => void
  onSell: (investment: Investment) => void
}

export const InvestmentDetailModal: FC<InvestmentDetailModalProps> = ({
  isOpen,
  onClose,
  investment,
  onEdit,
  onDelete,
  onSell
}) => {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!investment) return null

  const costBasis = investment.quantity * investment.avgCost
  const pnl = investment.currentValue - costBasis
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0
  const pnlColor = pnl >= 0 ? 'text-success' : 'text-error'

  const handleDelete = () => {
    if (isDeleting) {
      onDelete(investment)
      onClose()
      setIsDeleting(false)
    } else {
      setIsDeleting(true)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose()
        setIsDeleting(false)
      }}
      title="Dettaglio Investimento"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-text">{investment.name}</h3>
            <p className="text-sm text-text-muted">{investment.isin ?? (investment.ticker ?? 'No ISIN/Ticker')}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="default" className="capitalize">{investment.assetClass}</Badge>
            {investment.isPac && <Badge variant="info">PAC</Badge>}
          </div>
        </div>

        {/* P&L Snapshot */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-bg/50 border border-border">
          <div className="space-y-1">
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Valore Attuale</p>
            <p className="text-2xl font-bold">{formatCurrency(investment.currentValue, investment.currency)}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">P&L Totale</p>
            <p className={`text-2xl font-bold ${pnlColor}`}>
              {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, investment.currency)}
              <span className="text-sm ml-1">({pnlPct >= 0 ? '+' : ''}{formatPercent(pnlPct)})</span>
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-y-4 text-sm">
          <div className="flex items-center gap-3">
            <Tag size={16} className="text-text-muted" />
            <div>
              <p className="text-text-muted leading-tight">Quantità</p>
              <p className="font-medium">{investment.quantity}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShoppingBag size={16} className="text-text-muted" />
            <div>
              <p className="text-text-muted leading-tight">Costo Medio</p>
              <p className="font-medium">{formatCurrency(investment.avgCost, investment.currency)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TrendingUp size={16} className="text-text-muted" />
            <div>
              <p className="text-text-muted leading-tight">Prezzo Attuale</p>
              <p className="font-medium">{formatCurrency(investment.currentPrice, investment.currency)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Briefcase size={16} className="text-text-muted" />
            <div>
              <p className="text-text-muted leading-tight">Broker</p>
              <p className="font-medium capitalize">{investment.broker}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-text-muted" />
            <div>
              <p className="text-text-muted leading-tight">Ultimo Aggiornamento</p>
              <p className="font-medium">
                {investment.lastPriceUpdate ? formatDate(new Date(investment.lastPriceUpdate.toMillis()).toISOString()) : '-'}
              </p>
            </div>
          </div>
          {investment.isPac && (
            <div className="flex items-center gap-3">
              <TrendingDown size={16} className="text-text-muted" />
              <div>
                <p className="text-text-muted leading-tight">Mensilità PAC</p>
                <p className="font-medium">{formatCurrency(investment.pacMonthlyAmount ?? 0, investment.currency)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-6 border-t border-border">
          <Button variant="secondary" className="flex-1 gap-2" onClick={() => onEdit(investment)}>
            <Edit2 size={16} /> Modifica
          </Button>
          <Button variant="secondary" className="flex-1 gap-2" onClick={() => onSell(investment)}>
            <ShoppingBag size={16} /> Registra Vendita
          </Button>
          <Button
            variant={isDeleting ? 'danger' : 'ghost'}
            className="flex-1 gap-2"
            onClick={handleDelete}
          >
            <Trash2 size={16} /> {isDeleting ? 'Conferma?' : 'Elimina'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
