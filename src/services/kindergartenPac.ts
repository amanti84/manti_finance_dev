/**
 * Service: Kindergarten PAC
 * Collection: users/{uid}/kindergarten_pacs
 * COMPLETELY isolated from src/services/pac.ts
 */
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { KindergartenPAC } from '../types/kindergarten'
import type { ApiResult } from '../types'

const pacCol = (uid: string) =>
  collection(db, 'users', uid, 'kindergarten_pacs')

export async function getKindergartenPACs(
  uid: string
): Promise<ApiResult<KindergartenPAC[]>> {
  try {
    const q = query(pacCol(uid), orderBy('startDate', 'desc'))
    const snap = await getDocs(q)
    const data = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as KindergartenPAC[]
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore lettura PAC kindergarten' }
  }
}

export async function addKindergartenPAC(
  uid: string,
  pac: Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResult<string>> {
  try {
    const docRef = await addDoc(pacCol(uid), {
      ...pac,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return { success: true, data: docRef.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore aggiunta PAC kindergarten' }
  }
}

export async function updateKindergartenPAC(
  uid: string,
  id: string,
  data: Partial<Omit<KindergartenPAC, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ApiResult<void>> {
  try {
    await updateDoc(doc(pacCol(uid), id), {
      ...data,
      updatedAt: serverTimestamp(),
    })
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore aggiornamento PAC kindergarten' }
  }
}

export async function deleteKindergartenPAC(
  uid: string,
  id: string
): Promise<ApiResult<void>> {
  try {
    await deleteDoc(doc(pacCol(uid), id))
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore eliminazione PAC kindergarten' }
  }
}

/** Calcola KPI esclusivamente sui PAC kindergarten */
export function calculateKindergartenPACKPIs(pacs: KindergartenPAC[]) {
  const totalPACMonthly = pacs.reduce((acc, p) => acc + p.monthlyAmount, 0)
  const totalPACInvested = pacs.reduce((acc, p) => acc + p.totalInvested, 0)
  const totalPACValue = pacs.reduce((acc, p) => acc + p.currentValue, 0)
  const pacGainLoss = totalPACValue - totalPACInvested
  const pacGainLossPercent = totalPACInvested > 0 ? (pacGainLoss / totalPACInvested) * 100 : 0
  return { totalPACMonthly, totalPACInvested, totalPACValue, pacGainLoss, pacGainLossPercent }
}
