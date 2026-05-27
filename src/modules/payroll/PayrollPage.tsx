import type { FC } from 'react'
import { useState } from 'react'
import { usePayslips } from '../../hooks/usePayslips'
import { PayslipForm } from './PayslipForm'
import { PayslipList } from './PayslipList'
import type { Payslip, Month } from '../../types'

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

export const PayrollPage: FC = () => {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null)

  const { payslips, loading, error, addPayslip, refresh } = usePayslips(selectedYear)

  const handlePayslipClick = (payslip: Payslip) => {
    setSelectedPayslip(payslip)
  }

  const handleCloseDetail = () => {
    setSelectedPayslip(null)
  }

  const handleFormSuccess = () => {
    void refresh()
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>Gestione Cedolini</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <section>
          <h2 style={{ marginBottom: '16px' }}>Inserisci Cedolino</h2>
          <PayslipForm onSubmit={addPayslip} onSuccess={handleFormSuccess} />
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>Cedolini {selectedYear}</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSelectedYear(prev => prev - 1)}
                style={{ padding: '8px 16px', cursor: 'pointer' }}
              >
                &larr; {selectedYear - 1}
              </button>
              <button
                onClick={() => setSelectedYear(prev => prev + 1)}
                disabled={selectedYear >= currentYear}
                style={{
                  padding: '8px 16px',
                  cursor: selectedYear >= currentYear ? 'not-allowed' : 'pointer',
                  opacity: selectedYear >= currentYear ? 0.5 : 1,
                }}
              >
                {selectedYear + 1} &rarr;
              </button>
            </div>
          </div>
          <PayslipList
            payslips={payslips}
            loading={loading}
            error={error}
            onRowClick={handlePayslipClick}
          />
        </section>
      </div>

      {selectedPayslip && (
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
          onClick={handleCloseDetail}
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
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>
              Dettaglio Cedolino - {MONTH_NAMES[selectedPayslip.month]} {selectedPayslip.year}
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>Lordo</td>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                    {formatCurrency(selectedPayslip.grossSalary)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>IRPEF</td>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'right', color: '#dc3545' }}>
                    -{formatCurrency(selectedPayslip.irpef)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>INPS</td>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'right', color: '#dc3545' }}>
                    -{formatCurrency(selectedPayslip.inps)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>TFR</td>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                    {formatCurrency(selectedPayslip.tfr)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>Fondo Pensione</td>
                  <td style={{ padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'right', color: '#dc3545' }}>
                    -{formatCurrency(selectedPayslip.fondoPensione)}
                  </td>
                </tr>
                {selectedPayslip.bonus !== undefined && selectedPayslip.bonus > 0 && (
                  <tr>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>Bonus</td>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'right', color: '#28a745' }}>
                      +{formatCurrency(selectedPayslip.bonus)}
                    </td>
                  </tr>
                )}
                {selectedPayslip.rimborsiSpese !== undefined && selectedPayslip.rimborsiSpese > 0 && (
                  <tr>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>Rimborsi Spese</td>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid #eee', textAlign: 'right', color: '#28a745' }}>
                      +{formatCurrency(selectedPayslip.rimborsiSpese)}
                    </td>
                  </tr>
                )}
                <tr style={{ fontWeight: 'bold' }}>
                  <td style={{ padding: '12px 0' }}>Netto</td>
                  <td style={{ padding: '12px 0', textAlign: 'right' }}>
                    {formatCurrency(selectedPayslip.netSalary)}
                  </td>
                </tr>
                {selectedPayslip.surplus !== undefined && (
                  <tr>
                    <td style={{ padding: '8px 0' }}>Surplus</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#007bff' }}>
                      {formatCurrency(selectedPayslip.surplus)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <button
              onClick={handleCloseDetail}
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
    </div>
  )
}
