import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  captureNetWorthSnapshot,
  getNetWorthHistory,
  getLatestNetWorth
} from './netWorth'
import * as firestore from 'firebase/firestore'
import { logAudit } from './audit'
import * as cashflowService from './cashflow'
import * as investmentService from './investment'
import * as mutuoService from './mutuo'
import * as previdenzaService from './previdenza'

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
  limit: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({})),
  Timestamp: {
    now: vi.fn(() => ({ seconds: 1623321600, nanoseconds: 0 })),
    fromDate: vi.fn((date: Date) => ({
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
      toDate: () => date
    })),
  },
}))

vi.mock('../firebase', () => ({
  db: {}
}))

vi.mock('./audit', () => ({
  logAudit: vi.fn(),
}))

vi.mock('./cashflow', () => ({
  getAccounts: vi.fn(),
}))

vi.mock('./investment', () => ({
  getAllInvestments: vi.fn(),
}))

vi.mock('./mutuo', () => ({
  getMutuoConfig: vi.fn(),
}))

vi.mock('./previdenza', () => ({
  getAllPensionFunds: vi.fn(),
}))

describe('Net Worth Service', () => {
  const uid = 'test-user'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('captureNetWorthSnapshot', () => {
    it('calcola e salva correttamente lo snapshot', async () => {
      // Mock Accounts
      vi.mocked(cashflowService.getAccounts).mockResolvedValue({
        success: true,
        data: [
          { id: 'acc1', currentBalance: 1000 },
          { id: 'acc2', currentBalance: 500 }
        ] as unknown as never
      })

      // Mock Investments
      vi.mocked(investmentService.getAllInvestments).mockResolvedValue({
        success: true,
        data: [
          { id: 'inv1', assetClass: 'azioni', currentValue: 2000, isPac: false },
          { id: 'inv2', assetClass: 'etf', currentValue: 3000, isPac: true },
          { id: 'inv3', assetClass: 'immobili', currentValue: 200000, isPac: false }
        ] as unknown as never
      })

      // Mock Mutuo
      vi.mocked(mutuoService.getMutuoConfig).mockResolvedValue({
        success: true,
        data: { debitoResiduo: 50000 } as unknown as never
      })

      // Mock Previdenza
      vi.mocked(previdenzaService.getAllPensionFunds).mockResolvedValue({
        success: true,
        data: [
          { id: 'fund1', saldoAttuale: 10000 }
        ] as unknown as never
      })

      // Mock Latest Snapshot (per variazione)
      vi.mocked(firestore.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: '2026-5',
            data: () => ({ netWorth: 160000, date: { toDate: () => new Date() } })
          }
        ]
      } as unknown as never)

      const res = await captureNetWorthSnapshot(uid)

      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.assets.liquidita).toBe(1500)
        expect(res.data.assets.investimenti).toBe(2000)
        expect(res.data.assets.pac).toBe(3000)
        expect(res.data.assets.immobili).toBe(200000)
        expect(res.data.assets.previdenza).toBe(10000)
        expect(res.data.liabilities.mutuo).toBe(50000)
        expect(res.data.netWorth).toBe(166500) // 216500 - 50000
        expect(res.data.netWorthVariation).toBe(6500) // 166500 - 160000
      }

      expect(firestore.setDoc).toHaveBeenCalled()
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'snapshot',
        entityType: 'netWorthSnapshot'
      }))
    })

    it('gestisce l\'assenza di dati dai servizi', async () => {
      vi.mocked(cashflowService.getAccounts).mockResolvedValue({ success: true, data: [] })
      vi.mocked(investmentService.getAllInvestments).mockResolvedValue({ success: true, data: [] })
      vi.mocked(mutuoService.getMutuoConfig).mockResolvedValue({ success: false, error: 'Not found' })
      vi.mocked(previdenzaService.getAllPensionFunds).mockResolvedValue({ success: true, data: [] })
      vi.mocked(firestore.getDocs).mockResolvedValue({ empty: true } as unknown as never)

      const res = await captureNetWorthSnapshot(uid)

      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.netWorth).toBe(0)
        expect(res.data.netWorthVariation).toBe(0)
      }
    })
  })

  describe('getNetWorthHistory', () => {
    it('recupera lo storico snapshot in ordine cronologico', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [
          { id: '2026-6', data: () => ({ year: 2026, month: 6, netWorth: 1000 }) },
          { id: '2026-5', data: () => ({ year: 2026, month: 5, netWorth: 900 }) }
        ]
      } as unknown as never)

      const res = await getNetWorthHistory(uid)

      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data).toHaveLength(2)
        // reverse() in getNetWorthHistory
        expect(res.data[0].month).toBe(5)
        expect(res.data[1].month).toBe(6)
      }
    })
  })

  describe('getLatestNetWorth', () => {
    it('recupera lo snapshot più recente', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          { id: '2026-6', data: () => ({ netWorth: 1000 }) }
        ]
      } as unknown as never)

      const res = await getLatestNetWorth(uid)

      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data?.netWorth).toBe(1000)
      }
    })

    it('restituisce null se non ci sono snapshot', async () => {
      vi.mocked(firestore.getDocs).mockResolvedValue({ empty: true } as unknown as never)
      const res = await getLatestNetWorth(uid)
      expect(res.success).toBe(true)
      expect(res.data).toBeNull()
    })
  })
})
