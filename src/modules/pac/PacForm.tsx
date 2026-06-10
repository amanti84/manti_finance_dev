import type { FC, FormEvent } from 'react'
import { useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { recordPacPayment } from '../../services/pac'
import { createInvestment, getInvestment, updateInvestment } from '../../services/investment'
import type { Broker } from '../../types'
import type { PACSchedule } from '../../types/pacFrequency'
import { calcNextScheduledDate } from '../../types/pacFrequency'
import { PACScheduleEditor } from '../../components/PACScheduleEditor'

const DEFAULT_SCHEDULE: PACSchedule = { type: 'interval', intervalValue: 1, intervalUnit: 'month' }

interface PacFormProps {
  uid: string
  existingInvestmentId?: string
  existingInvestmentName?: string
  onSuccess: () => void
  onError: (message: string) => void
}

export const PacForm: FC<PacFormProps> = ({
  uid,
  existingInvestmentId,
  existingInvestmentName,
  onSuccess,
  onError,
}) => {
  const [name, setName] = useState(existingInvestmentName ?? '')
  const [isin, setIsin] = useState('')
  const [importoMensile, setImportoMensile] = useState('')
  const [dataInizio, setDataInizio] = useState('')
  const [schedule, setSchedule] = useState<PACSchedule>(DEFAULT_SCHEDULE)
  const [broker, setBroker] = useState<Broker>('fineco')
  const [priceAtPayment, setPriceAtPayment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitAsync = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const importo = Math.round(parseFloat(importoMensile) * 100) / 100
      const price = priceAtPayment ? Math.round(parseFloat(priceAtPayment) * 100) / 100 : 0

      if (isNaN(importo) || importo <= 0) {
        onError('Importo deve essere maggiore di zero')
        setIsSubmitting(false)
        return
      }

      if (priceAtPayment !== '' && (isNaN(price) || price < 0)) {
        onError('Prezzo non valido')
        setIsSubmitting(false)
        return
      }

      if (!dataInizio) {
        onError('Data obbligatoria')
        setIsSubmitting(false)
        return
      }

      if (!existingInvestmentId && !name.trim()) {
        onError('Nome PAC obbligatorio')
        setIsSubmitting(false)
        return
      }

      let investmentId = existingInvestmentId ?? ''
      const investmentName = name.trim()

      if (!existingInvestmentId) {
        const today = new Date().toISOString().slice(0, 10)
        const nextPaymentDate = calcNextScheduledDate(schedule, dataInizio, today)

        const investmentData = {
          name: investmentName,
          assetClass: 'pac' as const,
          broker,
          quantity: 0,
          avgCost: 0,
          currentPrice: price,
          currentValue: 0,
          currency: 'EUR' as const,
          isPac: true,
          pacMonthlyAmount: importo,
          schedule,
          startDate: dataInizio,
          nextPaymentDate,
          lastPriceUpdate: Timestamp.now(),
          ...(isin.trim() ? { isin: isin.trim() } : {}),
        }
        const createResult = await createInvestment(uid, investmentData)

        if (!createResult.success) {
          onError(createResult.error)
          setIsSubmitting(false)
          return
        }

        investmentId = createResult.data
      }

      const paymentResult = await recordPacPayment(uid, {
        investmentId,
        investmentName,
        data: Timestamp.fromDate(new Date(dataInizio)),
        importo,
        priceAtPayment: price,
        broker,
      })

      if (!paymentResult.success) {
        onError(paymentResult.error)
        setIsSubmitting(false)
        return
      }

      // Se è un investimento esistente, aggiorniamo lastPaymentDate e nextPaymentDate
      if (existingInvestmentId) {
        const investmentResult = await getInvestment(uid, existingInvestmentId)
        if (investmentResult.success) {
          const inv = investmentResult.data
          if (inv.schedule) {
            const today = new Date().toISOString().slice(0, 10)
            // Se la data di questo pagamento è più recente di lastPaymentDate, aggiorniamo
            const currentLastPayment = inv.lastPaymentDate ?? ''
            if (dataInizio > currentLastPayment) {
              const nextPaymentDate = calcNextScheduledDate(inv.schedule, dataInizio, today)
              await updateInvestment(uid, existingInvestmentId, {
                lastPaymentDate: dataInizio,
                nextPaymentDate,
              })
            }
          }
        }
      }

      onSuccess()
      setName('')
      setIsin('')
      setImportoMensile('')
      setDataInizio('')
      setPriceAtPayment('')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = (e: FormEvent): void => { void handleSubmitAsync(e) }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
      <h3>{existingInvestmentId ? 'Aggiungi Versamento' : 'Nuovo PAC'}</h3>

      {!existingInvestmentId && (
        <>
          <label>
            Nome PAC *
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </label>

          <label>
            ISIN (opzionale)
            <input
              type="text"
              value={isin}
              onChange={(e) => setIsin(e.target.value)}
              placeholder="es. LU0996182563"
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </label>

          <label>
            Broker *
            <select
              value={broker}
              onChange={(e) => setBroker(e.target.value as Broker)}
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            >
              <option value="fineco">Fineco</option>
              <option value="directa">Directa</option>
              <option value="degiro">Degiro</option>
              <option value="altri">Altri</option>
            </select>
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.9em', fontWeight: 'bold' }}>Frequenza versamenti *</span>
            <PACScheduleEditor value={schedule} onChange={setSchedule} />
          </div>
        </>
      )}

      <label>
        Importo {existingInvestmentId ? '' : 'mensile '}(EUR) *
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={importoMensile}
          onChange={(e) => setImportoMensile(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
      </label>

      <label>
        {existingInvestmentId ? 'Data Versamento' : 'Data Inizio'} *
        <input
          type="date"
          value={dataInizio}
          onChange={(e) => setDataInizio(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
      </label>

      <label>
        Prezzo al momento del versamento (EUR)
        <input
          type="number"
          step="0.0001"
          min="0"
          value={priceAtPayment}
          onChange={(e) => setPriceAtPayment(e.target.value)}
          placeholder="es. 125.50"
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          padding: '12px',
          backgroundColor: isSubmitting ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          marginTop: '8px',
        }}
      >
        {isSubmitting ? 'Salvataggio...' : existingInvestmentId ? 'Aggiungi Versamento' : 'Crea PAC'}
      </button>
    </form>
  )
}
