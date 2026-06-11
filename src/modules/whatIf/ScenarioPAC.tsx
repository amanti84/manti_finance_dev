import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { Investment } from '../../types'

interface ScenarioPACProps {
  pacs: Investment[]
}

export const ScenarioPAC: FC<ScenarioPACProps> = ({ pacs }) => {
  const [nuovoImporto, setNuovoImporto] = useState<number>(200)
  const [rendimentoAnnuo, setRendimentoAnnuo] = useState<number>(7)
  const [durataAnni, setDurataAnni] = useState<number>(10)

  const currentMonthlyTotal = useMemo(() => {
    return pacs.reduce((sum, pac) => sum + (pac.pacMonthlyAmount ?? 0), 0)
  }, [pacs])

  const currentCapital = useMemo(() => {
    return pacs.reduce((sum, pac) => sum + (pac.currentValue ?? 0), 0)
  }, [pacs])

  const simulationData = useMemo(() => {
    const data = []
    const rMensile = rendimentoAnnuo / 100 / 12
    const mesi = durataAnni * 12

    let currentM = currentCapital
    let simulatedM = currentCapital

    // Initial state
    data.push({
      mese: 0,
      anno: 0,
      attuale: Math.round(currentM),
      simulato: Math.round(simulatedM),
    })

    for (let m = 1; m <= mesi; m++) {
      currentM = (currentM + currentMonthlyTotal) * (1 + rMensile)
      simulatedM = (simulatedM + nuovoImporto) * (1 + rMensile)

      if (m % 12 === 0) {
        data.push({
          mese: m,
          anno: m / 12,
          attuale: Math.round(currentM),
          simulato: Math.round(simulatedM),
        })
      }
    }
    return data
  }, [currentCapital, currentMonthlyTotal, nuovoImporto, rendimentoAnnuo, durataAnni])

  const finalResults = useMemo(() => {
    const last = simulationData[simulationData.length - 1]
    return {
      attuale: last.attuale,
      simulato: last.simulato,
      delta: last.simulato - last.attuale,
    }
  }, [simulationData])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Parametri PAC</h3>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-md mb-4">
              <p className="text-xs text-gray-500 uppercase font-semibold">PAC Attuali</p>
              <p className="text-xl font-bold">{currentMonthlyTotal.toLocaleString()} €/mese</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nuovo Importo Mensile Totale (€)
              </label>
              <input
                type="range"
                min="50"
                max="2000"
                step="50"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                value={nuovoImporto}
                onChange={(e) => setNuovoImporto(Number(e.target.value))}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50€</span>
                <span className="font-bold text-blue-600 text-base">{nuovoImporto}€</span>
                <span>2000€</span>
              </div>
            </div>

            <Input
              label="Rendimento Annuo Stimato (%)"
              type="number"
              value={rendimentoAnnuo}
              onChange={(e) => setRendimentoAnnuo(Number(e.target.value))}
              min={-10}
              max={20}
              step={0.5}
            />

            <Input
              label="Orizzonte Temporale (Anni)"
              type="number"
              value={durataAnni}
              onChange={(e) => setDurataAnni(Number(e.target.value))}
              min={1}
              max={50}
            />
          </div>
        </Card>

        <Card className="p-6 bg-blue-50/30">
          <h3 className="text-lg font-bold mb-4">Confronto a {durataAnni} anni</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-600">Scenario Attuale</span>
              <span className="font-semibold">{finalResults.attuale.toLocaleString()} €</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-600">Scenario Simulato</span>
              <span className="font-bold text-blue-600">{finalResults.simulato.toLocaleString()} €</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-gray-600">Differenza (Delta)</span>
              <Badge variant={finalResults.delta >= 0 ? 'success' : 'error'} className="text-lg">
                {finalResults.delta >= 0 ? '+' : ''}{finalResults.delta.toLocaleString()} €
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card className="lg:col-span-2 p-6 flex flex-col">
        <h3 className="text-lg font-bold mb-6">Proiezione Montante nel Tempo</h3>
        <div className="flex-1 min-h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={simulationData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="anno"
                label={{ value: 'Anni', position: 'insideBottomRight', offset: -10 }}
              />
              <YAxis
                tickFormatter={(val: number) => `${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(val: number | string | readonly (number | string)[] | undefined) => {
                  if (typeof val === 'number') {
                    return [`${val.toLocaleString()} €`, '']
                  }
                  return [val?.toString() ?? '', '']
                }}
                labelFormatter={(label) => `Anno ${label}`}
              />
              <Legend verticalAlign="top" height={36}/>
              <Line
                name="Scenario Attuale"
                type="monotone"
                dataKey="attuale"
                stroke="#94a3b8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                name="Scenario Simulato"
                type="monotone"
                dataKey="simulato"
                stroke="#2563eb"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="lg:col-span-3 text-xs text-gray-400 italic mt-2">
        * I calcoli ipotizzano un rendimento costante e capitalizzazione mensile.
        I rendimenti passati non sono garanzia di risultati futuri.
      </div>
    </div>
  )
}
