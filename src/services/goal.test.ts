import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateGoalProgress, createGoal, listGoals, updateGoalProgress, deleteGoal } from './goal'
import type { QuerySnapshot, DocumentSnapshot, Timestamp, DocumentData } from 'firebase/firestore'
import type { Goal } from '../types'

// -----------------------------------------------------------------------
// MOCK FIREBASE
// -----------------------------------------------------------------------
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'mock-doc-id' })),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-goal-id' })),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date(), toMillis: () => Date.now() })),
    fromDate: vi.fn((date: Date) => ({
      toDate: () => date,
      toMillis: () => date.getTime(),
    })),
  },
}))

vi.mock('../firebase', () => ({
  db: {},
}))

vi.mock('./audit', () => ({
  logAudit: vi.fn().mockResolvedValue({ success: true, data: {} }).mockResolvedValue({ success: true, data: { id: 'audit-id' } }),
}))

const makeTimestamp = (d: Date): Timestamp =>
  ({
    toDate: () => d,
    toMillis: () => d.getTime(),
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    isEqual: () => false,
  }) as unknown as Timestamp

describe('goal service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('calculateGoalProgress', () => {
    const mockGoal: Goal = {
      id: 'g1',
      type: 'PATRIMONIO_TARGET',
      name: 'Test Goal',
      targetAmount: 10000,
      baselineAmount: 0,
      currentAmount: 5000,
      status: 'active',
      targetDate: makeTimestamp(new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)), // 1 year from now
      createdAt: makeTimestamp(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 6)), // 6 months ago
      updatedAt: makeTimestamp(new Date()),
    }

    it('should return 50% progress when halfway to target', () => {
      const progress = calculateGoalProgress(mockGoal)
      expect(progress.progressPercent).toBe(50)
    })

    it('should return correct projectedCompletionDate when on track', () => {
      // 5000 in 6 months -> 10000 in 12 months.
      // Since it started 6 months ago, it should finish in 6 months from now.
      const progress = calculateGoalProgress(mockGoal)
      expect(progress.projectedCompletionDate).toBeDefined()
      if (progress.projectedCompletionDate) {
        const diff = new Date(progress.projectedCompletionDate).getTime() - Date.now()
        const months = diff / (1000 * 60 * 60 * 24 * 30.4375)
        expect(months).toBeCloseTo(6, 0)
      }
      expect(progress.isOnTrack).toBe(true)
    })

    it('should return null projectedCompletionDate when no progress', () => {
      const noProgressGoal = { ...mockGoal, currentAmount: 0 }
      const progress = calculateGoalProgress(noProgressGoal)
      expect(progress.projectedCompletionDate).toBeNull()
      expect(progress.isOnTrack).toBe(false)
    })

    it('should detect milestone 25 when progress >= 25%', () => {
      const g = { ...mockGoal, currentAmount: 2500 }
      const progress = calculateGoalProgress(g)
      expect(progress.milestoneReached).toBe(25)
    })

    it('should detect milestone 50 when progress >= 50%', () => {
      const progress = calculateGoalProgress(mockGoal)
      expect(progress.milestoneReached).toBe(50)
    })

    it('should detect milestone 75 when progress >= 75%', () => {
      const g = { ...mockGoal, currentAmount: 7500 }
      const progress = calculateGoalProgress(g)
      expect(progress.milestoneReached).toBe(75)
    })

    it('should detect milestone 100 when target reached', () => {
      const g = { ...mockGoal, currentAmount: 10000 }
      const progress = calculateGoalProgress(g)
      expect(progress.milestoneReached).toBe(100)
      expect(progress.progressPercent).toBe(100)
    })

    it('should return isOnTrack: false when projected date exceeds targetDate', () => {
      // Slow progress: 1000 in 6 months. Needs 9000 more.
      // Tasso = 1000 / 6 = 166.6/month.
      // Remaining = 9000 / 166.6 = 54 months.
      // Target is in 12 months.
      const slowGoal = { ...mockGoal, currentAmount: 1000 }
      const progress = calculateGoalProgress(slowGoal)
      expect(progress.isOnTrack).toBe(false)
    })
  })

  describe('createGoal', () => {
    it('should create goal in Firestore and call logAudit', async () => {
      const input = {
        type: 'PATRIMONIO_TARGET' as const,
        name: 'Target 100k',
        targetAmount: 100000,
        targetDate: new Date('2030-12-31'),
        baselineAmount: 10000,
      }

      const result = await createGoal('user123', input)

      expect(result.success).toBe(true)
      const { addDoc } = await import('firebase/firestore')
      expect(addDoc).toHaveBeenCalled()
      const { logAudit } = await import('./audit')
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'create',
        entityType: 'goal',
      }))
    })

    it('should return error if Firestore addDoc fails', async () => {
      const { addDoc } = await import('firebase/firestore')
      vi.mocked(addDoc).mockRejectedValueOnce(new Error('Firestore error'))

      const input = {
        type: 'PATRIMONIO_TARGET' as const,
        name: 'Target 100k',
        targetAmount: 100000,
        targetDate: new Date('2030-12-31'),
        baselineAmount: 10000,
      }

      const result = await createGoal('user123', input)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Firestore error')
    })
  })

  describe('listGoals', () => {
    it('should return goals ordered by targetDate ASC', async () => {
      const { getDocs } = await import('firebase/firestore')
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: [
          { id: 'g1', data: () => ({ name: 'Goal 1' }) },
          { id: 'g2', data: () => ({ name: 'Goal 2' }) },
        ],
      } as unknown as QuerySnapshot<unknown, DocumentData>)

      const result = await listGoals('user123')
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
    })
  })

  describe('updateGoalProgress', () => {
    it('should update currentAmount and return updated goal', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore')
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Goal 1', currentAmount: 5000 }),
      } as unknown as DocumentSnapshot<unknown, DocumentData>)

      const result = await updateGoalProgress('user123', 'g1', 6000)
      expect(result.success).toBe(true)
      expect(result.data?.currentAmount).toBe(6000)
      expect(updateDoc).toHaveBeenCalled()
    })
  })

  describe('deleteGoal', () => {
    it('should delete goal and call logAudit', async () => {
      const { getDoc, deleteDoc } = await import('firebase/firestore')
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Goal 1' }),
      } as unknown as DocumentSnapshot<unknown, DocumentData>)

      const result = await deleteGoal('user123', 'g1')
      expect(result.success).toBe(true)
      expect(deleteDoc).toHaveBeenCalled()
      const { logAudit } = await import('./audit')
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'delete',
        entityType: 'goal',
      }))
    })
  })
})
