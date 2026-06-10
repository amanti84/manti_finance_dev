/**
 * KindergartenInvestmentList — lista + form investimenti diretti bambini.
 * Props-driven: riceve dati e callbacks da KindergartenPage.
 * ⚠️ ZERO import da investment.ts o tipi Investment adulti.
 *    Dominio COMPLETAMENTE SEPARATO dal portafoglio personale.
 */
import { useState } from 'react'
import type { KindergartenInvestment } from '../../types/kindergarten'

interface Props {
  investments: KindergartenInvestment[]
  onAdd: (inv: Omit<KindergartenInvestment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<unknown>
  onUpdate: (id: string, data: Partial<Omit<KindergartenInvestment, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
}

type KGCategory = KindergartenInvestment['category']
const KG_CATEGORIES: KGCategory[] = ['etf', 'fund', 'stock', 'bond', 'other']

const CATEGORY_LABEL: Record<KGCategory, string> = {
  etf: 'ETF',
  fund: 'Fondo',
  stock: 'Azione',
  bond: 'Obbligazione',
  other: 'Altro',
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
  category: KGCategory
  purchaseDate: string
  purchasePrice: number
  quantity: number
  currentPrice: number
  notes: string
}

const EMPTY_FORM: FormData = {
  name: '',
  isin: '',
  ticker: '',
  tickerOnly: false,
  autoUpdate: true,
  category: 'etf',
  purchaseDate: new Date().toISOString().slice(0, 10),
  purchasePrice: 0,
  quantity: 0,
  currentPrice: 0,
  notes: '',
}

function formFromInvestment(inv: KindergartenInvestment): FormData {
  return {
    name: inv.name,
    isin: inv.isin ?? '',
    ticker: inv.ticker ?? '',
    tickerOnly: inv.tickerOnly ?? false,
    autoUpdate: inv.autoUpdate ?? true,
    category: inv.category,
    purchaseDate: inv.purchaseDate,
    purchasePrice: inv.purchasePrice,
    quantity: inv.quantity,
    currentPrice: inv.currentPrice,
    notes: inv.notes ?? '',
  }
}

export default function KindergartenInvestmentList({ investments, onAdd, onUpdate, onDelete }: Props) {
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

  const openEdit = (inv: KindergartenInvestment) => {
    setEditingId(inv.id)
    setForm(formFromInvestment(inv))
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      const payload: Omit<KindergartenInvestment, 'id' | 'createdAt' | 'updatedAt'> = {
        name: form.name,
        category: form.category,
        purchaseDate: form.purchaseDate,
        purchasePrice: form.purchasePrice,
        quantity: form.quantity,
        currentPrice: form.currentPrice,
        tickerOnly: form.tickerOnly,
        autoUpdate: form.autoUpdate,
        ...(form.isin ? { isin: form.isin } : {}),
        ...(form.ticker ? { ticker: form.ticker } : {}),
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
    if (!window.confirm('Eliminare questo investimento dal portafoglio bambini?')) return
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
          + Aggiungi Investimento
        </button>
      </div>

      {investments.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-gray-400">
          <p>Nessun investimento nel portafoglio bambini.</p>
          <p className="text-sm mt-1">Aggiungi il primo investimento con il pulsante in alto.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Data Acquisto</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Prezzo Acquisto</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Prezzo Attuale</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Quantità</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Valore</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">G/P</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {investments.map(inv => {
                const invested = inv.purchasePrice * inv.quantity
                const value = inv.currentPrice * inv.quantity
                const gp = value - invested
                const gpPct = invested > 0 ? (gp / invested) * 100 : 0
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {inv.name}
                      {inv.ticker ? <span className="ml-1 text-xs text-gray-400">{inv.ticker}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{CATEGORY_LABEL[inv.category]}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.purchaseDate}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(inv.purchasePrice)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(inv.currentPrice)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{inv.quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(value)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${gp >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmt(gp)} ({gp >= 0 ? '+' : ''}{gpPct.toFixed(2)}%)
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button onClick={() => openEdit(inv)} className="text-blue-500 hover:text-blue-700 text-xs">Modifica</button>
                      <button
                        onClick={() => void handleDelete(inv.id)}
                        disabled={deletingId === inv.id}
                        className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                        aria-label={`Elimina ${inv.name}`}
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
              <h3 className="text-lg font-semibold">{editingId ? 'Modifica Investimento KG' : 'Nuovo Investimento KG'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={(e) => { void handleSubmit(e) }} className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nome *</label>
                <input name="name" value={form.name} onChange={handleChange} required
                  className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="es. Vanguard FTSE All-World" />
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
                    placeholder="VWCE.DE" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Categoria *</label>
                  <select name="category" value={form.category} onChange={handleChange}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {KG_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Data Acquisto *</label>
                  <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange} required
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Prezzo Acquisto € *</label>
                  <input name="purchasePrice" type="number" step="any" min="0" value={form.purchasePrice} onChange={handleChange} required
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Quantità *</label>
                  <input name="quantity" type="number" step="any" min="0" value={form.quantity} onChange={handleChange} required
                    className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Prezzo Attuale €</label>
                  <input name="currentPrice" type="number" step="any" min="0" value={form.currentPrice} onChange={handleChange}
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
