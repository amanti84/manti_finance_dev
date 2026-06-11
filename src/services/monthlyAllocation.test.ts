import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getMonthlyAllocation,
  createOrUpdateAllocation,
  confirmAllocation,
  generateDraftAllocation,
} from './monthlyAllocation'
import * as payrollService from './payroll'
import * as mutuoService from './mutuo'
import * as investmentService from './investment'
import * as cashflowService from './cashflow'
import { getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { logAudit } from './audit'

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {}
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({})),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: 123456789, nanoseconds: 0 }))
  }
}))

// Mock audit
vi.mock('./audit', () => ({
  logAudit: vi.fn().mockResolvedValue({ success: true, data: {} })
}))

// Mock other services
vi.mock('./payroll')
vi.mock('./mutuo')
vi.mock('./investment')
vi.mock('./cashflow')

describe('monthlyAllocation service', () => {
  const uid = 'test-user-id'
  const year = 2026
  const month = 6

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMonthlyAllocation', () => {
    it('returns allocation if exists', async () => {
      const mockData = { year, month, netIncome: 3000, status: 'draft' }
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: `${year}-${month}`,
        data: () => mockData
      } as unknown as never)

      const result = await getMonthlyAllocation(uid, year, month)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ id: `${year}-${month}`, ...mockData })
    })

    it('returns null if allocation does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => false
      } as unknown as never)

      const result = await getMonthlyAllocation(uid, year, month)

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })
  })

  describe('createOrUpdateAllocation', () => {
    it('creates a new allocation and logs audit', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as unknown as never) // for isUpdate check
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: `${year}-${month}`,
        data: () => ({ year, month, status: 'draft' })
      } as unknown as never) // for savedSnap

      const result = await createOrUpdateAllocation(uid, { year, month, netIncome: 3000, allocations: [] })

      expect(result.success).toBe(true)
      expect(setDoc).toHaveBeenCalled()
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'create',
        entityType: 'monthlyAllocation'
      }))
    })
  })

  describe('confirmAllocation', () => {
    it('confirms a draft allocation', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'draft' })
      } as unknown as never)

      const result = await confirmAllocation(uid, year, month)

      expect(result.success).toBe(true)
      expect(updateDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
        status: 'confirmed'
      }))
    })

    it('returns error if already confirmed', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'confirmed' })
      } as unknown as never)

      const result = await confirmAllocation(uid, year, month)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Allocazione già confermata')
    })
  })

  describe('generateDraftAllocation', () => {
    it('aggregates data from other services', async () => {
      // Mock Payroll
      vi.mocked(payrollService.getPayslipByMonth).mockResolvedValueOnce({
        success: true,
        data: { netSalary: 3000 } as unknown as never
      })
      // Mock Mutuo
      vi.mocked(mutuoService.getMutuoConfig).mockResolvedValueOnce({
        success: true,
        data: { rataMensile: 800 } as unknown as never
      })
      // Mock Investments (PAC)
      vi.mocked(investmentService.getAllInvestments).mockResolvedValueOnce({
        success: true,
        data: [{ id: 'pac-1', name: 'ETF World', isPac: true, pacMonthlyAmount: 200 }] as unknown as never
      })
      // Mock Cashflow (Recurring Expenses)
      vi.mocked(cashflowService.getRecurringExpenses).mockResolvedValueOnce({
        success: true,
        data: [{ id: 'exp-1', name: 'Internet', amount: 30, frequency: 'monthly' }] as unknown as never
      })

      // Mock createOrUpdateAllocation internal behavior
      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as unknown as never) // isUpdate
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: `${year}-${month}`,
        data: () => ({ year, month, netIncome: 3000 })
      } as unknown as never) // savedSnap

      const result = await generateDraftAllocation(uid, year, month)

      expect(result.success).toBe(true)
      // Verify allocations were generated
      const lastCall = vi.mocked(setDoc).mock.calls[0][1] as Record<string, unknown>
      const allocations = lastCall.allocations as unknown[]
      expect(allocations).toHaveLength(3)
      expect(lastCall.netIncome).toBe(3000)
      expect(lastCall.totalAllocated).toBe(800 + 200 + 30)
      expect(lastCall.surplus).toBe(3000 - (800 + 200 + 30))
    })
  })
})
