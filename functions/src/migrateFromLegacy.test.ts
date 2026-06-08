import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFirestore } from 'firebase-admin/firestore'
import { migrateFromLegacy, migrateCollections } from './migrateFromLegacy'

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
    mockLegacyCollection.get.mockResolvedValueOnce({ // pacs
      docs: [{ id: 'p1', data: () => ({ name: 'PAC 1', avgCost: 10, shares: 100, monthlyAmount: 100, startDate: '2023-01-01' }) }]
    }).mockResolvedValueOnce({ // investments
      docs: [{ id: 'i1', data: () => ({ name: 'Inv 1', avgCost: 50, quantity: 20, type: 'ETF', platform: 'Fineco' }) }]
    }).mockResolvedValueOnce({ // kindergarten_pacs
      docs: []
    }).mockResolvedValueOnce({ // kindergarten_investments
      docs: []
    }).mockResolvedValueOnce({ // transactions
      docs: []
    }).mockResolvedValueOnce({ // sales
      docs: []
    })

    // Mock New Data Check
    mockDoc.get.mockResolvedValue({ exists: false })

    // Mock New Data Snapshots for Validation (after write, 4 collections)
    mockCollection.get
      .mockResolvedValueOnce({
        docs: [{ data: () => ({ avgCost: 10, shares: 100 }) }]
      })
      .mockResolvedValueOnce({
        docs: [{ data: () => ({ avgCost: 50, quantity: 20 }) }]
      })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] })

    const result = (await (migrateFromLegacy as any)(request as any)) as any

    expect(result.success).toBe(true)
    expect(result.data.pacs.inserted).toBe(1)
    expect(result.data.investments.inserted).toBe(1)
    expect(result.data.validation.passed).toBe(true)
    expect(mockDoc.set).toHaveBeenCalledTimes(2)
  })

  it('should migrate kindergarten data correctly', async () => {
    const request = {
      auth: { token: { email: 'ant.manti@gmail.com' }, uid: 'admin123' },
      data: { dryRun: false },
    }

    // Mock Legacy Data: 1 PAC, 1 Investment
    // The collection name is NOT passed to get(), it's legacyDb.collection(name).get()
    // and our mockLegacyCollection is what is returned by collection(name).
    // So we need to mock successive calls to get() on that same object.
    mockLegacyCollection.get
      .mockResolvedValueOnce({ docs: [] }) // pacs
      .mockResolvedValueOnce({ docs: [] }) // investments
      .mockResolvedValueOnce({ // kindergarten_pacs
        docs: [{ id: 'kgp1', data: () => ({ name: 'KG PAC', avgCost: 10, shares: 100, monthlyAmount: 100 }) }]
      })
      .mockResolvedValueOnce({ // kindergarten_transactions
        docs: [{ id: 'kgi1', data: () => ({ name: 'KG Inv', avgCost: 50, shares: 20, type: 'ETF' }) }]
      })
      .mockResolvedValueOnce({ docs: [] }) // transactions
      .mockResolvedValueOnce({ docs: [] }) // sales

    // Mock New Data Check
    mockDoc.get.mockResolvedValue({ exists: false })

    // Mock New Data Snapshots for Validation
    // Similar to legacy, collection(path).get() returns the same mockCollection.
    // We need to mock the get() calls on mockCollection.
    mockCollection.get
      .mockResolvedValueOnce({ docs: [] }) // pacs
      .mockResolvedValueOnce({ docs: [] }) // investments
      .mockResolvedValueOnce({ // kindergarten_pacs
        docs: [{ data: () => ({ totalInvested: 1000 }) }]
      })
      .mockResolvedValueOnce({ // kindergarten_investments
        docs: [{ data: () => ({ purchasePrice: 50, quantity: 20 }) }]
      })

    const result = (await (migrateFromLegacy as any)(request as any)) as any

    expect(result.success).toBe(true)
    expect(result.data.kindergartenPacs.inserted).toBe(1)
    expect(result.data.kindergartenInvestments.inserted).toBe(1)
    expect(result.data.validation.passed).toBe(true)

    // Verify mapping for PAC
    expect(mockDb.collection).toHaveBeenCalledWith('users/admin123/kindergarten_pacs')
    expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
      totalInvested: 1000,
      targetYears: 18
    }))

    // Verify mapping for Investment
    expect(mockDb.collection).toHaveBeenCalledWith('users/admin123/kindergarten_investments')
    expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
      purchasePrice: 50,
      quantity: 20,
      category: 'etf'
    }))
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
    mockLegacyCollection.get
      .mockResolvedValueOnce({
        docs: [{ id: 'p1', data: () => ({ name: 'PAC 1', avgCost: 10, shares: 100, monthlyAmount: 100, startDate: '2023-01-01' }) }]
      })
      .mockResolvedValue({ docs: [] })

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

describe('migrateCollections', () => {
  let mockDb: any
  let mockDoc: any
  let mockCollection: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock New DB
    mockDoc = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    }
    mockCollection = {
      doc: vi.fn(() => mockDoc),
      get: vi.fn(),
      where: vi.fn().mockReturnThis(),
    }
    mockDb = {
      collection: vi.fn(() => mockCollection),
    }

    vi.mocked(getFirestore).mockReturnValue(mockDb)
  })

  it('should migrate collections correctly', async () => {
    const request = {
      auth: { token: { email: 'ant.manti@gmail.com' }, uid: 'admin123' },
      data: { dryRun: false },
    }

    // Mock Investments Snap (1 Adult PAC, 1 KG PAC)
    mockCollection.get.mockResolvedValueOnce({
      docs: [
        {
          id: 'pac1',
          ref: { delete: vi.fn() },
          data: () => ({ name: 'Adult PAC', isPac: true, isKindergarten: false, pacMonthlyAmount: 100, quantity: 10, avgCost: 10, currentPrice: 10 })
        },
        {
          id: 'kgpac1',
          ref: { delete: vi.fn() },
          data: () => ({ name: 'KG PAC', isPac: true, isKindergarten: true, pacMonthlyAmount: 50, quantity: 5, avgCost: 10, currentValue: 55 })
        }
      ]
    })

    // Mock Transactions Snap (1 KG Trans)
    mockCollection.get.mockResolvedValueOnce({
      docs: [
        {
          id: 'kgtrans1',
          ref: { delete: vi.fn() },
          data: () => ({ description: 'KG Invest', isKindergarten: true, amount: 200, date: { toDate: () => new Date() } })
        }
      ]
    })

    // Mock destination checks
    mockDoc.get.mockResolvedValue({ exists: false })

    const result = (await (migrateCollections as any)(request as any)) as any

    expect(result.success).toBe(true)
    expect(result.data.adultPacs.moved).toBe(1)
    expect(result.data.kindergartenPacs.moved).toBe(1)
    expect(result.data.kindergartenInvestments.moved).toBe(1)

    // Verify copies
    expect(mockDoc.set).toHaveBeenCalledTimes(3)
    // Verify NO deletions (requirement #123 Step 4)
    expect(mockCollection.get.mock.results[0].value.then).toBeDefined() // promise
    const invDocs = (await mockCollection.get.mock.results[0].value).docs
    expect(invDocs[0].ref.delete).not.toHaveBeenCalled()
    expect(invDocs[1].ref.delete).not.toHaveBeenCalled()

    const transDocs = (await mockCollection.get.mock.results[1].value).docs
    expect(transDocs[0].ref.delete).not.toHaveBeenCalled()
  })

  it('should skip existing documents in migrateCollections', async () => {
    const request = {
      auth: { token: { email: 'ant.manti@gmail.com' }, uid: 'admin123' },
      data: { dryRun: false },
    }

    mockCollection.get.mockResolvedValueOnce({
      docs: [{ id: 'pac1', data: () => ({ name: 'Adult PAC', isPac: true }) }]
    }).mockResolvedValueOnce({ docs: [] })

    mockDoc.get.mockResolvedValue({ exists: true })

    const result = (await (migrateCollections as any)(request as any)) as any

    expect(result.data.adultPacs.moved).toBe(0)
    expect(result.data.adultPacs.skipped).toBe(1)
    expect(mockDoc.set).not.toHaveBeenCalled()
  })

  it('should handle dryRun in migrateCollections', async () => {
    const request = {
      auth: { token: { email: 'ant.manti@gmail.com' }, uid: 'admin123' },
      data: { dryRun: true },
    }

    mockCollection.get.mockResolvedValueOnce({
      docs: [{ id: 'pac1', ref: { delete: vi.fn() }, data: () => ({ name: 'Adult PAC', isPac: true }) }]
    }).mockResolvedValueOnce({ docs: [] })

    mockDoc.get.mockResolvedValue({ exists: false })

    const result = (await (migrateCollections as any)(request as any)) as any

    expect(result.data.adultPacs.moved).toBe(1)
    expect(mockDoc.set).not.toHaveBeenCalled()
    const invDocs = (await mockCollection.get.mock.results[0].value).docs
    expect(invDocs[0].ref.delete).not.toHaveBeenCalled()
  })
})
