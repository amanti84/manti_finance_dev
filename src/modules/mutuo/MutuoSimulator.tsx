import { useState, useMemo } from 'react'
import type { FC } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from '../../components/ui'
import { formatCurrency } from '../../utils/format'
import { simulateExtraPayment } from '../../services/mutuo'
import type { MutuoConfig } from '../../types'
import { Calculator, TrendingDown, CalendarDays, Wallet, CheckCircle2 } from 'lucide-react'
import { toDateSafe } from '../../utils/date'

interface MutuoSimulatorProps {
  config: MutuoConfig | null
  onApplyOverpayment?: (amount: number) => Promise<boolean>
}

export const MutuoSimulator: FC<MutuoSimulatorProps> = ({ config, onApplyOverpayment }) => {
  const [extraAmount, setExtraAmount] = useState<number>(0)
  const [isApplying, setIsApplying] = useState(false)

  const simulation = useMemo(() => {
    if (!config || extraAmount <= 0) return null
    const result = simulateExtraPayment(config, extraAmount)
    return result.success ? result.data : null
  }, [config, extraAmount])

  const handleApply = async () => {
    if (!onApplyOverpayment || extraAmount <= 0) return
    setIsApplying(true)
    const success = await onApplyOverpayment(extraAmount)
    if (success) {
      setExtraAmount(0)
    }
    setIsApplying(false)
  }

  if (!config) return null

  const nuovaScadenzaDate = toDateSafe(simulation?.nuovaScadenza)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator size={20} className="text-primary" />
          Simulatore Estinzione Anticipata
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Importo extra da versare oggi</label>
          <div className="relative">
            <Input
              type="number"
              placeholder="0,00"
              value={extraAmount || ''}
              onChange={(e) => setExtraAmount(parseFloat(e.target.value) || 0)}
              className="pr-12"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted font-medium">€</div>
          </div>
          <p className="text-xs text-text-muted">
            Calcola l'impatto di un versamento extra sul debito residuo attuale ({formatCurrency(config.debitoResiduo)}).
          </p>
        </div>

        {simulation ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-4 rounded-lg bg-success/10 border border-success/20 space-y-1">
              <div className="flex items-center gap-2 text-success">
                <TrendingDown size={16} />
                <span className="text-xs font-bold uppercase">Risparmio Interessi</span>
              </div>
              <div className="text-xl font-bold text-success">
                {formatCurrency(simulation.interessiRisparmiati)}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-info/10 border border-info/20 space-y-1">
              <div className="flex items-center gap-2 text-info">
                <CalendarDays size={16} />
                <span className="text-xs font-bold uppercase">Mesi Risparmiati</span>
              </div>
              <div className="text-xl font-bold text-info">
                {simulation.rateRisparmiate} rate
              </div>
            </div>

            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-1">
              <div className="flex items-center gap-2 text-primary">
                <Wallet size={16} />
                <span className="text-xs font-bold uppercase">Nuova Scadenza</span>
              </div>
              <div className="text-xl font-bold text-primary">
                {nuovaScadenzaDate ? nuovaScadenzaDate.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }) : '-'}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center border-2 border-dashed border-border rounded-lg text-text-muted text-sm italic">
            Inserisci un importo per vedere la simulazione
          </div>
        )}

        {simulation && (
          <div className="space-y-4">
            <Button
              className="w-full gap-2"
              onClick={() => { void handleApply() }}
              isLoading={isApplying}
              disabled={!onApplyOverpayment}
            >
              <CheckCircle2 size={18} /> Applica Versamento Extra
            </Button>
            <div className="flex items-center gap-2 text-xs text-text-muted italic">
              * I calcoli sono stime basate sull'ammortamento alla francese e non includono eventuali penali o costi di gestione della banca.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
