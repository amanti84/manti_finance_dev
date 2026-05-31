import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { QuerySnapshot, DocumentSnapshot, DocumentReference } from 'firebase/firestore'
import type { Month } from '../types'
import {
  getKindergartenExpenses,
  addKindergartenExpense,
  updateKindergartenExpense,
  deleteKindergartenExpense,
  getKindergartenConfig,
  setKindergartenConfig,
  getKindergartenSummary,
} from './kindergarten'
import {
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
} from 'firebase/firestore'
import { logAudit } from './audit'

// Mock Firebase
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
  serverTimestamp: vi.fn(() => ({})),
  setDoc: vi.fn(),
  getFirestore: vi.fn(),
}))

vi.mock('../firebase', () => ({
  db: {},
}))

vi.mock('./audit', () => ({
  logAudit: vi.fn(),
}))

describe('Kindergarten Service', () => {
  const uid = 'test-user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Expenses CRUD', () => {
    it('should get expenses for a year', async () => {
      const mockDocs = [
        { id: '1', data: () => ({ description: 'Retta Jan', amount: 300, year: 2024, month: 1, category: 'retta' }) },
        { id: '2', data: () => ({ description: 'Mensa Jan', amount: 50, year: 2024, month: 1, category: 'mensa' }) },
      ]
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockDocs,
      } as unknown as QuerySnapshot)

      const result = await getKindergartenExpenses(uid, 2024)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.[0].description).toBe('Retta Jan')
    })

    it('should add a new expense and log audit', async () => {
      const expense = {
        description: 'Retta Feb',
        amount: 300,
        year: 2024,
        month: 2 as Month,
        category: 'retta' as const,
        frequency: 'monthly' as const,
      }
      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'new-id' } as unknown as DocumentReference)
      vi.mocked(getDoc).mockResolvedValueOnce({
        id: 'new-id',
        exists: () => true,
        data: () => ({ ...expense, id: 'new-id' }),
      } as unknown as DocumentSnapshot)

      const result = await addKindergartenExpense(uid, expense)

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('new-id')
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'create',
        entityType: 'kindergartenExpense',
      }))
    })

    it('should update an expense and log audit', async () => {
      const updates = { amount: 350 }
      vi.mocked(getDoc)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ description: 'Retta Jan', amount: 300 }),
        } as unknown as DocumentSnapshot)
        .mockResolvedValueOnce({
          id: '1',
          exists: () => true,
          data: () => ({ description: 'Retta Jan', amount: 350 }),
        } as unknown as DocumentSnapshot)

      const result = await updateKindergartenExpense(uid, '1', updates)

      expect(result.success).toBe(true)
      expect(result.data?.amount).toBe(350)
      expect(updateDoc).toHaveBeenCalled()
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'update',
        entityType: 'kindergartenExpense',
      }))
    })

    it('should delete an expense and log audit', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ description: 'Retta Jan' }),
      } as unknown as DocumentSnapshot)

      const result = await deleteKindergartenExpense(uid, '1')

      expect(result.success).toBe(true)
      expect(deleteDoc).toHaveBeenCalled()
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'delete',
        entityType: 'kindergartenExpense',
      }))
    })
  })

  describe('Config CRUD', () => {
    it('should get config or return default', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as unknown as DocumentSnapshot)

      const result = await getKindergartenConfig(uid)
      expect(result.success).toBe(true)
      expect(result.data?.monthlyBudget).toBe(0)

      const mockConfig = { monthlyBudget: 400, alertOnOverBudget: true }
      vi.mocked(getDoc).mockResolvedValueOnce({
        id: 'kindergarten',
        exists: () => true,
        data: () => mockConfig,
      } as unknown as DocumentSnapshot)

      const result2 = await getKindergartenConfig(uid)
      expect(result2.success).toBe(true)
      expect(result2.data?.monthlyBudget).toBe(400)
    })

    it('should set config and log audit', async () => {
      const newConfig = { monthlyBudget: 500, alertOnOverBudget: true }
      vi.mocked(getDoc)
        .mockResolvedValueOnce({ exists: () => true, data: () => ({ monthlyBudget: 400 }) } as unknown as DocumentSnapshot)
        .mockResolvedValueOnce({ id: 'kindergarten', exists: () => true, data: () => newConfig } as unknown as DocumentSnapshot)

      const result = await setKindergartenConfig(uid, newConfig)

      expect(result.success).toBe(true)
      expect(setDoc).toHaveBeenCalled()
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        entityType: 'kindergartenConfig',
      }))
    })
  })

  describe('Summary calculation', () => {
    it('should calculate summary correctly', async () => {
      const year = 2024
      const mockExpenses = [
        { category: 'retta', amount: 300, year: 2024, month: 1 },
        { category: 'mensa', amount: 50, year: 2024, month: 1 },
        { category: 'retta', amount: 300, year: 2024, month: 2 },
      ]

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockExpenses.map((e, i) => ({ id: String(i), data: () => e })),
      } as unknown as QuerySnapshot)

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ monthlyBudget: 300, alertOnOverBudget: true }),
      } as unknown as DocumentSnapshot)

      // Mock current date to be 2024-01-15
      const mockDate = new Date(2024, 0, 15) // Jan 15
      vi.setSystemTime(mockDate)

      const result = await getKindergartenSummary(uid, year)

      expect(result.success).toBe(true)
      expect(result.data?.totalAnnual).toBe(650)
      expect(result.data?.currentMonthTotal).toBe(350)
      expect(result.data?.isOverBudget).toBe(true)
      expect(result.data?.byCategory.retta).toBe(600)
      expect(result.data?.byCategory.mensa).toBe(50)

      vi.useRealTimers()
    })
  })
})
