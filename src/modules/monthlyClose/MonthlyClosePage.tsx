import type { FC } from 'react'
import { useState, useEffect, useCallback } from 'react'
import {
  getMonthStatus,
  getMonthlyCloseHistory,
  closeMonth,
  validateMonth,
} from '../../services/monthlyClose'
import { getSnapshot } from '../../services/snapshot'
import type { MonthlyCloseResult, MonthStatus, Month, PatrimonioSnapshot } from '../../types'

interface Props {
  uid: string
}

const MONTH_NAMES: Record<Month, string> = {
  1: 'Gennaio',
  2: 'Febbraio',
  3: 'Marzo',
  4: 'Aprile',
  5: 'Maggio',
  6: 'Giugno',
  7: 'Luglio',
  8: 'Agosto',
  9: 'Settembre',
  10: 'Ottobre',
  11: 'Novembre',
  12: 'Dicembre',
}

const StatusBadge: FC<{ status: MonthStatus }> = ({ status }) => {
  const styles: Record<string, React.CSSProperties> = {
    open: { backgroundColor: '#28a745', color: '#fff' },
    pending: { backgroundColor: '#ffc107', color: '#212529' },
    closed: { backgroundColor: '#007bff', color: '#fff' },
    OPEN: { backgroundColor: '#28a745', color: '#fff' },
    PENDING: { backgroundColor: '#ffc107', color: '#212529' },
    CLOSED: { backgroundColor: '#007bff', color: '#fff' },
    LOCKED: { backgroundColor: '#6c757d', color: '#fff' },
  }

  return (
    <span
      style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        ...styles[status],
      }}
    >
      {status}
    </span>
  )
}

export const MonthlyClosePage: FC<Props> = ({ uid }) => {
  const now = new Date()
  const currentMonth = (now.getMonth() + 1) as Month
  const currentYear = now.getFullYear()

  const [status, setStatus] = useState<MonthStatus>('OPEN')
  const [history, setHistory] = useState<MonthlyCloseResult[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedSnapshot, setSelectedSnapshot] = useState<PatrimonioSnapshot | null>(null)
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statusRes, historyRes, validRes] = await Promise.all([
        getMonthStatus(uid, currentYear, currentMonth),
        getMonthlyCloseHistory(uid),
        validateMonth(uid, currentYear, currentMonth),
      ])

      if (statusRes.success) setStatus(statusRes.data)
      if (historyRes.success) setHistory(historyRes.data)
      setIsValid(validRes.success)
      if (!validRes.success && statusRes.data === 'OPEN') {
        setError(validRes.error)
      }
    } catch {
      setError('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }, [uid, currentYear, currentMonth])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleViewSnapshot = async (item: MonthlyCloseResult) => {
    setLoadingSnapshot(true)
    try {
      const res = await getSnapshot(uid, item.year, item.month)
      if (res.success) {
        setSelectedSnapshot(res.data)
      } else {
        setError(res.error)
      }
    } catch {
      setError('Errore nel caricamento dello snapshot')
    } finally {
      setLoadingSnapshot(false)
    }
  }

  const handleCloseMonth = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await closeMonth(uid, currentYear, currentMonth)
      if (res.success) {
        setShowConfirm(false)
        await loadData()
      } else {
        setError(res.error)
      }
    } catch {
      setError('Errore durante la chiusura del mese')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div style={{ padding: '24px' }}>Caricamento...</div>

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>Chiusura Mensile</h1>

      {/* Stato Mese Corrente */}
      <section
        style={{
          backgroundColor: '#f8f9fa',
          padding: '24px',
          borderRadius: '8px',
          marginBottom: '32px',
          border: '1px solid #dee2e6',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <div style={{ marginTop: '8px' }}>
              Stato attuale: <StatusBadge status={status} />
            </div>
          </div>

          {status === 'OPEN' && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!isValid || actionLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: isValid ? '#007bff' : '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isValid ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
              }}
            >
              {actionLoading ? 'Chiusura in corso...' : 'Chiudi Mese'}
            </button>
          )}
        </div>

        {error && status === 'OPEN' && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              border: '1px solid #f5c6cb',
            }}
          >
            <strong>Attenzione:</strong> {error}
          </div>
        )}

        {status === 'CLOSED' && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#d1ecf1',
              color: '#0c5460',
              borderRadius: '4px',
            }}
          >
            Il mese è stato chiuso correttamente. Lo snapshot patrimoniale è stato generato.
          </div>
        )}
      </section>

      {/* Storico Chiusure */}
      <section>
        <h2 style={{ marginBottom: '16px' }}>Storico Chiusure</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #dee2e6' }}>
              <th style={{ textAlign: 'left', padding: '12px' }}>Periodo</th>
              <th style={{ textAlign: 'left', padding: '12px' }}>Stato</th>
              <th style={{ textAlign: 'left', padding: '12px' }}>Data Chiusura</th>
              <th style={{ textAlign: 'left', padding: '12px' }}>Snapshot ID</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6c757d' }}>
                  Nessuna chiusura presente in archivio.
                </td>
              </tr>
            ) : (
              history.map((item) => (
                <tr key={`${item.year}-${item.month}`} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    {MONTH_NAMES[item.month]} {item.year}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <StatusBadge status={item.status} />
                  </td>
                  <td style={{ padding: '12px' }}>
                    {item.closedAt ? item.closedAt.toDate().toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) : '-'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => void handleViewSnapshot(item)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#6c757d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      {loadingSnapshot ? '...' : 'Vedi Dettagli'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Dettaglio Snapshot */}
      {selectedSnapshot && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedSnapshot(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>
              Dettaglio Snapshot - {MONTH_NAMES[selectedSnapshot.month]} {selectedSnapshot.year}
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <td colSpan={2} style={{ padding: '8px', fontWeight: 'bold' }}>Attivi</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Conti Correnti</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                    {formatCurrency(selectedSnapshot.contiCorrenti)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Investimenti</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                    {formatCurrency(selectedSnapshot.investimenti)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Fondo Pensione</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                    {formatCurrency(selectedSnapshot.fondoPensione)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>TFR maturato</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                    {formatCurrency(selectedSnapshot.tfr)}
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <td colSpan={2} style={{ padding: '8px', fontWeight: 'bold' }}>Passivi</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Mutuo (debito residuo)</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'right', color: '#dc3545' }}>
                    -{formatCurrency(selectedSnapshot.mutuo)}
                  </td>
                </tr>
                <tr style={{ borderTop: '2px solid #333', fontWeight: 'bold' }}>
                  <td style={{ padding: '12px 8px' }}>Patrimonio Netto</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '1.1rem' }}>
                    {formatCurrency(selectedSnapshot.patrimonioNetto)}
                  </td>
                </tr>
              </tbody>
            </table>
            <button
              onClick={() => setSelectedSnapshot(null)}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Dialog di Conferma */}
      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '90%',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Conferma Chiusura</h3>
            <p>
              Stai per chiudere il mese di <strong>{MONTH_NAMES[currentMonth]} {currentYear}</strong>.
              Questa operazione genererà uno snapshot immutabile del tuo patrimonio.
            </p>
            <p style={{ color: '#dc3545', fontSize: '0.9rem' }}>
              Nota: Una volta chiuso, non sarà più possibile modificare i dati di questo mese.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Annulla
              </button>
              <button
                onClick={() => void handleCloseMonth()}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {actionLoading ? '...' : 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
