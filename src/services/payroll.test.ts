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
  calculateSurplus,
  calculateSurplusAbsolute,
  getVariableComponents,
  calculateAnnualProjection,
  calculateYoYComparison,
  calculateAllocatableSurplus,
} from './payroll'
import type { Payslip, Month } from '../types'
import type { Timestamp } from 'firebase/firestore'

const makeTimestamp = (d: Date): Timestamp =>
  ({
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime(),
    isEqual: () => false,
  }) as unknown as Timestamp

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
  bonus: 0,
  rimborsiSpese: 0,
  parsed: false,
  createdAt: makeTimestamp(new Date()),
  updatedAt: makeTimestamp(new Date()),
}

const makePayslip = (overrides: Partial<Payslip> = {}): Payslip => ({
  ...mockPayslip,
  ...overrides,
})

const makePayslips12Months = (year: number, netSalary = 2800): Payslip[] =>
  Array.from({ length: 12 }, (_, i) =>
    makePayslip({
      id: `ps-${year}-${i}`,
      year,
      month: (i + 1) as Month,
      netSalary,
    })
  )

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

// ---------------------------------------------------------------------------
// V2 EXTENSIONS TESTS
// ---------------------------------------------------------------------------

describe('calculateSurplus', () => {
  it('happy path: calcola surplus corretto con ratio default 0.65', () => {
    const payslip = makePayslip({ netSalary: 2800, bonus: 0, rimborsiSpese: 0 })
    const result = calculateSurplus(payslip)
    expect(result.surplusGross).toBeGreaterThan(0)
    expect(result.netSalary).toBe(2800)
    expect(result.surplusGross).toBe(Math.round((2800 - 2800 * 0.65) * 100) / 100)
  })

  it('edge case: mese con bonus elevato aumenta surplus variabile', () => {
    const payslip = makePayslip({ netSalary: 4200, bonus: 1400, rimborsiSpese: 0 })
    const result = calculateSurplus(payslip)
    expect(result.bonusAmount).toBe(1400)
    expect(result.variableComponent).toBeGreaterThan(0)
    expect(result.stableComponent).toBe(2800)
  })

  it('edge case: rimborsi spese non contano come surplus', () => {
    const withRimborsi = makePayslip({ netSalary: 3100, bonus: 0, rimborsiSpese: 300 })
    const senza = makePayslip({ netSalary: 2800, bonus: 0, rimborsiSpese: 0 })
    const r1 = calculateSurplus(withRimborsi)
    const r2 = calculateSurplus(senza)
    expect(r1.rimborsiAmount).toBe(300)
    expect(r1.stableComponent).toBe(r2.stableComponent)
  })
})

describe('calculateSurplusAbsolute', () => {
  it('happy path: surplus con importo fisso esplicito', () => {
    const payslip = makePayslip({ netSalary: 2800 })
    const result = calculateSurplusAbsolute(payslip, 1800)
    expect(result.surplusGross).toBe(1000)
    expect(result.fixedExpenses).toBe(1800)
  })

  it('edge case: spese fisse uguali al netto = surplus zero', () => {
    const payslip = makePayslip({ netSalary: 2800 })
    const result = calculateSurplusAbsolute(payslip, 2800)
    expect(result.surplusGross).toBe(0)
  })

  it('edge case: spese fisse superiori al netto = surplus negativo (alert)', () => {
    const payslip = makePayslip({ netSalary: 2800 })
    const result = calculateSurplusAbsolute(payslip, 3200)
    expect(result.surplusGross).toBeLessThan(0)
  })
})

describe('getVariableComponents', () => {
  it('happy path: estrae bonus e rimborsi per anno', () => {
    const payslips = [
      makePayslip({ year: 2026, month: 1, bonus: 500, rimborsiSpese: 100 }),
      makePayslip({ year: 2026, month: 2, bonus: 0, rimborsiSpese: 0 }),
      makePayslip({ year: 2025, month: 12, bonus: 1000, rimborsiSpese: 0 }),
    ]
    const result = getVariableComponents(payslips, 2026)
    expect(result).toHaveLength(2)
    const gennaio = result.find((r) => r.month === 1)
    expect(gennaio?.bonus).toBe(500)
    expect(gennaio?.rimborsiSpese).toBe(100)
  })

  it('edge case: anno senza variabili restituisce array con valori zero', () => {
    const payslips = makePayslips12Months(2026)
    const result = getVariableComponents(payslips, 2026)
    result.forEach((r) => {
      expect(r.bonus).toBe(0)
      expect(r.rimborsiSpese).toBe(0)
    })
  })

  it('edge case: nessun cedolino per quell anno restituisce array vuoto', () => {
    const payslips = makePayslips12Months(2025)
    const result = getVariableComponents(payslips, 2026)
    expect(result).toHaveLength(0)
  })
})

describe('calculateAnnualProjection', () => {
  it('happy path: proiezione annuale con 12 mesi di dati', () => {
    const payslips = makePayslips12Months(2026, 2800)
    const result = calculateAnnualProjection(payslips, 2026)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.year).toBe(2026)
      expect(result.data.monthsElapsed).toBe(12)
      expect(result.data.projectedAnnualNet).toBeGreaterThan(0)
    }
  })

  it('edge case: solo 3 mesi di dati — proiezione comunque calcolata', () => {
    const payslips = makePayslips12Months(2026, 2800).slice(0, 3)
    const result = calculateAnnualProjection(payslips, 2026)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.monthsElapsed).toBe(3)
      expect(result.data.projectedAnnualNet).toBeGreaterThan(0)
    }
  })

  it('errore: array vuoto restituisce ApiResult con success false', () => {
    const result = calculateAnnualProjection([], 2026)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeDefined()
    }
  })
})

describe('calculateYoYComparison', () => {
  it('happy path: confronto YoY con dati completi per 2 anni', () => {
    const payslips2025 = makePayslips12Months(2025, 2600)
    const payslips2026 = makePayslips12Months(2026, 2800)
    const all = [...payslips2025, ...payslips2026]
    const result = calculateYoYComparison(all, 2026)
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data.avgNetCurrent ?? 0)).toBeGreaterThan((result.data.avgNetPrevious ?? 0))
      expect(result.data.netDeltaAbsolute).toBe(200)
      expect(result.data.netDeltaPercent).toBeGreaterThan(0)
    }
  })

  it('edge case: anno precedente senza dati — restituisce errore', () => {
    const payslips2026 = makePayslips12Months(2026, 2800)
    const result = calculateYoYComparison(payslips2026, 2026)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeDefined()
    }
  })

  it('errore: array vuoto restituisce ApiResult con success false', () => {
    const result = calculateYoYComparison([], 2026)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeDefined()
    }
  })
})

describe('calculateAllocatableSurplus', () => {
  it('happy path: surplus allocabile basato sugli ultimi 3 mesi', () => {
    const payslips = makePayslips12Months(2026, 2800)
    const result = calculateAllocatableSurplus(payslips)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.allocatableSurplus).toBeGreaterThan(0)
      expect(result.data.basedOnMonths).toBe(3)
      expect(result.data.confidence).toBeDefined()
    }
  })

  it('edge case: meno mesi del lookback — usa quelli disponibili', () => {
    const payslips = makePayslips12Months(2026, 2800).slice(0, 2)
    const result = calculateAllocatableSurplus(payslips, 3)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.basedOnMonths).toBeLessThanOrEqual(2)
    }
  })

  it('errore: array vuoto restituisce ApiResult con success false', () => {
    const result = calculateAllocatableSurplus([])
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeDefined()
    }
  })
})
