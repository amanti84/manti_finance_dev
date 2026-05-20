/**
 * payroll-v2.ts
 * Payroll Engine v2 — calcolo surplus mensile, componenti variabili,
 * proiezione annuale e confronto YoY.
 * Issue #9 — M2 Core Modules
 */
import type { Payslip, Month, ApiResult } from '../types'

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface SurplusBreakdown {
  month: Month
  year: number
  netSalary: number
  fixedExpenses: number
  surplusGross: number
  stableComponent: number
  variableComponent: number
  bonusAmount: number
  rimborsiAmount: number
}

export interface AnnualProjection {
  year: number
  monthsElapsed: number
  cumulativeNet: number
  cumulativeSurplus: number
  projectedAnnualNet: number
  projectedAnnualSurplus: number
  averageMonthlyNet: number
  averageMonthlySurplus: number
}

export interface YoYComparison {
  year: number
  previousYear: number
  avgNetCurrent: number
  avgNetPrevious: number
  netDeltaAbsolute: number
  netDeltaPercent: number
  avgSurplusCurrent: number
  avgSurplusPrevious: number
  surplusDeltaAbsolute: number
  surplusDeltaPercent: number
  totalBonusCurrent: number
  totalBonusPrevious: number
}

export interface MonthlyVariableComponents {
  month: Month
  year: number
  bonus: number
  rimborsiSpese: number
  totalVariable: number
  totalStable: number
  variableRatio: number
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Calcola il surplus mensile disponibile.
 * surplus = netto - spese fisse ricorrenti.
 * Le spese fisse vengono stimate come netto base (senza bonus/rimborsi)
 * moltiplicato per il coefficiente di spesa fisso passato come parametro.
 * Default: 65% del netto stabile va in spese fisse.
 */
export function calculateSurplus(
  payslip: Payslip,
  fixedExpenseRatio = 0.65
): SurplusBreakdown {
  const bonusAmount = payslip.bonus ?? 0
  const rimborsiAmount = payslip.rimborsiSpese ?? 0
  const variableComponent = bonusAmount + rimborsiAmount
  const stableComponent = payslip.netSalary - variableComponent
  const fixedExpenses = Math.round(stableComponent * fixedExpenseRatio * 100) / 100
  const surplusGross = Math.round((payslip.netSalary - fixedExpenses) * 100) / 100

  return {
    month: payslip.month,
    year: payslip.year,
    netSalary: payslip.netSalary,
    fixedExpenses,
    surplusGross,
    stableComponent,
    variableComponent,
    bonusAmount,
    rimborsiAmount,
  }
}

/**
 * Calcola il surplus con importo spese fisse esplicito (valore assoluto).
 * Utile quando l'utente registra manualmente le spese mensili.
 */
export function calculateSurplusAbsolute(
  payslip: Payslip,
  fixedExpensesAmount: number
): SurplusBreakdown {
  const bonusAmount = payslip.bonus ?? 0
  const rimborsiAmount = payslip.rimborsiSpese ?? 0
  const variableComponent = bonusAmount + rimborsiAmount
  const stableComponent = payslip.netSalary - variableComponent
  const surplusGross = Math.round((payslip.netSalary - fixedExpensesAmount) * 100) / 100

  return {
    month: payslip.month,
    year: payslip.year,
    netSalary: payslip.netSalary,
    fixedExpenses: fixedExpensesAmount,
    surplusGross,
    stableComponent,
    variableComponent,
    bonusAmount,
    rimborsiAmount,
  }
}

/**
 * Estrae i componenti variabili (bonus, rimborsi) da un array di cedolini
 * per un dato anno. Separa la quota stabile dalla variabile.
 */
export function getVariableComponents(
  payslips: Payslip[],
  year: number
): MonthlyVariableComponents[] {
  return payslips
    .filter((p) => p.year === year)
    .map((p) => {
      const bonus = p.bonus ?? 0
      const rimborsiSpese = p.rimborsiSpese ?? 0
      const totalVariable = bonus + rimborsiSpese
      const totalStable = p.netSalary - totalVariable
      const variableRatio =
        p.netSalary > 0 ? Math.round((totalVariable / p.netSalary) * 10000) / 100 : 0

      return {
        month: p.month,
        year: p.year,
        bonus,
        rimborsiSpese,
        totalVariable,
        totalStable,
        variableRatio,
      }
    })
    .sort((a, b) => a.month - b.month)
}

/**
 * Proiezione annuale basata sui cedolini disponibili fino al mese corrente.
 * Usa la media dei mesi disponibili per proiettare i mesi mancanti.
 * Non include componenti variabili una-tantum (bonus) nella proiezione.
 */
export function calculateAnnualProjection(
  payslips: Payslip[],
  year: number,
  fixedExpenseRatio = 0.65
): ApiResult<AnnualProjection> {
  const yearPayslips = payslips
    .filter((p) => p.year === year)
    .sort((a, b) => a.month - b.month)

  if (yearPayslips.length === 0) {
    return { success: false, error: `Nessun cedolino trovato per l'anno ${year}` }
  }

  const monthsElapsed = yearPayslips.length
  const cumulativeNet = yearPayslips.reduce((sum, p) => sum + p.netSalary, 0)

  // Surplus cumulativo: usa solo la quota stabile per la proiezione
  const cumulativeSurplus = yearPayslips.reduce((sum, p) => {
    const breakdown = calculateSurplus(p, fixedExpenseRatio)
    return sum + breakdown.surplusGross
  }, 0)

  const averageMonthlyNet = Math.round((cumulativeNet / monthsElapsed) * 100) / 100
  const averageMonthlySurplus = Math.round((cumulativeSurplus / monthsElapsed) * 100) / 100

  // Proiezione su 12 mesi (non include bonus straordinari)
  const stableMonthlyNet = yearPayslips.reduce((sum, p) => {
    const bonus = p.bonus ?? 0
    const rimborsi = p.rimborsiSpese ?? 0
    return sum + p.netSalary - bonus - rimborsi
  }, 0) / monthsElapsed

  const projectedAnnualNet =
    Math.round((stableMonthlyNet * 12 + yearPayslips.reduce((s, p) => s + (p.bonus ?? 0), 0)) * 100) / 100
  const projectedAnnualSurplus = Math.round(averageMonthlySurplus * 12 * 100) / 100

  return {
    success: true,
    data: {
      year,
      monthsElapsed,
      cumulativeNet: Math.round(cumulativeNet * 100) / 100,
      cumulativeSurplus: Math.round(cumulativeSurplus * 100) / 100,
      projectedAnnualNet,
      projectedAnnualSurplus,
      averageMonthlyNet,
      averageMonthlySurplus,
    },
  }
}

/**
 * Confronto Year-over-Year tra due anni.
 * Richiede almeno 1 cedolino per ciascun anno.
 */
export function calculateYoYComparison(
  payslips: Payslip[],
  currentYear: number,
  fixedExpenseRatio = 0.65
): ApiResult<YoYComparison> {
  const previousYear = currentYear - 1

  const currentPayslips = payslips.filter((p) => p.year === currentYear)
  const previousPayslips = payslips.filter((p) => p.year === previousYear)

  if (currentPayslips.length === 0) {
    return { success: false, error: `Nessun cedolino trovato per l'anno ${currentYear}` }
  }
  if (previousPayslips.length === 0) {
    return { success: false, error: `Nessun cedolino trovato per l'anno ${previousYear}` }
  }

  const avg = (arr: Payslip[], field: keyof Payslip): number => {
    const vals = arr.map((p) => (p[field] as number) ?? 0)
    return Math.round((vals.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100
  }

  const avgSurplus = (arr: Payslip[]): number => {
    const total = arr.reduce((sum, p) => sum + calculateSurplus(p, fixedExpenseRatio).surplusGross, 0)
    return Math.round((total / arr.length) * 100) / 100
  }

  const avgNetCurrent = avg(currentPayslips, 'netSalary')
  const avgNetPrevious = avg(previousPayslips, 'netSalary')
  const netDeltaAbsolute = Math.round((avgNetCurrent - avgNetPrevious) * 100) / 100
  const netDeltaPercent =
    avgNetPrevious > 0
      ? Math.round(((netDeltaAbsolute / avgNetPrevious) * 100) * 100) / 100
      : 0

  const avgSurplusCurrent = avgSurplus(currentPayslips)
  const avgSurplusPrevious = avgSurplus(previousPayslips)
  const surplusDeltaAbsolute = Math.round((avgSurplusCurrent - avgSurplusPrevious) * 100) / 100
  const surplusDeltaPercent =
    avgSurplusPrevious > 0
      ? Math.round(((surplusDeltaAbsolute / avgSurplusPrevious) * 100) * 100) / 100
      : 0

  const totalBonusCurrent = currentPayslips.reduce((s, p) => s + (p.bonus ?? 0), 0)
  const totalBonusPrevious = previousPayslips.reduce((s, p) => s + (p.bonus ?? 0), 0)

  return {
    success: true,
    data: {
      year: currentYear,
      previousYear,
      avgNetCurrent,
      avgNetPrevious,
      netDeltaAbsolute,
      netDeltaPercent,
      avgSurplusCurrent,
      avgSurplusPrevious,
      surplusDeltaAbsolute,
      surplusDeltaPercent,
      totalBonusCurrent,
      totalBonusPrevious,
    },
  }
}

/**
 * Calcola il surplus allocabile per il Decision Engine.
 * Restituisce il surplus stabile mensile medio degli ultimi N mesi.
 * Esclude bonus e rimborsi una-tantum per garantire una stima conservativa.
 */
export function calculateAllocatableSurplus(
  payslips: Payslip[],
  lookbackMonths = 3,
  fixedExpenseRatio = 0.65
): ApiResult<{ allocatableSurplus: number; basedOnMonths: number; confidence: 'high' | 'medium' | 'low' }> {
  if (payslips.length === 0) {
    return { success: false, error: 'Nessun cedolino disponibile' }
  }

  const sorted = [...payslips].sort((a, b) =>
    a.year !== b.year ? b.year - a.year : b.month - a.month
  )
  const recent = sorted.slice(0, lookbackMonths)
  const basedOnMonths = recent.length

  // Usa solo la quota stabile (esclude bonus e rimborsi)
  const stableSurpluses = recent.map((p) => {
    const onlyStable: Payslip = { ...p, bonus: 0, rimborsiSpese: 0 }
    return calculateSurplus(onlyStable, fixedExpenseRatio).surplusGross
  })

  const allocatableSurplus =
    Math.round((stableSurpluses.reduce((a, b) => a + b, 0) / basedOnMonths) * 100) / 100

  const confidence: 'high' | 'medium' | 'low' =
    basedOnMonths >= 3 ? 'high' : basedOnMonths === 2 ? 'medium' : 'low'

  return {
    success: true,
    data: { allocatableSurplus, basedOnMonths, confidence },
  }
}
