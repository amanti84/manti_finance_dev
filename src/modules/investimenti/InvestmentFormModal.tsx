import { useState, useEffect } from 'react'
import type { FC } from 'react'
import { Modal, Input, Button } from '../../components/ui'
import type { Investment, AssetClass, Broker, Currency } from '../../types'
import { Timestamp } from 'firebase/firestore'

interface InvestmentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'currentValue'>) => Promise<void>
  initialData?: Investment | null
  title?: string
}

const ASSET_CLASSES: AssetClass[] = ['azioni', 'obbligazioni', 'etf', 'fondi', 'pac', 'crypto', 'liquidita', 'immobili', 'altro']
const BROKERS: Broker[] = ['fineco', 'directa', 'degiro', 'altri']
const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP', 'CHF']

export const InvestmentFormModal: FC<InvestmentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title = 'Aggiungi Investimento'
}) => {
  const [formData, setFormData] = useState({
    name: '',
    isin: '',
    ticker: '',
    assetClass: 'etf' as AssetClass,
    broker: 'fineco' as Broker,
    quantity: 0,
    avgCost: 0,
    currentPrice: 0,
    currency: 'EUR' as Currency,
    isPac: false,
    pacMonthlyAmount: 0
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        isin: initialData.isin ?? '',
        ticker: initialData.ticker ?? '',
        assetClass: initialData.assetClass,
        broker: initialData.broker,
        quantity: initialData.quantity,
        avgCost: initialData.avgCost,
        currentPrice: initialData.currentPrice,
        currency: initialData.currency,
        isPac: initialData.isPac,
        pacMonthlyAmount: initialData.pacMonthlyAmount ?? 0
      })
    } else {
      setFormData({
        name: '',
        isin: '',
        ticker: '',
        assetClass: 'etf',
        broker: 'fineco',
        quantity: 0,
        avgCost: 0,
        currentPrice: 0,
        currency: 'EUR',
        isPac: false,
        pacMonthlyAmount: 0
      })
    }
  }, [initialData, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    void (async () => {
      try {
        await onSubmit({
          ...formData,
          lastPriceUpdate: Timestamp.now()
        })
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
      title={title}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nome *</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="es. Vanguard S&P 500"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Currency</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">ISIN</label>
            <Input
              name="isin"
              value={formData.isin}
              onChange={handleChange}
              placeholder="IE00B3XXRP09"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Ticker</label>
            <Input
              name="ticker"
              value={formData.ticker}
              onChange={handleChange}
              placeholder="VUSA.L"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Asset Class</label>
            <select
              name="assetClass"
              value={formData.assetClass}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 capitalize"
            >
              {ASSET_CLASSES.map(ac => <option key={ac} value={ac}>{ac}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Broker</label>
            <select
              name="broker"
              value={formData.broker}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 capitalize"
            >
              {BROKERS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Quantità *</label>
            <Input
              name="quantity"
              type="number"
              step="any"
              value={formData.quantity}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Costo Medio *</label>
            <Input
              name="avgCost"
              type="number"
              step="any"
              value={formData.avgCost}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Prezzo Attuale *</label>
            <Input
              name="currentPrice"
              type="number"
              step="any"
              value={formData.currentPrice}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <input
              id="isPac"
              name="isPac"
              type="checkbox"
              checked={formData.isPac}
              onChange={handleChange}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="isPac" className="text-sm font-medium cursor-pointer">
              È un Piano di Accumulo (PAC)?
            </label>
          </div>

          {formData.isPac && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="text-sm font-medium">Importo Mensile PAC</label>
              <Input
                name="pacMonthlyAmount"
                type="number"
                value={formData.pacMonthlyAmount}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          <Button type="submit" isLoading={loading}>
            {initialData ? 'Salva Modifiche' : 'Aggiungi Investimento'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
