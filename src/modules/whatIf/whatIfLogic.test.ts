import { describe, it, expect } from 'vitest'

// Since the logic is inside components with useMemo, we'll extract core functions
// or test them via a pure function if we can refactor them.
// For now, I'll implement pure versions of the logic for testing.

export const calculateMortgageScenario = (
  config: { debitoResiduo: number; tasso: number; rataMensile: number },
  anticipo: number,
  mode: 'duration' | 'payment'
) => {
  const p = config.debitoResiduo
  const pPrime = Math.max(0, p - anticipo)
  const annualRate = config.tasso / 100
  const i = annualRate / 12
  const currentR = config.rataMensile

  const n = -Math.log(1 - (p * i) / currentR) / Math.log(1 + i)
  const remainingMonths = Math.ceil(n)
  const currentTotalInterests = (currentR * n) - p

  if (mode === 'duration') {
    if (pPrime === 0) return { risparmioInteressi: currentTotalInterests, mesiRisparmiati: remainingMonths }
    const nPrime = -Math.log(1 - (pPrime * i) / currentR) / Math.log(1 + i)
    const newRemainingMonths = Math.ceil(nPrime)
    const newTotalInterests = (currentR * nPrime) - pPrime
    return {
      risparmioInteressi: Math.round((currentTotalInterests - newTotalInterests) * 100) / 100,
      mesiRisparmiati: remainingMonths - newRemainingMonths
    }
  } else {
    const factor = (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
    const newR = pPrime * factor
    const newTotalInterests = (newR * n) - pPrime
    return {
      risparmioInteressi: Math.round((currentTotalInterests - newTotalInterests) * 100) / 100,
      deltaRata: Math.round((currentR - newR) * 100) / 100
    }
  }
}

export const calculateCompoundInterest = (
  initialCapital: number,
  monthlyAmount: number,
  annualRate: number,
  years: number
) => {
  const rMensile = annualRate / 100 / 12
  const mesi = years * 12
  let capital = initialCapital
  for (let m = 1; m <= mesi; m++) {
    capital = (capital + monthlyAmount) * (1 + rMensile)
  }
  return Math.round(capital)
}

describe('What-If Logic: Mutuo', () => {
  const mockConfig = { debitoResiduo: 100000, tasso: 3, rataMensile: 500 }

  it('calcola correttamente risparmio interessi riducendo durata', () => {
    const res = calculateMortgageScenario(mockConfig, 10000, 'duration')
    expect(res.risparmioInteressi).toBeGreaterThan(0)
    expect(res.mesiRisparmiati).toBeGreaterThan(0)
  })

  it('calcola correttamente risparmio interessi riducendo rata', () => {
    const res = calculateMortgageScenario(mockConfig, 10000, 'payment')
    expect(res.risparmioInteressi).toBeGreaterThan(0)
    if ('deltaRata' in res) {
      expect(res.deltaRata).toBeCloseTo(50, 0) // Roughly 10% of 500
    } else {
      throw new Error('deltaRata should be present')
    }
  })

  it('gestisce estinzione totale', () => {
    const res = calculateMortgageScenario(mockConfig, 100000, 'duration')
    expect(res.mesiRisparmiati).toBeGreaterThan(200)
  })
})

describe('What-If Logic: PAC (Compound Interest)', () => {
  it('calcola correttamente interesse composto', () => {
    const res = calculateCompoundInterest(0, 100, 7, 10)
    // Formula: 100 * ((1 + 0.07/12)^(120) - 1) / (0.07/12) * (1 + 0.07/12)
    // ~ 17409
    expect(res).toBeGreaterThan(17000)
    expect(res).toBeLessThan(18000)
  })

  it('include capitale iniziale', () => {
    const res = calculateCompoundInterest(10000, 0, 7, 10)
    // 10000 * (1 + 0.07/12)^120 = ~ 20096
    expect(res).toBeCloseTo(20096, -1)
  })
})

export const calculateRebalancingDelta = (
  totals: Record<string, number>,
  totalValue: number,
  targets: Record<string, number>
) => {
  const deltas: Record<string, number> = {}
  Object.entries(targets).forEach(([cat, targetPct]) => {
    const currentVal = totals[cat] || 0
    const targetVal = (totalValue * targetPct) / 100
    deltas[cat] = Math.round((targetVal - currentVal) * 100) / 100
  })
  return deltas
}

export const calculateRetirementGap = (
  currentAge: number,
  targetAge: number,
  currentBalance: number,
  annualContribution: number,
  expectedReturn: number,
  currentRal: number
) => {
  const n = Math.max(0, targetAge - currentAge)
  const r = expectedReturn / 100

  let projectedMontante = currentBalance
  if (r > 0) {
    projectedMontante = currentBalance * Math.pow(1 + r, n) +
                       annualContribution * ((Math.pow(1 + r, n) - 1) / r)
  } else {
    projectedMontante = currentBalance + (annualContribution * n)
  }

  const baseReplacementRate = 0.75
  const penaltyPerYear = 0.02
  const yearsBefore67 = 67 - targetAge
  const estimatedReplacementRate = Math.max(0.3, baseReplacementRate - (yearsBefore67 * penaltyPerYear))

  const annualPensionTarget = (currentRal * estimatedReplacementRate)
  const capitalNeeded = annualPensionTarget * 25
  const gap = Math.max(0, capitalNeeded - projectedMontante)

  return { projectedMontante, gap }
}

describe('What-If Logic: Portfolio Rebalancing', () => {
  it('calcola correttamente i delta di ribilanciamento', () => {
    const totals = { azioni: 8000, obbligazioni: 2000 }
    const targets = { azioni: 60, obbligazioni: 40 }
    const deltas = calculateRebalancingDelta(totals, 10000, targets)

    expect(deltas.azioni).toBe(-2000) // 6000 - 8000
    expect(deltas.obbligazioni).toBe(2000) // 4000 - 2000
  })
})

describe('What-If Logic: Pensione', () => {
  it('calcola il gap pensionistico', () => {
    const res = calculateRetirementGap(40, 60, 50000, 5000, 5, 50000)
    expect(res.projectedMontante).toBeGreaterThan(50000)
    expect(res.gap).toBeDefined()
  })

  it('gestisce età target già raggiunta', () => {
    const res = calculateRetirementGap(60, 60, 50000, 5000, 5, 50000)
    expect(res.projectedMontante).toBe(50000)
  })
})
