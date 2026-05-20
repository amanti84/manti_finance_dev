/**
 * payroll.test.ts
 * Unit test per le funzioni di calcolo del Payroll Engine v1
 * Issue #8 - M2 Core Modules
 */
import { describe, it, expect, vi } from 'vitest'

// Mock Firebase per evitare inizializzazione con chiavi vuote in CI
vi.mock('../firebase', () => ({
  db: {},
  auth: {},
  storage: {},
  default: {},
}))

// Mock Firestore per evitare chiamate reali
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(),
}))

import {
  calculateExpectedNet,
  calculateNetDelta,
  calculateNetTrend,
} from './payroll'
import type { Payslip } from '../types'

// Mock base per un cedolino
const mockPayslip: Payslip = {
  id: 'test-1',
  year: 2026,
  month: 1,
  grossSalary: 3000,
  netSalary: 2100,
  irpef: 600,
  inps: 210,
  tfr: 150,
  fondoPensione: 90,
  parsed: false,
  createdAt: {} as Payslip['createdAt'],
  updatedAt: {} as Payslip['updatedAt'],
}

describe('calculateExpectedNet', () => {
  it('calcola correttamente il netto atteso senza bonus', () => {
    const expected = calculateExpectedNet(mockPayslip)
    // 3000 - 600 - 210 - 90 = 2100
    expect(expected).toBe(2100)
  })

  it('include il bonus nel calcolo', () => {
    const expected = calculateExpectedNet({ ...mockPayslip, bonus: 500 })
    // 3000 - 600 - 210 - 90 + 500 = 2600
    expect(expected).toBe(2600)
  })

  it('include i rimborsi spese nel calcolo', () => {
    const expected = calculateExpectedNet({ ...mockPayslip, rimborsiSpese: 100 })
    // 3000 - 600 - 210 - 90 + 100 = 2200
    expect(expected).toBe(2200)
  })

  it('gestisce bonus e rimborsi insieme', () => {
    const expected = calculateExpectedNet({ ...mockPayslip, bonus: 200, rimborsiSpese: 50 })
    // 3000 - 600 - 210 - 90 + 200 + 50 = 2350
    expect(expected).toBe(2350)
  })
})

describe('calculateNetDelta', () => {
  it('ritorna 0 quando netto effettivo = netto atteso', () => {
    const delta = calculateNetDelta(mockPayslip)
    // netSalary=2100, expected=2100 => delta=0
    expect(delta).toBe(0)
  })

  it('ritorna valore positivo se netto effettivo > atteso', () => {
    const delta = calculateNetDelta({ ...mockPayslip, netSalary: 2200 })
    expect(delta).toBe(100)
  })

  it('ritorna valore negativo se netto effettivo < atteso', () => {
    const delta = calculateNetDelta({ ...mockPayslip, netSalary: 2000 })
    expect(delta).toBe(-100)
  })
})

describe('calculateNetTrend', () => {
  const payslips: Payslip[] = [
    { ...mockPayslip, id: 'p3', month: 3, netSalary: 2100 },
    { ...mockPayslip, id: 'p1', month: 1, netSalary: 2000 },
    { ...mockPayslip, id: 'p2', month: 2, netSalary: 2200 },
  ]

  it('ordina per mese crescente', () => {
    const trend = calculateNetTrend(payslips)
    expect(trend[0].month).toBe(1)
    expect(trend[1].month).toBe(2)
    expect(trend[2].month).toBe(3)
  })

  it('calcola correttamente netActual e netExpected', () => {
    const trend = calculateNetTrend([{ ...mockPayslip }])
    expect(trend[0].netActual).toBe(2100)
    expect(trend[0].netExpected).toBe(2100)
    expect(trend[0].delta).toBe(0)
  })

  it('ritorna array vuoto per input vuoto', () => {
    const trend = calculateNetTrend([])
    expect(trend).toHaveLength(0)
  })
})
