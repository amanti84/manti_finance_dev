import type { FC } from 'react'
import type { Payslip, Month } from '../../types'

interface Props {
  payslips: Payslip[]
  loading: boolean
  error: string | null
  onRowClick?: (payslip: Payslip) => void
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

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export const PayslipList: FC<Props> = ({ payslips, loading, error, onRowClick }) => {
  if (loading) {
    return <div style={{ padding: '16px' }}>Caricamento cedolini...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '16px', color: '#721c24', backgroundColor: '#f8d7da', borderRadius: '4px' }}>
        Errore: {error}
      </div>
    )
  }

  if (payslips.length === 0) {
    return (
      <div style={{ padding: '16px', color: '#6c757d' }}>
        Nessun cedolino presente. Inserisci il primo cedolino usando il form sopra.
      </div>
    )
  }

  const sortedPayslips = [...payslips].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year
    return b.month - a.month
  })

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>Mese/Anno</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Netto</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Lordo</th>
            <th style={{ padding: '12px', textAlign: 'right' }}>Surplus</th>
          </tr>
        </thead>
        <tbody>
          {sortedPayslips.map(payslip => (
            <tr
              key={payslip.id}
              onClick={() => onRowClick?.(payslip)}
              style={{
                borderBottom: '1px solid #dee2e6',
                cursor: onRowClick ? 'pointer' : 'default',
              }}
              onMouseEnter={e => {
                if (onRowClick) {
                  e.currentTarget.style.backgroundColor = '#f8f9fa'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <td style={{ padding: '12px' }}>
                {MONTH_NAMES[payslip.month]} {payslip.year}
              </td>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                {formatCurrency(payslip.netSalary)}
              </td>
              <td style={{ padding: '12px', textAlign: 'right' }}>
                {formatCurrency(payslip.grossSalary)}
              </td>
              <td style={{ padding: '12px', textAlign: 'right' }}>
                {payslip.surplus !== undefined ? formatCurrency(payslip.surplus) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
