/**
 * KindergartenPage — pagina principale portafoglio bambini.
 * Mostra banner auto-payment quando vengono registrati versamenti automatici.
 */
import { useEffect, useState } from 'react'
import { useKindergartenInvestments } from './useKindergartenInvestments'
import { useKindergartenPacs } from './useKindergartenPacs'
import KindergartenInvestmentList from './KindergartenInvestmentList'
import KindergartenPACList from './KindergartenPACList'
import { KindergartenSummaryCard } from './KindergartenSummaryCard'
import { KindergartenKPICard } from './KindergartenKPICard'

interface Props {
  uid: string
}

type Tab = 'investments' | 'pac'

export default function KindergartenPage({ uid }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('investments')
  const [autoPaymentBanner, setAutoPaymentBanner] = useState<string | null>(null)

  const {
    investments,
    loading: invLoading,
    error: invError,
    addInvestment,
    updateInvestment,
    deleteInvestment,
  } = useKindergartenInvestments(uid)

  const {
    pacs,
    kpis: pacKpis,
    loading: pacLoading,
    error: pacError,
    autoPaymentResults,
    clearAutoPaymentResults,
    addPAC,
    updatePAC,
    deletePAC,
  } = useKindergartenPacs(uid)

  // Mostra banner quando ci sono versamenti automatici registrati
  useEffect(() => {
    if (autoPaymentResults.length > 0) {
      const totalPayments = autoPaymentResults.reduce((s, r) => s + r.paymentsAdded, 0)
      const totalAmount = autoPaymentResults.reduce((s, r) => s + r.totalAmount, 0)
      const names = autoPaymentResults.map(r => r.pacName).join(', ')
      setAutoPaymentBanner(
        `✅ ${totalPayments} versament${totalPayments === 1 ? 'o automatico registrato' : 'i automatici registrati'} ` +
        `(${totalAmount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}) su: ${names}`
      )
      clearAutoPaymentResults()
    }
  }, [autoPaymentResults, clearAutoPaymentResults])

  const loading = invLoading || pacLoading
  const error = invError ?? pacError

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="mt-2 text-sm">Caricamento portafoglio bambini...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-medium">Errore: {error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 text-sm rounded-md bg-primary text-white">Riprova</button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Portafoglio Bambini 👶</h1>
        <p className="text-gray-500 mt-1">Investimenti e PAC dedicati — completamente separati dal portafoglio personale.</p>
      </div>

      {/* Banner versamenti automatici */}
      {autoPaymentBanner && (
        <div className="flex items-start justify-between gap-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          <span>{autoPaymentBanner}</span>
          <button onClick={() => setAutoPaymentBanner(null)} className="shrink-0 text-green-600 hover:text-green-800 font-bold">✕</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KindergartenSummaryCard investments={investments} />
        <KindergartenKPICard pacs={pacs} kpis={pacKpis} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {(['investments', 'pac'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'investments' ? `Investimenti (${investments.length})` : `PAC (${pacs.length})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'investments' && (
        <KindergartenInvestmentList
          investments={investments}
          onAdd={addInvestment}
          onUpdate={updateInvestment}
          onDelete={deleteInvestment}
        />
      )}

      {activeTab === 'pac' && (
        <KindergartenPACList
          pacs={pacs}
          onAdd={addPAC}
          onUpdate={updatePAC}
          onDelete={deletePAC}
        />
      )}
    </div>
  )
}
