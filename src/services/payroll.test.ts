/**
 * payroll.test.ts
 * Unit test per le funzioni di calcolo del Payroll Engine v1
 * Issue #8 - M2 Core Modules
 */
import { describe, it, expect } from 'vitest'
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
    const delta = calculateNetDelta({ ...mockPayslip, netSalary: 1900 })
    expect(delta).toBe(-200)
  })
})

describe('calculateNetTrend', () => {
  it('ritorna array vuoto per input vuoto', () => {
    expect(calculateNetTrend([])).toEqual([])
  })

  it('ordina cedolini per mese', () => {
    const payslips: Payslip[] = [
      { ...mockPayslip, id: '3', month: 3 },
      { ...mockPayslip, id: '1', month: 1 },
      { ...mockPayslip, id: '2', month: 2 },
    ]
    const trend = calculateNetTrend(payslips)
    expect(trend[0].month).toBe(1)
    expect(trend[1].month).toBe(2)
    expect(trend[2].month).toBe(3)
  })

  it('calcola correttamente tutti i campi del trend', () => {
    const trend = calculateNetTrend([mockPayslip])
    expect(trend).toHaveLength(1)
    expect(trend[0]).toMatchObject({
      month: 1,
      year: 2026,
      netActual: 2100,
      netExpected: 2100,
      delta: 0,
    })
  })
})
