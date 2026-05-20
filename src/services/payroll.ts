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
import type { Payslip, Month, ApiResult } from '../types'

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
    return { data: docRef.id, loading: false, error: null }
  } catch (error) {
    return { data: null, loading: false, error: error as Error }
  }
}

/**
 * Aggiorna un cedolino esistente.
 */
export async function updatePayslip(
  uid: string,
  payslipId: string,
  updates: Partial<Omit<Payslip, 'id' | 'createdAt'>>
): Promise<ApiResult<void>> {
  try {
    const docRef = doc(db, COLLECTION(uid), payslipId)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
    return { data: undefined, loading: false, error: null }
  } catch (error) {
    return { data: null, loading: false, error: error as Error }
  }
}

/**
 * Elimina un cedolino.
 */
export async function deletePayslip(
  uid: string,
  payslipId: string
): Promise<ApiResult<void>> {
  try {
    const docRef = doc(db, COLLECTION(uid), payslipId)
    await deleteDoc(docRef)
    return { data: undefined, loading: false, error: null }
  } catch (error) {
    return { data: null, loading: false, error: error as Error }
  }
}

/**
 * Recupera un singolo cedolino.
 */
export async function getPayslip(
  uid: string,
  payslipId: string
): Promise<ApiResult<Payslip | null>> {
  try {
    const docRef = doc(db, COLLECTION(uid), payslipId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { data: null, loading: false, error: null }
    return { data: { id: snap.id, ...snap.data() } as Payslip, loading: false, error: null }
  } catch (error) {
    return { data: null, loading: false, error: error as Error }
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
    return { data: payslips, loading: false, error: null }
  } catch (error) {
    return { data: null, loading: false, error: error as Error }
  }
}

/**
 * Recupera il cedolino per un mese/anno specifico.
 */
export async function getPayslipByMonth(
  uid: string,
  year: number,
  month: Month
): Promise<ApiResult<Payslip | null>> {
  try {
    const colRef = collection(db, COLLECTION(uid))
    const q = query(
      colRef,
      where('year', '==', year),
      where('month', '==', month)
    )
    const snap = await getDocs(q)
    if (snap.empty) return { data: null, loading: false, error: null }
    const d = snap.docs[0]
    return { data: { id: d.id, ...d.data() } as Payslip, loading: false, error: null }
  } catch (error) {
    return { data: null, loading: false, error: error as Error }
  }
}

/**
 * Calcola trend netto mensile per un anno.
 * Ritorna array ordinato per mese con netto effettivo e atteso.
 */
export function calculateNetTrend(
  payslips: Payslip[]
): Array<{ month: Month; year: number; netActual: number; netExpected: number; delta: number }> {
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
