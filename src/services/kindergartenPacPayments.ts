/**
 * Service: Kindergarten PAC Payments
 * Collection: users/{uid}/kindergarten_pac_payments
 * Uses shared PACSchedule from pacFrequency.ts
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
} from 'firebase/firestore'
import { db } from '../firebase'
import type { KindergartenPAC, KindergartenPACPayment } from '../types/kindergarten'
import { getPendingDates, calcNextScheduledDate } from '../types/pacFrequency'
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
// AUTO-PROCESS
// ---------------------------------------------------------------------------

export interface AutoPaymentResult {
  pacId: string
  pacName: string
  paymentsAdded: number
  totalAmount: number
}

export async function processKGPACAutoPayments(
  uid: string,
  pacs: KindergartenPAC[],
  updatePACFn: (id: string, data: Partial<Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<ApiResult<unknown>>
): Promise<AutoPaymentResult[]> {
  const today = new Date().toISOString().slice(0, 10)
  const results: AutoPaymentResult[] = []

  for (const pac of pacs) {
    if (!pac.schedule) continue
    const from = pac.lastPaymentDate ?? pac.startDate
    const pendingDates = getPendingDates(pac.schedule, from, today)
    if (pendingDates.length === 0) continue

    let addedCount = 0
    let totalAmount = 0
    let lastDate = from

    for (const date of pendingDates) {
      const res = await addKGPACPayment(uid, {
        pacId: pac.id,
        pacName: pac.name,
        date,
        amount: pac.monthlyAmount,
        priceAtPayment: pac.currentValue > 0 && (pac.quantity ?? 0) > 0
          ? pac.currentValue / (pac.quantity ?? 1)
          : 0,
        auto: true,
      })
      if (res.success) {
        addedCount++
        totalAmount += pac.monthlyAmount
        lastDate = date
      }
    }

    if (addedCount > 0) {
      const nextPaymentDate = calcNextScheduledDate(pac.schedule, lastDate, today)
      await updatePACFn(pac.id, {
        totalInvested: pac.totalInvested + totalAmount,
        lastPaymentDate: lastDate,
        nextPaymentDate,
      })
      results.push({ pacId: pac.id, pacName: pac.name, paymentsAdded: addedCount, totalAmount })
    }
  }

  return results
}
