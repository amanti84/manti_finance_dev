import type { FC } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../../components/ui'
import { Wallet, ArrowUpRight, TrendingUp, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatPercent } from '../../utils/format'
import type { PensionProjection } from '../../services/previdenza'
import type { PensionFund, PensionContribution } from '../../types'

interface PensionFundSectionProps {
  funds: PensionFund[]
  contributions: Record<string, PensionContribution[]>
  projection: PensionProjection | null
  loading?: boolean
}

export const PensionFundSection: FC<PensionFundSectionProps> = ({ funds, contributions, projection, loading }) => {
  if (loading) {
    return <Card className="animate-pulse h-64" />
  }

  if (funds.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Wallet size={48} className="text-text-muted mb-4" />
          <CardTitle>Nessun Fondo Pensione</CardTitle>
          <p className="text-text-muted max-w-xs mt-2">
            Non hai ancora configurato un fondo pensione complementare.
          </p>
          <Button variant="secondary" className="mt-6">Configura Fondo</Button>
        </CardContent>
      </Card>
    )
  }

  const totalBalance = funds.reduce((sum, f) => sum + f.saldoAttuale, 0)
  const annualContrib = funds.reduce((sum, f) => sum + f.contribuzioneAnnua, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">Saldo Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalBalance)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-muted">Contribuzione Annua</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(annualContrib)}</div>
            <p className="text-xs text-text-muted mt-1">Stima basata su RAL e % scelta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-muted">Rendimento Proiettato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {projection ? formatCurrency(projection.rendimentoTotale) : '-'}
            </div>
            <p className="text-xs text-text-muted mt-1">Interesse composto stimato</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet size={18} /> I tuoi Fondi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {funds.map((fund) => (
                <div key={fund.id} className="p-4 flex items-center justify-between hover:bg-surface-offset transition-colors">
                  <div>
                    <p className="font-bold">{fund.nome}</p>
                    <p className="text-xs text-text-muted uppercase">{fund.codice} • {fund.tipologia}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(fund.saldoAttuale)}</p>
                    <p className="text-xs text-success flex items-center justify-end gap-1">
                      <TrendingUp size={12} /> {formatPercent(fund.rendimentoStorico ?? 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight size={18} /> Ultimi Versamenti
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {Object.values(contributions).flat().slice(0, 5).map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Versamento {c.month}/{c.year}</p>
                    <Badge variant="default" size="sm" className="capitalize">{c.type}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(c.totale ?? c.amount)}</p>
                    <p className="text-xs text-text-muted">
                      {c.tfrConferito ? `TFR: ${formatCurrency(c.tfrConferito)}` : 'Senza TFR'}
                    </p>
                  </div>
                </div>
              ))}
              {Object.values(contributions).flat().length === 0 && (
                <div className="p-8 text-center text-text-muted text-sm">
                  Nessun versamento registrato negli ultimi mesi.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {annualContrib > 5164.57 && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="text-warning shrink-0" size={20} />
          <div>
            <p className="text-sm font-bold text-warning">Superamento tetto deducibilità</p>
            <p className="text-xs text-warning/80">
              I tuoi versamenti annui stimati ({formatCurrency(annualContrib)}) superano il tetto di €5.164,57.
              La quota eccedente non sarà deducibile fiscalmente.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
