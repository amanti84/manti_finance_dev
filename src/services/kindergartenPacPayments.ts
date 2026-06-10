/**
 * Service: Kindergarten PAC Payments
 * Collection: users/{uid}/kindergarten_pac_payments
 * Mirrors adult pac.ts logic — completely isolated.
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
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { KindergartenPAC, KindergartenPACPayment, KGPACFrequency } from '../types/kindergarten'
import type { ApiResult } from '../types'

const paymentsCol = (uid: string) =>
  collection(db, 'users', uid, 'kindergarten_pac_payments')

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function addKGPACPayment(
  uid: string,
  data: Omit<KindergartenPACPayment, 'id' | 'quantityPurchased' | 'createdAt' | 'updatedAt'>
): Promise<ApiResult<string>> {
  try {
    const quantityPurchased = data.priceAtPayment > 0
      ? Math.round((data.amount / data.priceAtPayment) * 100000) / 100000
      : 0
    const docRef = await addDoc(paymentsCol(uid), {
      ...data,
      quantityPurchased,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return { success: true, data: docRef.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore aggiunta pagamento KG PAC' }
  }
}

export async function getKGPACPaymentsByPAC(
  uid: string,
  pacId: string
): Promise<ApiResult<KindergartenPACPayment[]>> {
  try {
    const q = query(
      paymentsCol(uid),
      where('pacId', '==', pacId),
      orderBy('date', 'desc')
    )
    const snap = await getDocs(q)
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as KindergartenPACPayment[]
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore lettura pagamenti KG PAC' }
  }
}

export async function getAllKGPACPayments(
  uid: string
): Promise<ApiResult<KindergartenPACPayment[]>> {
  try {
    const q = query(paymentsCol(uid), orderBy('date', 'desc'))
    const snap = await getDocs(q)
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as KindergartenPACPayment[]
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore lettura tutti pagamenti KG PAC' }
  }
}

export async function deleteKGPACPayment(
  uid: string,
  paymentId: string
): Promise<ApiResult<void>> {
  try {
    await deleteDoc(doc(paymentsCol(uid), paymentId))
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore eliminazione pagamento KG PAC' }
  }
}

export async function updateKGPACPayment(
  uid: string,
  paymentId: string,
  data: Partial<Omit<KindergartenPACPayment, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ApiResult<void>> {
  try {
    await updateDoc(doc(paymentsCol(uid), paymentId), {
      ...data,
      updatedAt: serverTimestamp(),
    })
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore aggiornamento pagamento KG PAC' }
  }
}

// ---------------------------------------------------------------------------
// DATE UTILS
// ---------------------------------------------------------------------------

/**
 * Calcola la prossima data di pagamento in base alla frequenza.
 * - monthly:  stesso dayOfMonth del mese successivo (o dayOfMonth specificato)
 * - biweekly: +14 giorni
 * - daily:    +1 giorno
 */
export function calcNextPaymentDate(
  from: string,       // ISO date dell'ultimo pagamento
  frequency: KGPACFrequency,
  dayOfMonth?: number
): string {
  const d = new Date(from)
  switch (frequency) {
    case 'monthly': {
      const next = new Date(d)
      next.setMonth(next.getMonth() + 1)
      if (dayOfMonth) next.setDate(Math.min(dayOfMonth, daysInMonth(next.getFullYear(), next.getMonth())))
      return next.toISOString().slice(0, 10)
    }
    case 'biweekly': {
      const next = new Date(d)
      next.setDate(next.getDate() + 14)
      return next.toISOString().slice(0, 10)
    }
    case 'daily': {
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      return next.toISOString().slice(0, 10)
    }
  }
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Dato un PAC, restituisce tutte le date di pagamento scadute tra
 * lastPaymentDate (esclusa) e oggi (inclusa).
 */
export function getPendingPaymentDates(
  pac: KindergartenPAC,
  today: string = new Date().toISOString().slice(0, 10)
): string[] {
  const start = pac.lastPaymentDate ?? pac.startDate
  const pending: string[] = []
  let cursor = calcNextPaymentDate(start, pac.frequency, pac.dayOfMonth)
  while (cursor <= today) {
    pending.push(cursor)
    cursor = calcNextPaymentDate(cursor, pac.frequency, pac.dayOfMonth)
    // safety: max 1000 iterazioni
    if (pending.length > 1000) break
  }
  return pending
}

// ---------------------------------------------------------------------------
// AUTO-PROCESS
// ---------------------------------------------------------------------------

export interface AutoPaymentResult {
  pacId: string
  pacName: string
  paymentsAdded: number
  totalAmount: number
}

/**
 * Controlla tutti i PAC KG e registra automaticamente i versamenti scaduti.
 * Aggiorna totalInvested, lastPaymentDate e nextPaymentDate sul PAC.
 * Restituisce il report dei versamenti aggiunti.
 */
export async function processKGPACAutoPayments(
  uid: string,
  pacs: KindergartenPAC[],
  updatePACFn: (id: string, data: Partial<Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<ApiResult<unknown>>
): Promise<AutoPaymentResult[]> {
  const today = new Date().toISOString().slice(0, 10)
  const results: AutoPaymentResult[] = []

  for (const pac of pacs) {
    const pendingDates = getPendingPaymentDates(pac, today)
    if (pendingDates.length === 0) continue

    let addedCount = 0
    let totalAmount = 0
    let lastDate = pac.lastPaymentDate ?? pac.startDate

    for (const date of pendingDates) {
      const paymentData: Omit<KindergartenPACPayment, 'id' | 'quantityPurchased' | 'createdAt' | 'updatedAt'> = {
        pacId: pac.id,
        pacName: pac.name,
        date,
        amount: pac.monthlyAmount,
        priceAtPayment: pac.currentValue > 0 && (pac.quantity ?? 0) > 0
          ? pac.currentValue / (pac.quantity ?? 1)
          : 0,
        auto: true,
      }
      const res = await addKGPACPayment(uid, paymentData)
      if (res.success) {
        addedCount++
        totalAmount += pac.monthlyAmount
        lastDate = date
      }
    }

    if (addedCount > 0) {
      const newTotalInvested = pac.totalInvested + totalAmount
      const nextPaymentDate = calcNextPaymentDate(lastDate, pac.frequency, pac.dayOfMonth)
      await updatePACFn(pac.id, {
        totalInvested: newTotalInvested,
        lastPaymentDate: lastDate,
        nextPaymentDate,
      })
      results.push({ pacId: pac.id, pacName: pac.name, paymentsAdded: addedCount, totalAmount })
    }
  }

  return results
}
