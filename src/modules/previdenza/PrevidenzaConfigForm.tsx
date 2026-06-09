import { useState, useEffect } from 'react'
import type { FC } from 'react'
import { Modal, Input, Button } from '../../components/ui'
import type { PrevidenzaConfig } from '../../types'

interface PrevidenzaConfigFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<PrevidenzaConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  initialData?: PrevidenzaConfig | null
}

export const PrevidenzaConfigForm: FC<PrevidenzaConfigFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData
}) => {
  const [formData, setFormData] = useState({
    birthYear: new Date().getFullYear() - 30,
    inpsStartYear: new Date().getFullYear() - 5,
    currentRal: 30000,
    pensionFundBroker: '',
    pensionFundContributionPct: 1,
    pensionFundEmployerContributionPct: 1,
    expectedReturnPct: 4,
    retirementAgeTarget: 67
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData({
        birthYear: initialData.birthYear,
        inpsStartYear: initialData.inpsStartYear,
        currentRal: initialData.currentRal,
        pensionFundBroker: initialData.pensionFundBroker ?? '',
        pensionFundContributionPct: initialData.pensionFundContributionPct ?? 1,
        pensionFundEmployerContributionPct: initialData.pensionFundEmployerContributionPct ?? 1,
        expectedReturnPct: initialData.expectedReturnPct ?? 4,
        retirementAgeTarget: initialData.retirementAgeTarget ?? 67
      })
    }
  }, [initialData, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
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
      title="Configura Dati Previdenziali"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Anno di Nascita *</label>
            <Input
              name="birthYear"
              type="number"
              value={formData.birthYear}
              onChange={handleChange}
              required
              min={1950}
              max={new Date().getFullYear()}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Inizio Contribuzione INPS *</label>
            <Input
              name="inpsStartYear"
              type="number"
              value={formData.inpsStartYear}
              onChange={handleChange}
              required
              min={1970}
              max={new Date().getFullYear()}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">RAL Attuale (€) *</label>
            <Input
              name="currentRal"
              type="number"
              value={formData.currentRal}
              onChange={handleChange}
              required
              min={0}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Target Età Pensione</label>
            <Input
              name="retirementAgeTarget"
              type="number"
              value={formData.retirementAgeTarget}
              onChange={handleChange}
              min={50}
              max={80}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-bold mb-3">Configurazione Fondo Pensione</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Broker / Gestore</label>
              <Input
                name="pensionFundBroker"
                value={formData.pensionFundBroker}
                onChange={handleChange}
                placeholder="es. Allianz, Fon.Te, Moneyfarm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Rendimento Atteso (%)</label>
              <Input
                name="expectedReturnPct"
                type="number"
                step="0.1"
                value={formData.expectedReturnPct}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Tua Contribuzione (%)</label>
              <Input
                name="pensionFundContributionPct"
                type="number"
                step="0.1"
                value={formData.pensionFundContributionPct}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Contribuzione Datore (%)</label>
              <Input
                name="pensionFundEmployerContributionPct"
                type="number"
                step="0.1"
                value={formData.pensionFundEmployerContributionPct}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          <Button type="submit" isLoading={loading}>
            Salva Configurazione
          </Button>
        </div>
      </form>
    </Modal>
  )
}
