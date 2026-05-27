import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAvailableBalance } from './cashflow'

// -----------------------------------------------------------------------
// MOCK FIREBASE
// -----------------------------------------------------------------------
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(),
}))

vi.mock('../firebase', () => ({
  db: {},
}))

vi.mock('./audit', () => ({
  logAudit: vi.fn().mockResolvedValue({ id: 'audit-id' }),
}))

describe('cashflow service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAvailableBalance', () => {
    it('should calculate balance correctly with multiple accounts and expenses', async () => {
      const mockAccounts = [
        { id: '1', name: 'Conto 1', currentBalance: 1000 },
        { id: '2', name: 'Conto 2', currentBalance: 2000 },
      ]
      const mockExpenses = [
        { id: 'e1', name: 'Affitto', amount: 500, frequency: 'monthly' },
        { id: 'e2', name: 'Assicurazione', amount: 300, frequency: 'quarterly' },
        { id: 'e3', name: 'Tassa', amount: 120, frequency: 'annual' },
      ]

      const { getDocs } = await import('firebase/firestore')

      // First call for accounts
      ;(getDocs as any).mockResolvedValueOnce({
        docs: mockAccounts.map(a => ({ id: a.id, data: () => a }))
      })
      // Second call for expenses
      ;(getDocs as any).mockResolvedValueOnce({
        docs: mockExpenses.map(e => ({ id: e.id, data: () => e }))
      })

      const result = await getAvailableBalance('user123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.totalBalance).toBe(3000)
        // 500 + (300/3) + (120/12) = 500 + 100 + 10 = 610
        expect(result.data.monthlyRecurringExpenses).toBe(610)
        expect(result.data.availableBalance).toBe(2390)
      }
    })

    it('should handle zero accounts and zero expenses', async () => {
      const { getDocs } = await import('firebase/firestore')
      ;(getDocs as any).mockResolvedValue({ docs: [] })

      const result = await getAvailableBalance('user123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.totalBalance).toBe(0)
        expect(result.data.monthlyRecurringExpenses).toBe(0)
        expect(result.data.availableBalance).toBe(0)
      }
    })

    it('should handle only accounts', async () => {
      const { getDocs } = await import('firebase/firestore')
      ;(getDocs as any).mockResolvedValueOnce({
        docs: [{ id: '1', data: () => ({ name: 'Conto 1', currentBalance: 5000 }) }]
      })
      ;(getDocs as any).mockResolvedValueOnce({ docs: [] })

      const result = await getAvailableBalance('user123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.totalBalance).toBe(5000)
        expect(result.data.monthlyRecurringExpenses).toBe(0)
        expect(result.data.availableBalance).toBe(5000)
      }
    })

    it('should handle only expenses', async () => {
      const { getDocs } = await import('firebase/firestore')
      ;(getDocs as any).mockResolvedValueOnce({ docs: [] })
      ;(getDocs as any).mockResolvedValueOnce({
        docs: [{ id: 'e1', data: () => ({ name: 'Affitto', amount: 1000, frequency: 'monthly' }) }]
      })

      const result = await getAvailableBalance('user123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.totalBalance).toBe(0)
        expect(result.data.monthlyRecurringExpenses).toBe(1000)
        expect(result.data.availableBalance).toBe(-1000)
      }
    })

    it('should return error if getAccounts fails', async () => {
      const { getDocs } = await import('firebase/firestore')
      ;(getDocs as any).mockRejectedValueOnce(new Error('Database error'))

      const result = await getAvailableBalance('user123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database error')
      }
    })

    it('should return error if getRecurringExpenses fails', async () => {
      const { getDocs } = await import('firebase/firestore')
      ;(getDocs as any).mockResolvedValueOnce({ docs: [] })
      ;(getDocs as any).mockRejectedValueOnce(new Error('Fetch error'))

      const result = await getAvailableBalance('user123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Fetch error')
      }
    })
  })
})
