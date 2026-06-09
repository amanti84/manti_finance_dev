import type { FC } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui'
import { Landmark, TrendingUp, ShieldCheck, ArrowRightLeft } from 'lucide-react'
import { formatCurrency, formatPercent } from '../../utils/format'
import type { TFRComparison } from '../../services/previdenza'
import type { TFRData } from '../../types'

interface TFRSectionProps {
  tfrHistory: TFRData[]
  comparison: TFRComparison | null
  loading?: boolean
}

export const TFRSection: FC<TFRSectionProps> = ({ tfrHistory, comparison, loading }) => {
  if (loading) {
    return <Card className="animate-pulse h-64" />
  }

  const latestTFR = tfrHistory.length > 0 ? tfrHistory[tfrHistory.length - 1] : null
  const totalRivalutazione = tfrHistory.reduce((sum, h) => sum + (h.rivalutazione ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark size={18} /> TFR Maturato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-3xl font-bold">{formatCurrency(latestTFR?.totale ?? 0)}</p>
                <p className="text-sm text-text-muted">Totale accumulato al {latestTFR?.annoCompetenza ?? new Date().getFullYear()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-success flex items-center justify-end gap-1">
                  <TrendingUp size={14} /> +{formatCurrency(totalRivalutazione)}
                </p>
                <p className="text-xs text-text-muted">Rivalutazione storica</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-text-muted uppercase tracking-wider">Storico Annuale</p>
              <div className="space-y-2">
                {[...tfrHistory].reverse().slice(0, 5).map((history) => (
                  <div key={history.annoCompetenza} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                    <span className="font-medium">Anno {history.annoCompetenza}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-text-muted">Quota: {formatCurrency(history.quota ?? 0)}</span>
                      <span className="font-bold">{formatCurrency(history.totale ?? 0)}</span>
                    </div>
                  </div>
                ))}
                {tfrHistory.length === 0 && (
                  <p className="text-sm text-text-muted text-center py-4">Nessun dato TFR dai cedolini.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft size={18} /> Simulazione Destinazione TFR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-surface-offset border border-border">
                <p className="text-sm text-text-muted mb-4">
                  Confronto proiettato a età pensione ({comparison?.anniSimulazione} anni rimanenti).
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-text-muted uppercase font-bold">In Azienda</p>
                    <p className="text-xl font-bold">{formatCurrency(comparison?.tfrAzienda.montanteFinale ?? 0)}</p>
                    <p className="text-xs text-text-muted">Rivalutazione ISTAT</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs text-primary uppercase font-bold">Fondo Pensione</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(comparison?.tfrFondo.montanteFinale ?? 0)}</p>
                    <p className="text-xs text-text-muted">Rendimento Mercato</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-sm font-medium">Differenza Stimata:</span>
                  <span className={`text-lg font-bold ${comparison?.convenienza === 'fondo' ? 'text-success' : 'text-text'}`}>
                    {comparison?.differenza && comparison.differenza > 0 ? '+' : ''}
                    {formatCurrency(comparison?.differenza ?? 0)}
                  </span>
                </div>
              </div>

              {comparison?.convenienza === 'fondo' && (
                <div className="flex items-start gap-3 p-3 bg-success/10 border border-success/20 rounded-lg">
                  <ShieldCheck className="text-success shrink-0" size={20} />
                  <div>
                    <p className="text-xs font-bold text-success uppercase">Consiglio Proiettato</p>
                    <p className="text-sm text-success/90">
                      Il fondo pensione risulta più conveniente. La leva finanziaria del mercato e la tassazione agevolata
                      potrebbero incrementare il tuo capitale finale del {formatPercent((comparison.differenza / comparison.tfrAzienda.montanteFinale) * 100)}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
