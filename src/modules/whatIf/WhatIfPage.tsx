import type { FC } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getMutuoConfig } from '../../services/mutuo'
import { getAllInvestments } from '../../services/investment'
import { getPrevidenzaConfig, getAllPensionFunds } from '../../services/previdenza'
import type {
  MutuoConfig,
  Investment,
  PrevidenzaConfig,
  PensionFund
} from '../../types'

import { ScenarioMutuo } from './ScenarioMutuo'
import { ScenarioPAC } from './ScenarioPAC'
import { ScenarioPortafoglio } from './ScenarioPortafoglio'
import { ScenarioPensione } from './ScenarioPensione'
import { Skeleton } from '../../components/ui/Skeleton'

type TabId = 'mutuo' | 'pac' | 'portafoglio' | 'pensione'

interface Tab {
  id: TabId
  label: string
  icon: string
}

const TABS: Tab[] = [
  { id: 'mutuo', label: 'Anticipo Mutuo', icon: '🏠' },
  { id: 'pac', label: 'Variazione PAC', icon: '📈' },
  { id: 'portafoglio', label: 'Ribilanciamento', icon: '⚖️' },
  { id: 'pensione', label: 'Pensione Anticipata', icon: '🏖️' },
]

/**
 * WhatIfPage
 * Simulatore scenari finanziari stateless.
 * Questo modulo NON HA logAudit perché non scrive dati su Firestore.
 * Opera solo su copie locali dei dati per simulazioni in-memory.
 */
export const WhatIfPage: FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('mutuo')
  const [isLoading, setIsLoading] = useState(true)

  const [mutuoConfig, setMutuoConfig] = useState<MutuoConfig | null>(null)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [previdenzaConfig, setPrevidenzaConfig] = useState<PrevidenzaConfig | null>(null)
  const [pensionFunds, setPensionFunds] = useState<PensionFund[]>([])

  const loadData = useCallback(async () => {
    if (!user) return
    setIsLoading(true)

    try {
      const [mutuoRes, invRes, prevRes, fundsRes] = await Promise.all([
        getMutuoConfig(user.uid),
        getAllInvestments(user.uid),
        getPrevidenzaConfig(user.uid),
        getAllPensionFunds(user.uid),
      ])

      if (mutuoRes.success) setMutuoConfig(mutuoRes.data)
      if (invRes.success) setInvestments(invRes.data)
      if (prevRes.success) setPrevidenzaConfig(prevRes.data)
      if (fundsRes.success) setPensionFunds(fundsRes.data)
    } catch (error) {
      console.error('Errore durante il caricamento dei dati What-If:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const renderActiveScenario = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )
    }

    switch (activeTab) {
      case 'mutuo':
        return <ScenarioMutuo config={mutuoConfig} />
      case 'pac':
        return <ScenarioPAC pacs={investments.filter(i => i.isPac)} />
      case 'portafoglio':
        return <ScenarioPortafoglio investments={investments.filter(i => !i.isPac)} />
      case 'pensione':
        return <ScenarioPensione config={previdenzaConfig} funds={pensionFunds} />
      default:
        return null
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">What-If Scenarios</h1>
        <p className="text-gray-500 mt-2">
          Simula scenari alternativi senza modificare i tuoi dati reali.
          Tutti i calcoli avvengono localmente.
        </p>
      </header>

      {/* Desktop Tabs */}
      <div className="hidden md:flex border-b border-gray-200 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile Accordion-style select */}
      <div className="md:hidden mb-6">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabId)}
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.icon} {tab.label}
            </option>
          ))}
        </select>
      </div>

      <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {renderActiveScenario()}
      </main>

      <footer className="mt-12 pt-8 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-400">
          I risultati sono simulazioni basate su modelli matematici standard e non costituiscono consulenza finanziaria.
        </p>
      </footer>
    </div>
  )
}
