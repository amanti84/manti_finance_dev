/**
 * Test: kindergartenPac.ts
 *
 * Verifica:
 * 1. CRUD su users/{uid}/kindergarten_pacs
 * 2. Calcolo KPI PAC autonomi
 * 3. Segregazione: path NON usa la collection pacs del main
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { KindergartenPAC } from '../types/kindergarten'

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
  getKindergartenPacs,
  addKindergartenPac,
  updateKindergartenPac,
  deleteKindergartenPac,
  calculateKindergartenPacKPIs,
} from './kindergartenPac'
import { collection, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'

const UID = 'test-uid-456'

const mockPAC: KindergartenPAC = {
  id: 'pac-001',
  name: 'PAC Figlio 1',
  isin: 'IE00B3RBWM25',
  monthlyAmount: 200,
  startDate: '2023-01-01',
  totalInvested: 2400,
  currentValue: 2600,
  notes: 'Piano accumulo lungo termine',
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('kindergartenPac service', () => {
  beforeEach(() => vi.clearAllMocks())

  // ----------------------------------------------------------------
  // SEGREGAZIONE: verifica path collection
  // ----------------------------------------------------------------
  it('usa la collection kindergarten_pacs, non pacs', () => {
    ;(collection as ReturnType<typeof vi.fn>).mockReturnValue({ path: 'users/uid/kindergarten_pacs' })
    ;(getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({ docs: [] })

    getKindergartenPacs(UID)

    const callArgs = (collection as ReturnType<typeof vi.fn>).mock.calls[0] as unknown[]
    expect(callArgs).toContain('kindergarten_pacs')
    expect(callArgs).not.toContain('pacs') // NON la collection main
  })

  // ----------------------------------------------------------------
  // READ
  // ----------------------------------------------------------------
  it('getKindergartenPacs: ritorna lista PAC', async () => {
    ;(collection as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({
      docs: [{ id: 'pac-001', data: () => ({ ...mockPAC, id: undefined }) }],
    })

    const result = await getKindergartenPacs(UID)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].isin).toBe('IE00B3RBWM25')
    }
  })

  it('getKindergartenPacs: gestisce errore Firestore', async () => {
    ;(collection as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Timeout'))

    const result = await getKindergartenPacs(UID)
    expect(result.success).toBe(false)
  })

  // ----------------------------------------------------------------
  // CREATE
  // ----------------------------------------------------------------
  it('addKindergartenPac: aggiunge e ritorna id', async () => {
    ;(collection as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(addDoc as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-pac-id' })

    const { id: _id, createdAt: _c, updatedAt: _u, ...payload } = mockPAC
    const result = await addKindergartenPac(UID, payload)

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('new-pac-id')
  })

  // ----------------------------------------------------------------
  // UPDATE
  // ----------------------------------------------------------------
  it('updateKindergartenPac: aggiorna il documento', async () => {
    ;(collection as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(updateDoc as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const result = await updateKindergartenPac(UID, 'pac-001', { currentValue: 2800 })
    expect(result.success).toBe(true)
  })

  // ----------------------------------------------------------------
  // DELETE
  // ----------------------------------------------------------------
  it('deleteKindergartenPac: elimina il documento', async () => {
    ;(collection as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(deleteDoc as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const result = await deleteKindergartenPac(UID, 'pac-001')
    expect(result.success).toBe(true)
  })

  // ----------------------------------------------------------------
  // KPI CALC
  // ----------------------------------------------------------------
  describe('calculateKindergartenPacKPIs', () => {
    it('calcola totalPACInvested, totalPACValue, gainLoss, gainLossPercent', () => {
      const pacs: KindergartenPAC[] = [
        { ...mockPAC, totalInvested: 2400, currentValue: 2600 },
        { ...mockPAC, id: 'pac-002', totalInvested: 1200, currentValue: 1100 },
      ]
      const kpi = calculateKindergartenPacKPIs(pacs)
      expect(kpi.totalPACInvested).toBe(3600)
      expect(kpi.totalPACValue).toBe(3700)
      expect(kpi.totalPACGainLoss).toBe(100)
      expect(kpi.totalPACGainLossPercent).toBeCloseTo(2.78, 1)
    })

    it('ritorna zero percent se totalPACInvested è 0', () => {
      const kpi = calculateKindergartenPacKPIs([])
      expect(kpi.totalPACGainLossPercent).toBe(0)
    })

    it('ritorna zero per lista vuota', () => {
      const kpi = calculateKindergartenPacKPIs([])
      expect(kpi.totalPACInvested).toBe(0)
      expect(kpi.totalPACValue).toBe(0)
    })
  })
})
