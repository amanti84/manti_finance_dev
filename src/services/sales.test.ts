import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateSale,
  recordSale,
  getAnnualTaxSummary
} from './sales'
import * as firestore from 'firebase/firestore'
import { logAudit } from './audit'
import type { Investment, SaleRecord } from '../types'

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

describe('Sales Service', () => {
  const uid = 'test-user'
  const mockInvestment: Investment = {
    id: 'inv-1',
    name: 'Apple',
    isin: 'US0378331005',
    ticker: 'AAPL',
    assetClass: 'azioni',
    broker: 'directa',
    quantity: 10,
    avgCost: 150,
    currentPrice: 200,
    currentValue: 2000,
    currency: 'EUR',
    isPac: false,
    lastPriceUpdate: { seconds: 1623321600, nanoseconds: 0 } as unknown as firestore.Timestamp,
    createdAt: { seconds: 1623321600, nanoseconds: 0 } as unknown as firestore.Timestamp,
    updatedAt: { seconds: 1623321600, nanoseconds: 0 } as unknown as firestore.Timestamp,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateSale', () => {
    it('calcola correttamente plusvalenza senza minusvalenze', async () => {
      // Mock wallet vuoto
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false
      } as unknown as firestore.DocumentSnapshot<unknown, firestore.DocumentData>)

      const res = await calculateSale(mockInvestment, 200, 5, uid)

      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.grossGain).toBe(250) // (200 - 150) * 5
        expect(res.data.taxableGain).toBe(250)
        expect(res.data.taxAmount).toBe(65) // 250 * 0.26
        expect(res.data.netProceeds).toBe(935) // 1000 - 65
        expect(res.data.isLoss).toBe(false)
      }
    })

    it('calcola correttamente plusvalenza con compensazione minusvalenze', async () => {
      // Mock wallet con 100€ di minus
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        id: 'taxWallet',
        data: () => ({
          totalAvailableLosses: 100,
          lossItems: [{ amount: 100, year: 2024, expiryYear: 2028 }]
        })
      } as unknown as firestore.DocumentSnapshot<unknown, firestore.DocumentData>)

      const res = await calculateSale(mockInvestment, 200, 5, uid)

      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.grossGain).toBe(250)
        expect(res.data.taxableGain).toBe(150) // 250 - 100
        expect(res.data.taxAmount).toBe(39) // 150 * 0.26
        expect(res.data.netProceeds).toBe(961) // 1000 - 39
      }
    })

    it('gestisce una vendita in perdita', async () => {
      const res = await calculateSale(mockInvestment, 100, 5, uid)

      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.grossGain).toBe(-250) // (100 - 150) * 5
        expect(res.data.isLoss).toBe(true)
        expect(res.data.taxAmount).toBe(0)
        expect(res.data.netProceeds).toBe(500)
      }
    })
  })

  describe('recordSale', () => {
    it('registra correttamente una vendita in profitto e consuma minusvalenze', async () => {
      // Mock investimento
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'inv-1',
        data: () => mockInvestment
      } as unknown as firestore.DocumentSnapshot<unknown, firestore.DocumentData>)
      // Mock wallet
      .mockResolvedValueOnce({
        exists: () => true,
        id: 'taxWallet',
        data: () => ({
          totalAvailableLosses: 100,
          lossItems: [{ amount: 100, year: 2024, expiryYear: 2028 }]
        })
      } as unknown as firestore.DocumentSnapshot<unknown, firestore.DocumentData>)

      vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'sale-1' } as unknown as firestore.DocumentReference<unknown, firestore.DocumentData>)

      const res = await recordSale(uid, 'inv-1', 200, 5, new Date(2025, 5, 10))

      expect(res.success).toBe(true)
      expect(firestore.updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        quantity: 5
      }))
      expect(firestore.addDoc).toHaveBeenCalled()
      expect(firestore.setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        totalAvailableLosses: 0 // Tutte consumate
      }))
      expect(logAudit).toHaveBeenCalled()
    })

    it('registra una vendita in perdita e aggiorna lo zainetto fiscale', async () => {
        vi.mocked(firestore.getDoc).mockResolvedValueOnce({
          exists: () => true,
          id: 'inv-1',
          data: () => mockInvestment
        } as unknown as firestore.DocumentSnapshot<unknown, firestore.DocumentData>)
        .mockResolvedValueOnce({
          exists: () => false
        } as unknown as firestore.DocumentSnapshot<unknown, firestore.DocumentData>)

        vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'sale-2' } as unknown as firestore.DocumentReference<unknown, firestore.DocumentData>)

        const res = await recordSale(uid, 'inv-1', 100, 5, new Date(2025, 5, 10))

        expect(res.success).toBe(true)
        expect(firestore.setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          totalAvailableLosses: 250
        }))
      })

    it('ritorna errore se quantità insufficiente', async () => {
        vi.mocked(firestore.getDoc).mockResolvedValue({
          exists: () => true,
          id: 'inv-1',
          data: () => mockInvestment
        } as unknown as firestore.DocumentSnapshot<unknown, firestore.DocumentData>)

        const res = await recordSale(uid, 'inv-1', 200, 20, new Date())
        expect(res.success).toBe(false)
        expect(res.error).toBe('Quantità insufficiente')
    })
  })

  describe('Reporting', () => {
    it('getAnnualTaxSummary calcola i totali correttamente', async () => {
      const mockSales: Partial<SaleRecord>[] = [
        { grossGain: 200, taxableGain: 200, taxAmount: 52, isLoss: false },
        { grossGain: -100, taxableGain: 0, taxAmount: 0, isLoss: true }
      ]

      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: mockSales.map(s => ({ data: () => s }))
      } as unknown as firestore.QuerySnapshot<unknown, firestore.DocumentData>)

      const res = await getAnnualTaxSummary(uid, 2025)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.totalGrossGain).toBe(200)
        expect(res.data.totalTaxPaid).toBe(52)
        expect(res.data.totalLossesRealized).toBe(100)
      }
    })
  })
})
