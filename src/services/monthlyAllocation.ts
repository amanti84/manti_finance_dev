/**
 * monthlyAllocation.ts
 * Monthly Allocation Engine Service — calcola e gestisce l'allocazione del budget mensile.
 * Issue #88 — M3 Intelligence Layer
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { logAudit } from './audit'
import { getPayslipByMonth } from './payroll'
import { getMutuoConfig } from './mutuo'
import { getAllInvestments } from './investment'
import { getFixedExpenses } from './financialOverview'
import type {
  MonthlyAllocation,
  AllocationItem,
  ApiResult,
  Month,
} from '../types'

const COLLECTION = (uid: string) => `users/${uid}/monthlyAllocations`

/**
 * Recupera l'allocazione mensile per un dato mese/anno.
 */
export async function getMonthlyAllocation(
  uid: string,
  year: number,
  month: Month
): Promise<ApiResult<MonthlyAllocation | null>> {
  try {
    const docId = `${year}-${month}`
    const docRef = doc(db, COLLECTION(uid), docId)
    const snap = await getDoc(docRef)

    if (!snap.exists()) {
      return { success: true, data: null }
    }

    return { success: true, data: { id: snap.id, ...snap.data() } as MonthlyAllocation }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Crea o aggiorna un'allocazione mensile.
 */
export async function createOrUpdateAllocation(
  uid: string,
  data: Partial<MonthlyAllocation> & { year: number; month: Month }
): Promise<ApiResult<MonthlyAllocation>> {
  try {
    const docId = `${data.year}-${data.month}`
    const docRef = doc(db, COLLECTION(uid), docId)
    const snap = await getDoc(docRef)
    const isUpdate = snap.exists()

    const now = serverTimestamp()
    const allocationData = {
      ...data,
      updatedAt: now,
      ...(isUpdate ? {} : { createdAt: now, status: data.status ?? 'draft' }),
    }

    // Ricalcola totali se necessario
    if (data.allocations && data.netIncome !== undefined) {
      allocationData.totalAllocated = data.allocations.reduce((sum, item) => sum + item.amount, 0)
      allocationData.surplus = data.netIncome - allocationData.totalAllocated

      // Assicura che le percentuali siano aggiornate
      allocationData.allocations = data.allocations.map(item => ({
        ...item,
        percentage: data.netIncome! > 0 ? (item.amount / data.netIncome!) * 100 : 0
      }))
    }

    await setDoc(docRef, allocationData, { merge: true })

    const savedSnap = await getDoc(docRef)
    const savedData = { id: savedSnap.id, ...savedSnap.data() } as MonthlyAllocation

    await logAudit({
      uid,
      action: isUpdate ? 'update' : 'create',
      entityType: 'monthlyAllocation',
      entityId: docId,
      newValue: savedData as unknown as Record<string, unknown>,
    })

    return { success: true, data: savedData }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Conferma l'allocazione (irreversibile).
 */
export async function confirmAllocation(
  uid: string,
  year: number,
  month: Month
): Promise<ApiResult<void>> {
  try {
    const docId = `${year}-${month}`
    const docRef = doc(db, COLLECTION(uid), docId)
    const snap = await getDoc(docRef)

    if (!snap.exists()) {
      return { success: false, error: 'Allocazione non trovata' }
    }

    const currentData = snap.data() as MonthlyAllocation
    if (currentData.status === 'confirmed') {
      return { success: false, error: 'Allocazione già confermata' }
    }

    await updateDoc(docRef, {
      status: 'confirmed',
      confirmedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await logAudit({
      uid,
      action: 'update',
      entityType: 'monthlyAllocation',
      entityId: docId,
      newValue: { status: 'confirmed' },
    })

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Genera una bozza automatica basata sui dati esistenti.
 */
export async function generateDraftAllocation(
  uid: string,
  year: number,
  month: Month
): Promise<ApiResult<MonthlyAllocation>> {
  try {
    // 1. Recupera netto mensile
    const payrollRes = await getPayslipByMonth(uid, year, month)
    // Se non c'è per questo mese, proviamo a prendere l'ultimo disponibile
    const netIncome = payrollRes.success ? payrollRes.data.netSalary : 0

    const allocations: AllocationItem[] = []

    // 2. Rata Mutuo
    const mutuoRes = await getMutuoConfig(uid)
    if (mutuoRes.success && mutuoRes.data.rataMensile > 0) {
      allocations.push({
        id: 'auto-mutuo',
        label: 'Rata Mutuo',
        category: 'fixed_expense',
        amount: mutuoRes.data.rataMensile,
        percentage: netIncome > 0 ? (mutuoRes.data.rataMensile / netIncome) * 100 : 0,
        isAutoFilled: true,
        linkedServiceId: 'mutuo-config'
      })
    }

    // 3. PAC
    const investmentsRes = await getAllInvestments(uid)
    if (investmentsRes.success) {
      const pacs = investmentsRes.data.filter(inv => inv.isPac && inv.pacMonthlyAmount)
      pacs.forEach(pac => {
        allocations.push({
          id: `auto-pac-${pac.id}`,
          label: `PAC ${pac.name}`,
          category: 'investment',
          amount: pac.pacMonthlyAmount!,
          percentage: netIncome > 0 ? (pac.pacMonthlyAmount! / netIncome) * 100 : 0,
          isAutoFilled: true,
          linkedServiceId: pac.id
        })
      })
    }

    // 4. Spese Ricorrenti
    const expensesRes = await getFixedExpenses(uid)
    if (expensesRes.success) {
      expensesRes.data.forEach(exp => {
        let monthlyAmount = exp.amount
        if (exp.frequency === 'annual') monthlyAmount = exp.amount / 12

        allocations.push({
          id: `auto-exp-${exp.id}`,
          label: exp.label,
          category: 'fixed_expense',
          amount: Math.round(monthlyAmount * 100) / 100,
          percentage: netIncome > 0 ? (monthlyAmount / netIncome) * 100 : 0,
          isAutoFilled: true,
          linkedServiceId: exp.id
        })
      })
    }

    const totalAllocated = allocations.reduce((sum, item) => sum + item.amount, 0)
    const surplus = netIncome - totalAllocated

    const draft = {
      year,
      month,
      netIncome,
      allocations,
      totalAllocated: Math.round(totalAllocated * 100) / 100,
      surplus: Math.round(surplus * 100) / 100,
      status: 'draft' as const
    }

    return createOrUpdateAllocation(uid, draft)
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
