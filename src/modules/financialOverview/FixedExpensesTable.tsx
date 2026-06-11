import { useState, useMemo } from 'react'
import type { FC } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input, Card, Badge, Modal } from '../../components/ui'
import { formatCurrency } from '../../utils/format'
import type { FixedExpense } from '../../types'

interface FixedExpensesTableProps {
  expenses: FixedExpense[]
  onAdd: (expense: Omit<FixedExpense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  loading: boolean
}

export const FixedExpensesTable: FC<FixedExpensesTableProps> = ({
  expenses,
  onAdd,
  onDelete,
  loading
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [frequency, setFrequency] = useState<'monthly' | 'annual'>('monthly')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label || amount <= 0) return

    setIsSubmitting(true)
    try {
      await onAdd({ label, amount, frequency })
      setLabel('')
      setAmount(0)
      setIsModalOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const monthlyTotal = useMemo(() => {
    return expenses.reduce((sum, exp) => {
      return sum + (exp.frequency === 'monthly' ? exp.amount : exp.amount / 12)
    }, 0)
  }, [expenses])

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-border bg-bg/50 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-text">Uscite Ricorrenti Manuali</h3>
          <p className="text-xs text-text-muted mt-1">Spese fisse non tracciate automaticamente (es. affitto, utenze)</p>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={16} /> Aggiungi
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-xs font-semibold text-text-muted uppercase tracking-wider">
              <th className="px-4 py-3">Voce</th>
              <th className="px-4 py-3">Frequenza</th>
              <th className="px-4 py-3 text-right">Importo</th>
              <th className="px-4 py-3 text-right">Mensilizzato</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted text-sm italic">
                  Nessuna uscita manuale registrata.
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-4 py-3 font-medium text-text">{exp.label}</td>
                  <td className="px-4 py-3">
                    <Badge variant="info" className="capitalize text-[10px]">
                      {exp.frequency === 'monthly' ? 'Mensile' : 'Annuale'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-text">
                    {formatCurrency(exp.frequency === 'monthly' ? exp.amount : exp.amount / 12)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void onDelete(exp.id)}
                      className="text-text-muted hover:text-error transition-colors p-1 opacity-0 group-hover:opacity-100"
                      disabled={loading}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr className="bg-bg/50 font-bold border-t border-border">
                <td colSpan={3} className="px-4 py-3 text-sm">Totale Mensile Manuale</td>
                <td className="px-4 py-3 text-right text-primary">{formatCurrency(monthlyTotal)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuova Uscita Ricorrente"
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase">Etichetta</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Es. Affitto Casa"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-muted uppercase">Importo (€)</label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-muted uppercase">Frequenza</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'monthly' | 'annual')}
                className="w-full h-10 px-3 bg-bg border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="monthly">Mensile</option>
                <option value="annual">Annuale</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Salva Uscita
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}
