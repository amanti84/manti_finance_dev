import type { FC } from 'react'
import { useEffect, useState, useCallback } from 'react'
import type { Investment, PacPayment, PACReturnData } from '../../types'
import { getPaymentHistory, calculatePACReturn } from '../../services/pac'

interface PacDetailProps {
  uid: string
  investment: Investment
  onBack: () => void
  onError: (message: string) => void
}

interface ProjectionYear {
  year: number
  versato: number
  valoreProiettato: number
}

const DEFAULT_EXPECTED_RATE = 7

export const PacDetail: FC<PacDetailProps> = ({ uid, investment, onBack, onError }) => {
  const [payments, setPayments] = useState<PacPayment[]>([])
  const [performance, setPerformance] = useState<PACReturnData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expectedRate, setExpectedRate] = useState(DEFAULT_EXPECTED_RATE)
  const [projectionYears, setProjectionYears] = useState(10)
  const [projections, setProjections] = useState<ProjectionYear[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const historyResult = await getPaymentHistory(uid, investment.id)
      if (!historyResult.success) {
        onError(historyResult.error)
        setLoading(false)
        return
      }
      setPayments(historyResult.data)

      const performanceResult = await calculatePACReturn(uid, investment.id)
      if (performanceResult.success) {
        setPerformance(performanceResult.data)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Errore nel caricamento')
    } finally {
      setLoading(false)
    }
  }, [uid, investment, onError])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!performance) return

    const monthlyAmount = investment.pacMonthlyAmount ?? 0
    const currentTotal = performance.totalInvested
    const rate = expectedRate / 100
    const monthlyRate = rate / 12

    const newProjections: ProjectionYear[] = []
    const currentYear = new Date().getFullYear()

    for (let y = 1; y <= projectionYears; y++) {
      const months = y * 12
      const totalVersato = Math.round((currentTotal + monthlyAmount * months) * 100) / 100

      let valoreProiettato = currentTotal * Math.pow(1 + rate, y)
      for (let m = 1; m <= months; m++) {
        const remainingMonths = months - m
        valoreProiettato += monthlyAmount * Math.pow(1 + monthlyRate, remainingMonths)
      }
      valoreProiettato = Math.round(valoreProiettato * 100) / 100

      newProjections.push({
        year: currentYear + y,
        versato: totalVersato,
        valoreProiettato,
      })
    }

    setProjections(newProjections)
  }, [performance, expectedRate, projectionYears, investment.pacMonthlyAmount])

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
  }

  if (loading) {
    return <div>Caricamento dettagli...</div>
  }

  const maxValue = projections.length > 0 ? Math.max(...projections.map((p) => p.valoreProiettato)) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onBack}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ← Indietro
        </button>
        <h2 style={{ margin: 0 }}>{investment.name}</h2>
        {investment.isin && <span style={{ color: '#666' }}>({investment.isin})</span>}
      </div>

      {performance && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.85em', color: '#666' }}>Importo Mensile</div>
            <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
              {formatCurrency(investment.pacMonthlyAmount ?? 0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', color: '#666' }}>Totale Versato</div>
            <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{formatCurrency(performance.totalInvested)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', color: '#666' }}>Valore Attuale</div>
            <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{formatCurrency(performance.currentValue)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', color: '#666' }}>Rendimento</div>
            <div
              style={{
                fontSize: '1.2em',
                fontWeight: 'bold',
                color: performance.gainLoss >= 0 ? 'green' : 'red',
              }}
            >
              {performance.gainLoss >= 0 ? '+' : ''}
              {performance.gainLossPercent.toFixed(2)}% ({formatCurrency(performance.gainLoss)})
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', color: '#666' }}>Prezzo Corrente</div>
            <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{formatCurrency(investment.currentPrice)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85em', color: '#666' }}>Numero Versamenti</div>
            <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{payments.length}</div>
          </div>
        </div>
      )}

      <div>
        <h3>Storico Versamenti</h3>
        {payments.length === 0 ? (
          <div style={{ padding: '16px', color: '#666' }}>Nessun versamento registrato</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                <th style={{ padding: '10px 8px' }}>Data</th>
                <th style={{ padding: '10px 8px' }}>Importo</th>
                <th style={{ padding: '10px 8px' }}>Prezzo</th>
                <th style={{ padding: '10px 8px' }}>Quote Acquistate</th>
                <th style={{ padding: '10px 8px' }}>Broker</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 8px' }}>{formatDate(payment.data.toDate())}</td>
                  <td style={{ padding: '10px 8px' }}>{formatCurrency(payment.importo)}</td>
                  <td style={{ padding: '10px 8px' }}>{formatCurrency(payment.priceAtPayment)}</td>
                  <td style={{ padding: '10px 8px' }}>{payment.quantityPurchased.toFixed(5)}</td>
                  <td style={{ padding: '10px 8px' }}>{payment.broker}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h3>Proiezione Valore Futuro</h3>

        <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
          <label>
            Tasso atteso annuo (%):
            <input
              type="number"
              step="0.5"
              min="0"
              max="30"
              value={expectedRate}
              onChange={(e) => setExpectedRate(parseFloat(e.target.value) || 0)}
              style={{ width: '80px', marginLeft: '8px', padding: '6px' }}
            />
          </label>
          <label>
            Anni di proiezione:
            <input
              type="number"
              min="1"
              max="40"
              value={projectionYears}
              onChange={(e) => setProjectionYears(parseInt(e.target.value) || 10)}
              style={{ width: '60px', marginLeft: '8px', padding: '6px' }}
            />
          </label>
        </div>

        {projections.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '16px', height: '16px', backgroundColor: '#007bff' }} />
                <span>Versato</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '16px', height: '16px', backgroundColor: '#28a745' }} />
                <span>Valore Proiettato</span>
              </div>
            </div>

            {projections.map((proj) => (
              <div key={proj.year} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '60px', textAlign: 'right', fontWeight: 'bold' }}>{proj.year}</div>
                <div style={{ flex: 1, position: 'relative', height: '32px' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '14px',
                      backgroundColor: '#007bff',
                      width: `${(proj.versato / maxValue) * 100}%`,
                      minWidth: '2px',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 16,
                      left: 0,
                      height: '14px',
                      backgroundColor: '#28a745',
                      width: `${(proj.valoreProiettato / maxValue) * 100}%`,
                      minWidth: '2px',
                    }}
                  />
                </div>
                <div style={{ width: '200px', fontSize: '0.9em' }}>
                  <div>Versato: {formatCurrency(proj.versato)}</div>
                  <div style={{ color: '#28a745' }}>Proiettato: {formatCurrency(proj.valoreProiettato)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
