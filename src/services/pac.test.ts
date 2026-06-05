/**
 * pac.test.ts
 * Test suite per PAC Service
 * Issue #11 — M2 Core Modules
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  recordPacPayment,
  updatePacPayment,
  deletePacPayment,
  getPacPaymentsByInvestment,
  getAllPacPayments,
  getPacSummary,
  calculatePacProgress,
  getPacAnalytics,
} from './pac'
import type { PacPayment } from './pac'
import type { Investment } from '../types'
import type { Timestamp } from 'firebase/firestore'

// -----------------------------------------------------------------------
// MOCK FIREBASE
// -----------------------------------------------------------------------
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date() })) },
}))

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('./audit', () => ({ logAudit: vi.fn().mockResolvedValue({ success: true, data: {} }).mockResolvedValue({ success: true, data: undefined }) }))

// -----------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------
const makeTimestamp = (d: Date): Timestamp =>
  ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0,
     toDate: () => d, toMillis: () => d.getTime(),
     isEqual: () => false }) as unknown as Timestamp

const makePayment = (overrides: Partial<PacPayment> = {}): PacPayment => ({
  id: 'pac-001',
  investmentId: 'inv-001',
  investmentName: 'iShares MSCI World',
  data: makeTimestamp(new Date('2024-01-15')),
  importo: 200,
  priceAtPayment: 80.5,
  quantityPurchased: 2.48,
  broker: 'Fineco',
  createdAt: makeTimestamp(new Date()),
  updatedAt: makeTimestamp(new Date()),
  ...overrides,
})

const makeInvestment = (): Investment => ({
  id: 'inv-001',
  name: 'iShares MSCI World',
  ticker: 'SWDA',
  assetClass: 'etf',
  broker: 'altri',
  quantity: 10,
  avgCost: 80.5,
  currentPrice: 90.0,
  currentValue: 900,
  currency: 'EUR',
  isPac: false,
  lastPriceUpdate: makeTimestamp(new Date()),
  createdAt: makeTimestamp(new Date()),
  updatedAt: makeTimestamp(new Date()),
})

// helper: mock snapshot con forEach
const makeSnapshot = (items: PacPayment[]) => ({
  forEach: (cb: (d: { id: string; data: () => Omit<PacPayment, 'id'> }) => void) =>
    items.forEach(item => cb({ id: item.id, data: () => item })),
})

// -----------------------------------------------------------------------
// --- recordPacPayment ---
// -----------------------------------------------------------------------
describe('recordPacPayment', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('registra un versamento PAC con successo', async () => {
    const { addDoc } = await import('firebase/firestore')
    ;(addDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'pac-001' })
    const payload = {
      investmentId: 'inv-001',
      investmentName: 'iShares MSCI World',
      data: makeTimestamp(new Date()),
      importo: 200,
      priceAtPayment: 80.5,
      broker: 'Fineco',
    }
    const result = await recordPacPayment('user-123', payload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('pac-001')
    }
  })

  it('restituisce errore su Firebase failure', async () => {
    const { addDoc } = await import('firebase/firestore')
    ;(addDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'))
    const payload = {
      investmentId: 'inv-001',
      investmentName: 'iShares MSCI World',
      data: makeTimestamp(new Date()),
      importo: 200,
      priceAtPayment: 80.5,
      broker: 'Fineco',
    }
    const result = await recordPacPayment('user-123', payload)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeDefined()
    }
  })
})

// -----------------------------------------------------------------------
// --- updatePacPayment ---
// -----------------------------------------------------------------------
describe('updatePacPayment', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('aggiorna un versamento PAC con successo', async () => {
    const { updateDoc, getDoc } = await import('firebase/firestore')
    ;(getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      exists: () => true,
      data: () => makePayment(),
    })
    ;(updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)
    const result = await updatePacPayment('user-123', 'pac-001', { importo: 250 })
    expect(result.success).toBe(true)
  })

  it('restituisce errore se updateDoc fallisce', async () => {
    const { updateDoc, getDoc } = await import('firebase/firestore')
    ;(getDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      exists: () => true,
      data: () => makePayment(),
    })
    ;(updateDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'))
    const result = await updatePacPayment('user-123', 'pac-001', { importo: 250 })
    expect(result.success).toBe(false)
  })
})

// -----------------------------------------------------------------------
// --- deletePacPayment ---
// -----------------------------------------------------------------------
describe('deletePacPayment', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('elimina un versamento PAC con successo', async () => {
    const { deleteDoc } = await import('firebase/firestore')
    ;(deleteDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)
    const result = await deletePacPayment('user-123', 'pac-001')
    expect(result.success).toBe(true)
  })

  it('restituisce errore se deleteDoc fallisce', async () => {
    const { deleteDoc } = await import('firebase/firestore')
    ;(deleteDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'))
    const result = await deletePacPayment('user-123', 'pac-001')
    expect(result.success).toBe(false)
  })
})

// -----------------------------------------------------------------------
// --- getPacPaymentsByInvestment ---
// -----------------------------------------------------------------------
describe('getPacPaymentsByInvestment', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('restituisce i versamenti filtrati per investimento', async () => {
    const { getDocs, query } = await import('firebase/firestore')
    ;(query as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeSnapshot([makePayment()])
    )
    const result = await getPacPaymentsByInvestment('user-123', 'inv-001')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.length).toBe(1)
      expect(result.data[0].id).toBe('pac-001')
    }
  })

  it('restituisce errore Firebase', async () => {
    const { getDocs, query } = await import('firebase/firestore')
    ;(query as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'))
    const result = await getPacPaymentsByInvestment('user-123', 'inv-001')
    expect(result.success).toBe(false)
  })
})

// -----------------------------------------------------------------------
// --- getAllPacPayments ---
// -----------------------------------------------------------------------
describe('getAllPacPayments', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('restituisce tutti i versamenti PAC', async () => {
    const { getDocs, query } = await import('firebase/firestore')
    ;(query as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeSnapshot([
        makePayment(),
        makePayment({ id: 'pac-002', importo: 300 }),
      ])
    )
    const result = await getAllPacPayments('user-123')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.length).toBe(2)
    }
  })

  it('restituisce errore Firebase', async () => {
    const { getDocs, query } = await import('firebase/firestore')
    ;(query as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'))
    const result = await getAllPacPayments('user-123')
    expect(result.success).toBe(false)
  })
})

// -----------------------------------------------------------------------
// --- getPacSummary ---
// -----------------------------------------------------------------------
describe('getPacSummary', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('calcola il summary PAC correttamente', async () => {
    const { getDocs, query } = await import('firebase/firestore')
    ;(query as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeSnapshot([
        makePayment({ importo: 200, priceAtPayment: 80, quantityPurchased: 2.5 }),
        makePayment({ id: 'pac-002', importo: 200, priceAtPayment: 85, quantityPurchased: 2.35 }),
      ])
    )
    const result = await getPacSummary('user-123', makeInvestment())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totaleVersato).toBe(400)
      expect(result.data.numeroVersamenti).toBe(2)
    }
  })

  it('restituisce errore se getDocs fallisce', async () => {
    const { getDocs, query } = await import('firebase/firestore')
    ;(query as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firebase error'))
    const result = await getPacSummary('user-123', makeInvestment())
    expect(result.success).toBe(false)
  })
})

// -----------------------------------------------------------------------
// --- calculatePacProgress ---
// -----------------------------------------------------------------------
describe('calculatePacProgress', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('calcola il progresso verso un obiettivo', async () => {
    const { getDocs, query } = await import('firebase/firestore')
    ;(query as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeSnapshot([makePayment({ importo: 500 })])
    )
    const result = await calculatePacProgress('user-123', makeInvestment(), 1000)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.progressoPercent).toBeGreaterThan(0)
      expect(result.data.obiettivo).toBe(1000)
    }
  })

  it('funziona senza obiettivo (null)', async () => {
    const { getDocs, query } = await import('firebase/firestore')
    ;(query as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      makeSnapshot([makePayment({ importo: 500 })])
    )
    const result = await calculatePacProgress('user-123', makeInvestment(), null)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.obiettivo).toBeNull()
      expect(result.data.proiezioneCompletamento).toBeNull()
    }
  })
})

// -----------------------------------------------------------------------
// --- getPacAnalytics ---
// -----------------------------------------------------------------------
describe('getPacAnalytics', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('restituisce analytics aggregati per lista investimenti PAC', async () => {
    const { getDocs, query } = await import('firebase/firestore')
    ;(query as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSnapshot([
        makePayment({ importo: 200, priceAtPayment: 80, quantityPurchased: 2.5 }),
      ])
    )
    const result = await getPacAnalytics('user-123', [makeInvestment()])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totalePacAttivi).toBe(1)
    }
  })

  it('se getDocs fallisce restituisce analytics vuoti (nessun summary disponibile)', async () => {
    // getPacAnalytics silences individual summary errors:
    // returns success:true with totalePacAttivi=0 when no summaries can be computed.
    const { getDocs, query } = await import('firebase/firestore')
    ;(query as ReturnType<typeof vi.fn>).mockReturnValue({})
    ;(getDocs as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Firebase error'))
    const result = await getPacAnalytics('user-123', [makeInvestment()])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totalePacAttivi).toBe(0)
    }
  })
})
