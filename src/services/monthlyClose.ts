/**
 * monthlyClose.ts
 * Servizio per gestione chiusura mensile e consolidamento patrimonio
 * Issue #26 - M2 Core Modules
 */
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { MonthlyCloseResult, MonthStatus, Month, ApiResult } from '../types'
import { getPayslipByMonth, getPayslips } from './payroll'
import { getAvailableBalance } from './cashflow'
import { getAllInvestments } from './investment'
import { getMutuoConfig } from './mutuo'
import { getAllPensionFunds } from './previdenza'
import { createSnapshot } from './snapshot'
import { logAudit } from './audit'

const COLLECTION = (uid: string) => `users/${uid}/monthlyClose`

/**
 * Genera il document ID nel formato YYYY-MM.
 */
export function buildMonthlyCloseId(year: number, month: Month): string {
  const mm = String(month).padStart(2, '0')
  return `${year}-${mm}`
}

/**
 * Valida che il mese abbia almeno 1 cedolino inserito.
 */
export async function validateMonth(
  uid: string,
  year: number,
  month: Month
): Promise<ApiResult<boolean>> {
  try {
    const payslipResult = await getPayslipByMonth(uid, year, month)
    if (!payslipResult.success) {
      return { success: false, error: `Cedolino mancante per ${month}/${year}` }
    }
    return { success: true, data: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Legge lo stato del mese corrente.
 */
export async function getMonthStatus(
  uid: string,
  year: number,
  month: Month
): Promise<ApiResult<MonthStatus>> {
  try {
    const id = buildMonthlyCloseId(year, month)
    const docRef = doc(db, COLLECTION(uid), id)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: true, data: 'open' }
    const data = snap.data() as MonthlyCloseResult
    return { success: true, data: data.status }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Lista storico chiusure.
 */
export async function getMonthlyCloseHistory(
  uid: string
): Promise<ApiResult<MonthlyCloseResult[]>> {
  try {
    const colRef = collection(db, COLLECTION(uid))
    const q = query(colRef, orderBy('year', 'desc'), orderBy('month', 'desc'))
    const snap = await getDocs(q)
    const history = snap.docs.map((d) => d.data() as MonthlyCloseResult)
    return { success: true, data: history }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Esegue la chiusura: crea snapshot + logAudit + imposta status CLOSED.
 */
export async function closeMonth(
  uid: string,
  year: number,
  month: Month
): Promise<ApiResult<MonthlyCloseResult>> {
  try {
    // 1. Validazione
    const validation = await validateMonth(uid, year, month)
    if (!validation.success) return { success: false, error: validation.error }

    // 2. Verifica se già chiuso
    const statusResult = await getMonthStatus(uid, year, month)
    if (statusResult.success && (statusResult.data as string).toLowerCase() !== 'open') {
      return { success: false, error: `Mese ${month}/${year} già chiuso o bloccato` }
    }

    // 3. Aggregazione dati per snapshot
    const [balanceRes, investRes, mutuoRes, pensionRes, payslipsRes] = await Promise.all([
      getAvailableBalance(uid),
      getAllInvestments(uid),
      getMutuoConfig(uid),
      getAllPensionFunds(uid),
      getPayslips(uid),
    ])

    if (!balanceRes.success) return { success: false, error: balanceRes.error }
    if (!investRes.success) return { success: false, error: investRes.error }
    if (!mutuoRes.success) return { success: false, error: mutuoRes.error }
    if (!pensionRes.success) return { success: false, error: pensionRes.error }
    if (!payslipsRes.success) return { success: false, error: payslipsRes.error }

    const contiCorrenti = balanceRes.data.totalBalance
    const investimenti = investRes.data.reduce((sum, inv) => sum + inv.currentValue, 0)
    const mutuo = mutuoRes.data.debitoResiduo ?? 0
    const fondoPensione = pensionRes.data.reduce((sum, f) => sum + f.saldoAttuale, 0)
    const tfr = payslipsRes.data.reduce((sum, p) => sum + (p.tfr || 0), 0)

    // 4. Creazione Snapshot
    const snapshot = await createSnapshot({
      uid,
      year,
      month,
      contiCorrenti,
      investimenti,
      immobili: 0, // Da implementare se richiesto in futuro
      fondoPensione,
      tfr,
      mutuo,
      altriDebiti: 0,
      note: `Chiusura automatica mese ${month}/${year}`,
    })

    // 5. Salvataggio record chiusura
    const closeResult: MonthlyCloseResult = {
      id: buildMonthlyCloseId(year, month),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      month,
      year,
      status: 'closed',
      snapshotId: snapshot.id,
      closedAt: Timestamp.now(),
      patrimonioNetto: contiCorrenti + investimenti + fondoPensione + tfr - mutuo,
      surplusMensile: 0,
      netSalary: 0,
      fixedExpenses: 0,
    }

    const id = buildMonthlyCloseId(year, month)
    await setDoc(doc(db, COLLECTION(uid), id), closeResult)

    // 6. Audit Trail
    await logAudit({
      uid,
      action: 'snapshot',
      entityType: 'monthlyClose',
      entityId: id,
      newValue: { ...closeResult },
    })

    return { success: true, data: closeResult }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
