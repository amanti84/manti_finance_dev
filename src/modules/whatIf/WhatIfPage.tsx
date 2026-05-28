import { useState, useEffect, useCallback } from 'react'
import type { FC } from 'react'
import type {
  ScenarioType,
  ScenarioOutput,
  Scenario,
  PatrimonioSnapshot,
} from '../../types'
import {
  simulateScenario,
  saveScenario,
  getSavedScenarios,
  deleteScenario,
} from '../../services/whatIf'
import { listSnapshots } from '../../services/snapshot'
import { useAuth } from '../../hooks/useAuth'

export const WhatIfPage: FC = () => {
  const { user } = useAuth()
  const [scenarioType, setScenarioType] = useState<ScenarioType>('ESTINZIONE_MUTUO')
  const [params, setParams] = useState<Record<string, number>>({
    anni: 10,
    rendimentoAnnuo: 7,
    incrementoMensile: 0,
    importoInvestimento: 0,
    importoEstinzione: 0,
    nuovaRal: 0,
  })
  const [output, setOutput] = useState<ScenarioOutput | null>(null)
  const [baseline, setBaseline] = useState<PatrimonioSnapshot | null>(null)
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([])
  const [scenarioName, setScenarioName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [comparisonTarget, setComparisonTarget] = useState<Scenario | null>(null)

  const loadInitialData = useCallback(async () => {
    if (!user) return
    const [snaps, scenarios] = await Promise.all([
      listSnapshots(user.uid, 1),
      getSavedScenarios(user.uid),
    ])
    if (snaps.length > 0) setBaseline(snaps[0])
    if (scenarios.success) setSavedScenarios(scenarios.data)
  }, [user])

  useEffect(() => {
    if (user) {
      void loadInitialData()
    }
  }, [user, loadInitialData])

  const handleSimulate = async () => {
    if (!user) return
    setError(null)
    const result = await simulateScenario(user.uid, { type: scenarioType, params })
    if (result.success) {
      setOutput(result.data)
    } else {
      setError(result.error)
    }
  }

  const handleSave = async () => {
    if (!user || !output || !scenarioName || !baseline) return
    const result = await saveScenario(
      user.uid,
      scenarioName,
      { type: scenarioType, params },
      output,
      baseline.id
    )
    if (result.success) {
      setSavedScenarios([result.data, ...savedScenarios])
      setScenarioName('')
      alert('Scenario salvato con successo!')
    } else {
      setError(result.error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user || !window.confirm('Sicuro di voler eliminare questo scenario?')) return
    const result = await deleteScenario(user.uid, id)
    if (result.success) {
      setSavedScenarios(savedScenarios.filter((s) => s.id !== id))
    } else {
      setError(result.error)
    }
  }

  const renderParamForm = () => {
    switch (scenarioType) {
      case 'ESTINZIONE_MUTUO':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Importo Estinzione (\u20ac)</label>
              <input
                type="number"
                className="mt-1 block w-full border rounded p-2"
                onChange={(e) => setParams({ ...params, importoEstinzione: Number(e.target.value) })}
              />
            </div>
          </div>
        )
      case 'INVESTIMENTO_ETF':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Importo Investimento (\u20ac)</label>
              <input
                type="number"
                className="mt-1 block w-full border rounded p-2"
                onChange={(e) => setParams({ ...params, importoInvestimento: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Anni</label>
              <input
                type="number"
                className="mt-1 block w-full border rounded p-2"
                value={params.anni ?? 10}
                onChange={(e) => setParams({ ...params, anni: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Rendimento Annuo Stimato (%)</label>
              <input
                type="number"
                className="mt-1 block w-full border rounded p-2"
                value={params.rendimentoAnnuo ?? 7}
                onChange={(e) => setParams({ ...params, rendimentoAnnuo: Number(e.target.value) })}
              />
            </div>
          </div>
        )
      case 'AUMENTO_PAC':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Incremento Mensile (\u20ac)</label>
              <input
                type="number"
                className="mt-1 block w-full border rounded p-2"
                onChange={(e) => setParams({ ...params, incrementoMensile: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Anni</label>
              <input
                type="number"
                className="mt-1 block w-full border rounded p-2"
                value={params.anni ?? 5}
                onChange={(e) => setParams({ ...params, anni: Number(e.target.value) })}
              />
            </div>
          </div>
        )
      case 'VARIAZIONE_RAL':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Nuova RAL (\u20ac)</label>
              <input
                type="number"
                className="mt-1 block w-full border rounded p-2"
                onChange={(e) => setParams({ ...params, nuovaRal: Number(e.target.value) })}
              />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">What-if Engine</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-lg shadow h-fit">
          <h2 className="text-xl font-semibold mb-4">Nuova Simulazione</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Tipo Scenario</label>
              <select
                className="mt-1 block w-full border rounded p-2"
                value={scenarioType}
                onChange={(e) => {
                  const newType = e.target.value as ScenarioType
                  setScenarioType(newType)
                  setParams({
                    anni: newType === 'AUMENTO_PAC' ? 5 : 10,
                    rendimentoAnnuo: 7,
                    incrementoMensile: 0,
                    importoInvestimento: 0,
                    importoEstinzione: 0,
                    nuovaRal: 0,
                  })
                  setOutput(null)
                }}
              >
                <option value="ESTINZIONE_MUTUO">Estinzione Mutuo</option>
                <option value="INVESTIMENTO_ETF">Investimento ETF</option>
                <option value="AUMENTO_PAC">Aumento PAC</option>
                <option value="VARIAZIONE_RAL">Variazione RAL</option>
              </select>
            </div>

            {renderParamForm()}

            <button
              onClick={() => void handleSimulate()}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mt-4"
            >
              Simula
            </button>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8">
          {error && <div className="bg-red-100 text-red-700 p-4 rounded">{error}</div>}

          {output && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Risultati Simulazione</h2>
              <p className="text-gray-600 mb-6">{output.descrizione}</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2">Metrica</th>
                      <th className="py-2">Baseline (Attuale)</th>
                      <th className="py-2">Scenario</th>
                      <th className="py-2">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 font-medium">Patrimonio (5-10y)</td>
                      <td className="py-2">{baseline?.patrimonioNetto.toLocaleString()}\u20ac</td>
                      <td className="py-2">{output.patrimonioProiettato.toLocaleString()}\u20ac</td>
                      <td className={`py-2 ${output.patrimonioProiettato >= (baseline?.patrimonioNetto ?? 0) ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.round(output.patrimonioProiettato - (baseline?.patrimonioNetto ?? 0)).toLocaleString()}\u20ac
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-medium">Surplus Mensile</td>
                      <td className="py-2">Baseline</td>
                      <td className="py-2">{output.surplusMensileProiettato > 0 ? '+' : ''}{output.surplusMensileProiettato.toLocaleString()}\u20ac</td>
                      <td className={`py-2 ${output.surplusMensileProiettato >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {output.surplusMensileProiettato.toLocaleString()}\u20ac
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-medium">Costo Opportunit\u00e0</td>
                      <td className="py-2">-</td>
                      <td className="py-2 text-red-500">-{output.costoOpportunita.toLocaleString()}\u20ac</td>
                      <td className="py-2">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-8 pt-6 border-t flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Nome scenario (es. Estinzione Parziale)"
                  className="flex-1 border rounded p-2"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                />
                <button
                  onClick={() => void handleSave()}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                >
                  Salva Scenario
                </button>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Scenari Salvati</h2>
            <div className="space-y-4">
              {savedScenarios.length === 0 && <p className="text-gray-500">Nessuno scenario salvato.</p>}
              {savedScenarios.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 border rounded hover:bg-gray-50">
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="text-sm text-gray-500">
                      {s.input.type} \u2022 Proiezione: {s.output.patrimonioProiettato.toLocaleString()}\u20ac
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setComparisonTarget(s)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Confronta
                    </button>
                    <button
                      onClick={() => void handleDelete(s.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {comparisonTarget && (
            <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Confronto Scenari</h2>
                <button onClick={() => setComparisonTarget(null)} className="text-gray-500">Chiudi</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="font-bold border-b mb-2 pb-1">Corrente</h3>
                  <p className="text-2xl font-bold">{output?.patrimonioProiettato.toLocaleString()}\u20ac</p>
                  <p className="text-sm text-gray-500">Patrimonio Proiettato</p>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="font-bold border-b mb-2 pb-1">{comparisonTarget.name}</h3>
                  <p className="text-2xl font-bold">{comparisonTarget.output.patrimonioProiettato.toLocaleString()}\u20ac</p>
                  <p className="text-sm text-gray-500">Patrimonio Proiettato</p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-white rounded shadow text-center">
                <p className="font-medium">
                  Differenza:{' '}
                  <span className={(output?.patrimonioProiettato ?? 0) - comparisonTarget.output.patrimonioProiettato >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {Math.round((output?.patrimonioProiettato ?? 0) - comparisonTarget.output.patrimonioProiettato).toLocaleString()}\u20ac
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
