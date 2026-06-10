import type { FC } from 'react'
import { useMemo, useState, useEffect } from 'react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { Investment, AssetClass } from '../../types'

interface ScenarioPortafoglioProps {
  investments: Investment[]
}

const CLASS_LABELS: Record<AssetClass, string> = {
  azioni: 'Azioni',
  obbligazioni: 'Obbligazioni',
  etf: 'ETF',
  fondi: 'Fondi',
  pac: 'PAC',
  crypto: 'Crypto',
  liquidita: 'Liquidità',
  immobili: 'Immobili',
  altro: 'Altro',
}

export const ScenarioPortafoglio: FC<ScenarioPortafoglioProps> = ({ investments }) => {
  const currentAllocation = useMemo(() => {
    const totals: Record<string, number> = {}
    let totalValue = 0

    investments.forEach((inv) => {
      const val = inv.currentValue || 0
      const cat = inv.assetClass || 'altro'
      totals[cat] = (totals[cat] || 0) + val
      totalValue += val
    })

    return { totals, totalValue }
  }, [investments])

  const [targets, setTargets] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    const activeClasses = Object.keys(currentAllocation.totals) as AssetClass[]

    if (activeClasses.length === 0) return {}

    const evenSplit = Math.floor(100 / activeClasses.length)
    activeClasses.forEach((cat, index) => {
      initial[cat] = index === activeClasses.length - 1 ? 100 - evenSplit * index : evenSplit
    })
    return initial
  })

  // Sync targets if current allocation changes and targets are empty
  useEffect(() => {
    if (Object.keys(targets).length === 0 && currentAllocation.totalValue > 0) {
      const activeClasses = Object.keys(currentAllocation.totals) as AssetClass[]
      const initial: Record<string, number> = {}
      const evenSplit = Math.floor(100 / activeClasses.length)
      activeClasses.forEach((cat, index) => {
        initial[cat] = index === activeClasses.length - 1 ? 100 - evenSplit * index : evenSplit
      })
      setTargets(initial)
    }
  }, [currentAllocation, targets])

  const handleTargetChange = (cat: string, val: number) => {
    setTargets((prev) => ({ ...prev, [cat]: val }))
  }

  const totalTargetPercent = Object.values(targets).reduce((sum, v) => sum + v, 0)

  const rebalancingData = useMemo(() => {
    return Object.entries(targets).map(([cat, targetPct]) => {
      const currentVal = currentAllocation.totals[cat] || 0
      const currentPct = currentAllocation.totalValue > 0
        ? (currentVal / currentAllocation.totalValue) * 100
        : 0

      const targetVal = (currentAllocation.totalValue * targetPct) / 100
      const deltaVal = targetVal - currentVal

      return {
        category: cat,
        label: CLASS_LABELS[cat as AssetClass] || cat,
        currentPct: Math.round(currentPct * 10) / 10,
        targetPct: Math.round(targetPct * 10) / 10,
        currentVal,
        targetVal,
        deltaVal: Math.round(deltaVal * 100) / 100,
      }
    }).sort((a, b) => b.targetPct - a.targetPct)
  }, [currentAllocation, targets])

  const chartData = useMemo(() => {
    return rebalancingData.map(d => ({
      name: d.label,
      Attuale: d.currentPct,
      Target: d.targetPct,
    }))
  }, [rebalancingData])

  if (investments.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Nessun investimento trovato. Aggiungi asset al tuo portafoglio per simulare il ribilanciamento.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">Percentuali Target</h3>
          <Badge variant={totalTargetPercent === 100 ? 'success' : 'warning'}>
            Totale: {totalTargetPercent}%
          </Badge>
        </div>

        <div className="space-y-6">
          {Object.keys(currentAllocation.totals).map((cat) => (
            <div key={cat} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">{CLASS_LABELS[cat as AssetClass] || cat}</span>
                <span className="font-bold text-blue-600">{targets[cat] || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                value={targets[cat] || 0}
                onChange={(e) => handleTargetChange(cat, Number(e.target.value))}
              />
            </div>
          ))}

          {totalTargetPercent !== 100 && (
            <p className="text-sm text-red-500 italic">
              * La somma delle percentuali deve essere 100% per un calcolo corretto.
            </p>
          )}
        </div>

        <div className="mt-10 space-y-4">
          <h4 className="font-bold text-gray-800 border-b pb-2">Azioni Consigliate</h4>
          <div className="space-y-3">
            {rebalancingData.filter(d => Math.abs(d.deltaVal) > 10).map(d => (
              <div key={d.category} className="flex justify-between items-center text-sm">
                <span>{d.label}</span>
                <span className={`font-bold ${d.deltaVal > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {d.deltaVal > 0 ? 'Acquista' : 'Vendi'} {Math.abs(d.deltaVal).toLocaleString()} €
                </span>
              </div>
            ))}
            {rebalancingData.every(d => Math.abs(d.deltaVal) <= 10) && (
              <p className="text-sm text-gray-500 italic">Il portafoglio è già bilanciato rispetto ai target.</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold mb-6">Confronto Allocazione (%)</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} />
              <YAxis />
              <Tooltip />
              <Legend verticalAlign="top" />
              <Bar dataKey="Attuale" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Target" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="pb-2 font-medium">Asset Class</th>
                <th className="pb-2 font-medium text-right">Attuale (€)</th>
                <th className="pb-2 font-medium text-right">Target (€)</th>
                <th className="pb-2 font-medium text-right">Delta (€)</th>
              </tr>
            </thead>
            <tbody>
              {rebalancingData.map(d => (
                <tr key={d.category} className="border-b last:border-0">
                  <td className="py-3">{d.label}</td>
                  <td className="py-3 text-right">{d.currentVal.toLocaleString()} €</td>
                  <td className="py-3 text-right">{d.targetVal.toLocaleString()} €</td>
                  <td className={`py-3 text-right font-bold ${d.deltaVal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {d.deltaVal > 0 ? '+' : ''}{d.deltaVal.toLocaleString()} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="lg:col-span-2 text-xs text-gray-400 italic mt-4">
        * Il ribilanciamento non tiene conto di tasse su plusvalenze o commissioni di trading.
        Nessuna operazione viene eseguita su Firestore.
      </div>
    </div>
  )
}
