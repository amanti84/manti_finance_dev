import { useState, useEffect } from 'react'
import type { KindergartenInvestment } from '../../types/kindergarten'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export interface KindergartenInvestmentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (inv: Omit<KindergartenInvestment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<unknown>
  initialData?: KindergartenInvestment | undefined
}

export default function KindergartenInvestmentFormModal({ isOpen, onClose, onSave, initialData }: KindergartenInvestmentFormModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    ticker: string;
    category: 'etf' | 'fund' | 'stock' | 'bond' | 'other';
    purchaseDate: string;
    purchasePrice: number;
    quantity: number;
    currentPrice: number;
    notes: string;
  }>({
    name: '',
    ticker: '',
    category: 'etf',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: 0,
    quantity: 0,
    currentPrice: 0,
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        ticker: initialData.ticker ?? '',
        category: initialData.category,
        purchaseDate: initialData.purchaseDate,
        purchasePrice: initialData.purchasePrice,
        quantity: initialData.quantity,
        currentPrice: initialData.currentPrice,
        notes: initialData.notes ?? ''
      })
    } else {
      setFormData({
        name: '',
        ticker: '',
        category: 'etf',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: 0,
        quantity: 0,
        currentPrice: 0,
        notes: ''
      })
    }
  }, [initialData, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    onSave(formData)
      .then(() => {
        onClose()
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Modifica Investimento KG' : 'Nuovo Investimento KG'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ticker (opzionale)"
            value={formData.ticker}
            onChange={e => setFormData({ ...formData, ticker: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value as 'etf' | 'fund' | 'stock' | 'bond' | 'other' })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="etf">ETF</option>
              <option value="fund">Fondo</option>
              <option value="stock">Azione</option>
              <option value="bond">Obbligazione</option>
              <option value="other">Altro</option>
            </select>
          </div>
        </div>
        <Input
          label="Data Acquisto"
          type="date"
          value={formData.purchaseDate}
          onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
          required
        />
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Prezzo Acq (€)"
            type="number"
            step="0.0001"
            value={formData.purchasePrice}
            onChange={e => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) })}
            required
          />
          <Input
            label="Quantità"
            type="number"
            step="0.0001"
            value={formData.quantity}
            onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
            required
          />
          <Input
            label="Prezzo Att (€)"
            type="number"
            step="0.0001"
            value={formData.currentPrice}
            onChange={e => setFormData({ ...formData, currentPrice: parseFloat(e.target.value) })}
            required
          />
        </div>
        <Input
          label="Note"
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Annulla</Button>
          <Button type="submit" isLoading={loading}>{initialData ? 'Salva' : 'Aggiungi'}</Button>
        </div>
      </form>
    </Modal>
  )
}
