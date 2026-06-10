/**
 * Test: kindergartenPac.ts
 *
 * Verifica:
 * 1. CRUD su users/{uid}/kindergarten_pacs
 * 2. Calcolo KPI PAC autonomi
 * 3. Segregazione: path usa kindergarten_pacs, non pacs
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { KindergartenPAC } from '../types/kindergarten'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('./audit', () => ({
  logAudit: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  logCreate: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  logChange: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  logDelete: vi.fn(() => Promise.resolve({ success: true, data: {} })),
}))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  doc: vi.fn((_col: unknown, id: string) => ({ id })),
  getDocs: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => true, data: () => ({}) })),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn((col: unknown) => col),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _isServerTimestamp: true })),
}))

import {
  getKindergartenPACs,
  addKindergartenPAC,
  updateKindergartenPAC,
  deleteKindergartenPAC,
  calculateKindergartenPACKPIs,
} from './kindergartenPac'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, orderBy, getDoc, type DocumentSnapshot } from 'firebase/firestore'
import { logAudit } from './audit'

const UID = 'test-uid-456'

const mockPAC: KindergartenPAC = {
  id: 'pac-001',
  name: 'PAC Figlio 1',
  ticker: 'VWCE',
  monthlyAmount: 200,
  startDate: '2023-01-01',
  targetYears: 18,
  totalInvested: 2400,
  currentValue: 2600,
  notes: 'Piano accumulo lungo termine',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('kindergartenPac service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('usa la collection kindergarten_pacs, non pacs', async () => {
    const mockCol = vi.mocked(collection)
    const mockGetDocs = vi.mocked(getDocs)
    mockCol.mockReturnValue({ path: 'users/uid/kindergarten_pacs' } as unknown as never)
    mockGetDocs.mockResolvedValue({ docs: [] } as unknown as never)

    await getKindergartenPACs(UID)

    const callArgs = mockCol.mock.calls[0]
    expect(callArgs).toContain('kindergarten_pacs')
    expect(callArgs).not.toContain('pacs')
  })

  it('getKindergartenPACs: usa ordinamento corretto e stabile', async () => {
    vi.mocked(collection).mockReturnValue({} as unknown as never)
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as unknown as never)

    await getKindergartenPACs(UID)

    expect(orderBy).toHaveBeenCalledWith('startDate', 'asc')
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc')
  })

  it('getKindergartenPACs: ritorna lista PAC', async () => {
    vi.mocked(collection).mockReturnValue({} as unknown as never)
    vi.mocked(getDocs).mockResolvedValue({
      docs: [{ id: 'pac-001', data: () => ({ ...mockPAC, id: undefined }) }],
    } as unknown as never)

    const result = await getKindergartenPACs(UID)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('PAC Figlio 1')
    }
  })

  it('getKindergartenPACs: gestisce errore Firestore', async () => {
    vi.mocked(collection).mockReturnValue({} as unknown as never)
    vi.mocked(getDocs).mockRejectedValue(new Error('Timeout'))

    const result = await getKindergartenPACs(UID)
    expect(result.success).toBe(false)
  })

  it('addKindergartenPAC: aggiunge, ritorna id e logga audit', async () => {
    vi.mocked(collection).mockReturnValue({} as unknown as never)
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-pac-id' } as unknown as never)

    const { id: _id, createdAt: _c, updatedAt: _u, ...payload } = mockPAC
    const result = await addKindergartenPAC(UID, payload)

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('new-pac-id')
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'create',
      entityType: 'investment',
      entityId: 'new-pac-id'
    }))
  })

  it('updateKindergartenPAC: aggiorna il documento e logga audit', async () => {
    vi.mocked(collection).mockReturnValue({} as unknown as never)
    vi.mocked(updateDoc).mockResolvedValue(undefined)
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ name: 'Old PAC' })
    } as unknown as DocumentSnapshot)

    const result = await updateKindergartenPAC(UID, 'pac-001', { currentValue: 2800 })
    expect(result.success).toBe(true)
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'update',
      entityType: 'investment',
      entityId: 'pac-001'
    }))
  })

  it('deleteKindergartenPAC: elimina il documento e logga audit', async () => {
    vi.mocked(collection).mockReturnValue({} as unknown as never)
    vi.mocked(deleteDoc).mockResolvedValue(undefined)
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ name: 'PAC to delete' })
    } as unknown as DocumentSnapshot)

    const result = await deleteKindergartenPAC(UID, 'pac-001')
    expect(result.success).toBe(true)
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'delete',
      entityType: 'investment',
      entityId: 'pac-001'
    }))
  })

  describe('calculateKindergartenPACKPIs', () => {
    it('calcola totalPACInvested, totalPACValue, pacGainLoss, pacGainLossPercent', () => {
      const pacs: KindergartenPAC[] = [
        { ...mockPAC, totalInvested: 2400, currentValue: 2600 },
        { ...mockPAC, id: 'pac-002', totalInvested: 1200, currentValue: 1100 },
      ]
      const kpi = calculateKindergartenPACKPIs(pacs)
      expect(kpi.totalPACInvested).toBe(3600)
      expect(kpi.totalPACValue).toBe(3700)
      expect(kpi.pacGainLoss).toBe(100)
      expect(kpi.pacGainLossPercent).toBeCloseTo(2.78, 1)
    })

    it('ritorna zero percent se totalPACInvested è 0', () => {
      const kpi = calculateKindergartenPACKPIs([])
      expect(kpi.pacGainLossPercent).toBe(0)
    })

    it('ritorna zero per lista vuota', () => {
      const kpi = calculateKindergartenPACKPIs([])
      expect(kpi.totalPACInvested).toBe(0)
      expect(kpi.totalPACValue).toBe(0)
    })
  })
})
