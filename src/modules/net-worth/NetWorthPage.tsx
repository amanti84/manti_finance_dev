import type { FC } from 'react'
import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  RefreshCcw,
  BarChart3,
  LineChart as LineChartIcon
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts'
import { useAuth } from '../../hooks/useAuth'
import {
  captureNetWorthSnapshot,
  getNetWorthHistory,
  getLatestNetWorth
} from '../../services/netWorth'
import type { NetWorthSnapshot } from '../../types'
import { formatCurrency } from '../../utils/format'
import { Card, Button, Skeleton, Badge, EmptyState } from '../../components/ui'

export const NetWorthPage: FC = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<NetWorthSnapshot[]>([])
  const [latestSnapshot, setLatestSnapshot] = useState<NetWorthSnapshot | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [historyRes, latestRes] = await Promise.all([
        getNetWorthHistory(user.uid),
        getLatestNetWorth(user.uid)
      ])

      if (historyRes.success) setHistory(historyRes.data)
      if (latestRes.success) setLatestSnapshot(latestRes.data)
    } catch (err) {
      setError('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [user])

  const handleUpdateSnapshot = async () => {
    if (!user) return
    setIsUpdating(true)
    try {
      const res = await captureNetWorthSnapshot(user.uid)
      if (res.success) {
        await fetchData()
      } else {
        setError(res.error)
      }
    } catch (err) {
      setError('Errore durante l\'aggiornamento dello snapshot')
    } finally {
      setIsUpdating(false)
    }
  }

  const chartData = useMemo(() => {
    return history.map(snap => ({
      name: `${snap.month}/${String(snap.year).slice(-2)}`,
      Assets: snap.assets.liquidita + snap.assets.investimenti + snap.assets.pac + snap.assets.previdenza + snap.assets.immobili,
      Liabilities: snap.liabilities.mutuo + snap.liabilities.altriDebiti,
      NetWorth: snap.netWorth
    }))
  }, [history])

  const breakdownData = useMemo(() => {
    if (!latestSnapshot) return []
    return [
      { name: 'Liquidità', value: latestSnapshot.assets.liquidita, color: 'var(--color-primary)' },
      { name: 'Investimenti', value: latestSnapshot.assets.investimenti, color: 'var(--color-blue)' },
      { name: 'PAC', value: latestSnapshot.assets.pac, color: 'var(--color-indigo)' },
      { name: 'Previdenza', value: latestSnapshot.assets.previdenza, color: 'var(--color-orange)' },
      { name: 'Immobili', value: latestSnapshot.assets.immobili, color: 'var(--color-warning)' }
    ].filter(d => d.value > 0)
  }, [latestSnapshot])

  const projectionData = useMemo(() => {
    if (history.length < 2) return null

    // Calcolo media variazione degli ultimi 6 snapshot (o meno se non disponibili)
    const recentHistory = history.slice(-6)
    const variations = recentHistory
      .map((snap, i) => i === 0 ? null : snap.netWorth - recentHistory[i-1].netWorth)
      .filter((v): v is number => v !== null)

    const avgVariation = variations.reduce((a, b) => a + b, 0) / variations.length

    const lastSnap = history[history.length - 1]
    const projection = []

    // Ultimo punto reale
    projection.push({
      name: `${lastSnap.month}/${String(lastSnap.year).slice(-2)}`,
      NetWorth: lastSnap.netWorth,
      isReal: true
    })

    // 12 mesi di proiezione
    for (let i = 1; i <= 12; i++) {
      const nextDate = new Date(lastSnap.year, lastSnap.month - 1 + i, 1)
      projection.push({
        name: `${nextDate.getMonth() + 1}/${String(nextDate.getFullYear()).slice(-2)}`,
        NetWorth: Math.round((lastSnap.netWorth + avgVariation * i) * 100) / 100,
        isReal: false
      })
    }

    return { data: projection, avgVariation }
  }, [history])

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!latestSnapshot && history.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Wallet size={48} className="text-text-muted" />}
          title="Nessuno snapshot registrato"
          description="Inizia a tracciare il tuo patrimonio netto catturando il tuo primo snapshot oggi."
          action={{
            label: "Registra snapshot oggi",
            onClick: () => { void handleUpdateSnapshot() }
          }}
        />
      </div>
    )
  }

  const totalAssets = latestSnapshot ? (
    latestSnapshot.assets.liquidita +
    latestSnapshot.assets.investimenti +
    latestSnapshot.assets.pac +
    latestSnapshot.assets.previdenza +
    latestSnapshot.assets.immobili
  ) : 0

  const totalLiabilities = latestSnapshot ? (
    latestSnapshot.liabilities.mutuo +
    latestSnapshot.liabilities.altriDebiti
  ) : 0

  return (
    <div className="space-y-8 pb-12 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">Patrimonio Netto</h1>
          <p className="text-text-muted mt-1">Sintesi aggregata di attivi e passivi.</p>
        </div>
        <Button
          onClick={() => { void handleUpdateSnapshot() }}
          isLoading={isUpdating}
          leftIcon={<RefreshCcw size={18} />}
        >
          Aggiorna snapshot
        </Button>
      </div>

      {error && (
        <Badge variant="error" className="w-full justify-center py-2">
          {error}
        </Badge>
      )}

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="text-xs font-bold text-text-muted uppercase">Patrimonio Netto</div>
          <div className="text-2xl font-bold text-text mt-1">
            {formatCurrency(latestSnapshot?.netWorth ?? 0)}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {(latestSnapshot?.netWorthVariation ?? 0) >= 0 ? (
              <TrendingUp size={14} className="text-success" />
            ) : (
              <TrendingDown size={14} className="text-error" />
            )}
            <span className={`text-xs font-bold ${(latestSnapshot?.netWorthVariation ?? 0) >= 0 ? 'text-success' : 'text-error'}`}>
              {formatCurrency(latestSnapshot?.netWorthVariation ?? 0)}
            </span>
            <span className="text-[10px] text-text-muted">vs mese prec.</span>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-success">
          <div className="text-xs font-bold text-text-muted uppercase">Totale Asset</div>
          <div className="text-2xl font-bold text-text mt-1">
            {formatCurrency(totalAssets)}
          </div>
          <div className="text-[10px] text-text-muted mt-1">Somma di tutti gli attivi</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-error">
          <div className="text-xs font-bold text-text-muted uppercase">Totale Passivi</div>
          <div className="text-2xl font-bold text-text mt-1">
            {formatCurrency(totalLiabilities)}
          </div>
          <div className="text-[10px] text-text-muted mt-1">Mutuo e altri debiti</div>
        </Card>

        <Card className="p-4 bg-surface/50 border-dashed">
          <div className="text-xs font-bold text-text-muted uppercase">Ultimo Aggiornamento</div>
          <div className="text-lg font-bold text-text mt-2">
            {latestSnapshot?.date.toDate().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
          <div className="text-[10px] text-text-muted mt-1">Snapshot {latestSnapshot?.month}/{latestSnapshot?.year}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Historical Chart */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-text flex items-center gap-2">
              <LineChartIcon size={20} className="text-primary" />
              Trend Storico (24 Mesi)
            </h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="name"
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                  formatter={(value: number | string | readonly (number | string)[] | undefined) => formatCurrency(typeof value === 'number' ? value : 0)}
                />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="Assets" stroke="var(--color-success)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Liabilities" stroke="var(--color-error)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="NetWorth" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Breakdown */}
        <Card className="p-6">
          <h3 className="font-bold text-text mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" />
            Breakdown Asset Correnti
          </h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                  formatter={(value: number | string | readonly (number | string)[] | undefined) => formatCurrency(typeof value === 'number' ? value : 0)}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                  {breakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {breakdownData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-text-muted">{item.name}</span>
                </div>
                <span className="font-bold text-text">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Projection Section */}
      {projectionData && (
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="font-bold text-text flex items-center gap-2">
                <PiggyBank size={20} className="text-primary" />
                Proiezione Patrimonio (12 Mesi)
              </h3>
              <p className="text-xs text-text-muted mt-1">
                Calcolo lineare basato su una variazione media mensile di <span className="font-bold text-primary">{formatCurrency(projectionData.avgVariation)}</span>.
              </p>
            </div>
            <Badge variant="info">Modello Statistico</Badge>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionData.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                  formatter={(value: number | string | readonly (number | string)[] | undefined) => formatCurrency(typeof value === 'number' ? value : 0)}
                />
                <Line
                  type="monotone"
                  dataKey="NetWorth"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  )
}
