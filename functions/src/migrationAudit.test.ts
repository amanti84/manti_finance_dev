import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMigrationAudit } from './migrateFromLegacy'

// Mock Firebase Admin
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn((path) => ({
      get: vi.fn(() => {
        // Legacy project paths (manti-finance)
        if (path === 'pacs') return { size: 2, docs: [] }
        if (path === 'kindergarten_pacs') return { size: 1, docs: [] }
        if (path === 'kindergarten_transactions') return { size: 3, docs: [] }

        // New project paths (users/admin-uid/...)
        if (path === 'users/admin-uid/pacs') {
          return {
            size: 2,
            docs: [
              { id: 'p1', data: () => ({ name: 'Adult PAC 1', isKindergarten: false }) },
              { id: 'p2', data: () => ({ name: 'Adult PAC 2', isKindergarten: false }) }
            ]
          }
        }
        if (path === 'users/admin-uid/kindergarten_pacs') {
          return {
            size: 1,
            docs: [
              { id: 'kp1', data: () => ({ name: 'KG PAC 1', isKindergarten: true }) }
            ]
          }
        }
        if (path === 'users/admin-uid/kindergarten_investments') {
          return {
            size: 3,
            docs: [
              { id: 'ki1', data: () => ({ name: 'KG Inv 1', purchasePrice: 100, quantity: 1, isKindergarten: true }) },
              { id: 'ki2', data: () => ({ name: 'KG Inv 2', purchasePrice: 200, quantity: 2, isKindergarten: true }) },
              { id: 'ki3', data: () => ({ name: 'KG Inv 3', purchasePrice: 300, quantity: 3, isKindergarten: true }) }
            ]
          }
        }
        return { size: 0, docs: [] }
      })
    }))
  })),
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => 123456789 }))
  }
}))

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (handler: any) => handler,
  HttpsError: class extends Error {
    constructor(public code: string, message: string) {
      super(message)
    }
  }
}))

describe('getMigrationAudit Cloud Function', () => {
  const mockAuth = {
    uid: 'admin-uid',
    token: { email: 'ant.manti@gmail.com' }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fails if unauthenticated', async () => {
    await expect(getMigrationAudit({ auth: null } as any))
      .rejects.toThrow("L'utente deve essere autenticato")
  })

  it('fails if not admin', async () => {
    const nonAdminAuth = { ...mockAuth, token: { email: 'user@example.com' } }
    await expect(getMigrationAudit({ auth: nonAdminAuth } as any))
      .rejects.toThrow("Accesso riservato all'amministratore")
  })

  it('returns successful audit report when counts match and schema is valid', async () => {
    const result = await getMigrationAudit({ auth: mockAuth, data: { targetUid: 'admin-uid' } } as any)

    expect(result.success).toBe(true)
    expect(result.data.overallPassed).toBe(true)
    expect(result.data.pacs.mismatch).toBe(false)
    expect(result.data.kindergartenPacs.mismatch).toBe(false)
    expect(result.data.schemaV3.invalid).toBe(0)
    expect(result.data.segregation.passed).toBe(true)
  })
})
