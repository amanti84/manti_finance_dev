import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { PrevidenzaConfig, PensionFund } from '../../types'

interface ScenarioPensioneProps {
  config: PrevidenzaConfig | null
  funds: PensionFund[]
}

export const ScenarioPensione: FC<ScenarioPensioneProps> = ({ config, funds }) => {
  const [targetAge, setTargetAge] = useState<number>(60)
  const [expectedReturn, setExpectedReturn] = useState<number>(5)

  const currentAge = useMemo(() => {
    if (!config) return 0
    return new Date().getFullYear() - config.birthYear
  }, [config])

  const totalFundBalance = useMemo(() => {
    return funds.reduce((sum, f) => sum + (f.saldoAttuale || 0), 0)
  }, [funds])

  const results = useMemo(() => {
    if (!config) return null

    const yearsLeft = Math.max(0, targetAge - currentAge)
    const annualContribution = funds.reduce((sum, f) => sum + (f.contribuzioneAnnua || 0), 0)

    // Simple projection: montante = current * (1+r)^n + contribution * ((1+r)^n - 1) / r
    const r = expectedReturn / 100
    const n = yearsLeft

    let projectedMontante = totalFundBalance
    if (r > 0) {
      projectedMontante = totalFundBalance * Math.pow(1 + r, n) +
                         annualContribution * ((Math.pow(1 + r, n) - 1) / r)
    } else {
      projectedMontante = totalFundBalance + (annualContribution * n)
    }

    // Rough estimation of replacement rate (tasso di sostituzione)
    // Decreases if retiring earlier
    const baseReplacementRate = 0.75 // at 67
    const penaltyPerYear = 0.02
    const yearsBefore67 = 67 - targetAge
    const estimatedReplacementRate = Math.max(0.3, baseReplacementRate - (yearsBefore67 * penaltyPerYear))

    const annualPensionTarget = (config.currentRal * estimatedReplacementRate)
    const capitalNeeded = annualPensionTarget * 25 // 4% rule equivalent
    const gap = Math.max(0, capitalNeeded - projectedMontante)
    const extraAnnualSavingNeeded = gap > 0 && n > 0
      ? r > 0 ? (gap * r) / (Math.pow(1 + r, n) - 1) : gap / n
      : 0

    return {
      yearsLeft,
      projectedMontante: Math.round(projectedMontante),
      estimatedReplacementRate: Math.round(estimatedReplacementRate * 100),
      gap: Math.round(gap),
      extraMonthlySavingNeeded: Math.round(extraAnnualSavingNeeded / 12),
      annualPensionTarget: Math.round(annualPensionTarget),
      capitalNeeded: Math.round(capitalNeeded),
    }
  }, [config, totalFundBalance, funds, currentAge, targetAge, expectedReturn])

  const chartData = useMemo(() => {
    if (!results) return []
    return [
      { name: 'Montante Proiettato', valore: results.projectedMontante, fill: '#2563eb' },
      { name: 'Capitale Necessario', valore: results.capitalNeeded, fill: '#94a3b8' },
    ]
  }, [results])

  if (!config) {
    return (
      <div className="p-4 text-center text-gray-500">
        Configura prima i tuoi dati previdenziali nella sezione dedicata.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 p-6">
        <h3 className="text-lg font-bold mb-4">Parametri Pensione</h3>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-500 uppercase font-semibold">Età Attuale</p>
            <p className="text-xl font-bold">{currentAge} anni</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Età Target Pensionamento
            </label>
            <input
              type="range"
              min="55"
              max="70"
              step="1"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              value={targetAge}
              onChange={(e) => setTargetAge(Number(e.target.value))}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>55 anni</span>
              <span className="font-bold text-blue-600 text-base">{targetAge} anni</span>
              <span>70 anni</span>
            </div>
          </div>

          <Input
            label="Rendimento Fondo Pensione (%)"
            type="number"
            value={expectedReturn}
            onChange={(e) => setExpectedReturn(Number(e.target.value))}
            min={0}
            max={15}
            step={0.5}
          />
        </div>
      </Card>

      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-blue-50/30">
            <h3 className="text-lg font-bold mb-4">Output Simulazione</h3>
            {results && (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Anni Mancanti</span>
                  <span className="font-bold">{results.yearsLeft} anni</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Montante Proiettato</span>
                  <span className="font-bold">{results.projectedMontante.toLocaleString()} €</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Tasso Sostituzione Stimato</span>
                  <Badge variant="info">{results.estimatedReplacementRate}%</Badge>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Gap per Target (4% rule)</span>
                  <span className="font-bold text-red-600">{results.gap.toLocaleString()} €</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-600">Risparmio Extra Necessario</span>
                  <Badge variant="warning" className="text-lg">
                    {results.extraMonthlySavingNeeded.toLocaleString()} €/mese
                  </Badge>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold mb-6">Confronto Capitale (€)</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" hide />
                  <Tooltip
                    formatter={(val: number | string | readonly (number | string)[] | undefined) => {
                      if (typeof val === 'number') {
                        return [`${val.toLocaleString()} €`, '']
                      }
                      return [val?.toString() ?? '', '']
                    }}
                  />
                  <Bar dataKey="valore" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-col space-y-2">
              <div className="flex items-center text-xs">
                <div className="w-3 h-3 bg-blue-600 mr-2 rounded-sm" />
                <span>Montante Proiettato</span>
              </div>
              <div className="flex items-center text-xs">
                <div className="w-3 h-3 bg-gray-400 mr-2 rounded-sm" />
                <span>Capitale Necessario (Target)</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="lg:col-span-3 text-xs text-gray-400 italic mt-4">
        * Nota: Il tasso di sostituzione e il gap sono stime basate su modelli semplificati.
        I calcoli non includono l'inflazione o variazioni della RAL.
      </div>
    </div>
  )
}
