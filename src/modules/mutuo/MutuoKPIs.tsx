import type { FC } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Skeleton } from '../../components/ui'
import { formatCurrency, formatPercent } from '../../utils/format'
import type { MutuoSummary } from '../../services/mutuo'
import { Calendar, Percent, Landmark, Clock } from 'lucide-react'
import { toDateSafe } from '../../utils/date'

interface MutuoKPIsProps {
  summary: MutuoSummary | null
  tasso?: number
  loading?: boolean
}

export const MutuoKPIs: FC<MutuoKPIsProps> = ({ summary, tasso, loading }) => {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const prossimaRataDate = toDateSafe(summary.prossimaRata)
  const scadenzaDate = toDateSafe(summary.scadenza)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-text-muted">Debito Residuo</CardTitle>
          <Landmark size={16} className="text-text-muted" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold">{formatCurrency(summary.debitoResiduo)}</div>
            <Badge variant="info" className="w-fit">
              {formatPercent(summary.percentualeRimborso)} rimborsato
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-text-muted">Rata Mensile</CardTitle>
          <Clock size={16} className="text-text-muted" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.rataTotale)}</div>
          <p className="text-xs text-text-muted mt-1">Prossima: {prossimaRataDate ? prossimaRataDate.toLocaleDateString() : '-'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-text-muted">Scadenza</CardTitle>
          <Calendar size={16} className="text-text-muted" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {scadenzaDate ? scadenzaDate.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }) : '-'}
          </div>
          <p className="text-xs text-text-muted mt-1">{summary.rateRimanenti} mesi rimanenti</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-text-muted">Tasso</CardTitle>
          <Percent size={16} className="text-text-muted" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{tasso != null ? formatPercent(tasso) : '-'}</div>
          <p className="text-xs text-text-muted mt-1">Tasso applicato alla simulazione</p>
        </CardContent>
      </Card>
    </div>
  )
}
