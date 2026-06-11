/**
 * audit.test.ts
 * Unit test per AuditService (mock Firestore)
 * Issue #6 - M1 Foundation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logAudit, logChange, logCreate, logDelete, getAuditLog, exportAuditLogCSV } from './audit'
import * as firestore from 'firebase/firestore'
import type { AuditLogEntry, AuditEntityType } from '../types'

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
    now: vi.fn(() => ({ seconds: 1700000000, nanoseconds: 0 })),
    fromDate: vi.fn((date: Date) => ({
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
      toDate: () => date
    })),
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
      newValue: { name: 'ETF World' },
    })

    expect(addDoc).toHaveBeenCalledOnce()
    if (!result.success) throw new Error('Result should be successful')
    expect(result.data.id).toBe('mock-audit-id-123')
    expect(result.data.action).toBe('create')
    expect(result.data.entityType).toBe('investment')
    expect(result.data.entityId).toBe('inv-001')
    expect(result.data.source).toBe('user')
  })

  it('usa source user come default', async () => {
    const result = await logAudit({
      uid: 'user123',
      action: 'delete',
      entityType: 'payslip',
      entityId: 'pay-001',
    })

    if (!result.success) throw new Error('Result should be successful')
    expect(result.data.source).toBe('user')
  })

  it('accetta source personalizzato', async () => {
    const result = await logAudit({
      uid: 'user123',
      action: 'import',
      entityType: 'payslip',
      entityId: 'pay-002',
      source: 'import',
    })

    if (!result.success) throw new Error('Result should be successful')
    expect(result.data.source).toBe('import')
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
    const previousValue = { amount: 1000 }
    const newValue = { amount: 1500 }

    const result = await logChange(
      'user123',
      'investment',
      'inv-001',
      previousValue,
      newValue
    )

    if (!result.success) throw new Error('Result should be successful')
    expect(result.data.action).toBe('update')
    expect(result.data.previousValue).toEqual(previousValue)
    expect(result.data.newValue).toEqual(newValue)
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

    if (!result.success) throw new Error('Result should be successful')
    expect(result.data.action).toBe('create')
    expect(result.data.newValue).toEqual(data)
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

    if (!result.success) throw new Error('Result should be successful')
    expect(result.data.action).toBe('delete')
    expect(result.data.previousValue).toEqual(data)
  })
})

// --------------------------------------------------------
// getAuditLog
// --------------------------------------------------------

describe('getAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(firestore.getDocs).mockResolvedValue({
      docs: []
    } as unknown as firestore.QuerySnapshot<unknown, firestore.DocumentData>)
  })

  it('applica correttamente i filtri di data', async () => {
    const { where } = await import('firebase/firestore')
    const dateFrom = firestore.Timestamp.fromDate(new Date('2024-01-01'))
    const dateTo = firestore.Timestamp.fromDate(new Date('2024-01-31'))

    await getAuditLog('user123', {
      dateFrom,
      dateTo
    })

    expect(where).toHaveBeenCalledWith('createdAt', '>=', dateFrom)
    expect(where).toHaveBeenCalledWith('createdAt', '<=', dateTo)
  })

  it('applica altri filtri e ordinamento', async () => {
    const { where, orderBy, limit } = await import('firebase/firestore')

    await getAuditLog('user123', {
      entityType: 'investment',
      action: 'create',
      limitN: 20
    })

    expect(where).toHaveBeenCalledWith('entityType', '==', 'investment')
    expect(where).toHaveBeenCalledWith('action', '==', 'create')
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc')
    expect(limit).toHaveBeenCalledWith(20)
  })

  it('applica filtri multipli con operatore in', async () => {
    const { where } = await import('firebase/firestore')
    const entityTypes: AuditEntityType[] = ['investment', 'payslip']

    await getAuditLog('user123', {
      entityType: entityTypes
    })

    expect(where).toHaveBeenCalledWith('entityType', 'in', entityTypes)
  })
})

// --------------------------------------------------------
// exportAuditLogCSV
// --------------------------------------------------------

describe('exportAuditLogCSV', () => {
  it('genera correttamente il contenuto CSV', () => {
    const mockDate = new Date('2024-06-12T10:00:00')
    const entries: AuditLogEntry[] = [
      {
        id: '1',
        uid: 'user123',
        action: 'create',
        entityType: 'investment',
        entityId: 'inv-1',
        source: 'user',
        createdAt: firestore.Timestamp.fromDate(mockDate),
        updatedAt: firestore.Timestamp.fromDate(mockDate),
      }
    ]

    const csv = exportAuditLogCSV(entries)
    const lines = csv.split('\n')

    expect(lines[0]).toBe('Timestamp,Azione,EntityType,EntityId,Fonte,UID')
    expect(lines[1]).toContain('"create"')
    expect(lines[1]).toContain('"investment"')
    expect(lines[1]).toContain('"inv-1"')
    expect(lines[1]).toContain('"user123"')
  })
})
