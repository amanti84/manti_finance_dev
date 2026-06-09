import type { FC } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../../components/ui'
import { Umbrella, Calendar, Clock, TrendingUp } from 'lucide-react'
import { formatCurrency } from '../../utils/format'
import type { PensionProjection } from '../../services/previdenza'

interface PrevidenzaSummaryProps {
  projection: PensionProjection | null
  inpsStartYear: number
  loading?: boolean
}

export const PrevidenzaSummary: FC<PrevidenzaSummaryProps> = ({ projection, inpsStartYear, loading }) => {
  if (loading || !projection) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse h-24" />
        ))}
      </div>
    )
  }

  const inpsSeniority = new Date().getFullYear() - inpsStartYear
  const retirementDate = new Date()
  retirementDate.setFullYear(retirementDate.getFullYear() + projection.anniAlPensionamento)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-text-muted">Età Attuale</CardTitle>
          <Clock className="h-4 w-4 text-text-muted" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{projection.etaAttuale} anni</div>
          <p className="text-xs text-text-muted mt-1">Anzianità INPS: {inpsSeniority} anni</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-text-muted">Target Pensione</CardTitle>
          <Calendar className="h-4 w-4 text-text-muted" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{projection.etaPensione} anni</div>
          <p className="text-xs text-text-muted mt-1">
            Data stimata: {retirementDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-text-muted">Anni Mancanti</CardTitle>
          <Umbrella className="h-4 w-4 text-text-muted" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{projection.anniAlPensionamento} anni</div>
          <Badge variant="info" size="sm" className="mt-1">
            {projection.anniAlPensionamento > 20 ? 'Lungo termine' : projection.anniAlPensionamento > 10 ? 'Medio termine' : 'Breve termine'}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-text-muted">Montante Proiettato</CardTitle>
          <TrendingUp className="h-4 w-4 text-text-muted" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{formatCurrency(projection.montanteProiettato)}</div>
          <p className="text-xs text-text-muted mt-1">Include contribuzione futura</p>
        </CardContent>
      </Card>
    </div>
  )
}
