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
import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useKindergartenInvestments } from './useKindergartenInvestments'
import { useKindergartenPacs } from './useKindergartenPacs'
import KindergartenInvestmentList from './KindergartenInvestmentList'
import KindergartenPACList from './KindergartenPACList'
import KindergartenKPICard from './KindergartenKPICard'
import { Button } from '../../components/ui'
import { updateAllKindergartenPrices } from '../../services/priceUpdate'

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
    refresh: refreshInvestments,
  } = useKindergartenInvestments(uid)

  const {
    pacs,
    kpis: pacKPIs,
    loading: pacLoading,
    error: pacError,
    addPAC,
    updatePAC,
    deletePAC,
    refresh: refreshPACs,
  } = useKindergartenPacs(uid)

  // Update State
  const [isUpdatingAll, setIsUpdatingAll] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number; name: string } | null>(null)
  const [updateResult, setUpdateResult] = useState<{ success: number; fail: number; total: number } | null>(null)

  const handleUpdateAll = async () => {
    setIsUpdatingAll(true)
    setUpdateResult(null)

    const res = await updateAllKindergartenPrices(uid, {
      onProgress: (current, total, name) => setProgress({ current, total, name })
    })

    if (res.success) {
      setUpdateResult({
        success: res.data.successCount,
        fail: res.data.failCount,
        total: res.data.total
      })
      await Promise.all([refreshInvestments(), refreshPACs()])
    }

    setProgress(null)
    setIsUpdatingAll(false)
  }

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

  if (loading && !isUpdatingAll) {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">Kindergarten</h1>
          <p className="text-text-muted">Portafoglio investimenti per il futuro dei bambini.</p>
        </div>
        <div className="flex gap-2 self-start md:self-center">
          <Button
            variant="ghost"
            onClick={() => { void handleUpdateAll() }}
            disabled={isUpdatingAll || loading || (investments.length === 0 && pacs.length === 0)}
            className="gap-2"
            isLoading={isUpdatingAll}
            leftIcon={!isUpdatingAll ? <RefreshCw size={20} /> : undefined}
          >
            {isUpdatingAll ? 'Aggiornamento...' : 'Aggiorna Prezzi'}
          </Button>
        </div>
      </div>

      {progress && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-primary">
              Aggiornamento in corso: {progress.name}
            </span>
            <span className="text-xs text-text-muted">
              {progress.current} di {progress.total}
            </span>
          </div>
          <div className="w-full bg-bg rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {updateResult && (
        <div className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${updateResult.fail === 0 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
              <RefreshCw size={20} />
            </div>
            <div>
              <div className="font-semibold text-text">Aggiornamento completato</div>
              <div className="text-sm text-text-muted">
                {updateResult.success} successi, {updateResult.fail} fallimenti su {updateResult.total} totali.
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setUpdateResult(null)}>Chiudi</Button>
        </div>
      )}

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
