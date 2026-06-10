import { useState, useMemo } from 'react'
import type { FC } from 'react'
import { Plus, Search, Filter, RefreshCw } from 'lucide-react'
import { useInvestments } from '../../hooks/useInvestments'
import { updateInvestmentPrice, updateAllPrices } from '../../services/priceUpdate'
import { useAuth } from '../../hooks/useAuth'
import { InvestmentKPIs } from './InvestmentKPIs'
import { InvestmentTable } from './InvestmentTable'
import { InvestmentFormModal } from './InvestmentFormModal'
import { InvestmentDetailModal } from './InvestmentDetailModal'
import { SellInvestmentModal } from './SellInvestmentModal'
import { Button, Input, EmptyState, Skeleton } from '../../components/ui'
import type { Investment, AssetClass, Broker } from '../../types'

type SortField = 'name' | 'currentValue' | 'pnlPct'
type SortOrder = 'asc' | 'desc'

export const InvestimentiPage: FC = () => {
  const { user } = useAuth()
  const {
    investments,
    loading,
    error,
    summary,
    addInvestment,
    editInvestment,
    removeInvestment,
    refresh
  } = useInvestments()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [assetClassFilter, setAssetClassFilter] = useState<AssetClass | 'all'>('all')
  const [brokerFilter, setBrokerFilter] = useState<Broker | 'all'>('all')
  const [isPacFilter, setIsPacFilter] = useState<'all' | 'pac' | 'no-pac'>('all')
  const [sortField, setSortField] = useState<SortField>('currentValue')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSellModalOpen, setIsSellModalOpen] = useState(false)

  // Update State
  const [isUpdatingAll, setIsUpdatingAll] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number; name: string } | null>(null)
  const [updateResult, setUpdateResult] = useState<{ success: number; fail: number; total: number } | null>(null)

  // Derived Data
  const filteredInvestments = useMemo(() => {
    return investments
      .filter((inv) => {
        const matchesSearch = inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (inv.isin ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (inv.ticker ?? '').toLowerCase().includes(searchTerm.toLowerCase())
        const matchesAssetClass = assetClassFilter === 'all' || inv.assetClass === assetClassFilter
        const matchesBroker = brokerFilter === 'all' || inv.broker === brokerFilter
        const matchesPac = isPacFilter === 'all' ||
          (isPacFilter === 'pac' && inv.isPac) ||
          (isPacFilter === 'no-pac' && !inv.isPac)

        return matchesSearch && matchesAssetClass && matchesBroker && matchesPac
      })
      .sort((a, b) => {
        let valA: string | number = 0
        let valB: string | number = 0

        if (sortField === 'pnlPct') {
          const pnlA = a.currentValue - (a.quantity * a.avgCost)
          const pnlB = b.currentValue - (b.quantity * b.avgCost)
          valA = a.quantity * a.avgCost > 0 ? pnlA / (a.quantity * a.avgCost) : 0
          valB = b.quantity * b.avgCost > 0 ? pnlB / (b.quantity * b.avgCost) : 0
        } else if (sortField === 'name' || sortField === 'currentValue') {
          valA = a[sortField]
          valB = b[sortField]
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
  }, [investments, searchTerm, assetClassFilter, brokerFilter, isPacFilter, sortField, sortOrder])

  const assetClasses = useMemo(() => Array.from(new Set(investments.map(i => i.assetClass))), [investments])
  const brokers = useMemo(() => Array.from(new Set(investments.map(i => i.broker))), [investments])

  // Handlers
  const handleUpdatePrice = async (inv: Investment) => {
    if (!user?.uid) return
    setUpdatingId(inv.id)
    const res = await updateInvestmentPrice(user.uid, inv)
    if (res.success) {
      await refresh()
    }
    setUpdatingId(null)
  }

  const handleUpdateAll = async () => {
    if (!user?.uid || investments.length === 0) return
    setIsUpdatingAll(true)
    setUpdateResult(null)

    const res = await updateAllPrices(user.uid, investments, {
      onProgress: (current, total, name) => setProgress({ current, total, name })
    })

    if (res.success) {
      setUpdateResult({
        success: res.data.successCount,
        fail: res.data.failCount,
        total: res.data.total
      })
      await refresh()
    }

    setProgress(null)
    setIsUpdatingAll(false)
  }

  const handleAddSubmit = async (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'currentValue'>) => {
    await addInvestment(data)
  }

  const handleEditSubmit = async (data: Partial<Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (selectedInvestment) {
      await editInvestment(selectedInvestment.id, data)
    }
  }

  const handleSellConfirm = async (id: string, quantityToSell: number, salePrice: number) => {
    const inv = investments.find(i => i.id === id)
    if (!inv) return

    if (quantityToSell >= inv.quantity) {
      // Full sale - usually we might archive it, but for now we just delete or update to 0
      await removeInvestment(id)
    } else {
      // Partial sale
      await editInvestment(id, {
        quantity: inv.quantity - quantityToSell,
        currentPrice: salePrice // Option to update price to sale price
      })
    }
  }

  const handleDelete = (inv: Investment) => {
    void removeInvestment(inv.id)
  }

  const openDetail = (inv: Investment) => {
    setSelectedInvestment(inv)
    setIsDetailModalOpen(true)
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-error font-medium">Errore nel caricamento investimenti: {error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>Riprova</Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">Portafoglio Investimenti</h1>
          <p className="text-text-muted">Monitora le performance e gestisci i tuoi asset.</p>
        </div>
        <div className="flex gap-2 self-start md:self-center">
          <Button
            variant="ghost"
            onClick={() => { void handleUpdateAll() }}
            disabled={isUpdatingAll || loading || investments.length === 0}
            className="gap-2"
            isLoading={isUpdatingAll}
            leftIcon={!isUpdatingAll ? <RefreshCw size={20} /> : undefined}
          >
            {isUpdatingAll ? 'Aggiornamento...' : 'Aggiorna Prezzi'}
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <Plus size={20} /> Aggiungi Investimento
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

      <InvestmentKPIs summary={summary} loading={loading} />

      {/* Filters and Search */}
      <div className="bg-surface rounded-lg border border-border p-4 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full space-y-1">
          <label className="text-xs font-semibold text-text-muted uppercase">Cerca</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nome, ISIN, Ticker..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="w-full md:w-44 space-y-1">
          <label className="text-xs font-semibold text-text-muted uppercase flex items-center gap-1">
            <Filter size={12} /> Asset Class
          </label>
          <select
            value={assetClassFilter}
            onChange={(e) => setAssetClassFilter(e.target.value as AssetClass | 'all')}
            className="w-full h-10 px-3 rounded-md border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 capitalize"
          >
            <option value="all">Tutte</option>
            {assetClasses.map(ac => <option key={ac} value={ac}>{ac}</option>)}
          </select>
        </div>

        <div className="w-full md:w-44 space-y-1">
          <label className="text-xs font-semibold text-text-muted uppercase">Broker</label>
          <select
            value={brokerFilter}
            onChange={(e) => setBrokerFilter(e.target.value as Broker | 'all')}
            className="w-full h-10 px-3 rounded-md border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 capitalize"
          >
            <option value="all">Tutti</option>
            {brokers.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="w-full md:w-44 space-y-1">
          <label className="text-xs font-semibold text-text-muted uppercase">Tipo</label>
          <select
            value={isPacFilter}
            onChange={(e) => setIsPacFilter(e.target.value as 'all' | 'pac' | 'no-pac')}
            className="w-full h-10 px-3 rounded-md border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Tutti</option>
            <option value="pac">Solo PAC</option>
            <option value="no-pac">Escludi PAC</option>
          </select>
        </div>

        <div className="w-full md:w-44 space-y-1">
          <label className="text-xs font-semibold text-text-muted uppercase">Ordina per</label>
          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-')
              setSortField(field as SortField)
              setSortOrder(order as SortOrder)
            }}
            className="w-full h-10 px-3 rounded-md border border-border bg-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="name-asc">Nome (A-Z)</option>
            <option value="name-desc">Nome (Z-A)</option>
            <option value="currentValue-desc">Valore (Max-Min)</option>
            <option value="currentValue-asc">Valore (Min-Max)</option>
            <option value="pnlPct-desc">P&L % (Migliore)</option>
            <option value="pnlPct-asc">P&L % (Peggiore)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : filteredInvestments.length === 0 ? (
        <EmptyState
          title={searchTerm || assetClassFilter !== 'all' || brokerFilter !== 'all' || isPacFilter !== 'all'
            ? "Nessun investimento trovato"
            : "Il tuo portafoglio è vuoto"
          }
          description={searchTerm || assetClassFilter !== 'all' || brokerFilter !== 'all' || isPacFilter !== 'all'
            ? "Prova a modificare i filtri o i termini di ricerca."
            : "Inizia aggiungendo il tuo primo investimento."
          }
          action={{
            label: searchTerm || assetClassFilter !== 'all' || brokerFilter !== 'all' || isPacFilter !== 'all'
              ? "Pulisci filtri"
              : "Aggiungi Investimento",
            onClick: () => {
              if (searchTerm || assetClassFilter !== 'all' || brokerFilter !== 'all' || isPacFilter !== 'all') {
                setSearchTerm('')
                setAssetClassFilter('all')
                setBrokerFilter('all')
                setIsPacFilter('all')
              } else {
                setIsAddModalOpen(true)
              }
            }
          }}
        />
      ) : (
        <InvestmentTable
          investments={filteredInvestments}
          onRowClick={openDetail}
          onUpdatePrice={handleUpdatePrice}
          updatingId={updatingId}
        />
      )}

      {/* Modals */}
      <InvestmentFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSubmit}
      />

      <InvestmentFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        initialData={selectedInvestment}
        title="Modifica Investimento"
      />

      <InvestmentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        investment={selectedInvestment}
        onEdit={(inv) => {
          setSelectedInvestment(inv)
          setIsDetailModalOpen(false)
          setIsEditModalOpen(true)
        }}
        onDelete={handleDelete}
        onSell={(inv) => {
          setSelectedInvestment(inv)
          setIsDetailModalOpen(false)
          setIsSellModalOpen(true)
        }}
      />

      <SellInvestmentModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        investment={selectedInvestment}
        onConfirm={handleSellConfirm}
      />
    </div>
  )
}
