import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import type { MutuoConfig } from '../../types'

interface ScenarioMutuoProps {
  config: MutuoConfig | null
}

export const ScenarioMutuo: FC<ScenarioMutuoProps> = ({ config }) => {
  const [anticipo, setAnticipo] = useState<number>(0)
  const [mode, setMode] = useState<'duration' | 'payment'>('duration')

  const results = useMemo(() => {
    if (!config) return null

    const p = config.debitoResiduo
    const pPrime = Math.max(0, p - anticipo)
    const annualRate = config.tasso / 100
    const i = annualRate / 12
    const currentR = config.rataMensile

    // Calculate remaining months n from current config
    // R = P * (i * (1+i)^n) / ((1+i)^n - 1)
    // 1 - (P*i/R) = (1+i)^-n
    // -n = log(1 - (P*i/R)) / log(1+i)
    // n = -log(1 - (P*i/R)) / log(1+i)
    const n = -Math.log(1 - (p * i) / currentR) / Math.log(1 + i)
    const remainingMonths = Math.ceil(n)

    // Current total interests
    const currentTotalPaid = currentR * n
    const currentTotalInterests = currentTotalPaid - p

    if (mode === 'duration') {
      // Keep R, find new nPrime
      if (pPrime === 0) {
        return {
          nuovoDebito: 0,
          nuovaDataFine: new Date().toISOString().split('T')[0],
          risparmioInteressi: currentTotalInterests,
          deltaRata: 0,
          nuovaRata: currentR,
          mesiRisparmiati: remainingMonths,
        }
      }

      const nPrime = -Math.log(1 - (pPrime * i) / currentR) / Math.log(1 + i)
      const newRemainingMonths = Math.ceil(nPrime)
      const newTotalPaid = currentR * nPrime
      const newTotalInterests = newTotalPaid - pPrime
      const risparmioInteressi = currentTotalInterests - newTotalInterests

      const nuovaDataFine = new Date()
      nuovaDataFine.setMonth(nuovaDataFine.getMonth() + newRemainingMonths)

      return {
        nuovoDebito: pPrime,
        nuovaDataFine: nuovaDataFine.toISOString().split('T')[0],
        risparmioInteressi: Math.round(risparmioInteressi * 100) / 100,
        deltaRata: 0,
        nuovaRata: currentR,
        mesiRisparmiati: remainingMonths - newRemainingMonths,
      }
    } else {
      // Keep n, find new RPrime
      const factor = (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
      const newR = pPrime * factor
      const newTotalPaid = newR * n
      const newTotalInterests = newTotalPaid - pPrime
      const risparmioInteressi = currentTotalInterests - newTotalInterests

      const nuovaDataFine = new Date(typeof config.dataFine === 'string' ? config.dataFine : config.dataFine.toDate())

      return {
        nuovoDebito: pPrime,
        nuovaDataFine: nuovaDataFine.toISOString().split('T')[0],
        risparmioInteressi: Math.round(risparmioInteressi * 100) / 100,
        deltaRata: Math.round((currentR - newR) * 100) / 100,
        nuovaRata: Math.round(newR * 100) / 100,
        mesiRisparmiati: 0,
      }
    }
  }, [config, anticipo, mode])

  if (!config) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Configura prima il tuo mutuo nella sezione dedicata.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Parametri Simulazione</h3>
        <div className="space-y-4">
          <Input
            label="Importo da anticipare (€)"
            type="number"
            value={anticipo}
            onChange={(e) => setAnticipo(Number(e.target.value))}
            min={0}
            max={config.debitoResiduo}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strategia</label>
            <select
              className="w-full p-2 border rounded-md"
              value={mode}
              onChange={(e) => setMode(e.target.value as 'duration' | 'payment')}
            >
              <option value="duration">Riduci Durata</option>
              <option value="payment">Riduci Rata</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-blue-50/30">
        <h3 className="text-lg font-bold mb-4">Risultati Stimati</h3>
        {results && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-600">Nuovo Debito Residuo</span>
              <span className="font-bold">{results.nuovoDebito.toLocaleString()} €</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-600">Risparmio Interessi Totale</span>
              <Badge variant="success" className="text-lg">
                {results.risparmioInteressi.toLocaleString()} €
              </Badge>
            </div>
            {mode === 'duration' ? (
              <>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Mesi Risparmiati</span>
                  <span className="font-bold text-blue-600">{results.mesiRisparmiati} mesi</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Nuova Data Fine Stimata</span>
                  <span className="font-bold">{results.nuovaDataFine}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Nuova Rata Mensile</span>
                  <span className="font-bold text-blue-600">{results.nuovaRata.toLocaleString()} €</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Riduzione Rata (Delta)</span>
                  <span className="font-bold text-green-600">-{results.deltaRata.toLocaleString()} €</span>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
      <div className="md:col-span-2 text-xs text-gray-400 italic mt-4">
        * Nota: I calcoli sono puramente indicativi e basati su ammortamento alla francese a tasso fisso.
        Nessun dato viene salvato su Firestore.
      </div>
    </div>
  )
}
