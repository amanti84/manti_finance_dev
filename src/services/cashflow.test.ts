import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAvailableBalance } from './cashflow'
import type { Mock } from 'vitest'

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
  logAudit: vi.fn().mockResolvedValue({ success: true, data: {} }).mockResolvedValue({ success: true, data: { id: 'audit-id' } }),
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
        { id: 'e1', label: 'Affitto', amount: 500, frequency: 'monthly' },
        { id: 'e3', label: 'Tassa', amount: 120, frequency: 'annual' },
      ]

      const { getDocs } = await import('firebase/firestore')
      const getDocsMock = getDocs as Mock

      // First call for accounts
      getDocsMock.mockResolvedValueOnce({
        docs: mockAccounts.map(a => ({ id: a.id, data: () => a }))
      })
      // Second call for expenses
      getDocsMock.mockResolvedValueOnce({
        docs: mockExpenses.map(e => ({ id: e.id, data: () => e }))
      })

      const result = await getAvailableBalance('user123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.totalBalance).toBe(3000)
        // 500 + (120/12) = 500 + 10 = 510
        expect(result.data.monthlyRecurringExpenses).toBe(510)
        expect(result.data.availableBalance).toBe(2490)
      }
    })

    it('should handle zero accounts and zero expenses', async () => {
      const { getDocs } = await import('firebase/firestore')
      const getDocsMock = getDocs as Mock
      getDocsMock.mockResolvedValue({ docs: [] })

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
      const getDocsMock = getDocs as Mock
      getDocsMock.mockResolvedValueOnce({
        docs: [{ id: '1', data: () => ({ name: 'Conto 1', currentBalance: 5000 }) }]
      })
      getDocsMock.mockResolvedValueOnce({ docs: [] })

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
      const getDocsMock = getDocs as Mock
      getDocsMock.mockResolvedValueOnce({ docs: [] })
      getDocsMock.mockResolvedValueOnce({
        docs: [{ id: 'e1', data: () => ({ label: 'Affitto', amount: 1000, frequency: 'monthly' }) }]
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
      const getDocsMock = getDocs as Mock
      getDocsMock.mockRejectedValueOnce(new Error('Database error'))

      const result = await getAvailableBalance('user123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database error')
      }
    })

    it('should return error if getRecurringExpenses fails', async () => {
      const { getDocs } = await import('firebase/firestore')
      const getDocsMock = getDocs as Mock
      getDocsMock.mockResolvedValueOnce({ docs: [] })
      getDocsMock.mockRejectedValueOnce(new Error('Fetch error'))

      const result = await getAvailableBalance('user123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Fetch error')
      }
    })
  })
})
