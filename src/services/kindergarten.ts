/**
 * kindergarten.ts
 * Servizio per gestione spese Kindergarten e isolamento area spese figli.
 * Issue #19 - Kindergarten module
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
  setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { logAudit } from './audit'
import type {
  KindergartenExpense,
  KindergartenConfig,
  KindergartenSummary,
  ApiResult,
  KindergartenCategory,
} from '../types'

const EXPENSES_COLLECTION = (uid: string) => `users/${uid}/kindergartenExpenses`
const CONFIG_DOC = (uid: string) => doc(db, `users/${uid}/config/kindergarten`)

/**
 * Recupera le spese kindergarten per un determinato anno.
 */
export async function getKindergartenExpenses(
  uid: string,
  year: number
): Promise<ApiResult<KindergartenExpense[]>> {
  try {
    const colRef = collection(db, EXPENSES_COLLECTION(uid))
    const q = query(
      colRef,
      where('year', '==', year),
      orderBy('month', 'asc'),
      orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    const expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as KindergartenExpense)
    return { success: true, data: expenses }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Aggiunge una nuova spesa kindergarten.
 */
export async function addKindergartenExpense(
  uid: string,
  expense: Omit<KindergartenExpense, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResult<KindergartenExpense>> {
  try {
    const colRef = collection(db, EXPENSES_COLLECTION(uid))
    const docRef = await addDoc(colRef, {
      ...expense,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    const savedSnap = await getDoc(docRef)
    const savedData = { id: savedSnap.id, ...savedSnap.data() } as KindergartenExpense

    await logAudit({
      uid,
      action: 'create',
      entityType: 'kindergartenExpense',
      entityId: savedData.id,
      newValue: savedData as unknown as Record<string, unknown>,
    })

    return { success: true, data: savedData }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Aggiorna una spesa kindergarten esistente.
 */
export async function updateKindergartenExpense(
  uid: string,
  id: string,
  data: Partial<Omit<KindergartenExpense, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ApiResult<KindergartenExpense>> {
  try {
    const docRef = doc(db, EXPENSES_COLLECTION(uid), id)
    const snap = await getDoc(docRef)
    if (!snap.exists()) {
      return { success: false, error: 'Spesa non trovata' }
    }
    const previousValue = snap.data()

    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })

    const savedSnap = await getDoc(docRef)
    const savedData = { id: savedSnap.id, ...savedSnap.data() } as KindergartenExpense

    await logAudit({
      uid,
      action: 'update',
      entityType: 'kindergartenExpense',
      entityId: id,
      previousValue: previousValue,
      newValue: savedData as unknown as Record<string, unknown>,
    })

    return { success: true, data: savedData }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Elimina una spesa kindergarten.
 */
export async function deleteKindergartenExpense(
  uid: string,
  id: string
): Promise<ApiResult<void>> {
  try {
    const docRef = doc(db, EXPENSES_COLLECTION(uid), id)
    const snap = await getDoc(docRef)
    if (!snap.exists()) {
      return { success: false, error: 'Spesa non trovata' }
    }
    const previousValue = snap.data()

    await deleteDoc(docRef)

    await logAudit({
      uid,
      action: 'delete',
      entityType: 'kindergartenExpense',
      entityId: id,
      previousValue: previousValue,
    })

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Recupera la configurazione kindergarten.
 */
export async function getKindergartenConfig(uid: string): Promise<ApiResult<KindergartenConfig>> {
  try {
    const snap = await getDoc(CONFIG_DOC(uid))
    if (!snap.exists()) {
      // Default config
      return {
        success: true,
        data: {
          id: 'kindergarten',
          monthlyBudget: 0,
          alertOnOverBudget: false,
        } as KindergartenConfig,
      }
    }
    return { success: true, data: { id: snap.id, ...snap.data() } as KindergartenConfig }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Salva la configurazione kindergarten.
 */
export async function setKindergartenConfig(
  uid: string,
  config: Omit<KindergartenConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResult<KindergartenConfig>> {
  try {
    const docRef = CONFIG_DOC(uid)
    const snap = await getDoc(docRef)
    const isUpdate = snap.exists()
    const previousValue = isUpdate ? snap.data() : undefined

    await setDoc(
      docRef,
      {
        ...config,
        updatedAt: serverTimestamp(),
        ...(isUpdate ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true }
    )

    const savedSnap = await getDoc(docRef)
    const savedData = { id: savedSnap.id, ...savedSnap.data() } as KindergartenConfig

    await logAudit({
      uid,
      action: isUpdate ? 'update' : 'create',
      entityType: 'kindergartenConfig',
      entityId: 'kindergarten',
      ...(previousValue ? { previousValue: previousValue } : {}),
      newValue: savedData as unknown as Record<string, unknown>,
    })

    return { success: true, data: savedData }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Calcola il riepilogo kindergarten per un determinato anno.
 */
export async function getKindergartenSummary(
  uid: string,
  year: number
): Promise<ApiResult<KindergartenSummary>> {
  try {
    const expensesResult = await getKindergartenExpenses(uid, year)
    if (!expensesResult.success) return expensesResult

    const configResult = await getKindergartenConfig(uid)
    if (!configResult.success) return configResult

    const expenses = expensesResult.data
    const config = configResult.data

    const totalAnnual = expenses.reduce((sum, e) => sum + e.amount, 0)

    // Calcolo media mensile basata sui mesi in cui ci sono state spese o sul numero di mesi trascorsi
    // Qui usiamo una logica semplice: totale annuale / 12
    const totalMonthly = totalAnnual / 12

    const byCategory: Record<KindergartenCategory, number> = {
      retta: 0,
      mensa: 0,
      attivita_extra: 0,
      materiale: 0,
      altro: 0,
    }

    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    let currentMonthTotal = 0

    expenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
      if (e.year === currentYear && e.month === currentMonth) {
        currentMonthTotal += e.amount
      }
    })

    return {
      success: true,
      data: {
        year,
        totalAnnual,
        totalMonthly,
        byCategory,
        budgetMonthly: config.monthlyBudget,
        isOverBudget: config.monthlyBudget > 0 && currentMonthTotal > config.monthlyBudget,
        currentMonthTotal,
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
