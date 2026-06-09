import type { FC } from 'react'
import { useState, useEffect, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle,
  RefreshCcw,
  PieChart as PieChartIcon
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts'
import { useAuth } from '../../hooks/useAuth'
import {
  getMonthlyAllocation,
  createOrUpdateAllocation,
  confirmAllocation,
  generateDraftAllocation
} from '../../services/monthlyAllocation'
import type { MonthlyAllocation, AllocationItem, Month } from '../../types'
import { Button, Card, Badge, Input, Skeleton, EmptyState } from '../../components/ui'
import { formatCurrency } from '../../utils/format'

const CATEGORY_COLORS: Record<string, string> = {
  saving: 'var(--color-primary)',
  investment: 'var(--color-blue)',
  fixed_expense: 'var(--color-warning)',
  variable_expense: 'var(--color-orange)',
  emergency: 'var(--color-error)'
}

const CATEGORY_LABELS: Record<string, string> = {
  saving: 'Risparmio',
  investment: 'Investimento',
  fixed_expense: 'Spesa Fissa',
  variable_expense: 'Spesa Variabile',
  emergency: 'Emergenza'
}

export const MonthlyAllocationPage: FC = () => {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [allocation, setAllocation] = useState<MonthlyAllocation | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = (currentDate.getMonth() + 1) as Month

  const fetchAllocation = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const result = await getMonthlyAllocation(user.uid, year, month)
    if (result.success) {
      setAllocation(result.data)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void fetchAllocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, year, month])

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1))
  }

  const handleGenerateDraft = async () => {
    if (!user) return
    setIsSaving(true)
    const result = await generateDraftAllocation(user.uid, year, month)
    if (result.success) {
      setAllocation(result.data)
    } else {
      setError(result.error)
    }
    setIsSaving(false)
  }

  const handleUpdateItemAmount = async (itemId: string, newAmount: number) => {
    if (!user || !allocation) return

    const newAllocations = allocation.allocations.map(item =>
      item.id === itemId ? { ...item, amount: newAmount } : item
    )

    const result = await createOrUpdateAllocation(user.uid, {
      ...allocation,
      allocations: newAllocations
    })

    if (result.success) {
      setAllocation(result.data)
    }
  }

  const handleAddItem = async () => {
    if (!user || !allocation) return

    const newItem: AllocationItem = {
      id: `manual-${Date.now()}`,
      label: 'Nuova voce',
      category: 'variable_expense',
      amount: 0,
      percentage: 0,
      isAutoFilled: false
    }

    const result = await createOrUpdateAllocation(user.uid, {
      ...allocation,
      allocations: [...allocation.allocations, newItem]
    })

    if (result.success) {
      setAllocation(result.data)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!user || !allocation) return

    const newAllocations = allocation.allocations.filter(item => item.id !== itemId)

    const result = await createOrUpdateAllocation(user.uid, {
      ...allocation,
      allocations: newAllocations
    })

    if (result.success) {
      setAllocation(result.data)
    }
  }

  const handleConfirm = async () => {
    if (!user || !allocation) return
    if (!window.confirm('Confermare l\'allocazione? Questa operazione è irreversibile.')) return

    setIsSaving(true)
    const result = await confirmAllocation(user.uid, year, month)
    if (result.success) {
      await fetchAllocation()
    } else {
      setError(result.error)
    }
    setIsSaving(false)
  }

  const chartData = useMemo(() => {
    if (!allocation) return []
    const categories = ['saving', 'investment', 'fixed_expense', 'variable_expense', 'emergency'] as const
    return categories.map(cat => {
      const total = allocation.allocations
        .filter(item => item.category === cat)
        .reduce((sum, item) => sum + item.amount, 0)
      return {
        name: CATEGORY_LABELS[cat],
        value: total,
        color: CATEGORY_COLORS[cat]
      }
    }).filter(d => d.value > 0)
  }, [allocation])

  const monthName = currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 col-span-1" />
          <Skeleton className="h-32 col-span-1" />
          <Skeleton className="h-32 col-span-1" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-surface rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold capitalize">{monthName}</h1>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-surface rounded-full transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {allocation && (
            <Badge variant={allocation.status === 'confirmed' ? 'success' : 'warning'}>
              {allocation.status === 'confirmed' ? 'Confermata' : 'Bozza'}
            </Badge>
          )}
          <div className="text-sm text-text-muted">
            Netto mensile: <span className="font-bold text-text">{formatCurrency(allocation?.netIncome ?? 0)}</span>
          </div>
        </div>
      </div>

      {error && (
        <Badge variant="error" className="w-full justify-center py-2">
          {error}
        </Badge>
      )}

      {!allocation ? (
        <EmptyState
          icon={<PieChartIcon size={40} />}
          title="Nessuna allocazione per questo mese"
          description="Inizia generando una bozza automatica basata sui tuoi dati finanziari."
          action={{
            label: "Genera bozza automatica",
            onClick: () => { void handleGenerateDraft() }
          }}
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="p-4">
                <div className="text-sm text-text-muted mb-1">Totale Allocato</div>
                <div className="text-2xl font-bold text-text">
                  {formatCurrency(allocation.totalAllocated)}
                </div>
                <div className="text-xs text-text-muted mt-1">
                    {allocation.netIncome > 0 ? ((allocation.totalAllocated / allocation.netIncome) * 100).toFixed(1) : '0'}% del netto
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="text-sm text-text-muted mb-1">Surplus Disponibile</div>
                <div className={`text-2xl font-bold ${allocation.surplus >= 0 ? 'text-primary' : 'text-error'}`}>
                  {formatCurrency(allocation.surplus)}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  Risparmio non ancora allocato
                </div>
              </div>
            </Card>

            <Card className="flex items-center justify-center p-4">
              <div className="flex flex-col w-full gap-2">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => { void handleConfirm() }}
                  disabled={allocation.status === 'confirmed'}
                  isLoading={isSaving}
                  leftIcon={<CheckCircle size={18} />}
                >
                  Conferma Allocazione
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => { void handleGenerateDraft() }}
                  disabled={allocation.status === 'confirmed'}
                  isLoading={isSaving}
                  leftIcon={<RefreshCcw size={18} />}
                >
                  Rigenera Bozza
                </Button>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Allocation Table */}
            <Card className="lg:col-span-2">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-surface/50">
                      <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-muted">Categoria</th>
                      <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-muted">Label</th>
                      <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-muted">Importo</th>
                      <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-muted">%</th>
                      <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-muted text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {allocation.allocations.map((item) => (
                      <tr key={item.id} className="hover:bg-surface/30 transition-colors">
                        <td className="p-4">
                          <Badge
                            variant="default"
                            className="text-[10px]"
                            style={{
                              backgroundColor: `${CATEGORY_COLORS[item.category]}20`,
                              color: CATEGORY_COLORS[item.category],
                              borderColor: `${CATEGORY_COLORS[item.category]}40`
                            }}
                          >
                            {CATEGORY_LABELS[item.category]}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text">{item.label}</span>
                            {item.isAutoFilled && (
                              <Badge variant="info" className="text-[10px] px-1 py-0 h-4">Auto</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {allocation.status === 'confirmed' ? (
                            <span className="font-mono">{formatCurrency(item.amount)}</span>
                          ) : (
                            <div className="w-32">
                              <Input
                                type="number"
                                value={item.amount}
                                onChange={(e) => void handleUpdateItemAmount(item.id, Number(e.target.value))}
                                className="font-mono"
                              />
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-sm text-text-muted font-mono">
                          {item.percentage.toFixed(1)}%
                        </td>
                        <td className="p-4 text-right">
                          {!item.isAutoFilled && allocation.status !== 'confirmed' && (
                            <button
                              onClick={() => { void handleDeleteItem(item.id) }}
                              className="text-text-muted hover:text-error transition-colors p-1"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {allocation.status !== 'confirmed' && (
                      <tr>
                        <td colSpan={5} className="p-4">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => { void handleAddItem() }}
                            leftIcon={<Plus size={16} />}
                          >
                            Aggiungi voce
                          </Button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Chart */}
            <Card className="flex flex-col">
              <div className="p-4 border-b border-border font-semibold">Breakdown Categorie</div>
              <div className="flex-1 h-[300px] min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: unknown) => formatCurrency(Number(value ?? 0))}
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
