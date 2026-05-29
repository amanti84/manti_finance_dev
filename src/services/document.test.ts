import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  uploadDocument,
  listDocuments,
  classifyDocument,
  linkDocument,
  deleteDocument,
} from './document'
import type { QuerySnapshot, DocumentSnapshot, DocumentData } from 'firebase/firestore'

// -----------------------------------------------------------------------
// MOCK FIREBASE
// -----------------------------------------------------------------------
interface MockUploadTask {
  on: (
    state: string,
    onProgress: (snap: unknown) => void,
    onError: (err: unknown) => void,
    onComplete: () => void
  ) => void
  snapshot: {
    ref: unknown
  }
}

const mockUploadTask: MockUploadTask = {
  on: vi.fn(),
  snapshot: {
    ref: {},
  },
}

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytesResumable: vi.fn(() => mockUploadTask),
  getDownloadURL: vi.fn(() => Promise.resolve('https://mock-url.com/file.pdf')),
  deleteObject: vi.fn(() => Promise.resolve()),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'mock-doc-id' })),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: 123456789, nanoseconds: 0 })),
    fromDate: vi.fn((date: Date) => ({
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
      toMillis: () => date.getTime(),
    })),
  },
}))

vi.mock('../firebase', () => ({
  db: {},
  storage: {},
}))

vi.mock('./audit', () => ({
  logAudit: vi.fn().mockResolvedValue({ id: 'audit-id' }),
}))

describe('document service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadDocument', () => {
    it('should upload file to Storage and create Firestore document', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

      // Setup mockUploadTask.on to simulate success
      vi.mocked(mockUploadTask.on).mockImplementation(
        (_state, _onProgress, _onError, onComplete) => {
          onComplete()
        }
      )

      const result = await uploadDocument('user123', file)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.fileName).toBe('test.pdf')
        expect(result.data.status).toBe('uploaded')
        expect(result.data.downloadUrl).toBe('https://mock-url.com/file.pdf')
      }
    })

    it('should call onProgress callback during upload', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const onProgress = vi.fn()

      vi.mocked(mockUploadTask.on).mockImplementation(
        (_state, onProgressCb, _onError, onComplete) => {
          onProgressCb({ bytesTransferred: 50, totalBytes: 100 })
          onComplete()
        }
      )

      await uploadDocument('user123', file, onProgress)
      expect(onProgress).toHaveBeenCalledWith(50)
    })

    it('should reject file with unsupported mimeType', async () => {
      const file = new File(['test content'], 'test.exe', { type: 'application/x-msdownload' })
      const result = await uploadDocument('user123', file)
      expect(result.success).toBe(false)
      expect(result.error).toContain('non supportato')
    })

    it('should reject file exceeding 10MB size limit', async () => {
      const largeFile = {
        name: 'large.pdf',
        size: 11 * 1024 * 1024,
        type: 'application/pdf',
      } as unknown as File

      const result = await uploadDocument('user123', largeFile)
      expect(result.success).toBe(false)
      expect(result.error).toContain('10MB')
    })

    it('should call logAudit on successful upload', async () => {
      const { logAudit } = await import('./audit')
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      vi.mocked(mockUploadTask.on).mockImplementation((_state, _onProgress, _onError, onComplete) => {
        onComplete()
      })

      await uploadDocument('user123', file)
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'create', entityType: 'document' })
      )
    })
  })

  describe('listDocuments', () => {
    it('should return all documents for uid', async () => {
      const { getDocs } = await import('firebase/firestore')
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            fileName: 'file1.pdf',
            type: 'cedolino',
            createdAt: { toMillis: () => 2000 }
          })
        },
        {
          id: 'doc2',
          data: () => ({
            fileName: 'file2.jpg',
            type: 'altro',
            createdAt: { toMillis: () => 1000 }
          })
        },
      ]
      vi.mocked(getDocs).mockResolvedValue({
        docs: mockDocs,
      } as unknown as QuerySnapshot<unknown, DocumentData>)

      const result = await listDocuments('user123')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0].id).toBe('doc1') // Most recent first
      }
    })

    it('should filter by type when provided', async () => {
      const { where } = await import('firebase/firestore')
      await listDocuments('user123', { type: 'cedolino' })
      expect(where).toHaveBeenCalledWith('type', '==', 'cedolino')
    })
  })

  describe('classifyDocument', () => {
    it('should update type and set status to classified', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore')
      const mockDoc = {
        status: 'uploaded',
        fileName: 'test.pdf',
      }
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockDoc,
      } as unknown as DocumentSnapshot<unknown, DocumentData>)

      const result = await classifyDocument(
        'user123',
        'doc123',
        'cedolino',
        new Date(2026, 4, 1)
      )
      expect(result.success).toBe(true)
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'cedolino', status: 'classified' })
      )
    })

    it('should preserve linked status if already linked', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore')
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ status: 'linked', type: 'altro' }),
      } as unknown as DocumentSnapshot<unknown, DocumentData>)

      await classifyDocument('user123', 'doc123', 'cedolino')
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 'linked' })
      )
    })
  })

  describe('linkDocument', () => {
    it('should set linkedEntityType, linkedEntityId and status linked', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore')
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ status: 'classified', type: 'cedolino' }),
      } as unknown as DocumentSnapshot<unknown, DocumentData>)

      const result = await linkDocument('user123', 'doc123', 'payslip', 'ps123')
      expect(result.success).toBe(true)
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          linkedEntityType: 'payslip',
          linkedEntityId: 'ps123',
          status: 'linked',
        })
      )
    })
  })

  describe('deleteDocument', () => {
    it('should delete from Storage and Firestore', async () => {
      const { getDoc, deleteDoc } = await import('firebase/firestore')
      const { deleteObject } = await import('firebase/storage')

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ storagePath: 'users/123/documents/test.pdf' }),
      } as unknown as DocumentSnapshot<unknown, DocumentData>)

      const result = await deleteDocument('user123', 'doc123')
      expect(result.success).toBe(true)
      expect(deleteObject).toHaveBeenCalled()
      expect(deleteDoc).toHaveBeenCalled()
    })

    it('should proceed with Firestore delete if Storage returns object-not-found', async () => {
      const { getDoc, deleteDoc } = await import('firebase/firestore')
      const { deleteObject } = await import('firebase/storage')

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ storagePath: 'users/123/documents/test.pdf' }),
      } as unknown as DocumentSnapshot<unknown, DocumentData>)

      vi.mocked(deleteObject).mockRejectedValue({ code: 'storage/object-not-found' })

      const result = await deleteDocument('user123', 'doc123')
      expect(result.success).toBe(true)
      expect(deleteDoc).toHaveBeenCalled()
    })
  })
})
