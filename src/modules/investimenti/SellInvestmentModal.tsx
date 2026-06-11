import { useState, useEffect } from 'react'
import type { FC } from 'react'
import { Modal, Input, Button } from '../../components/ui'
import { formatCurrency } from '../../utils/format'
import type { Investment, SaleResult } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import { calculateSale, recordSale } from '../../services/sales'

interface SellInvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  investment: Investment | null
  onSuccess: () => Promise<void>
}

export const SellInvestmentModal: FC<SellInvestmentModalProps> = ({
  isOpen,
  onClose,
  investment,
  onSuccess
}) => {
  const { user } = useAuth()
  const [quantity, setQuantity] = useState(0)
  const [price, setPrice] = useState(0)
  const [loading, setLoading] = useState(false)
  const [fiscalPreview, setFiscalPreview] = useState<SaleResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (investment && isOpen) {
      setQuantity(investment.quantity)
      setPrice(investment.currentPrice)
      setError(null)
    }
  }, [investment, isOpen])

  useEffect(() => {
    if (investment && user && quantity > 0 && quantity <= investment.quantity && price > 0) {
      void (async () => {
        const res = await calculateSale(investment, price, quantity, user.uid)
        if (res.success) {
          setFiscalPreview(res.data)
        }
      })()
    } else {
      setFiscalPreview(null)
    }
  }, [investment, user, quantity, price])

  if (!investment) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || quantity <= 0 || quantity > investment.quantity) return

    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const res = await recordSale(user.uid, investment.id, price, quantity, new Date())
        if (res.success) {
          await onSuccess()
          onClose()
        } else {
          setError(res.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    })()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registra Vendita"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-error/10 border border-error/20 rounded text-error text-sm">
            {error}
          </div>
        )}

        <p className="text-sm text-text-muted">
          Registra la vendita di una parte o della totalità di <strong>{investment.name}</strong>.
          La quantità rimanente verrà aggiornata.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase">Quantità (max {investment.quantity})</label>
            <Input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              max={investment.quantity}
              min={0.000001}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase">Prezzo Vendita (€)</label>
            <Input
              type="number"
              step="any"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              required
            />
          </div>
        </div>

        <div className="p-4 bg-bg rounded-lg border border-border space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-text-muted">Controvalore lordo:</span>
            <span className="font-bold text-base">{formatCurrency(quantity * price, investment.currency)}</span>
          </div>

          {fiscalPreview && (
            <>
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <span className="text-text-muted">Plusvalenza/Minusvalenza:</span>
                <span className={`font-medium ${fiscalPreview.grossGain >= 0 ? 'text-success' : 'text-error'}`}>
                  {fiscalPreview.grossGain >= 0 ? '+' : ''}{formatCurrency(fiscalPreview.grossGain, investment.currency)}
                </span>
              </div>

              {fiscalPreview.grossGain > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted">Imposta (26%):</span>
                  <span className="text-error">-{formatCurrency(fiscalPreview.taxAmount, investment.currency)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-border font-bold text-primary">
                <span>Incasso netto stimato:</span>
                <span>{formatCurrency(fiscalPreview.netProceeds, investment.currency)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between items-center text-xs pt-1 text-text-muted italic">
            <span>Quantità residua dopo vendita:</span>
            <span>{(investment.quantity - quantity).toFixed(4)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          <Button type="submit" isLoading={loading} disabled={quantity <= 0 || quantity > investment.quantity}>
            Conferma Vendita
          </Button>
        </div>
      </form>
    </Modal>
  )
}
