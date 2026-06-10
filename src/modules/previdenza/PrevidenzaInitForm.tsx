import { useState, useEffect } from 'react'
import type { FC } from 'react'
import { Modal, Input, Button } from '../../components/ui'
import type { PrevidenzaBaseline } from '../../types'

interface PrevidenzaInitFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<PrevidenzaBaseline, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  initialData?: PrevidenzaBaseline | null
}

export const PrevidenzaInitForm: FC<PrevidenzaInitFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData
}) => {
  const [formData, setFormData] = useState({
    tfrAccumulato: 0,
    montanteFondoPensione: 0,
    anniContributiINPS: 0,
    annoInizioLavoro: new Date().getFullYear() - 5,
    retribuzioneAnnuaLorda: 0
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData({
        tfrAccumulato: initialData.tfrAccumulato,
        montanteFondoPensione: initialData.montanteFondoPensione,
        anniContributiINPS: initialData.anniContributiINPS,
        annoInizioLavoro: initialData.annoInizioLavoro,
        retribuzioneAnnuaLorda: initialData.retribuzioneAnnuaLorda ?? 0
      })
    }
  }, [initialData, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    let val: string | number = value
    if (type === 'number') {
      val = (name === 'anniContributiINPS' || name === 'annoInizioLavoro')
        ? parseInt(value, 10) || 0
        : parseFloat(value) || 0
    }
    setFormData(prev => ({
      ...prev,
      [name]: val
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    void (async () => {
      try {
        await onSubmit(formData)
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
      title="Inizializzazione Dati Storici Previdenza"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-muted mb-4">
          Inserisci i dati storici accumulati fino ad oggi per rendere le proiezioni pensionistiche realistiche.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">TFR Accumulato in Azienda (€) *</label>
            <Input
              name="tfrAccumulato"
              type="number"
              value={formData.tfrAccumulato}
              onChange={handleChange}
              required
              min={0}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Montante Fondo Pensione Esistente (€) *</label>
            <Input
              name="montanteFondoPensione"
              type="number"
              value={formData.montanteFondoPensione}
              onChange={handleChange}
              required
              min={0}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Anni Contributi INPS versati *</label>
            <Input
              name="anniContributiINPS"
              type="number"
              value={formData.anniContributiINPS}
              onChange={handleChange}
              required
              min={0}
              max={50}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Anno Inizio Lavoro *</label>
            <Input
              name="annoInizioLavoro"
              type="number"
              value={formData.annoInizioLavoro}
              onChange={handleChange}
              required
              min={1970}
              max={new Date().getFullYear()}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Retribuzione Annua Lorda Attuale (€)</label>
          <Input
            name="retribuzioneAnnuaLorda"
            type="number"
            value={formData.retribuzioneAnnuaLorda}
            onChange={handleChange}
            min={0}
          />
          <p className="text-xs text-text-muted italic">Opzionale se già configurata o ricavabile dai cedolini.</p>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          <Button type="submit" isLoading={loading}>
            Salva Dati Iniziali
          </Button>
        </div>
      </form>
    </Modal>
  )
}
