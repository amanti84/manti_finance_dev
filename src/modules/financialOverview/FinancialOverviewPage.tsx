import { useState, useEffect, useCallback } from 'react'
import type { FC } from 'react'
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Target
} from 'lucide-react'
import {
  getMonthlyOverview,
  getFixedExpenses,
  saveFixedExpense,
  deleteFixedExpense,
  getAnnualStats,
  getTrend
} from '../../services/financialOverview'
import type { MonthlyOverview, AnnualFinancialStats, FixedExpense, Month } from '../../types'
import { formatCurrency } from '../../utils/format'
import { Card, Button, Skeleton, Badge } from '../../components/ui'
import { FixedExpensesTable } from './FixedExpensesTable'
import { FinancialTrendChart } from './FinancialTrendChart'

interface Props {
  uid: string
}

export const FinancialOverviewPage: FC<Props> = ({ uid }) => {
  const [loading, setLoading] = useState(true)
  const [currentOverview, setCurrentOverview] = useState<MonthlyOverview | null>(null)
  const [annualStats, setAnnualStats] = useState<AnnualFinancialStats | null>(null)
  const [trendData, setTrendData] = useState<MonthlyOverview[]>([])
  const [manualExpenses, setManualExpenses] = useState<FixedExpense[]>([])

  const [selectedMonth, setSelectedMonth] = useState<Month>((new Date().getMonth() + 1) as Month)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [ovRes, statsRes, trendRes, expRes] = await Promise.all([
        getMonthlyOverview(uid, selectedYear, selectedMonth),
        getAnnualStats(uid, selectedYear),
        getTrend(uid, 12),
        getFixedExpenses(uid)
      ])

      if (ovRes.success) setCurrentOverview(ovRes.data)
      if (statsRes.success) setAnnualStats(statsRes.data)
      if (trendRes.success) setTrendData(trendRes.data)
      if (expRes.success) setManualExpenses(expRes.data)
    } finally {
      setLoading(false)
    }
  }, [uid, selectedMonth, selectedYear])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleAddExpense = async (data: Omit<FixedExpense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const res = await saveFixedExpense(uid, data)
    if (res.success) {
      await fetchData()
    }
  }

  const handleDeleteExpense = async (id: string) => {
    const res = await deleteFixedExpense(uid, id)
    if (res.success) {
      await fetchData()
    }
  }

  const changeMonth = (delta: number) => {
    let newMonth = selectedMonth + delta
    let newYear = selectedYear

    if (newMonth > 12) {
      newMonth = 1
      newYear++
    } else if (newMonth < 1) {
      newMonth = 12
      newYear--
    }

    setSelectedMonth(newMonth as Month)
    setSelectedYear(newYear)
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">Sintesi Finanziaria</h1>
          <p className="text-text-muted mt-1">Cruscotto automatico di reddito, uscite e tasso di risparmio.</p>
        </div>

        <div className="flex items-center bg-surface border border-border rounded-lg p-1">
          <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)}>
            <ChevronLeft size={20} />
          </Button>
          <div className="px-4 text-sm font-bold flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            <span className="min-w-[100px] text-center">
              {new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(new Date(selectedYear, selectedMonth - 1))}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => changeMonth(1)}>
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>

      {/* Monthly KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col justify-between border-l-4 border-l-primary">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Entrate Mensili</span>
            <TrendingUp className="text-primary" size={20} />
          </div>
          <div className="mt-2">
            {loading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-text">
                {formatCurrency(currentOverview?.netIncome || 0)}
              </div>
            )}
            <p className="text-xs text-text-muted mt-1">Cedolino netto del mese</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between border-l-4 border-l-error">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Uscite Fisse</span>
            <TrendingDown className="text-error" size={20} />
          </div>
          <div className="mt-2">
            {loading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-text">
                {formatCurrency((currentOverview?.fixedExpensesAuto || 0) + (currentOverview?.fixedExpensesManual || 0))}
              </div>
            )}
            <div className="flex gap-2 mt-1">
              <Badge variant="info" className="text-[9px]">AUTO: {formatCurrency(currentOverview?.fixedExpensesAuto || 0)}</Badge>
              <Badge variant="info" className="text-[9px]">MAN: {formatCurrency(currentOverview?.fixedExpensesManual || 0)}</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between border-l-4 border-l-success">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Surplus Stimato</span>
            <PiggyBank className="text-success" size={20} />
          </div>
          <div className="mt-2">
            {loading ? <Skeleton className="h-8 w-24" /> : (
              <div className={`text-2xl font-bold ${(currentOverview?.estimatedSurplus || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                {formatCurrency(currentOverview?.estimatedSurplus || 0)}
              </div>
            )}
            <p className="text-xs text-text-muted mt-1">Liquidità post-spese fisse</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-primary/5">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Tasso Risparmio</span>
            <Target className="text-primary" size={20} />
          </div>
          <div className="mt-2">
            {loading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-primary">
                {annualStats ? Math.round(annualStats.savingsRate * 100) : 0}%
              </div>
            )}
            <p className="text-xs text-text-muted mt-1">Media anno {selectedYear}</p>
          </div>
        </Card>
      </div>

      {!loading && currentOverview && !currentOverview.dataComplete && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-center gap-3 text-warning">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">
            Manca il cedolino per il mese selezionato. I dati di reddito e contributi sono incompleti.
          </p>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-bold text-text mb-6">Trend Ultimi 12 Mesi</h3>
          {loading ? <Skeleton className="h-[350px] w-full" /> : (
            <FinancialTrendChart data={trendData} />
          )}
        </Card>

        {/* Annual Stats & Projections */}
        <div className="space-y-6">
          <Card className="p-6 bg-surface border-border">
            <h3 className="font-bold text-text flex items-center gap-2 mb-6">
              <Calendar size={18} className="text-primary" />
              Statistiche Annuali {selectedYear}
            </h3>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs text-text-muted uppercase font-semibold mb-1">
                  <span>Totale Investito</span>
                  <span className="text-text">{formatCurrency(annualStats?.totalInvested || 0)}</span>
                </div>
                <div className="h-2 bg-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, ((annualStats?.totalInvested || 0) / (annualStats?.projectedYearEndSurplus || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-text-muted uppercase font-semibold mb-1">
                  <span>Surplus Mensile Medio</span>
                  <span className="text-text">{formatCurrency(annualStats?.avgMonthlySurplus || 0)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-text-muted uppercase font-semibold mb-2">Proiezione fine anno</p>
                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(annualStats?.projectedYearEndSurplus || 0)}
                </div>
                <p className="text-[10px] text-text-muted mt-1 italic">
                  * Basata su surplus medio e mesi rimanenti.
                </p>
              </div>
            </div>
          </Card>

          <FixedExpensesTable
            expenses={manualExpenses}
            onAdd={handleAddExpense}
            onDelete={handleDeleteExpense}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}
