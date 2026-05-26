/**
 * payroll-v2.test.ts
 * Test suite per Payroll Engine v2
 * Issue #9 — M2 Core Modules
 */

import { describe, it, expect } from 'vitest'
import {
  calculateSurplus,
  calculateSurplusAbsolute,
  getVariableComponents,
  calculateAnnualProjection,
  calculateYoYComparison,
  calculateAllocatableSurplus,
} from './payroll-v2'
import type { Payslip, Month } from '../types'
import type { Timestamp } from 'firebase/firestore'

const makeTimestamp = (d: Date): Timestamp =>
  ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0,
     toDate: () => d, toMillis: () => d.getTime(),
     isEqual: () => false }) as unknown as Timestamp

// ---------------------------------------------------------------------------
// MOCK FIXTURES
// ---------------------------------------------------------------------------

const makePayslip = (overrides: Partial<Payslip> = {}): Payslip => ({
  id: 'test-id',
  year: 2026,
  month: 1,
  grossSalary: 4000,
  netSalary: 2800,
  irpef: 800,
  inps: 300,
  tfr: 200,
  fondoPensione: 100,
  bonus: 0,
  rimborsiSpese: 0,
  parsed: true,
  createdAt: makeTimestamp(new Date()),
  updatedAt: makeTimestamp(new Date()),
  ...overrides,
})

const makePayslips12Months = (year: number, netSalary = 2800): Payslip[] =>
  Array.from({ length: 12 }, (_, i) => makePayslip({
    id: `ps-${year}-${i}`,
    year,
    month: (i + 1) as Month,
    netSalary,
  }))

// ---------------------------------------------------------------------------
// 1. HAPPY PATH — calculateSurplus
// ---------------------------------------------------------------------------

describe('calculateSurplus', () => {
  it('happy path: calcola surplus corretto con ratio default 0.65', () => {
    const payslip = makePayslip({ netSalary: 2800, bonus: 0, rimborsiSpese: 0 })
    const result = calculateSurplus(payslip)
    // fixedExpenses = stableComponent * 0.65
    // stableComponent = netSalary - bonus - rimborsi = 2800
    // fixedExpenses = 2800 * 0.65 = 1820
    // surplus = 2800 - 1820 = 980
    expect(result.surplusGross).toBeGreaterThan(0)
    expect(result.netSalary).toBe(2800)
    expect(result.surplusGross).toBe(Math.round((2800 - 2800 * 0.65) * 100) / 100)
  })

  it('edge case: mese con bonus elevato aumenta surplus variabile', () => {
    const payslip = makePayslip({ netSalary: 4200, bonus: 1400, rimborsiSpese: 0 })
    const result = calculateSurplus(payslip)
    expect(result.bonusAmount).toBe(1400)
    expect(result.variableComponent).toBeGreaterThan(0)
    expect(result.stableComponent).toBe(2800) // netSalary - bonus
  })

  it('edge case: rimborsi spese non contano come surplus', () => {
    const withRimborsi = makePayslip({ netSalary: 3100, bonus: 0, rimborsiSpese: 300 })
    const senza = makePayslip({ netSalary: 2800, bonus: 0, rimborsiSpese: 0 })
    const r1 = calculateSurplus(withRimborsi)
    const r2 = calculateSurplus(senza)
    // I rimborsi non devono inflare il surplus stabile
    expect(r1.rimborsiAmount).toBe(300)
    expect(r1.stableComponent).toBe(r2.stableComponent)
  })
})

// ---------------------------------------------------------------------------
// 2. HAPPY PATH — calculateSurplusAbsolute
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 3. HAPPY PATH — getVariableComponents
// ---------------------------------------------------------------------------

describe('getVariableComponents', () => {
  it('happy path: estrae bonus e rimborsi per anno', () => {
    const payslips = [
      makePayslip({ year: 2026, month: 1, bonus: 500, rimborsiSpese: 100 }),
      makePayslip({ year: 2026, month: 2, bonus: 0, rimborsiSpese: 0 }),
      makePayslip({ year: 2025, month: 12, bonus: 1000, rimborsiSpese: 0 }),
    ]
    const result = getVariableComponents(payslips, 2026)
    expect(result).toHaveLength(2)
    const gennaio = result.find(r => r.month === 1)
    expect(gennaio?.bonus).toBe(500)
    expect(gennaio?.rimborsiSpese).toBe(100)
  })

  it('edge case: anno senza variabili restituisce array con valori zero', () => {
    const payslips = makePayslips12Months(2026)
    const result = getVariableComponents(payslips, 2026)
    result.forEach(r => {
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

// ---------------------------------------------------------------------------
// 4. HAPPY PATH — calculateAnnualProjection (ApiResult<T>)
// ---------------------------------------------------------------------------

describe('calculateAnnualProjection', () => {
  it('happy path: proiezione annuale con 12 mesi di dati', async () => {
    const payslips = makePayslips12Months(2026, 2800)
    const result = await calculateAnnualProjection(payslips, 2026)
    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.year).toBe(2026)
    expect(result.data?.monthsElapsed).toBe(12)
    expect(result.data?.projectedAnnualNet).toBeGreaterThan(0)
  })

  it('edge case: solo 3 mesi di dati — proiezione comunque calcolata', async () => {
    const payslips = makePayslips12Months(2026, 2800).slice(0, 3)
    const result = await calculateAnnualProjection(payslips, 2026)
    expect(result.error).toBeNull()
    expect(result.data?.monthsElapsed).toBe(3)
    expect(result.data?.projectedAnnualNet).toBeGreaterThan(0)
  })

  it('errore: array vuoto restituisce ApiResult con error !== null', async () => {
    const result = await calculateAnnualProjection([], 2026)
    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 5. HAPPY PATH — calculateYoYComparison (ApiResult<T>)
// ---------------------------------------------------------------------------

describe('calculateYoYComparison', () => {
  it('happy path: confronto YoY con dati completi per 2 anni', async () => {
    const payslips2025 = makePayslips12Months(2025, 2600)
    const payslips2026 = makePayslips12Months(2026, 2800)
    const all = [...payslips2025, ...payslips2026]
    const result = await calculateYoYComparison(all, 2026)
    expect(result.error).toBeNull()
    expect(result.data?.avgNetCurrent).toBeGreaterThan(result.data?.avgNetPrevious ?? 0)
    expect(result.data?.netDeltaAbsolute).toBe(200)
    expect(result.data?.netDeltaPercent).toBeGreaterThan(0)
  })

  it('edge case: anno precedente senza dati — delta = null o gestito', async () => {
    const payslips2026 = makePayslips12Months(2026, 2800)
    const result = await calculateYoYComparison(payslips2026, 2026)
    // Senza anno precedente deve restituire errore o delta gestito
    expect(result.data !== null || result.error !== null).toBe(true)
  })

  it('errore: array vuoto restituisce ApiResult con error !== null', async () => {
    const result = await calculateYoYComparison([], 2026)
    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 6. HAPPY PATH — calculateAllocatableSurplus (ApiResult<T>)
// ---------------------------------------------------------------------------

describe('calculateAllocatableSurplus', () => {
  it('happy path: surplus allocabile basato sugli ultimi 3 mesi', async () => {
    const payslips = makePayslips12Months(2026, 2800)
    const result = await calculateAllocatableSurplus(payslips)
    expect(result.error).toBeNull()
    expect(result.data?.allocatableSurplus).toBeGreaterThan(0)
    expect(result.data?.basedOnMonths).toBe(3)
    expect(result.data?.confidence).toBeDefined()
  })

  it('edge case: meno mesi del lookback — usa quelli disponibili', async () => {
    const payslips = makePayslips12Months(2026, 2800).slice(0, 2)
    const result = await calculateAllocatableSurplus(payslips, 3)
    expect(result.error).toBeNull()
    expect(result.data?.basedOnMonths).toBeLessThanOrEqual(2)
  })

  it('errore: array vuoto restituisce ApiResult con error !== null', async () => {
    const result = await calculateAllocatableSurplus([])
    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
  })
})
