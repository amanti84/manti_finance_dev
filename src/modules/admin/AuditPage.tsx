import React, { useState, useEffect, useMemo, useCallback, type FC } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Navigate } from 'react-router-dom'
import {
  getAuditLog,
  exportAuditLogCSV,
  type AuditFilter
} from '../../services/audit'
import {
  Button,
  Card,
  Badge,
  Input,
  EmptyState,
  Skeleton
} from '../../components/ui'
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  Activity,
  Clock,
  Zap
} from 'lucide-react'
import { Timestamp, type DocumentSnapshot } from 'firebase/firestore'
import type { AuditLogEntry, AuditEntityType, AuditAction } from '../../types'

const ENTITY_TYPES: AuditEntityType[] = [
  'transaction', 'investment', 'payslip', 'snapshot',
  'goal', 'document', 'inbox', 'alert', 'config',
  'account', 'recurringExpense', 'inboxItem',
  'scenario', 'monthlyClose',
  'kindergartenExpense', 'kindergartenConfig',
  'monthlyAllocation',
  'sale', 'taxWallet'
]

const ACTIONS: AuditAction[] = [
  'create', 'update', 'delete', 'read',
  'login', 'logout', 'export', 'import',
  'snapshot', 'LEGACY_IMPORT'
]

export const AuditPage: FC = () => {
  const { user, loading: authLoading } = useAuth()

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<AuditEntityType[]>([])
  const [selectedActions, setSelectedActions] = useState<AuditAction[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // Data
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Pagination
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const pageSize = 50

  const allowedEmails = (import.meta.env.VITE_ALLOWED_EMAILS as string || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())

  const isAdmin = useMemo(() => {
    return user?.email && allowedEmails.includes(user.email.toLowerCase())
  }, [user, allowedEmails])

  const fetchLogs = useCallback(async (isNext = false) => {
    if (!user || !isAdmin) return
    setLoading(true)

    const filter: AuditFilter = {
      limitN: pageSize,
      lastVisible: isNext ? (lastVisible ?? undefined) : undefined
    }

    if (selectedEntityTypes.length > 0) filter.entityType = selectedEntityTypes
    if (selectedActions.length > 0) filter.action = selectedActions
    if (dateFrom) filter.dateFrom = Timestamp.fromDate(new Date(dateFrom))
    if (dateTo) {
      const dTo = new Date(dateTo)
      dTo.setHours(23, 59, 59, 999)
      filter.dateTo = Timestamp.fromDate(dTo)
    }

    const res = await getAuditLog(user.uid, filter)
    if (res.success) {
      if (isNext) {
        setLogs(prev => [...prev, ...res.data.entries])
      } else {
        setLogs(res.data.entries)
      }
      setLastVisible(res.data.lastVisible)
      setHasMore(res.data.entries.length === pageSize)
    }
    setLoading(false)
  }, [user, isAdmin, selectedEntityTypes, selectedActions, dateFrom, dateTo, lastVisible])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs
    const s = searchTerm.toLowerCase()
    return logs.filter(log =>
      log.entityId.toLowerCase().includes(s) ??
      (log.newValue && JSON.stringify(log.newValue).toLowerCase().includes(s)) ??
      (log.previousValue && JSON.stringify(log.previousValue).toLowerCase().includes(s))
    )
  }, [logs, searchTerm])

  const stats = useMemo(() => {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const count24h = logs.filter(l => l.createdAt.toDate() > last24h).length

    const entityCounts: Record<string, number> = {}
    logs.forEach(l => {
      entityCounts[l.entityType] = (entityCounts[l.entityType] || 0) + 1
    })

    const mostModified = Object.entries(entityCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '-'

    return {
      total: logs.length,
      last24h: count24h,
      mostModified
    }
  }, [logs])

  if (authLoading) return <div className="p-8 text-center">Caricamento...</div>
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  const handleExport = async () => {
    if (!user) return
    // Per l'export completo scarichiamo più record (es. 1000)
    const res = await getAuditLog(user.uid, { limitN: 1000 })
    if (res.success) {
      const csv = exportAuditLogCSV(res.data.entries)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      const today = new Date().toISOString().split('T')[0]
      link.setAttribute('href', url)
      link.setAttribute('download', `audit-log-${today}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const formatDate = (ts: Timestamp) => {
    const d = ts.toDate()
    return `${d.toLocaleDateString('it-IT')} ${d.toLocaleTimeString('it-IT')}`
  }

  const toggleEntityType = (type: AuditEntityType) => {
    setSelectedEntityTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const toggleAction = (act: AuditAction) => {
    setSelectedActions(prev =>
      prev.includes(act) ? prev.filter(a => a !== act) : [...prev, act]
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Audit Trail</h1>
          <p className="text-text-muted">Registro storico delle operazioni di sistema</p>
        </div>
        <Button onClick={() => { void handleExport() }} variant="secondary" className="flex items-center gap-2">
          <Download size={18} /> Esporta CSV (ultimi 1000)
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-text-muted uppercase font-semibold">Log Caricati</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-success/10 rounded-full text-success">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.last24h}</div>
            <div className="text-xs text-text-muted uppercase font-semibold">Ultime 24 Ore (caricati)</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-warning/10 rounded-full text-warning">
            <Zap size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold capitalize">{stats.mostModified}</div>
            <div className="text-xs text-text-muted uppercase font-semibold">Entità più Attiva</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase flex items-center gap-2">
              <Clock size={14} /> Periodo
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-1 bg-bg border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <input
                type="date"
                className="flex-1 bg-bg border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase flex items-center gap-2">
              <Search size={14} /> Ricerca Libera
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <Input
                className="pl-9"
                placeholder="ID entità o contenuto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-end">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setDateFrom('')
                setDateTo('')
                setSelectedEntityTypes([])
                setSelectedActions([])
                setSearchTerm('')
              }}
            >
              Reset Filtri
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase">Tipi Entità (Selezione Multipla)</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-bg/50 rounded-lg border border-border">
              {ENTITY_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => toggleEntityType(t)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                    selectedEntityTypes.includes(t)
                      ? 'bg-primary text-white'
                      : 'bg-surface text-text-muted hover:bg-border'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase">Azioni (Selezione Multipla)</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-bg/50 rounded-lg border border-border">
              {ACTIONS.map(a => (
                <button
                  key={a}
                  onClick={() => toggleAction(a)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                    selectedActions.includes(a)
                      ? 'bg-success text-white'
                      : 'bg-surface text-text-muted hover:bg-border'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title="Nessun log trovato"
            description="Prova a modificare i filtri per visualizzare più risultati."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg/50 text-xs font-bold text-text-muted uppercase tracking-wider">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Azione</th>
                  <th className="px-4 py-3">Entità</th>
                  <th className="px-4 py-3">ID Entità</th>
                  <th className="px-4 py-3">Fonte</th>
                  <th className="px-4 py-3 text-right">Dettagli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      className={`hover:bg-primary/5 transition-colors cursor-pointer ${expandedId === log.id ? 'bg-primary/5' : ''}`}
                      onClick={() => { setExpandedId(expandedId === log.id ? null : log.id) }}
                    >
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={
                          log.action === 'delete' ? 'error' :
                          log.action === 'create' ? 'success' :
                          log.action === 'update' ? 'info' : 'default'
                        }>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{log.entityType}</td>
                      <td className="px-4 py-3 text-sm font-mono text-text-muted truncate max-w-[150px]">
                        {log.entityId}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="default">{log.source ?? 'user'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {expandedId === log.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr className="bg-bg/30">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-bold text-text-muted uppercase mb-2">Valore Precedente</div>
                              <pre className="text-xs bg-bg p-3 rounded border border-border overflow-x-auto max-h-60">
                                {log.previousValue ? JSON.stringify(log.previousValue, null, 2) : 'null'}
                              </pre>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-text-muted uppercase mb-2">Nuovo Valore</div>
                              <pre className="text-xs bg-bg p-3 rounded border border-border overflow-x-auto max-h-60">
                                {log.newValue ? JSON.stringify(log.newValue, null, 2) : 'null'}
                              </pre>
                            </div>
                          </div>
                          {log.ipHash && (
                            <div className="mt-4 text-[10px] text-text-muted font-mono">
                              IP Hash: {log.ipHash} | UID: {log.uid}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Load More */}
      {!loading && hasMore && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={() => { void fetchLogs(true) }}
          >
            Carica Altri
          </Button>
        </div>
      )}

      {loading && logs.length > 0 && (
        <div className="text-center text-sm text-text-muted">
          Caricamento altri log...
        </div>
      )}
    </div>
  )
}
