import { useState, useMemo } from 'react'
import type { FC } from 'react'
import { Settings, LayoutDashboard, Wallet, Landmark } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usePrevidenzaData } from '../../hooks/usePrevidenzaData'
import { savePrevidenzaConfig } from '../../services/previdenza'
import { PrevidenzaSummary } from './PrevidenzaSummary'
import { PrevidenzaCharts } from './PrevidenzaCharts'
import { PensionFundSection } from './PensionFundSection'
import { TFRSection } from './TFRSection'
import { PrevidenzaConfigForm } from './PrevidenzaConfigForm'
import { Button, EmptyState, Skeleton, Card, CardHeader, CardTitle, CardContent, ErrorCard } from '../../components/ui'
import { formatCurrency } from '../../utils/format'
import type { PrevidenzaConfig } from '../../types'

export const PrevidenzaPage: FC = () => {
  const { user } = useAuth()
  const {
    config,
    funds,
    contributions,
    tfrHistory,
    pensionProjection,
    tfrComparison,
    loading,
    error,
    refresh
  } = usePrevidenzaData()

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fondo' | 'tfr'>('dashboard')

  const chartData = useMemo(() => {
    if (!pensionProjection || !config) return []

    const startYear = new Date().getFullYear()
    const years = pensionProjection.anniAlPensionamento
    const data = []

    // Generate data points for every 5 years or yearly if short
    const step = years > 15 ? 5 : 2

    for (let i = 0; i <= years; i += step) {
      const year = startYear + i
      // Simplified linear projection for chart visualization based on CAGR
      const progress = i / years
      const currentVal = pensionProjection.montanteAttuale +
        (pensionProjection.montanteProiettato - pensionProjection.montanteAttuale) * progress

      data.push({
        year,
        total: Math.round(currentVal),
        fondo: Math.round(currentVal * 0.4) // Dummy split for visualization
      })
    }

    // Add last point
    if (data[data.length - 1].year !== startYear + years) {
      data.push({
        year: startYear + years,
        total: pensionProjection.montanteProiettato,
        fondo: Math.round(pensionProjection.montanteProiettato * 0.4)
      })
    }

    return data
  }, [pensionProjection, config])

  const composition = useMemo(() => {
    if (!pensionProjection) return []
    return [
      { name: 'INPS (Stima)', value: pensionProjection.montanteProiettato * 0.6, color: '#10B981' },
      { name: 'Fondo Pensione', value: pensionProjection.montanteProiettato * 0.4, color: '#3B82F6' }
    ]
  }, [pensionProjection])

  const handleConfigSubmit = async (data: Omit<PrevidenzaConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (user?.uid) {
      const res = await savePrevidenzaConfig(user.uid, data)
      if (res.success) {
        await refresh()
      }
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error && error !== 'Configurazione previdenza non trovata') {
    return (
      <div className="p-8 flex justify-center">
        <div className="max-w-md w-full">
          <ErrorCard message={error} onRetry={() => { void refresh(); }} />
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-text mb-6">Previdenza</h1>
        <EmptyState
          title="Nessun dato configurato"
          description="Per visualizzare le proiezioni pensionistiche e il TFR, configura i tuoi dati di base."
          action={{
            label: "Configura Ora",
            onClick: () => setIsConfigModalOpen(true)
          }}
        />
        <PrevidenzaConfigForm
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSubmit={handleConfigSubmit}
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">Dashboard Previdenza</h1>
          <p className="text-text-muted">Monitora la tua pensione futura e il TFR accumulato.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsConfigModalOpen(true)} className="gap-2">
            <Settings size={18} /> Configura
          </Button>
        </div>
      </header>

      <PrevidenzaSummary
        projection={pensionProjection}
        inpsStartYear={config.inpsStartYear}
      />

      {/* Tabs */}
      <div className="flex p-1 bg-surface border border-border rounded-lg w-full md:w-fit">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'dashboard' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-text-muted hover:text-text'
          }`}
        >
          <LayoutDashboard size={16} /> Dashboard
        </button>
        <button
          onClick={() => setActiveTab('fondo')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'fondo' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-text-muted hover:text-text'
          }`}
        >
          <Wallet size={16} /> Fondo Pensione
        </button>
        <button
          onClick={() => setActiveTab('tfr')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'tfr' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-text-muted hover:text-text'
          }`}
        >
          <Landmark size={16} /> TFR
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <PrevidenzaCharts
            projectionData={chartData}
            composition={composition}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Stato Fondo Pensione</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('fondo')}>Dettagli</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-muted">Capitale Accumulato</span>
                    <span className="font-bold">{formatCurrency(funds.reduce((s, f) => s + f.saldoAttuale, 0))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-muted">Contribuzione Mensile</span>
                    <span className="font-bold text-primary">
                      {formatCurrency((config.currentRal * (config.pensionFundContributionPct ?? 0) / 100) / 12)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Stato TFR</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('tfr')}>Dettagli</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-muted">TFR Maturato</span>
                    <span className="font-bold">{formatCurrency(tfrHistory[tfrHistory.length - 1]?.totale ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-muted">Ultima Rivalutazione</span>
                    <span className="font-bold text-success">
                      +{formatCurrency(tfrHistory[tfrHistory.length - 1]?.rivalutazione ?? 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'fondo' && (
        <div className="animate-in fade-in duration-500">
          <PensionFundSection
            funds={funds}
            contributions={contributions}
            projection={pensionProjection}
          />
        </div>
      )}

      {activeTab === 'tfr' && (
        <div className="animate-in fade-in duration-500">
          <TFRSection
            tfrHistory={tfrHistory}
            comparison={tfrComparison}
          />
        </div>
      )}

      <PrevidenzaConfigForm
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSubmit={handleConfigSubmit}
        initialData={config}
      />
    </div>
  )
}
