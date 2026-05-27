import type { FC, FormEvent } from 'react'
import { useState, useEffect } from 'react'
import type { Account, Currency } from '../../types'
import { saveAccount } from '../../services/cashflow'

interface AccountFormProps {
  uid: string
  existingAccount?: Account | null
  onSuccess: () => void
  onError: (message: string | null) => void
  onCancel: () => void
}

export const AccountForm: FC<AccountFormProps> = ({
  uid,
  existingAccount,
  onSuccess,
  onError,
  onCancel,
}) => {
  const [name, setName] = useState(existingAccount?.name ?? '')
  const [bank, setBank] = useState(existingAccount?.bank ?? '')
  const [iban, setIban] = useState(existingAccount?.iban ?? '')
  const [currentBalance, setCurrentBalance] = useState(existingAccount?.currentBalance?.toString() ?? '0')
  const [currency, setCurrency] = useState<Currency>(existingAccount?.currency ?? 'EUR')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (existingAccount) {
      setName(existingAccount.name)
      setBank(existingAccount.bank)
      setIban(existingAccount.iban ?? '')
      setCurrentBalance(existingAccount.currentBalance.toString())
      setCurrency(existingAccount.currency)
    }
  }, [existingAccount])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const balance = parseFloat(currentBalance)
      if (isNaN(balance)) {
        onError('Saldo non valido')
        setIsSubmitting(false)
        return
      }

      const result = await saveAccount(uid, {
        ...(existingAccount?.id ? { id: existingAccount.id } : {}),
        name,
        bank,
        iban: iban.trim() || undefined,
        currentBalance: balance,
        currency,
      } as Parameters<typeof saveAccount>[1])

      if (result.success) {
        onSuccess()
      } else {
        onError(result.error)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
      <h3>{existingAccount ? 'Modifica Conto' : 'Nuovo Conto'}</h3>

      <label>
        Nome Conto *
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          placeholder="es. Conto Principale"
        />
      </label>

      <label>
        Banca *
        <input
          type="text"
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          placeholder="es. Intesa Sanpaolo"
        />
      </label>

      <label>
        IBAN (opzionale)
        <input
          type="text"
          value={iban}
          onChange={(e) => setIban(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          placeholder="IT00..."
        />
      </label>

      <label>
        Saldo Attuale (EUR) *
        <input
          type="number"
          step="0.01"
          value={currentBalance}
          onChange={(e) => setCurrentBalance(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
      </label>

      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: isSubmitting ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Salvataggio...' : 'Salva'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Annulla
        </button>
      </div>
    </form>
  )
}
