/**
 * snapshot.test.ts
 * Unit test per SnapshotService (pure functions - no Firestore)
 */

import { describe, it, expect, vi } from 'vitest'import {
  buildSnapshotId,
  calcPatrimonioNetto,
  computeDeltas,
} from './snapshot'
import type { SnapshotInput } from './snapshot'
import type { PatrimonioSnapshot } from '../types'
import { Timestamp } from 'firebase/firestore'

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
    totaleInvestimenti: 50000,
    saldoContiCorrente: 10000,
    valoreMutuoResiduo: 120000,
    tfr: 8000,
  }

  it('calcola patrimonio netto senza voci opzionali', () => {
    // 50000 + 10000 + 8000 - 120000 = -52000
    expect(calcPatrimonioNetto(baseInput)).toBe(-52000)
  })

  it('include altreAttivita e altrePassivita', () => {
    const input: SnapshotInput = {
      ...baseInput,
      altreAttivita: 5000,
      altrePassivita: 2000,
    }
    // 50000 + 10000 + 8000 + 5000 - 120000 - 2000 = -49000
    expect(calcPatrimonioNetto(input)).toBe(-49000)
  })

  it('patrimonio positivo con investimenti alti', () => {
    const input: SnapshotInput = {
      ...baseInput,
      totaleInvestimenti: 200000,
      saldoContiCorrente: 50000,
      valoreMutuoResiduo: 80000,
      tfr: 15000,
    }
    // 200000 + 50000 + 15000 - 80000 = 185000
    expect(calcPatrimonioNetto(input)).toBe(185000)
  })

  it('gestisce valori opzionali undefined come 0', () => {
    const input: SnapshotInput = {
      ...baseInput,
      altreAttivita: undefined,
      altrePassivita: undefined,
    }
    expect(calcPatrimonioNetto(input)).toBe(calcPatrimonioNetto(baseInput))
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
    uid: 'user123',
    year: 2024,
    month: month as PatrimonioSnapshot['month'],
    totaleInvestimenti: 0,
    saldoContiCorrente: 0,
    valoreMutuoResiduo: 0,
    tfr: 0,
    altreAttivita: 0,
    altrePassivita: 0,
    patrimonioNetto,
  })

  it('calcola delta rispetto al mese precedente', () => {
    // Array ordinato decrescente: mese piu' recente prima
    const snapshots = [
      makeSnapshot(3, 105000), // mese corrente
      makeSnapshot(2, 100000), // mese precedente
      makeSnapshot(1, 95000),  // due mesi fa
    ]
    const result = computeDeltas(snapshots)
    expect(result[0].delta).toBe(5000)  // 105000 - 100000
    expect(result[1].delta).toBe(5000)  // 100000 - 95000
    expect(result[2].delta).toBeNull()  // nessun precedente
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
