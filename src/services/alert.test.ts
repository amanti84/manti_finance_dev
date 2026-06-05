import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateAlerts, markAlertRead, snoozeAlert, getActiveAlerts } from './alert'
import * as cashflowService from './cashflow'
import * as payrollService from './payroll'
import * as snapshotService from './snapshot'
import type { QuerySnapshot, DocumentSnapshot, Timestamp, DocumentData } from 'firebase/firestore'
import type { PatrimonioSnapshot, Payslip, ApiResult, FinancialAlert } from '../types'

// -----------------------------------------------------------------------
// MOCK FIREBASE
// -----------------------------------------------------------------------
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'mock-doc-id' })),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-alert-id' })),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now() })),
    fromDate: vi.fn((date: Date) => ({ toMillis: () => date.getTime() })),
  }
}))

vi.mock('../firebase', () => ({
  db: {},
}))

vi.mock('./audit', () => ({
  logAudit: vi.fn().mockResolvedValue({ success: true, data: {} }).mockResolvedValue({ success: true, data: { id: 'audit-id' } }),
}))

vi.mock('./cashflow')
vi.mock('./payroll')
vi.mock('./snapshot')

describe('alert service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks to avoid errors in tests that don't specificy them
    vi.mocked(cashflowService.getAvailableBalance).mockResolvedValue({
      success: true,
      data: { availableBalance: 5000, totalBalance: 6000, monthlyRecurringExpenses: 1000 }
    })
    vi.mocked(payrollService.getPayslipByMonth).mockResolvedValue({
      success: true,
      data: {
        id: 'p1', year: 2026, month: 5, grossSalary: 3000, netSalary: 2000, irpef: 500,
        inps: 300, tfr: 200, fondoPensione: 100, parsed: true,
        createdAt: {} as unknown as Timestamp,
        updatedAt: {} as unknown as Timestamp
      } as unknown as Payslip
    })
    vi.mocked(snapshotService.listSnapshots).mockResolvedValue([])
  })

  describe('evaluateAlerts', () => {
    it('should generate SALDO_SOTTO_SOGLIA alert if balance < 3000', async () => {
      vi.mocked(cashflowService.getAvailableBalance).mockResolvedValue({
        success: true,
        data: { availableBalance: 2500, totalBalance: 3500, monthlyRecurringExpenses: 1000 }
      })

      const { getDocs } = await import('firebase/firestore')
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as unknown as QuerySnapshot<unknown, DocumentData>)

      const result = await evaluateAlerts('user123')

      expect(result.success).toBe(true)
      const alerts = result.success ? result.data : []
      expect(alerts.some(a => a.type === 'SALDO_SOTTO_SOGLIA' && a.severity === 'critical')).toBe(true)
    })

    it('should NOT generate SALDO_SOTTO_SOGLIA alert if balance >= 3000', async () => {
      vi.mocked(cashflowService.getAvailableBalance).mockResolvedValue({
        success: true,
        data: { availableBalance: 3500, totalBalance: 4500, monthlyRecurringExpenses: 1000 }
      })

      const { getDocs } = await import('firebase/firestore')
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as unknown as QuerySnapshot<unknown, DocumentData>)

      const result = await evaluateAlerts('user123')

      expect(result.success).toBe(true)
      const alerts = result.success ? result.data : []
      expect(alerts.some(a => a.type === 'SALDO_SOTTO_SOGLIA')).toBe(false)
    })

    it('should generate CEDOLINO_MANCANTE alert after the 10th of the month if missing', async () => {
      // Mock Date to be after 10th
      const mockDate = new Date(2026, 4, 15) // May 15th
      vi.useFakeTimers()
      vi.setSystemTime(mockDate)

      vi.mocked(payrollService.getPayslipByMonth).mockResolvedValue({
        success: false,
        error: 'Not found'
      } as unknown as ApiResult<Payslip>)

      const { getDocs } = await import('firebase/firestore')
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as unknown as QuerySnapshot<unknown, DocumentData>)

      const result = await evaluateAlerts('user123')

      expect(result.success).toBe(true)
      const alerts = result.success ? result.data : []
      expect(alerts.some(a => a.type === 'CEDOLINO_MANCANTE' && a.severity === 'warning')).toBe(true)

      vi.useRealTimers()
    })

    it('should generate PATRIMONIO_VARIAZIONE alert if variation > 10%', async () => {
        const mockSnapshots = [
            { id: '2026-05', year: 2026, month: 5, patrimonioNetto: 120000 },
            { id: '2026-04', year: 2026, month: 4, patrimonioNetto: 100000 },
        ] as PatrimonioSnapshot[]
        vi.mocked(snapshotService.listSnapshots).mockResolvedValue(mockSnapshots)
        vi.mocked(snapshotService.computeDeltas).mockReturnValue([
            { ...mockSnapshots[0], delta: 20000 },
            { ...mockSnapshots[1], delta: 0 },
        ])

        const { getDocs } = await import('firebase/firestore')
        vi.mocked(getDocs).mockResolvedValue({ docs: [] } as unknown as QuerySnapshot<unknown, DocumentData>)

        const result = await evaluateAlerts('user123')

        expect(result.success).toBe(true)
        const alerts = result.success ? result.data : []
        expect(alerts.some(a => a.type === 'PATRIMONIO_VARIAZIONE' && a.severity === 'warning')).toBe(true)
    })
  })

  describe('markAlertRead', () => {
    it('should update read flag and log audit', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore')
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ type: 'SALDO_SOTTO_SOGLIA', read: false })
      } as unknown as DocumentSnapshot<unknown, DocumentData>)

      const result = await markAlertRead('user123', 'alert123')

      expect(result.success).toBe(true)
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ read: true }))
    })
  })

  describe('snoozeAlert', () => {
    it('should update snoozedUntil and log audit', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore')
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ type: 'SALDO_SOTTO_SOGLIA', read: false })
      } as unknown as DocumentSnapshot<unknown, DocumentData>)

      const result = await snoozeAlert('user123', 'alert123', 7)

      expect(result.success).toBe(true)
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          snoozedUntil: expect.anything()
        })
      )
    })
  })

  describe('getActiveAlerts', () => {
    it('should return only non-read and non-snoozed alerts', async () => {
      const { getDocs, Timestamp: FSTimestampValue } = await import('firebase/firestore')

      const now = Date.now()
      const future = now + 1000000
      const past = now - 1000000

      const mockAlerts: FinancialAlert[] = [
        { id: 'a1', type: 'SALDO_SOTTO_SOGLIA', read: false, createdAt: {} as unknown as Timestamp, updatedAt: {} as unknown as Timestamp, severity: 'critical', message: 'test' },
        { id: 'a2', type: 'CEDOLINO_MANCANTE', read: false, snoozedUntil: { toMillis: () => future } as unknown as Timestamp, createdAt: {} as unknown as Timestamp, updatedAt: {} as unknown as Timestamp, severity: 'warning', message: 'test' },
        { id: 'a3', type: 'MESE_NON_CHIUSO', read: false, snoozedUntil: { toMillis: () => past } as unknown as Timestamp, createdAt: {} as unknown as Timestamp, updatedAt: {} as unknown as Timestamp, severity: 'info', message: 'test' },
      ]

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockAlerts.map(a => ({ id: a.id, data: () => a }))
      } as unknown as QuerySnapshot<unknown, DocumentData>)

      // Mock Timestamp.now to return current time
      const mockNowVal = { toMillis: () => now } as unknown as Timestamp

      interface MockNow { mockReturnValue: (v: unknown) => void }
      interface MockTS { now: () => MockNow }
      const mockFSTimestamp = FSTimestampValue as unknown as MockTS
      if (mockFSTimestamp.now && typeof mockFSTimestamp.now === 'function') {
        const nowMock = mockFSTimestamp.now()
        if (nowMock && typeof nowMock.mockReturnValue === 'function') {
          nowMock.mockReturnValue(mockNowVal)
        }
      }

      const result = await getActiveAlerts('user123')

      expect(result.success).toBe(true)
      const alerts = result.success ? result.data : []
      expect(alerts.length).toBe(2)
      expect(alerts.some(a => a.id === 'a1')).toBe(true)
      expect(alerts.some(a => a.id === 'a3')).toBe(true)
      expect(alerts.some(a => a.id === 'a2')).toBe(false)
    })
  })
})
