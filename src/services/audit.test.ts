/**
 * audit.test.ts
 * Unit test per AuditService (mock Firestore)
 * Issue #6 - M1 Foundation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logAudit, logChange, logCreate, logDelete } from './audit'

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(() =>
    Promise.resolve({ id: 'mock-audit-id-123' })
  ),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  Timestamp: {
    now: () => ({ seconds: 1700000000, nanoseconds: 0 }),
  },
}))

// Mock firebase app
vi.mock('../firebase', () => ({ db: {} }))

// --------------------------------------------------------
// logAudit
// --------------------------------------------------------

describe('logAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('chiama addDoc con i dati corretti', async () => {
    const { addDoc } = await import('firebase/firestore')

    const result = await logAudit({
      uid: 'user123',
      action: 'create',
      entityType: 'investment',
      entityId: 'inv-001',
      changes: { after: { name: 'ETF World' } },
    })

    expect(addDoc).toHaveBeenCalledOnce()
    expect(result.id).toBe('mock-audit-id-123')
    expect(result.uid).toBe('user123')
    expect(result.action).toBe('create')
    expect(result.entityType).toBe('investment')
    expect(result.entityId).toBe('inv-001')
  })

  it('usa oggetti vuoti per changes e metadata se non forniti', async () => {
    const result = await logAudit({
      uid: 'user123',
      action: 'delete',
      entityType: 'payslip',
      entityId: 'pay-001',
    })

    expect(result.changes).toEqual({})
    expect(result.metadata).toEqual({})
  })
})

// --------------------------------------------------------
// logChange
// --------------------------------------------------------

describe('logChange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delega a logAudit con action update', async () => {
    const before = { amount: 1000 }
    const after = { amount: 1500 }

    const result = await logChange(
      'user123',
      'investment',
      'inv-001',
      before,
      after
    )

    expect(result.action).toBe('update')
    expect(result.changes).toEqual({ before, after })
  })
})

// --------------------------------------------------------
// logCreate
// --------------------------------------------------------

describe('logCreate', () => {
  it('delega a logAudit con action create', async () => {
    const data = { name: 'Fondo Pensione', amount: 5000 }

    const result = await logCreate(
      'user123',
      'investment',
      'inv-002',
      data
    )

    expect(result.action).toBe('create')
    expect(result.changes).toEqual({ after: data })
  })
})

// --------------------------------------------------------
// logDelete
// --------------------------------------------------------

describe('logDelete', () => {
  it('delega a logAudit con action delete', async () => {
    const data = { name: 'Vecchio Fondo', amount: 2000 }

    const result = await logDelete(
      'user123',
      'investment',
      'inv-003',
      data
    )

    expect(result.action).toBe('delete')
    expect(result.changes).toEqual({ before: data })
  })
})
