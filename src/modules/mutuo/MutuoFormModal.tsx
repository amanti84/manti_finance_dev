import { useState, useEffect } from 'react'
import type { FC } from 'react'
import { Modal, Input, Button } from '../../components/ui'
import type { MutuoConfig } from '../../types'
import { Timestamp } from 'firebase/firestore'
import { toDateSafe } from '../../utils/date'

interface MutuoFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: MutuoConfig) => Promise<void>
  initialData?: MutuoConfig | null
}

export const MutuoFormModal: FC<MutuoFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData
}) => {
  const [formData, setFormData] = useState({
    importoOriginale: 0,
    debitoResiduo: 0,
    rataMensile: 0,
    tasso: 0,
    dataInizio: '',
    dataFine: '',
    isMutuoVariabile: false,
    banca: '',
    notes: ''
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      const dateStart = toDateSafe(initialData.dataInizio)
      const dateEnd = toDateSafe(initialData.dataFine)

      setFormData({
        importoOriginale: initialData.importoOriginale,
        debitoResiduo: initialData.debitoResiduo,
        rataMensile: initialData.rataMensile,
        tasso: initialData.tasso,
        dataInizio: dateStart ? dateStart.toISOString().split('T')[0] : '',
        dataFine: dateEnd ? dateEnd.toISOString().split('T')[0] : '',
        isMutuoVariabile: initialData.isMutuoVariabile,
        banca: initialData.banca ?? '',
        notes: initialData.notes ?? ''
      })
    }
  }, [initialData, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        const dataInizioDate = new Date(formData.dataInizio)
        const dataFineDate = new Date(formData.dataFine)

        const config: MutuoConfig = {
          ...formData,
          dataInizio: Timestamp.fromDate(dataInizioDate),
          dataFine: Timestamp.fromDate(dataFineDate)
        }
        await onSubmit(config)
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
      title={initialData ? 'Modifica Mutuo' : 'Configura Mutuo'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Banca</label>
            <Input
              name="banca"
              value={formData.banca}
              onChange={handleChange}
              placeholder="es. Intesa Sanpaolo"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Importo Originale *</label>
            <Input
              name="importoOriginale"
              type="number"
              value={formData.importoOriginale}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Debito Residuo Attuale *</label>
            <Input
              name="debitoResiduo"
              type="number"
              value={formData.debitoResiduo}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Rata Mensile *</label>
            <Input
              name="rataMensile"
              type="number"
              value={formData.rataMensile}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Tasso Annuo (%) *</label>
            <Input
              name="tasso"
              type="number"
              step="0.01"
              value={formData.tasso}
              onChange={handleChange}
              required
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              id="isMutuoVariabile"
              name="isMutuoVariabile"
              type="checkbox"
              checked={formData.isMutuoVariabile}
              onChange={handleChange}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="isMutuoVariabile" className="text-sm font-medium cursor-pointer">
              Mutuo a tasso variabile
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Data Inizio *</label>
            <Input
              name="dataInizio"
              type="date"
              value={formData.dataInizio}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Data Fine *</label>
            <Input
              name="dataFine"
              type="date"
              value={formData.dataFine}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Note</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="w-full min-h-[80px] p-3 rounded-md border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Altre informazioni sul mutuo..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          <Button type="submit" isLoading={loading}>
            {initialData ? 'Salva Modifiche' : 'Configura Mutuo'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
