/**
 * snapshot.test.ts
 * Unit test per SnapshotService (pure functions - no Firestore)
 */

import { describe, it, expect, vi } from 'vitest'
import {
  buildSnapshotId,
  calcPatrimonioNetto,
  computeDeltas,
} from './snapshot'
import type { SnapshotInput } from './snapshot'
import type { PatrimonioSnapshot } from '../types'
import { Timestamp } from 'firebase/firestore'

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
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
// buildSnapshotId
// --------------------------------------------------------

describe('buildSnapshotId', () => {
  it('genera ID corretto per mese a una cifra', () => {
    expect(buildSnapshotId(2024, 1)).toBe('2024-01')
    expect(buildSnapshotId(2024, 9)).toBe('2024-09')
  })

  it('genera ID corretto per mese a due cifre', () => {
    expect(buildSnapshotId(2024, 10)).toBe('2024-10')
    expect(buildSnapshotId(2024, 12)).toBe('2024-12')
  })

  it('gestisce anni diversi', () => {
    expect(buildSnapshotId(2023, 6)).toBe('2023-06')
    expect(buildSnapshotId(2025, 3)).toBe('2025-03')
  })
})

// --------------------------------------------------------
// calcPatrimonioNetto
// --------------------------------------------------------

describe('calcPatrimonioNetto', () => {
  const baseInput: SnapshotInput = {
    uid: 'user123',
    year: 2024,
    month: 6,
    contiCorrenti: 10000,
    investimenti: 50000,
    immobili: 200000,
    fondoPensione: 15000,
    tfr: 8000,
    mutuo: 120000,
    altriDebiti: 5000,
  }

  it('calcola patrimonio netto correttamente', () => {
    // attivi: 10000 + 50000 + 200000 + 15000 + 8000 = 283000
    // passivi: 120000 + 5000 = 125000
    // netto: 283000 - 125000 = 158000
    expect(calcPatrimonioNetto(baseInput)).toBe(158000)
  })

  it('patrimonio con immobili e nessun debito extra', () => {
    const input: SnapshotInput = {
      ...baseInput,
      altriDebiti: 0,
    }
    // 283000 - 120000 = 163000
    expect(calcPatrimonioNetto(input)).toBe(163000)
  })

  it('patrimonio negativo con mutuo alto', () => {
    const input: SnapshotInput = {
      ...baseInput,
      contiCorrenti: 1000,
      investimenti: 2000,
      immobili: 0,
      fondoPensione: 0,
      tfr: 0,
      mutuo: 200000,
      altriDebiti: 0,
    }
    // attivi: 3000, passivi: 200000
    expect(calcPatrimonioNetto(input)).toBe(-197000)
  })
})

// --------------------------------------------------------
// computeDeltas
// --------------------------------------------------------

describe('computeDeltas', () => {
  const now = Timestamp.now()

  const makeSnapshot = (
    month: number,
    patrimonioNetto: number
  ): PatrimonioSnapshot => ({
    id: buildSnapshotId(2024, month),
    createdAt: now,
    updatedAt: now,
    year: 2024,
    month: month as PatrimonioSnapshot['month'],
    contiCorrenti: 0,
    investimenti: 0,
    immobili: 0,
    fondoPensione: 0,
    tfr: 0,
    mutuo: 0,
    altriDebiti: 0,
    patrimonioNetto,
  })

  it('calcola delta rispetto al mese precedente', () => {
    const snapshots = [
      makeSnapshot(3, 105000),
      makeSnapshot(2, 100000),
      makeSnapshot(1, 95000),
    ]
    const result = computeDeltas(snapshots)
    expect(result[0].delta).toBe(5000)
    expect(result[1].delta).toBe(5000)
    expect(result[2].delta).toBeNull()
  })

  it('delta null per snapshot singolo', () => {
    const result = computeDeltas([makeSnapshot(1, 100000)])
    expect(result[0].delta).toBeNull()
  })

  it('lista vuota non lancia errori', () => {
    expect(computeDeltas([])).toEqual([])
  })

  it('delta negativo per patrimonio in calo', () => {
    const snapshots = [
      makeSnapshot(2, 90000),
      makeSnapshot(1, 100000),
    ]
    const result = computeDeltas(snapshots)
    expect(result[0].delta).toBe(-10000)
  })
})
