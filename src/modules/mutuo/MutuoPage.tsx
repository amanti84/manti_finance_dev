import { useState } from 'react'
import type { FC } from 'react'
import { Edit2, RefreshCw, Trash2 } from 'lucide-react'
import { useMutuo } from '../../hooks/useMutuo'
import { MutuoKPIs } from './MutuoKPIs'
import { MutuoAmmortamentoTable } from './MutuoAmmortamentoTable'
import { MutuoFormModal } from './MutuoFormModal'
import { MutuoSimulator } from './MutuoSimulator'
import { MutuoChart } from './MutuoChart'
import { Button, EmptyState, Skeleton } from '../../components/ui'
import type { MutuoConfig } from '../../types'

export const MutuoPage: FC = () => {
  const {
    config,
    piano,
    summary,
    loading,
    error,
    saveConfig,
    deleteMutuo,
    applyPartialRepayment,
    refresh
  } = useMutuo()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleFormSubmit = async (data: MutuoConfig) => {
    const res = await saveConfig(data)
    if (res.success) {
      setIsFormOpen(false)
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Sei sicuro? Questa azione è irreversibile e cancellerà tutta la configurazione del mutuo.')) {
      setIsDeleting(true)
      const res = await deleteMutuo()
      if (!res.success) {
        alert(`Errore durante l'eliminazione: ${res.error}`)
      }
      setIsDeleting(false)
    }
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-error font-medium">Errore nel caricamento del mutuo: {error}</p>
        <Button className="mt-4 gap-2" onClick={() => { void refresh() }}>
          <RefreshCw size={16} /> Riprova
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-text mb-6">Mutuo Immobiliare</h1>
        <EmptyState
          title="Nessun mutuo configurato"
          description="Configura il tuo mutuo per monitorare il debito residuo e visualizzare il piano di ammortamento."
          action={{
            label: "Configura Mutuo",
            onClick: () => setIsFormOpen(true)
          }}
        />
        <MutuoFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">Mutuo Immobiliare</h1>
          <p className="text-text-muted">{config.banca ?? 'Mutuo Prima Casa'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsFormOpen(true)} className="gap-2">
            <Edit2 size={18} /> Modifica
          </Button>
          <Button variant="ghost" onClick={() => { void handleDelete() }} className="gap-2 text-error hover:text-error hover:bg-error/10" isLoading={isDeleting}>
            <Trash2 size={18} /> Elimina
          </Button>
        </div>
      </header>

      <MutuoKPIs summary={summary} tasso={config.tasso} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <MutuoChart piano={piano} />
          <MutuoAmmortamentoTable piano={piano} />
        </div>

        <div className="space-y-8">
          <MutuoSimulator
            config={config}
            onApplyOverpayment={async (amount) => {
              const res = await applyPartialRepayment(amount)
              return res.success
            }}
          />

          <div className="bg-surface p-6 rounded-lg border border-border space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <RefreshCw size={18} className="text-primary" />
              Aggiornamento Dati
            </h3>
            <p className="text-sm text-text-muted">
              I dati visualizzati sono basati sulla configurazione iniziale. In caso di variazioni di tasso (mutuo variabile) o rimborsi extra, aggiorna la configurazione.
            </p>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setIsFormOpen(true)}>
              Modifica Configurazione
            </Button>
          </div>
        </div>
      </div>

      <MutuoFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={config}
      />
    </div>
  )
}
