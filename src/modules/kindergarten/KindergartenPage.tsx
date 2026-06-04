/**
 * KindergartenPage — Entry point del modulo portafoglio bambini.
 *
 * Architettura identica al modello legacy manti_finance/Kindergarten.jsx:
 * - investimenti diretti (kindergarten_investments)
 * - PAC (kindergarten_pacs)
 * - KPI aggregati autonomi
 * - nessuna dipendenza dai moduli investment/PAC principali
 *
 * ⚠️  File sostituisce la versione precedente orientata a Expenses/Budget.
 *     Il dominio corretto è: investimenti bambini + PAC bambini.
 */
import { useMemo } from 'react'
import { useKindergartenInvestments } from './useKindergartenInvestments'
import { useKindergartenPacs } from './useKindergartenPacs'
import KindergartenInvestmentList from './KindergartenInvestmentList'
import KindergartenPACList from './KindergartenPACList'
import KindergartenKPICard from './KindergartenKPICard'

interface Props {
  uid: string
}

export default function KindergartenPage({ uid }: Props) {
  const {
    investments,
    kpis: invKPIs,
    loading: invLoading,
    error: invError,
    addInvestment,
    updateInvestment,
    deleteInvestment,
  } = useKindergartenInvestments(uid)

  const {
    pacs,
    kpis: pacKPIs,
    loading: pacLoading,
    error: pacError,
    addPAC,
    updatePAC,
    deletePAC,
  } = useKindergartenPacs(uid)

  const grandKPIs = useMemo(() => {
    const grandTotalInvested = invKPIs.totalInvested + pacKPIs.totalPACInvested
    const grandTotalValue = invKPIs.currentValue + pacKPIs.totalPACValue
    const grandTotalGainLoss = grandTotalValue - grandTotalInvested
    const grandTotalGainLossPercent =
      grandTotalInvested > 0 ? (grandTotalGainLoss / grandTotalInvested) * 100 : 0
    return { grandTotalInvested, grandTotalValue, grandTotalGainLoss, grandTotalGainLossPercent }
  }, [invKPIs, pacKPIs])

  const loading = invLoading || pacLoading
  const error = invError ?? pacError

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700">
        <p className="font-medium">Errore caricamento dati kindergarten</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <KindergartenKPICard
        invKPIs={invKPIs}
        pacKPIs={pacKPIs}
        grandKPIs={grandKPIs}
      />
      <section>
        <h2 className="text-lg font-semibold mb-4">Investimenti Diretti</h2>
        <KindergartenInvestmentList
          investments={investments}
          onAdd={addInvestment}
          onUpdate={updateInvestment}
          onDelete={deleteInvestment}
        />
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-4">Piano di Accumulo (PAC)</h2>
        <KindergartenPACList
          pacs={pacs}
          onAdd={addPAC}
          onUpdate={updatePAC}
          onDelete={deletePAC}
        />
      </section>
    </div>
  )
}
