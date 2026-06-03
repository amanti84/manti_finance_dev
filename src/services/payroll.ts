/**
 * payroll.ts
 * Servizio per gestione cedolini (Payroll Engine v1)
 * Issue #8 - M2 Core Modules
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type {
  Payslip,
  Month,
  ApiResult,
  SurplusBreakdown,
  AnnualProjection,
  YoYComparison,
  MonthlyVariableComponents,
} from '../types'

const COLLECTION = (uid: string) => `users/${uid}/payslips`

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------

/**
 * Calcola il netto atteso sottraendo le detrazioni standard.
 * Formula: lordo - IRPEF - INPS + rimborsi + bonus
 */
export function calculateExpectedNet(data: Pick<Payslip, 'grossSalary' | 'irpef' | 'inps' | 'fondoPensione' | 'bonus' | 'rimborsiSpese'>): number {
  const { grossSalary, irpef, inps, fondoPensione, bonus = 0, rimborsiSpese = 0 } = data
  return grossSalary - irpef - inps - fondoPensione + bonus + rimborsiSpese
}

/**
 * Calcola la differenza tra netto atteso e netto effettivo.
 */
export function calculateNetDelta(payslip: Payslip): number {
  const expected = calculateExpectedNet(payslip)
  return payslip.netSalary - expected
}

// -------------------------------------------------------
// CRUD OPERATIONS
// -------------------------------------------------------

/**
 * Crea un nuovo cedolino per l'utente.
 */
export async function createPayslip(
  uid: string,
  data: Omit<Payslip, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResult<string>> {
  try {
    const colRef = collection(db, COLLECTION(uid))
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return { success: true, data: docRef.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Aggiorna un cedolino esistente.
 */
export async function updatePayslip(
  uid: string,
  payslipId: string,
  updates: Partial<Omit<Payslip, 'id' | 'createdAt'>>
): Promise<ApiResult<undefined>> {
  try {
    const docRef = doc(db, COLLECTION(uid), payslipId)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Elimina un cedolino.
 */
export async function deletePayslip(
  uid: string,
  payslipId: string
): Promise<ApiResult<undefined>> {
  try {
    const docRef = doc(db, COLLECTION(uid), payslipId)
    await deleteDoc(docRef)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Recupera un singolo cedolino.
 */
export async function getPayslip(
  uid: string,
  payslipId: string
): Promise<ApiResult<Payslip>> {
  try {
    const docRef = doc(db, COLLECTION(uid), payslipId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: false, error: 'Cedolino non trovato' }
    return { success: true, data: { id: snap.id, ...snap.data() } as Payslip }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Recupera tutti i cedolini per anno (storico).
 */
export async function getPayslipsByYear(
  uid: string,
  year: number
): Promise<ApiResult<Payslip[]>> {
  try {
    const colRef = collection(db, COLLECTION(uid))
    const q = query(
      colRef,
      where('year', '==', year),
      orderBy('month', 'asc')
    )
    const snap = await getDocs(q)
    const payslips = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Payslip)
    return { success: true, data: payslips }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Recupera il cedolino per un mese/anno specifico.
 */
export async function getPayslipByMonth(
  uid: string,
  year: number,
  month: Month
): Promise<ApiResult<Payslip>> {
  try {
    const colRef = collection(db, COLLECTION(uid))
    const q = query(
      colRef,
      where('year', '==', year),
      where('month', '==', month)
    )
    const snap = await getDocs(q)
    if (snap.empty) return { success: false, error: 'Cedolino non trovato' }
    const d = snap.docs[0]
    return { success: true, data: { id: d.id, ...d.data() } as Payslip }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Calcola trend netto mensile per un anno.
 * Ritorna array ordinato per mese con netto effettivo e atteso.
 */
export function calculateNetTrend(
  payslips: Payslip[]
): { month: Month; year: number; netActual: number; netExpected: number; delta: number }[] {
  return payslips
    .sort((a, b) => a.month - b.month)
    .map(p => ({
      month: p.month,
      year: p.year,
      netActual: p.netSalary,
      netExpected: calculateExpectedNet(p),
      delta: calculateNetDelta(p),
    }))
}

/**
 * Recupera tutti i cedolini per l'utente.
 */
export async function getPayslips(uid: string): Promise<ApiResult<Payslip[]>> {
  try {
    const colRef = collection(db, COLLECTION(uid))
    const q = query(colRef, orderBy('year', 'desc'), orderBy('month', 'desc'))
    const snap = await getDocs(q)
    const payslips = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Payslip)
    return { success: true, data: payslips }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// ---------------------------------------------------------------------------
// V2 EXTENSIONS — SURPLUS & PROJECTIONS
// ---------------------------------------------------------------------------

/**
 * Calcola il surplus mensile disponibile.
 * surplus = netto - spese fisse ricorrenti.
 * Le spese fisse vengono stimate come netto base (senza bonus/rimborsi)
 * moltiplicato per il coefficiente di spesa fisso passato come parametro.
 * Default: 65% del netto stabile va in spese fisse.
 */
export function calculateSurplus(payslip: Payslip, fixedExpenseRatio = 0.65): SurplusBreakdown {
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
export function getVariableComponents(payslips: Payslip[], year: number): MonthlyVariableComponents[] {
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
        rimborsi: rimborsiSpese,
        total: totalVariable,
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
  const stableMonthlyNet =
    yearPayslips.reduce((sum, p) => {
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
      projectedGross: 0,
      projectedNet: projectedAnnualNet,
      projectedBonus: yearPayslips.reduce((s, p) => s + (p.bonus ?? 0), 0),
      projectedTFR: yearPayslips.reduce((s, p) => s + (p.tfr ?? 0), 0),
      projectedFondoPensione: yearPayslips.reduce((s, p) => s + (p.fondoPensione ?? 0), 0),
      monthsRemaining: 12 - monthsElapsed,
      confidence: 'medium' as const,
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
    const total = arr.reduce(
      (sum, p) => sum + calculateSurplus(p, fixedExpenseRatio).surplusGross,
      0
    )
    return Math.round((total / arr.length) * 100) / 100
  }

  const avgNetCurrent = avg(currentPayslips, 'netSalary')
  const avgNetPrevious = avg(previousPayslips, 'netSalary')
  const netDeltaAbsolute = Math.round((avgNetCurrent - avgNetPrevious) * 100) / 100
  const netDeltaPercent =
    avgNetPrevious > 0 ? Math.round((netDeltaAbsolute / avgNetPrevious) * 100 * 100) / 100 : 0

  const avgSurplusCurrent = avgSurplus(currentPayslips)
  const avgSurplusPrevious = avgSurplus(previousPayslips)
  const surplusDeltaAbsolute = Math.round((avgSurplusCurrent - avgSurplusPrevious) * 100) / 100
  const surplusDeltaPercent =
    avgSurplusPrevious > 0
      ? Math.round((surplusDeltaAbsolute / avgSurplusPrevious) * 100 * 100) / 100
      : 0

  const totalBonusCurrent = currentPayslips.reduce((s, p) => s + (p.bonus ?? 0), 0)
  const totalBonusPrevious = previousPayslips.reduce((s, p) => s + (p.bonus ?? 0), 0)

  return {
    success: true,
    data: {
      year: currentYear,
      currentYear,
      previousYear,
      netSalaryDelta: avgNetCurrent - avgNetPrevious,
      netSalaryDeltaPercent: netDeltaPercent,
      grossSalaryDelta: 0,
      bonusDelta: totalBonusCurrent - totalBonusPrevious,
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
