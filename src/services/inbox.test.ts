import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateBadgeCount,
  createInboxItem,
  listInboxItems,
  updateInboxStatus,
  confirmInboxItem,
  deleteInboxItem,
} from './inbox'
import {
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore'
import type { DocumentReference, QuerySnapshot, DocumentSnapshot, Timestamp } from 'firebase/firestore'
import { logAudit } from './audit'
import type { InboxItem, ConfidenceField } from '../types'

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => ({})),
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now() })),
    fromDate: vi.fn((d: Date) => ({ toMillis: () => d.getTime() })),
  },
}))

// Mock Firebase Init
vi.mock('../firebase', () => ({
  db: {},
}))

// Mock Audit
vi.mock('./audit', () => ({
  logAudit: vi.fn(),
}))

const makeTimestamp = (d: Date): Timestamp =>
  ({
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime(),
    isEqual: () => false,
  }) as unknown as Timestamp

const makeInboxItem = (overrides: Partial<InboxItem> = {}): InboxItem => ({
  id: 'test-item-id',
  documentId: 'doc-id',
  fileName: 'test.pdf',
  status: 'RICEVUTO',
  source: 'upload',
  confidenceFields: [],
  createdAt: makeTimestamp(new Date()),
  updatedAt: makeTimestamp(new Date()),
  ...overrides,
})

describe('inbox service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateBadgeCount', () => {
    it('should return total 0 and requiresReview 0 for empty array', () => {
      const result = calculateBadgeCount([])
      expect(result).toEqual({ total: 0, requiresReview: 0 })
    })

    it('should count only non-terminal items in total', () => {
      const items: InboxItem[] = [
        makeInboxItem({ status: 'RICEVUTO' }),
        makeInboxItem({ status: 'ESTRATTO' }),
        makeInboxItem({ status: 'CONFERMATO' }),
        makeInboxItem({ status: 'ERRORE' }),
      ]
      const result = calculateBadgeCount(items)
      expect(result.total).toBe(2)
    })

    it('should count items with at least one confidence < 80 in requiresReview', () => {
      const fields: ConfidenceField[] = [
        { fieldName: 'f1', extractedValue: 'v1', confidence: 90 },
        { fieldName: 'f2', extractedValue: 'v2', confidence: 70 },
      ]
      const items: InboxItem[] = [
        makeInboxItem({ status: 'RICEVUTO', confidenceFields: fields }),
        makeInboxItem({ status: 'ESTRATTO', confidenceFields: [{ fieldName: 'f3', extractedValue: 'v3', confidence: 85 }] }),
      ]
      const result = calculateBadgeCount(items)
      expect(result.requiresReview).toBe(1)
    })

    it('should not count in requiresReview if all fields confidence >= 80', () => {
      const items: InboxItem[] = [
        makeInboxItem({ status: 'RICEVUTO', confidenceFields: [{ fieldName: 'f1', extractedValue: 'v1', confidence: 80 }] }),
      ]
      const result = calculateBadgeCount(items)
      expect(result.requiresReview).toBe(0)
    })

    it('should not count CONFERMATO items in requiresReview even if low confidence', () => {
      const items: InboxItem[] = [
        makeInboxItem({ status: 'CONFERMATO', confidenceFields: [{ fieldName: 'f1', extractedValue: 'v1', confidence: 10 }] }),
      ]
      const result = calculateBadgeCount(items)
      expect(result.total).toBe(0)
      expect(result.requiresReview).toBe(0)
    })
  })

  describe('createInboxItem', () => {
    it('should create item with status RICEVUTO and call logAudit', async () => {
      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'new-id' } as unknown as DocumentReference)

      const result = await createInboxItem('uid', {
        documentId: 'doc1',
        fileName: 'file1.pdf',
        source: 'upload',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('RICEVUTO')
        expect(result.data.id).toBe('new-id')
      }
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', entityType: 'inboxItem' }))
    })

    it('should set confidenceFields to empty array if not provided', async () => {
      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'new-id' } as unknown as DocumentReference)

      const result = await createInboxItem('uid', {
        documentId: 'doc1',
        fileName: 'file1.pdf',
        source: 'upload',
      })

      if (result.success) {
        expect(result.data.confidenceFields).toEqual([])
      }
    })

    it('should return error if Firestore addDoc fails', async () => {
      vi.mocked(addDoc).mockRejectedValueOnce(new Error('Firestore error'))

      const result = await createInboxItem('uid', {
        documentId: 'doc1',
        fileName: 'file1.pdf',
        source: 'upload',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Firestore error')
    })
  })

  describe('listInboxItems', () => {
    it('should return all items ordered by createdAt DESC', async () => {
      const mockDocs = [
        { id: '1', data: () => makeInboxItem({ id: '1' }) },
        { id: '2', data: () => makeInboxItem({ id: '2' }) },
      ]
      vi.mocked(getDocs).mockResolvedValueOnce({ docs: mockDocs } as unknown as QuerySnapshot)

      const result = await listInboxItems('uid')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0].id).toBe('1')
      }
    })
  })

  describe('updateInboxStatus', () => {
    it('should update status correctly', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => makeInboxItem({ id: 'item1', status: 'RICEVUTO' }),
      } as unknown as DocumentSnapshot)
      vi.mocked(updateDoc).mockResolvedValueOnce(undefined)

      const result = await updateInboxStatus('uid', 'item1', 'ESTRATTO')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('ESTRATTO')
      }
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'update', entityType: 'inboxItem' }))
    })

    it('should save errorMessage when status is ERRORE', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => makeInboxItem({ id: 'item1' }),
      } as unknown as DocumentSnapshot)

      const result = await updateInboxStatus('uid', 'item1', 'ERRORE', 'Something went wrong')

      if (result.success) {
        expect(result.data.errorMessage).toBe('Something went wrong')
      }
    })
  })

  describe('confirmInboxItem', () => {
    it('should update confirmedValue for each field and set status CONFERMATO', async () => {
      const initialFields: ConfidenceField[] = [
        { fieldName: 'salary', extractedValue: 2000, confidence: 70 },
      ]
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => makeInboxItem({ id: 'item1', confidenceFields: initialFields }),
      } as unknown as DocumentSnapshot)

      const result = await confirmInboxItem('uid', 'item1', { salary: 2100 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('CONFERMATO')
        expect(result.data.confidenceFields[0].confirmedValue).toBe(2100)
        expect(result.data.confirmedAt).toBeDefined()
      }
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'update' }))
    })
  })

  describe('deleteInboxItem', () => {
    it('should delete item and call logAudit', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => makeInboxItem({ id: 'item1' }),
      } as unknown as DocumentSnapshot)
      vi.mocked(deleteDoc).mockResolvedValueOnce(undefined)

      const result = await deleteInboxItem('uid', 'item1')

      expect(result.success).toBe(true)
      expect(deleteDoc).toHaveBeenCalled()
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete' }))
    })
  })
})
