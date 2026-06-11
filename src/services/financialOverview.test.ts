import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getMonthlyOverview,
  getFixedExpenses,
  saveFixedExpense,
  deleteFixedExpense,
  getAnnualStats,
  getTrend
} from './financialOverview'
import * as firestore from 'firebase/firestore'
import { logAudit } from './audit'
import * as payrollService from './payroll'
import * as mutuoService from './mutuo'
import * as investmentService from './investment'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn((_db: unknown, path: string) => ({ path })),
  doc: vi.fn((_db: unknown, path: string, id?: string) => ({ path: id ? `${path}/${id}` : path })),
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({})),
  Timestamp: {
    now: vi.fn(() => ({ seconds: 1623321600, nanoseconds: 0 })),
    fromDate: vi.fn((date: Date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 })),
  },
}))

vi.mock('../firebase', () => ({
  db: {}
}))

vi.mock('./audit', () => ({
  logAudit: vi.fn(),
}))

vi.mock('./payroll', () => ({
  getPayslipByMonth: vi.fn(),
  getPayslipsByYear: vi.fn(),
}))

vi.mock('./mutuo', () => ({
  getMutuoConfig: vi.fn(),
}))

vi.mock('./investment', () => ({
  getAllInvestments: vi.fn(),
}))

describe('Financial Overview Service', () => {
  const uid = 'test-user'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMonthlyOverview', () => {
    it('calcola correttamente il surplus mensile con tutti i dati', async () => {
      // Mock Cedolino
      vi.mocked(payrollService.getPayslipByMonth).mockResolvedValue({
        success: true,
        data: { netSalary: 2500, fondoPensione: 100 } as unknown as never
      })

      // Mock Mutuo
      vi.mocked(mutuoService.getMutuoConfig).mockResolvedValue({
        success: true,
        data: { rataMensile: 800 } as unknown as never
      })

      // Mock Investimenti (PAC)
      vi.mocked(investmentService.getAllInvestments).mockResolvedValue({
        success: true,
        data: [
          { isPac: true, pacMonthlyAmount: 200 },
          { isPac: false, currentValue: 5000 }
        ] as unknown as never
      })

      // Mock Uscite Manuali
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [
          { id: 'exp-1', data: () => ({ label: 'Affitto', amount: 500, frequency: 'monthly' }) }
        ]
      } as unknown as never)

      const res = await getMonthlyOverview(uid, 2026, 6)

      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.netIncome).toBe(2500)
        expect(res.data.fixedExpensesAuto).toBe(1100) // 800 (mutuo) + 200 (PAC) + 100 (pensione)
        expect(res.data.fixedExpensesManual).toBe(500)
        expect(res.data.estimatedSurplus).toBe(900) // 2500 - 1100 - 500
        expect(res.data.dataComplete).toBe(true)
      }
    })

    it('gestisce dati mancanti del cedolino', async () => {
      vi.mocked(payrollService.getPayslipByMonth).mockResolvedValue({
        success: false,
        error: 'Not found'
      })
      vi.mocked(mutuoService.getMutuoConfig).mockResolvedValue({ success: true, data: { rataMensile: 800 } as unknown as never })
      vi.mocked(investmentService.getAllInvestments).mockResolvedValue({ success: true, data: [] })
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: [] } as unknown as never)

      const res = await getMonthlyOverview(uid, 2026, 6)

      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.netIncome).toBe(0)
        expect(res.data.dataComplete).toBe(false)
        expect(res.data.estimatedSurplus).toBe(-800)
      }
    })
  })

  describe('Fixed Expenses CRUD', () => {
    it('recupera le spese fisse', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [
          { id: '1', data: () => ({ label: 'Internet', amount: 30, frequency: 'monthly' }) }
        ]
      } as unknown as never)

      const res = await getFixedExpenses(uid)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toHaveLength(1)
        expect(res.data[0].label).toBe('Internet')
      }
    })

    it('crea una nuova spesa fissa', async () => {
      vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'new-id' } as unknown as never)

      const res = await saveFixedExpense(uid, {
        label: 'Netflix',
        amount: 15,
        frequency: 'monthly'
      })

      expect(res.success).toBe(true)
      expect(res.data).toBe('new-id')
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'create',
        entityType: 'fixedExpense'
      }))
    })

    it('elimina una spesa fissa', async () => {
      const res = await deleteFixedExpense(uid, 'target-id')
      expect(res.success).toBe(true)
      expect(firestore.deleteDoc).toHaveBeenCalled()
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'delete'
      }))
    })
  })

  describe('Reporting', () => {
    it('getAnnualStats calcola correttamente i totali annuali', async () => {
      // Mock payroll
      vi.mocked(payrollService.getPayslipsByYear).mockResolvedValue({
        success: true,
        data: [{ id: 'p1' }] as unknown as never
      })
      vi.mocked(payrollService.getPayslipByMonth).mockResolvedValue({
        success: true,
        data: { netSalary: 2000, fondoPensione: 0 } as unknown as never
      })

      // Mock Mutuo
      vi.mocked(mutuoService.getMutuoConfig).mockResolvedValue({ success: true, data: { rataMensile: 500 } as unknown as never })

      // Mock Investimenti
      vi.mocked(investmentService.getAllInvestments).mockResolvedValue({ success: true, data: [] })

      // Mock PAC payments (firestore query)
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        docs: [
          { data: () => ({ importo: 100 }) },
          { data: () => ({ importo: 100 }) }
        ]
      } as unknown as never) // PAC payments
      .mockResolvedValue({ docs: [] } as unknown as never) // manual expenses

      const res = await getAnnualStats(uid, 2026)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.totalInvested).toBe(200)
        expect(res.data.savingsRate).toBe(0.75) // (2000 - 500) / 2000 = 0.75
      }
    })

    it('getTrend restituisce la serie temporale', async () => {
       // Mock basics for getMonthlyOverview
       vi.mocked(payrollService.getPayslipByMonth).mockResolvedValue({
        success: true,
        data: { netSalary: 2000, fondoPensione: 0 } as unknown as never
      })
      vi.mocked(mutuoService.getMutuoConfig).mockResolvedValue({ success: true, data: { rataMensile: 500 } as unknown as never })
      vi.mocked(investmentService.getAllInvestments).mockResolvedValue({ success: true, data: [] })
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: [] } as unknown as never)

      const res = await getTrend(uid, 3)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toHaveLength(3)
        expect(res.data[0].netIncome).toBe(2000)
      }
    })
  })
})
