/**
 * KindergartenPACList — lista + form PAC del portafoglio bambini.
 * Supporta frequency (daily/biweekly/monthly) + dayOfMonth.
 * Props-driven: riceve dati e callbacks da KindergartenPage.
 */
import { useState } from 'react'
import type { KindergartenPAC, KGPACFrequency } from '../../types/kindergarten'
import { calcNextPaymentDate } from '../../services/kindergartenPacPayments'

interface Props {
  pacs: KindergartenPAC[]
  onAdd: (pac: Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'>) => Promise<unknown>
  onUpdate: (id: string, data: Partial<Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
}

const FREQ_LABEL: Record<KGPACFrequency, string> = {
  monthly: 'Mensile',
  biweekly: 'Quindicinale',
  daily: 'Giornaliero',
}

function fmt(n: number) {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

interface FormData {
  name: string
  isin: string
  ticker: string
  tickerOnly: boolean
  autoUpdate: boolean
  frequency: KGPACFrequency
  dayOfMonth: number
  monthlyAmount: number
  quantity: number
  startDate: string
  targetYears: number
  currentValue: number
  totalInvested: number
  lastPaymentDate: string
  notes: string
}

const EMPTY_FORM: FormData = {
  name: '',
  isin: '',
  ticker: '',
  tickerOnly: false,
  autoUpdate: true,
  frequency: 'monthly',
  dayOfMonth: 1,
  monthlyAmount: 0,
  quantity: 0,
  startDate: new Date().toISOString().slice(0, 10),
  targetYears: 18,
  currentValue: 0,
  totalInvested: 0,
  lastPaymentDate: '',
  notes: '',
}

function formFromPAC(pac: KindergartenPAC): FormData {
  return {
    name: pac.name,
    isin: pac.isin ?? '',
    ticker: pac.ticker ?? '',
    tickerOnly: pac.tickerOnly ?? false,
    autoUpdate: pac.autoUpdate ?? true,
    frequency: pac.frequency ?? 'monthly',
    dayOfMonth: pac.dayOfMonth ?? 1,
    monthlyAmount: pac.monthlyAmount,
    quantity: pac.quantity ?? 0,
    startDate: pac.startDate,
    targetYears: pac.targetYears,
    currentValue: pac.currentValue,
    totalInvested: pac.totalInvested,
    lastPaymentDate: pac.lastPaymentDate ?? '',
    notes: pac.notes ?? '',
  }
}

export default function KindergartenPACList({ pacs, onAdd, onUpdate, onDelete }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (pac: KindergartenPAC) => {
    setEditingId(pac.id)
    setForm(formFromPAC(pac))
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const startRef = form.lastPaymentDate || form.startDate
      const nextPaymentDate = calcNextPaymentDate(startRef, form.frequency, form.dayOfMonth || undefined)

      const payload: Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'> = {
        name: form.name,
        tickerOnly: form.tickerOnly,
        autoUpdate: form.autoUpdate,
        frequency: form.frequency,
        monthlyAmount: form.monthlyAmount,
        startDate: form.startDate,
        targetYears: form.targetYears,
        currentValue: form.currentValue,
        totalInvested: form.totalInvested,
        nextPaymentDate,
        ...(form.isin ? { isin: form.isin } : {}),
        ...(form.ticker ? { ticker: form.ticker } : {}),
        ...(form.quantity > 0 ? { quantity: form.quantity } : {}),
        ...(form.dayOfMonth > 0 && form.frequency === 'monthly' ? { dayOfMonth: form.dayOfMonth } : {}),
        ...(form.lastPaymentDate ? { lastPaymentDate: form.lastPaymentDate } : {}),
        ...(form.notes ? { notes: form.notes } : {}),
      }
      if (editingId) {
        await onUpdate(editingId, payload)
      } else {
        await onAdd(payload)
      }
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Eliminare questo PAC dal portafoglio bambini?')) return
    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          + Aggiungi PAC
        </button>
      </div>

      {pacs.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-gray-400">
          <p>Nessun PAC nel portafoglio bambini.</p>
          <p className="text-sm mt-1">Configura il primo piano di accumulo con il pulsante in alto.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nome PAC</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Frequenza</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Rata</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Totale Versato</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Valore Attuale</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">G/P</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Pross. Versamento</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Orizzonte</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {pacs.map(pac => {
                const gp = pac.currentValue - pac.totalInvested
                const gpPct = pac.totalInvested > 0 ? (gp / pac.totalInvested) * 100 : 0
                const nextDue = pac.nextPaymentDate
                const today = new Date().toISOString().slice(0, 10)
                const isOverdue = nextDue ? nextDue < today : false
                return (
                  <tr key={pac.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {pac.name}
                      {pac.ticker ? <span className="ml-1 text-xs text-gray-400">{pac.ticker}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{FREQ_LABEL[pac.frequency ?? 'monthly']}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(pac.monthlyAmount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(pac.totalInvested)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(pac.currentValue)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${gp >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmt(gp)} ({gp >= 0 ? '+' : ''}{gpPct.toFixed(2)}%)
                    </td>
                    <td className={`px-4 py-3 text-right text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                      {nextDue ?? '—'}{isOverdue ? ' ⚠' : ''}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{pac.targetYears} anni</td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button onClick={() => openEdit(pac)} className="text-blue-500 hover:text-blue-700 text-xs">Modifica</button>
                      <button
                        onClick={() => void handleDelete(pac.id)}
                        disabled={deletingId === pac.id}
                        className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                        aria-label={`Elimina PAC ${pac.name}`}
                      >Elimina</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-semibold">{editingId ? 'Modifica PAC KG' : 'Nuovo PAC KG'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={(e) => { void handleSubmit(e) }} className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nome PAC *</label>
                <input name="name" value={form.name} onChange={handleChange} required
                  className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="es. Vanguard LifeStrategy 80" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">ISIN</label>
                  <input name="isin" value={form.isin} onChange={handleChange}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="IE00B3XXRP09" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Ticker</label>
                  <input name="ticker" value={form.ticker} onChange={handleChange}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="VNGA80.MI" />
                </div>
              </div>

              {/* Frequenza */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Frequenza *</label>
                  <select name="frequency" value={form.frequency} onChange={handleChange}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="monthly">Mensile</option>
                    <option value="biweekly">Quindicinale (14gg)</option>
                    <option value="daily">Giornaliero</option>
                  </select>
                </div>
                {form.frequency === 'monthly' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Giorno del mese</label>
                    <input name="dayOfMonth" type="number" min="1" max="28" value={form.dayOfMonth} onChange={handleChange}
                      className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Data Inizio *</label>
                  <input name="startDate" type="date" value={form.startDate} onChange={handleChange} required
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Ultimo Versamento</label>
                  <input name="lastPaymentDate" type="date" value={form.lastPaymentDate} onChange={handleChange}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Orizzonte (anni) *</label>
                  <input name="targetYears" type="number" min="1" max="40" value={form.targetYears} onChange={handleChange} required
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Rata {FREQ_LABEL[form.frequency]} €*</label>
                  <input name="monthlyAmount" type="number" step="any" min="0" value={form.monthlyAmount} onChange={handleChange} required
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Totale Versato €</label>
                  <input name="totalInvested" type="number" step="any" min="0" value={form.totalInvested} onChange={handleChange}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Valore Attuale €</label>
                  <input name="currentValue" type="number" step="any" min="0" value={form.currentValue} onChange={handleChange}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Quantità quote</label>
                  <input name="quantity" type="number" step="any" min="0" value={form.quantity} onChange={handleChange}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input name="autoUpdate" type="checkbox" checked={form.autoUpdate} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-primary" />
                  Aggiornamento automatico
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input name="tickerOnly" type="checkbox" checked={form.tickerOnly} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-primary" />
                  Solo Ticker
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Note</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Note opzionali..." />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50">Annulla</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-60">
                  {saving ? 'Salvataggio...' : (editingId ? 'Salva Modifiche' : 'Aggiungi')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
