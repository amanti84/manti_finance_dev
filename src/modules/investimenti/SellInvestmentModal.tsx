import { useState, useEffect } from 'react'
import type { FC } from 'react'
import { Modal, Input, Button } from '../../components/ui'
import { formatCurrency } from '../../utils/format'
import type { Investment } from '../../types'

interface SellInvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  investment: Investment | null
  onConfirm: (id: string, quantityToSell: number, salePrice: number) => Promise<void>
}

export const SellInvestmentModal: FC<SellInvestmentModalProps> = ({
  isOpen,
  onClose,
  investment,
  onConfirm
}) => {
  const [quantity, setQuantity] = useState(0)
  const [price, setPrice] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (investment) {
      setQuantity(investment.quantity)
      setPrice(investment.currentPrice)
    }
  }, [investment, isOpen])

  if (!investment) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (quantity <= 0 || quantity > investment.quantity) return

    setLoading(true)
    void (async () => {
      try {
        await onConfirm(investment.id, quantity, price)
        onClose()
      } catch (err) {
        console.error(err)
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
        <p className="text-sm text-text-muted">
          Registra la vendita di una parte o della totalità di <strong>{investment.name}</strong>.
          La quantità rimanente verrà aggiornata.
        </p>

        <div className="space-y-1">
          <label className="text-sm font-medium">Quantità da vendere (max {investment.quantity})</label>
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
          <label className="text-sm font-medium">Prezzo di vendita (per unità)</label>
          <Input
            type="number"
            step="any"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        <div className="p-3 bg-bg rounded border border-border text-sm">
          <div className="flex justify-between">
            <span>Controvalore vendita:</span>
            <span className="font-bold">{formatCurrency(quantity * price, investment.currency)}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Quantità residua:</span>
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
