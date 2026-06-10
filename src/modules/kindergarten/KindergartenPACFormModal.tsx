import { useState, useEffect } from 'react'
import type { KindergartenPAC } from '../../types/kindergarten'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export interface KindergartenPACFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (pac: Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'>) => Promise<unknown>
  initialData?: KindergartenPAC | undefined
}

export default function KindergartenPACFormModal({ isOpen, onClose, onSave, initialData }: KindergartenPACFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    ticker: '',
    monthlyAmount: 0,
    startDate: new Date().toISOString().split('T')[0],
    targetYears: 18,
    currentValue: 0,
    totalInvested: 0,
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        ticker: initialData.ticker ?? '',
        monthlyAmount: initialData.monthlyAmount,
        startDate: initialData.startDate,
        targetYears: initialData.targetYears,
        currentValue: initialData.currentValue,
        totalInvested: initialData.totalInvested,
        notes: initialData.notes ?? ''
      })
    } else {
      setFormData({
        name: '',
        ticker: '',
        monthlyAmount: 0,
        startDate: new Date().toISOString().split('T')[0],
        targetYears: 18,
        currentValue: 0,
        totalInvested: 0,
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
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Modifica PAC KG' : 'Nuovo PAC KG'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome PAC"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <Input
          label="Ticker (opzionale)"
          value={formData.ticker}
          onChange={e => setFormData({ ...formData, ticker: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Rata Mensile (€)"
            type="number"
            step="0.01"
            value={formData.monthlyAmount}
            onChange={e => setFormData({ ...formData, monthlyAmount: parseFloat(e.target.value) })}
            required
          />
          <Input
            label="Data Inizio"
            type="date"
            value={formData.startDate}
            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Anni Target"
            type="number"
            value={formData.targetYears}
            onChange={e => setFormData({ ...formData, targetYears: parseInt(e.target.value) })}
            required
          />
          <Input
            label="Tot. Versato (€)"
            type="number"
            step="0.01"
            value={formData.totalInvested}
            onChange={e => setFormData({ ...formData, totalInvested: parseFloat(e.target.value) })}
            required
          />
          <Input
            label="Val. Attuale (€)"
            type="number"
            step="0.01"
            value={formData.currentValue}
            onChange={e => setFormData({ ...formData, currentValue: parseFloat(e.target.value) })}
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
