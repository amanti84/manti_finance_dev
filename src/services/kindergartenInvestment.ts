/**
 * Service: Kindergarten Investments
 * Collection: users/{uid}/kindergarten_investments
 * COMPLETELY isolated from src/services/investment.ts
 */
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { KindergartenInvestment } from '../types/kindergarten'
import type { ApiResult } from '../types'
import { logAudit } from './audit'

const investmentCol = (uid: string) =>
  collection(db, 'users', uid, 'kindergarten_investments')

export async function getKindergartenInvestments(
  uid: string
): Promise<ApiResult<KindergartenInvestment[]>> {
  try {
    const q = query(
      investmentCol(uid),
      orderBy('purchaseDate', 'asc'),
      orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    const data = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as KindergartenInvestment[]
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore lettura investimenti kindergarten' }
  }
}

export async function addKindergartenInvestment(
  uid: string,
  investment: Omit<KindergartenInvestment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResult<string>> {
  try {
    const docRef = await addDoc(investmentCol(uid), {
      ...investment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await logAudit({
      uid,
      action: 'create',
      entityType: 'investment',
      entityId: docRef.id,
      newValue: { ...investment, isKindergarten: true },
    })

    return { success: true, data: docRef.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore aggiunta investimento kindergarten' }
  }
}

export async function updateKindergartenInvestment(
  uid: string,
  id: string,
  data: Partial<Omit<KindergartenInvestment, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ApiResult<void>> {
  try {
    const docRef = doc(investmentCol(uid), id)
    const snap = await getDoc(docRef)
    const previousValue = snap.exists() ? snap.data() : undefined

    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })

    await logAudit({
      uid,
      action: 'update',
      entityType: 'investment',
      entityId: id,
      previousValue: previousValue as Record<string, unknown>,
      newValue: { ...data, isKindergarten: true },
    })

    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore aggiornamento investimento kindergarten' }
  }
}

export async function deleteKindergartenInvestment(
  uid: string,
  id: string
): Promise<ApiResult<void>> {
  try {
    const docRef = doc(investmentCol(uid), id)
    const snap = await getDoc(docRef)
    const previousValue = snap.exists() ? snap.data() : undefined

    await deleteDoc(docRef)

    await logAudit({
      uid,
      action: 'delete',
      entityType: 'investment',
      entityId: id,
      previousValue: previousValue as Record<string, unknown>,
    })

    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore eliminazione investimento kindergarten' }
  }
}

/** Calcola KPI esclusivamente sugli investimenti kindergarten */
export function calculateKindergartenInvestmentKPIs(investments: KindergartenInvestment[]) {
  const totalInvested = investments.reduce((acc, inv) => acc + inv.purchasePrice * inv.quantity, 0)
  const currentValue = investments.reduce((acc, inv) => acc + inv.currentPrice * inv.quantity, 0)
  const gainLoss = currentValue - totalInvested
  const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0
  return { totalInvested, currentValue, gainLoss, gainLossPercent }
}
