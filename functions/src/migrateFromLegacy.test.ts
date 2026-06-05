import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFirestore } from 'firebase-admin/firestore'
import { migrateFromLegacy } from './migrateFromLegacy'

// Mock firebase-functions
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (fn: any) => fn,
  HttpsError: class extends Error {
    constructor(public code: string, message: string) {
      super(message)
    }
  },
}))

// Mock firebase-admin/app
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}))

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  Timestamp: {
    now: () => ({ toMillis: () => 123456789 }),
    fromDate: (d: Date) => d,
  },
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}))

describe('migrateFromLegacy', () => {
  let mockDb: any
  let mockLegacyDb: any
  let mockDoc: any
  let mockCollection: any
  let mockLegacyCollection: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock New DB
    mockDoc = {
      get: vi.fn(),
      set: vi.fn(),
    }
    mockCollection = {
      doc: vi.fn(() => mockDoc),
      get: vi.fn(() => ({ docs: [] })),
      add: vi.fn(),
    }
    mockDb = {
      collection: vi.fn(() => mockCollection),
    }

    // Mock Legacy DB
    mockLegacyCollection = {
      get: vi.fn(),
    }
    mockLegacyDb = {
      collection: vi.fn(() => mockLegacyCollection),
    }

    // getFirestore is called twice: one for legacy, one for new
    vi.mocked(getFirestore).mockReturnValueOnce(mockLegacyDb).mockReturnValueOnce(mockDb)
  })

  it('should throw unauthenticated if no auth context', async () => {
    const request = { auth: null, data: {} }
    await expect((migrateFromLegacy as any)(request as any)).rejects.toThrow(
      expect.objectContaining({ code: 'unauthenticated' })
    )
  })

  it('should throw permission-denied if not admin', async () => {
    const request = {
      auth: { token: { email: 'user@test.com' }, uid: 'user123' },
      data: {},
    }
    await expect((migrateFromLegacy as any)(request as any)).rejects.toThrow(
      expect.objectContaining({ code: 'permission-denied' })
    )
  })

  it('should migrate data correctly for admin', async () => {
    const request = {
      auth: { token: { email: 'ant.manti@gmail.com' }, uid: 'admin123' },
      data: { dryRun: false },
    }

    // Mock Legacy Data
    mockLegacyCollection.get.mockResolvedValueOnce({
      docs: [{ id: 'p1', data: () => ({ name: 'PAC 1', avgCost: 10, shares: 100, monthlyAmount: 100, startDate: '2023-01-01' }) }]
    }).mockResolvedValueOnce({
      docs: [{ id: 'i1', data: () => ({ name: 'Inv 1', avgCost: 50, quantity: 20, type: 'ETF', platform: 'Fineco' }) }]
    }).mockResolvedValueOnce({
      docs: []
    }).mockResolvedValueOnce({
      docs: []
    })

    // Mock New Data Check
    mockDoc.get.mockResolvedValue({ exists: false })

    // Mock New Data Snapshots for Validation (after write)
    mockCollection.get.mockResolvedValueOnce({
      docs: [{ data: () => ({ avgCost: 10, shares: 100 }) }]
    }).mockResolvedValueOnce({
      docs: [{ data: () => ({ avgCost: 50, quantity: 20 }) }]
    }).mockResolvedValueOnce({
      docs: []
    }).mockResolvedValueOnce({
      docs: []
    })

    const result = (await (migrateFromLegacy as any)(request as any)) as any

    expect(result.success).toBe(true)
    expect(result.data.pacs.inserted).toBe(1)
    expect(result.data.investments.inserted).toBe(1)
    expect(result.data.validation.passed).toBe(true)
    expect(mockDoc.set).toHaveBeenCalledTimes(2)
  })

  it('should skip existing documents', async () => {
    const request = {
      auth: { token: { email: 'ant.manti@gmail.com' }, uid: 'admin123' },
      data: { dryRun: false },
    }

    mockLegacyCollection.get.mockResolvedValue({
      docs: [{ id: 'p1', data: () => ({ name: 'PAC 1', avgCost: 10, shares: 100, monthlyAmount: 100, startDate: '2023-01-01' }) }]
    })

    mockDoc.get.mockResolvedValue({ exists: true })

    // Mock Validation Snaps
    mockCollection.get.mockResolvedValue({
        docs: [{ data: () => ({ avgCost: 10, shares: 100 }) }]
    })

    const result = (await (migrateFromLegacy as any)(request as any)) as any

    expect(result.data.pacs.inserted).toBe(0)
    expect(result.data.pacs.skipped).toBe(1)
    expect(mockDoc.set).not.toHaveBeenCalled()
  })

  it('should handle dryRun', async () => {
    const request = {
      auth: { token: { email: 'ant.manti@gmail.com' }, uid: 'admin123' },
      data: { dryRun: true },
    }

    mockLegacyCollection.get.mockResolvedValueOnce({
      docs: [{ id: 'p1', data: () => ({ name: 'PAC 1', avgCost: 10, shares: 100, monthlyAmount: 100, startDate: '2023-01-01' }) }]
    }).mockResolvedValue({ docs: [] })

    mockDoc.get.mockResolvedValue({ exists: false })

    const result = (await (migrateFromLegacy as any)(request as any)) as any

    expect(result.data.pacs.inserted).toBe(1)
    expect(mockDoc.set).not.toHaveBeenCalled()
    expect(result.data.validation.passed).toBe(true)
  })

  it('should throw mismatch error on validation failure', async () => {
    const request = {
      auth: { token: { email: 'ant.manti@gmail.com' }, uid: 'admin123' },
      data: { dryRun: false },
    }

    // Legacy: 1000€
    mockLegacyCollection.get.mockResolvedValueOnce({
      docs: [{ id: 'p1', data: () => ({ name: 'PAC 1', avgCost: 10, shares: 100, monthlyAmount: 100, startDate: '2023-01-01' }) }]
    }).mockResolvedValue({ docs: [] })

    mockDoc.get.mockResolvedValue({ exists: false })

    // New: 0€ (mocking failure to write or something else)
    mockCollection.get.mockResolvedValue({
      docs: []
    })

    await expect((migrateFromLegacy as any)(request as any)).rejects.toThrow(
      expect.objectContaining({ code: 'internal' })
    )
  })
})
