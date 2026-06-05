import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DocumentSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore'
import {
  validateMonth,
  closeMonth,
  getMonthStatus,
  getMonthlyCloseHistory,
} from './monthlyClose'
import * as payroll from './payroll'
import * as cashflow from './cashflow'
import * as investment from './investment'
import * as mutuo from './mutuo'
import * as previdenza from './previdenza'
import * as snapshot from './snapshot'
import * as audit from './audit'
import { getDoc, getDocs, setDoc } from 'firebase/firestore'
import type { PatrimonioSnapshot, Payslip, MutuoConfig, PensionFund, ApiResult, Investment } from '../types'

// Mock Firebase per evitare inizializzazione con chiavi vuote in CI
vi.mock('../firebase', () => ({
  db: {},
  auth: {},
  storage: {},
  default: {},
}))

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
  },
}))

vi.mock('./payroll')
vi.mock('./cashflow')
vi.mock('./investment')
vi.mock('./mutuo')
vi.mock('./previdenza')
vi.mock('./snapshot')
vi.mock('./audit')

describe('monthlyClose service', () => {
  const uid = 'test-uid'
  const year = 2026
  const month = 5

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateMonth', () => {
    it('should return success: true if payslip exists', async () => {
      vi.mocked(payroll.getPayslipByMonth).mockResolvedValue({
        success: true,
        data: { id: 'p1' } as Payslip,
      })

      const result = await validateMonth(uid, year, month)
      expect(result.success).toBe(true)
    })

    it('should return success: false if payslip is missing', async () => {
      vi.mocked(payroll.getPayslipByMonth).mockResolvedValue({
        success: false,
        error: 'Not found',
      })

      const result = await validateMonth(uid, year, month)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Cedolino mancante')
    })
  })

  describe('getMonthStatus', () => {
    it('should return open if document does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as unknown as DocumentSnapshot<unknown, DocumentData>)

      const result = await getMonthStatus(uid, year, month)
      expect(result.success).toBe(true)
      expect(result.data).toBe('open')
    })

    it('should return closed if document exists with CLOSED status', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ status: 'closed' }),
      } as unknown as DocumentSnapshot<unknown, DocumentData>)

      const result = await getMonthStatus(uid, year, month)
      expect(result.success).toBe(true)
      expect(result.data).toBe('closed')
    })
  })

  describe('closeMonth', () => {
    it('should successfully close the month', async () => {
      // Mocks for validation and status
      vi.mocked(payroll.getPayslipByMonth).mockResolvedValue({ success: true, data: {} as Payslip })
      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as unknown as DocumentSnapshot<unknown, DocumentData>) // Status check

      // Mocks for data aggregation
      const balanceResult: ApiResult<{ totalBalance: number; monthlyRecurringExpenses: number; availableBalance: number }> = {
        success: true,
        data: { totalBalance: 1000, monthlyRecurringExpenses: 0, availableBalance: 1000 }
      }
      vi.mocked(cashflow.getAvailableBalance).mockResolvedValue(balanceResult)
      vi.mocked(investment.getAllInvestments).mockResolvedValue({ success: true, data: [{ currentValue: 500 }] as Investment[] })
      vi.mocked(mutuo.getMutuoConfig).mockResolvedValue({ success: true, data: { debitoResiduo: 200000 } as unknown as MutuoConfig })
      vi.mocked(previdenza.getAllPensionFunds).mockResolvedValue({ success: true, data: [{ saldoAttuale: 5000 }] as PensionFund[] })
      vi.mocked(payroll.getPayslips).mockResolvedValue({ success: true, data: [{ tfr: 100 }] as Payslip[] })

      // Mock for snapshot creation
      vi.mocked(snapshot.createSnapshot).mockResolvedValue({ success: true, data: { id: 'snap-123' } as PatrimonioSnapshot })

      const result = await closeMonth(uid, year, month)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status.toLowerCase()).toBe('closed')
        expect(result.data.snapshotId).toBe('snap-123')
      }
      expect(setDoc).toHaveBeenCalled()
      expect(audit.logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'snapshot',
        entityType: 'monthlyClose',
      }))
    })

    it('should fail if already closed', async () => {
      vi.mocked(payroll.getPayslipByMonth).mockResolvedValue({ success: true, data: {} as Payslip })
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'closed' }),
      } as unknown as DocumentSnapshot<unknown, DocumentData>)

      const result = await closeMonth(uid, year, month)
      expect(result.success).toBe(false)
      expect(result.error).toContain('già chiuso')
    })
  })

  describe('getMonthlyCloseHistory', () => {
    it('should return history of closures', async () => {
      vi.mocked(getDocs).mockResolvedValue({
        docs: [
          { data: () => ({ year: 2026, month: 5, status: 'closed' }) },
          { data: () => ({ year: 2026, month: 4, status: 'closed' }) },
        ],
      } as unknown as QuerySnapshot<unknown, DocumentData>)

      const result = await getMonthlyCloseHistory(uid)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.length).toBe(2)
      }
    })
  })
})
