import type { FC } from 'react'
import type { Account } from '../../types'
import { formatCurrency } from '../../utils/format'

interface AccountListProps {
  accounts: Account[]
  onEdit: (account: Account) => void
}

export const AccountList: FC<AccountListProps> = ({ accounts, onEdit }) => {
  const total = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>I tuoi Conti</h3>
        <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
          Totale: {formatCurrency(total)}
        </div>
      </div>

      {accounts.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666', border: '1px dashed #ccc' }}>
          Nessun conto configurato
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {accounts.map((account) => (
            <div
              key={account.id}
              onClick={() => onEdit(account)}
              style={{
                padding: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: '#fff',
                transition: 'box-shadow 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
              onMouseOut={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ fontWeight: 'bold', fontSize: '1.1em', marginBottom: '4px' }}>{account.name}</div>
              <div style={{ color: '#666', fontSize: '0.9em', marginBottom: '8px' }}>{account.bank}</div>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#28a745' }}>
                {formatCurrency(account.currentBalance)}
              </div>
              {account.iban && (
                <div style={{ color: '#999', fontSize: '0.8em', marginTop: '8px', wordBreak: 'break-all' }}>
                  {account.iban}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
