import type { FC } from 'react'
import { useState, useEffect, useCallback } from 'react'
import type { Account, RecurringExpense } from '../../types'
import { getAccounts, getRecurringExpenses, getAvailableBalance } from '../../services/cashflow'
import { AccountForm } from './AccountForm'
import { AccountList } from './AccountList'
import { RecurringExpenseForm } from './RecurringExpenseForm'
import { formatCurrency } from '../../utils/format'

const SAFETY_BUFFER = 3000

interface CashFlowPageProps {
  uid: string
}

export const CashFlowPage: FC<CashFlowPageProps> = ({ uid }) => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenses, setExpenses] = useState<RecurringExpense[]>([])
  const [balanceInfo, setBalanceInfo] = useState<{
    totalBalance: number
    monthlyRecurringExpenses: number
    availableBalance: number
  } | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [accRes, expRes, balRes] = await Promise.all([
        getAccounts(uid),
        getRecurringExpenses(uid),
        getAvailableBalance(uid),
      ])

      if (accRes.success) setAccounts(accRes.data)
      if (expRes.success) setExpenses(expRes.data)
      if (balRes.success) setBalanceInfo(balRes.data)

      if (!accRes.success) setError(accRes.error)
      else if (!expRes.success) setError(expRes.error)
      else if (!balRes.success) setError(balRes.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dati')
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleSuccess = () => {
    setShowAccountForm(false)
    setShowExpenseForm(false)
    setEditingAccount(null)
    setEditingExpense(null)
    void loadData()
  }

  if (loading) return <div style={{ padding: '24px' }}>Caricamento Cash Flow...</div>

  const isBelowBuffer = balanceInfo && balanceInfo.availableBalance < SAFETY_BUFFER

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Cash Flow</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowAccountForm(true)}
            style={{ padding: '10px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Aggiungi Conto
          </button>
          <button
            onClick={() => setShowExpenseForm(true)}
            style={{ padding: '10px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Aggiungi Spesa
          </button>
        </div>
      </header>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', border: '1px solid #f5c6cb' }}>
          {error}
        </div>
      )}

      {balanceInfo && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          backgroundColor: '#f8f9fa',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #dee2e6'
        }}>
          <div>
            <div style={{ color: '#6c757d', fontSize: '0.9em', marginBottom: '4px' }}>Saldo Totale</div>
            <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>{formatCurrency(balanceInfo.totalBalance)}</div>
          </div>
          <div>
            <div style={{ color: '#6c757d', fontSize: '0.9em', marginBottom: '4px' }}>Spese Ricorrenti (mensili)</div>
            <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#dc3545' }}>{formatCurrency(balanceInfo.monthlyRecurringExpenses)}</div>
          </div>
          <div>
            <div style={{ color: '#6c757d', fontSize: '0.9em', marginBottom: '4px' }}>Saldo Disponibile Netto</div>
            <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: isBelowBuffer ? '#dc3545' : '#28a745' }}>
              {formatCurrency(balanceInfo.availableBalance)}
            </div>
          </div>
        </div>
      )}

      {isBelowBuffer && (
        <div style={{ padding: '16px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '8px', border: '1px solid #ffeeba', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>⚠️</span>
          <span>Attenzione: il saldo disponibile è inferiore alla soglia di sicurezza di {formatCurrency(SAFETY_BUFFER)}.</span>
        </div>
      )}

      {(showAccountForm || editingAccount) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <AccountForm
            uid={uid}
            existingAccount={editingAccount}
            onSuccess={handleSuccess}
            onCancel={() => { setShowAccountForm(false); setEditingAccount(null); }}
            onError={setError}
          />
        </div>
      )}

      {(showExpenseForm || editingExpense) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <RecurringExpenseForm
            uid={uid}
            accounts={accounts}
            existingExpense={editingExpense}
            onSuccess={handleSuccess}
            onCancel={() => { setShowExpenseForm(false); setEditingExpense(null); }}
            onError={setError}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        <AccountList
          accounts={accounts}
          onEdit={(acc) => setEditingAccount(acc)}
        />

        <section>
          <h3>Spese Ricorrenti</h3>
          {expenses.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666', border: '1px dashed #ccc' }}>
              Nessuna spesa ricorrente configurata
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Nome</th>
                    <th style={{ padding: '12px' }}>Categoria</th>
                    <th style={{ padding: '12px' }}>Frequenza</th>
                    <th style={{ padding: '12px' }}>Giorno</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      onClick={() => setEditingExpense(expense)}
                      style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '12px' }}>{expense.name}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '4px 8px', backgroundColor: '#e9ecef', borderRadius: '4px', fontSize: '0.85em' }}>
                          {expense.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{expense.frequency}</td>
                      <td style={{ padding: '12px' }}>{expense.dayOfMonth || '-'}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(expense.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
