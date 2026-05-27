import type { FC, FormEvent } from 'react'
import React, { useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { recordPacPayment } from '../../services/pac'
import { createInvestment } from '../../services/investment'
import type { Broker } from '../../types'

type Frequency = 'mensile' | 'trimestrale'

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
  const [frequency, setFrequency] = useState<Frequency>('mensile')
  const [broker, setBroker] = useState<Broker>('fineco')
  const [priceAtPayment, setPriceAtPayment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const importo = Math.round(parseFloat(importoMensile) * 100) / 100
      const price = priceAtPayment ? Math.round(parseFloat(priceAtPayment) * 100) / 100 : 0

      if (isNaN(importo) || importo <= 0) {
        onError('Importo non valido')
        setIsSubmitting(false)
        return
      }

      let investmentId = existingInvestmentId ?? ''
      let investmentName = name.trim()

      if (!existingInvestmentId) {
        const investmentData = {
          name: investmentName,
          assetClass: 'pac' as const,
          broker,
          quantity: 0,
          avgCost: 0,
          currentPrice: price,
          currency: 'EUR' as const,
          isPac: true,
          pacMonthlyAmount: importo,
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

          <label>
            Frequenza *
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            >
              <option value="mensile">Mensile</option>
              <option value="trimestrale">Trimestrale</option>
            </select>
          </label>
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
