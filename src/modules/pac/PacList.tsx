import type { FC } from 'react'
import React, { useEffect, useState, useCallback } from 'react'
import type { Investment } from '../../types'
import { getAllInvestments, deleteInvestment } from '../../services/investment'
import { getPacSummary, deletePacPayment, getAllPacPayments, type PacSummary, type PacPayment } from '../../services/pac'

interface PacListProps {
  uid: string
  onSelectPac: (investment: Investment) => void
  onAddPayment: (investment: Investment) => void
  onEditPac: (investment: Investment) => void
  onError: (message: string) => void
  onSuccess: (message: string) => void
  refreshTrigger?: number
}

interface PacWithSummary {
  investment: Investment
  summary: PacSummary | null
}

export const PacList: FC<PacListProps> = ({
  uid,
  onSelectPac,
  onAddPayment,
  onEditPac,
  onError,
  onSuccess,
  refreshTrigger,
}) => {
  const [pacList, setPacList] = useState<PacWithSummary[]>([])
  const [loading, setLoading] = useState(true)

  const loadPacList = useCallback(async () => {
    setLoading(true)
    try {
      const investmentsResult = await getAllInvestments(uid)
      if (!investmentsResult.success) {
        onError(investmentsResult.error)
        setLoading(false)
        return
      }

      const pacInvestments = investmentsResult.data.filter((inv) => inv.isPac)
      const pacWithSummaries: PacWithSummary[] = []

      for (const investment of pacInvestments) {
        const summaryResult = await getPacSummary(uid, investment)
        pacWithSummaries.push({
          investment,
          summary: summaryResult.success ? summaryResult.data : null,
        })
      }

      setPacList(pacWithSummaries)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Errore nel caricamento')
    } finally {
      setLoading(false)
    }
  }, [uid, onError])

  useEffect(() => {
    loadPacList()
  }, [loadPacList, refreshTrigger])

  const handleDelete = async (investmentId: string) => {
    if (!confirm('Eliminare questo PAC e tutti i suoi versamenti?')) return

    try {
      const paymentsResult = await getAllPacPayments(uid)
      if (paymentsResult.success) {
        const payments = paymentsResult.data.filter((p: PacPayment) => p.investmentId === investmentId)
        for (const payment of payments) {
          await deletePacPayment(uid, payment.id)
        }
      }

      const deleteResult = await deleteInvestment(uid, investmentId)
      if (!deleteResult.success) {
        onError(deleteResult.error)
        return
      }

      onSuccess('PAC eliminato con successo')
      loadPacList()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Errore eliminazione')
    }
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  if (loading) {
    return <div>Caricamento PAC...</div>
  }

  if (pacList.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Nessun PAC attivo</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3>PAC Attivi ({pacList.length})</h3>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
            <th style={{ padding: '12px 8px' }}>Nome</th>
            <th style={{ padding: '12px 8px' }}>Importo Mensile</th>
            <th style={{ padding: '12px 8px' }}>Totale Versato</th>
            <th style={{ padding: '12px 8px' }}>Valore Attuale</th>
            <th style={{ padding: '12px 8px' }}>Rendimento</th>
            <th style={{ padding: '12px 8px' }}>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {pacList.map(({ investment, summary }) => (
            <tr key={investment.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px 8px' }}>
                <button
                  onClick={() => onSelectPac(investment)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    fontSize: 'inherit',
                  }}
                >
                  {investment.name}
                </button>
                {investment.isin && (
                  <div style={{ fontSize: '0.85em', color: '#666' }}>{investment.isin}</div>
                )}
              </td>
              <td style={{ padding: '12px 8px' }}>
                {formatCurrency(summary?.importoMensile ?? investment.pacMonthlyAmount ?? 0)}
              </td>
              <td style={{ padding: '12px 8px' }}>
                {summary ? formatCurrency(summary.totaleVersato) : '-'}
              </td>
              <td style={{ padding: '12px 8px' }}>
                {summary ? formatCurrency(summary.valoreAttuale) : '-'}
              </td>
              <td
                style={{
                  padding: '12px 8px',
                  color: summary && summary.pnlPercent >= 0 ? 'green' : 'red',
                  fontWeight: 'bold',
                }}
              >
                {summary ? formatPercent(summary.pnlPercent) : '-'}
              </td>
              <td style={{ padding: '12px 8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onAddPayment(investment)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                    }}
                  >
                    + Versamento
                  </button>
                  <button
                    onClick={() => onEditPac(investment)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ffc107',
                      color: '#000',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                    }}
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => handleDelete(investment.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                    }}
                  >
                    Elimina
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
