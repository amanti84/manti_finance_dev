/**
 * Test: kindergartenInvestment.ts
 *
 * Verifica:
 * 1. CRUD su users/{uid}/kindergarten_investments
 * 2. Calcolo KPI patrimoniali autonomi
 * 3. Segregazione: collection path usa kindergarten_investments, non investments
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { KindergartenInvestment } from '../types/kindergarten'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...path) => ({ path: path.join('/') })),
  doc: vi.fn((_col, id) => ({ id })),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(col => col),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _isServerTimestamp: true })),
}))

import {
  getKindergartenInvestments,
  addKindergartenInvestment,
  updateKindergartenInvestment,
  deleteKindergartenInvestment,
  calculateKindergartenInvestmentKPIs,
} from './kindergartenInvestment'
import { collection, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'

const UID = 'test-uid-123'

const mockInvestment: KindergartenInvestment = {
  id: 'inv-001',
  name: 'ETF World Junior',
  ticker: 'VWCE',
  category: 'etf',
  quantity: 10,
  purchasePrice: 100,
  currentPrice: 120,
  purchaseDate: '2024-01-15',
  notes: 'PAC mensile figli',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('kindergartenInvestment service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('usa la collection kindergarten_investments, non investments', () => {
    ;(collection as ReturnType<typeof vi.fn>).mockReturnValue({ path: 'users/uid/kindergarten_investments' })
    ;(getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({ docs: [] })

    getKindergartenInvestments(UID)

    const callArgs = (collection as ReturnType<typeof vi.fn>).mock.calls[0] as unknown[]
    expect(callArgs).toContain('kindergarten_investments')
    expect(callArgs).not.toContain('investments')
  })

  it('include uid nel path della collection', () => {
    ;(collection as ReturnType<typeof vi.fn>).mockReturnValue({ path: `users/${UID}/kindergarten_investments` })
    ;(getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({ docs: [] })

    getKindergartenInvestments(UID)

    const callArgs = (collection as ReturnType<typeof vi.fn>).mock.calls[0] as unknown[]
    expect(callArgs).toContain(UID)
  })

  it('getKindergartenInvestments: ritorna lista investimenti', async () => {
    ;(collection as ReturnType<typeof vi.fn>).mockReturnValue({ path: 'users/uid/kindergarten_investments' })
    ;(getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
      docs: [{ id: 'inv-001', data: () => ({ ...mockInvestment, id: undefined }) }],
    })

    const result = await getKindergartenInvestments(UID)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].ticker).toBe('VWCE')
    }
  })

  it('getKindergartenInvestments: gestisce errore Firestore', async () => {
    ;(collection as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

    const result = await getKindergartenInvestments(UID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Network error')
    }
  })

  it('addKindergartenInvestment: aggiunge e ritorna id', async () => {
    ;(collection as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(addDoc as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-inv-id' })

    const { id: _id, createdAt: _c, updatedAt: _u, ...payload } = mockInvestment
    const result = await addKindergartenInvestment(UID, payload)

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('new-inv-id')
  })

  it('updateKindergartenInvestment: aggiorna il documento', async () => {
    ;(collection as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(updateDoc as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const result = await updateKindergartenInvestment(UID, 'inv-001', { currentPrice: 130 })
    expect(result.success).toBe(true)
    const updateCalls = (updateDoc as ReturnType<typeof vi.fn>).mock.calls
    expect(updateCalls).toHaveLength(1)
  })

  it('deleteKindergartenInvestment: elimina il documento', async () => {
    ;(collection as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(deleteDoc as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const result = await deleteKindergartenInvestment(UID, 'inv-001')
    expect(result.success).toBe(true)
  })

  describe('calculateKindergartenInvestmentKPIs', () => {
    it('calcola totalInvested, currentValue, gainLoss, gainLossPercent', () => {
      const investments: KindergartenInvestment[] = [
        { ...mockInvestment, purchasePrice: 100, currentPrice: 120, quantity: 10 },
        { ...mockInvestment, id: 'inv-002', purchasePrice: 200, currentPrice: 180, quantity: 5 },
      ]
      const kpi = calculateKindergartenInvestmentKPIs(investments)
      expect(kpi.totalInvested).toBe(2000)
      expect(kpi.currentValue).toBe(2100)
      expect(kpi.gainLoss).toBe(100)
      expect(kpi.gainLossPercent).toBeCloseTo(5, 1)
    })

    it('ritorna zero percent se totalInvested è 0', () => {
      const kpi = calculateKindergartenInvestmentKPIs([])
      expect(kpi.gainLossPercent).toBe(0)
    })
  })
})
