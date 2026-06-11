/**
 * financialOverview.ts
 * Servizio per il cruscotto di sintesi finanziaria (Financial Overview).
 * Issue #155 — [REDESIGN] Financial Overview
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { logAudit } from './audit'
import type {
  MonthlyOverview,
  AnnualFinancialStats,
  FixedExpense,
  ApiResult,
  Month,
} from '../types'
import { getPayslipByMonth, getPayslipsByYear } from './payroll'
import { getMutuoConfig } from './mutuo'
import { getAllInvestments } from './investment'

const FIXED_EXPENSES_COLLECTION = (uid: string) => `users/${uid}/fixedExpenses`

/**
 * Recupera le uscite ricorrenti manuali.
 */
export async function getFixedExpenses(uid: string): Promise<ApiResult<FixedExpense[]>> {
  try {
    const colRef = collection(db, FIXED_EXPENSES_COLLECTION(uid))
    const q = query(colRef, orderBy('label', 'asc'))
    const snap = await getDocs(q)
    const expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FixedExpense)
    return { success: true, data: expenses }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Salva una uscita ricorrente manuale.
 */
export async function saveFixedExpense(
  uid: string,
  data: Omit<FixedExpense, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<ApiResult<string>> {
  try {
    const isUpdate = !!data.id
    const colRef = collection(db, FIXED_EXPENSES_COLLECTION(uid))

    let docId = data.id ?? ''
    const payload = {
      ...data,
      updatedAt: serverTimestamp(),
    }

    if (isUpdate) {
      const docRef = doc(db, FIXED_EXPENSES_COLLECTION(uid), docId)
      await updateDoc(docRef, payload)
    } else {
      const docRef = await addDoc(colRef, {
        ...payload,
        createdAt: serverTimestamp(),
      })
      docId = docRef.id
    }

    await logAudit({
      uid,
      action: isUpdate ? 'update' : 'create',
      entityType: 'fixedExpense',
      entityId: docId,
      newValue: data,
    })

    return { success: true, data: docId }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Elimina una uscita ricorrente manuale.
 */
export async function deleteFixedExpense(uid: string, id: string): Promise<ApiResult<void>> {
  try {
    const docRef = doc(db, FIXED_EXPENSES_COLLECTION(uid), id)
    await deleteDoc(docRef)
    await logAudit({
      uid,
      action: 'delete',
      entityType: 'fixedExpense',
      entityId: id,
    })
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Calcola la sintesi finanziaria mensile.
 */
export async function getMonthlyOverview(
  uid: string,
  year: number,
  month: Month
): Promise<ApiResult<MonthlyOverview>> {
  try {
    // 1. Entrate (Cedolino)
    const payslipRes = await getPayslipByMonth(uid, year, month)
    const payslip = payslipRes.success ? payslipRes.data : null

    // 2. Uscite Auto (Mutuo)
    const mutuoRes = await getMutuoConfig(uid)
    const rataMutuo = mutuoRes.success ? mutuoRes.data.rataMensile : 0

    // 3. Uscite Auto (PAC + Previdenza)
    const invRes = await getAllInvestments(uid)
    const investments = invRes.success ? invRes.data : []

    const totalPac = investments
      .filter(i => i.isPac)
      .reduce((sum, i) => sum + (i.pacMonthlyAmount ?? 0), 0)

    // Previdenza dal cedolino (se presente) o da stima?
    // L'issue dice "Contributi mensili fondo pensione (calcolati automaticamente dai dati già presenti)"
    // Usiamo il dato dal cedolino se disponibile.
    const previdenza = payslip ? (payslip.fondoPensione ?? 0) : 0

    // 4. Uscite Manuali
    const manualExpensesRes = await getFixedExpenses(uid)
    const manualExpenses = manualExpensesRes.success ? manualExpensesRes.data : []
    const totalManual = manualExpenses.reduce((sum, exp) => {
      return sum + (exp.frequency === 'monthly' ? exp.amount : exp.amount / 12)
    }, 0)

    const netIncome = payslip ? payslip.netSalary : 0
    const fixedExpensesAuto = rataMutuo + totalPac + previdenza
    const estimatedSurplus = netIncome - fixedExpensesAuto - totalManual

    return {
      success: true,
      data: {
        year,
        month,
        netIncome,
        fixedExpensesAuto,
        fixedExpensesManual: Math.round(totalManual * 100) / 100,
        estimatedSurplus: Math.round(estimatedSurplus * 100) / 100,
        dataComplete: !!payslip
      }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Calcola statistiche annuali.
 */
export async function getAnnualStats(uid: string, year: number): Promise<ApiResult<AnnualFinancialStats>> {
  try {
    const payslipsRes = await getPayslipsByYear(uid, year)
    const payslips = payslipsRes.success ? payslipsRes.data : []

    if (payslips.length === 0) {
      return {
        success: true,
        data: {
          year,
          totalInvested: 0,
          savingsRate: 0,
          projectedYearEndSurplus: 0,
          avgMonthlySurplus: 0
        }
      }
    }

    // Totale investito nell'anno (PAC + investimenti diretti acquistati nell'anno)
    // Nota: Investment non ha una 'purchaseDate' chiara per investimenti diretti in questo schema v3 (ha createdAt)
    // ma usiamo createdAt come proxy per "acquistato nell'anno" se non è un PAC?
    // In realtà Investment ha 'createdAt' (Timestamp).

    const invRes = await getAllInvestments(uid)
    const investments = invRes.success ? invRes.data : []

    // Per i PAC: calcoliamo i versamenti effettuati nell'anno
    // Dovremmo interrogare pac_payments? Sì.
    const pacPaymentsCol = collection(db, `users/${uid}/pac_payments`)
    const startOfYear = Timestamp.fromDate(new Date(year, 0, 1))
    const endOfYear = Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59))
    const qPac = query(pacPaymentsCol, where('data', '>=', startOfYear), where('data', '<=', endOfYear))
    const snapPac = await getDocs(qPac)
    const totalPacInvested = snapPac.docs.reduce((sum, d) => sum + ((d.data().importo as number) ?? 0), 0)

    // Per investimenti diretti: quelli creati quest'anno (che non sono PAC)
    const directInvestments = investments.filter(i => {
      const createdDate = i.createdAt.toDate()
      return !i.isPac && createdDate.getFullYear() === year
    })
    const totalDirectInvested = directInvestments.reduce((sum, i) => sum + (i.quantity * i.avgCost), 0)

    const totalInvested = totalPacInvested + totalDirectInvested

    // Calcolo Surplus medio (parallelo per performance)
    const overviewPromises = Array.from({ length: 12 }, (_, i) => getMonthlyOverview(uid, year, (i + 1) as Month))
    const overviewResults = await Promise.all(overviewPromises)
    const monthlyOverviews = overviewResults
      .filter((res): res is { success: true; data: MonthlyOverview } => !!res.success && res.data.dataComplete)
      .map(res => res.data)

    const totalSurplus = monthlyOverviews.reduce((sum, o) => sum + o.estimatedSurplus, 0)
    const avgMonthlySurplus = monthlyOverviews.length > 0 ? totalSurplus / monthlyOverviews.length : 0

    const totalNetIncome = monthlyOverviews.reduce((sum, o) => sum + o.netIncome, 0)
    const savingsRate = totalNetIncome > 0 ? totalSurplus / totalNetIncome : 0

    const monthsRemaining = 12 - (new Date().getFullYear() === year ? new Date().getMonth() + 1 : 12)
    const projectedYearEndSurplus = totalSurplus + (avgMonthlySurplus * Math.max(0, monthsRemaining))

    return {
      success: true,
      data: {
        year,
        totalInvested: Math.round(totalInvested * 100) / 100,
        savingsRate: Math.round(savingsRate * 100) / 100,
        projectedYearEndSurplus: Math.round(projectedYearEndSurplus * 100) / 100,
        avgMonthlySurplus: Math.round(avgMonthlySurplus * 100) / 100
      }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Recupera il trend degli ultimi N mesi (parallelo per performance).
 */
export async function getTrend(uid: string, monthsCount: number): Promise<ApiResult<MonthlyOverview[]>> {
  try {
    const now = new Date()
    const trendPromises = Array.from({ length: monthsCount }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1 - i), 1)
      return getMonthlyOverview(uid, d.getFullYear(), (d.getMonth() + 1) as Month)
    })

    const trendResults = await Promise.all(trendPromises)
    const results = trendResults
      .filter((res): res is { success: true; data: MonthlyOverview } => !!res.success)
      .map(res => res.data)

    return { success: true, data: results }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
