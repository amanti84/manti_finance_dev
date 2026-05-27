/**
 * cashflow.ts
 * Servizio per gestione Cash Flow: conti correnti e movimenti ricorrenti.
 * Issue #15 / #51 - M2 Core Modules
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import { logAudit } from './audit'
import type { Account, RecurringExpense, ApiResult } from '../types'

const ACCOUNTS_COLLECTION = (uid: string) => `users/${uid}/accounts`
const EXPENSES_COLLECTION = (uid: string) => `users/${uid}/recurringExpenses`

/**
 * Recupera tutti i conti correnti dell'utente.
 */
export async function getAccounts(uid: string): Promise<ApiResult<Account[]>> {
  try {
    const colRef = collection(db, ACCOUNTS_COLLECTION(uid))
    const q = query(colRef, orderBy('name', 'asc'))
    const snap = await getDocs(q)
    const accounts = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Account)
    return { success: true, data: accounts }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Salva un conto corrente (creazione o aggiornamento).
 */
export async function saveAccount(
  uid: string,
  data: Partial<Account> & { name: string; bank: string; currentBalance: number }
): Promise<ApiResult<Account>> {
  try {
    const isUpdate = !!data.id
    const colRef = collection(db, ACCOUNTS_COLLECTION(uid))

    let accountId = data.id ?? ''
    let previousValue: Record<string, unknown> | undefined

    if (isUpdate) {
      const docRef = doc(db, ACCOUNTS_COLLECTION(uid), accountId)
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        previousValue = snap.data()
      }

      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      })
    } else {
      const docRef = await addDoc(colRef, {
        ...data,
        currency: data.currency ?? 'EUR',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      accountId = docRef.id
    }

    const savedSnap = await getDoc(doc(db, ACCOUNTS_COLLECTION(uid), accountId))
    const savedData = { id: savedSnap.id, ...savedSnap.data() } as Account

    await logAudit({
      uid,
      action: isUpdate ? 'update' : 'create',
      entityType: 'account',
      entityId: accountId,
      ...(previousValue ? { previousValue } : {}),
      newValue: savedData as unknown as Record<string, unknown>,
    })

    return { success: true, data: savedData }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Recupera tutte le spese ricorrenti dell'utente.
 */
export async function getRecurringExpenses(uid: string): Promise<ApiResult<RecurringExpense[]>> {
  try {
    const colRef = collection(db, EXPENSES_COLLECTION(uid))
    const q = query(colRef, orderBy('name', 'asc'))
    const snap = await getDocs(q)
    const expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecurringExpense)
    return { success: true, data: expenses }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Salva una spesa ricorrente (creazione o aggiornamento).
 */
export async function saveRecurringExpense(
  uid: string,
  data: Partial<RecurringExpense> & { name: string; amount: number; frequency: RecurringExpense['frequency'] }
): Promise<ApiResult<RecurringExpense>> {
  try {
    const isUpdate = !!data.id
    const colRef = collection(db, EXPENSES_COLLECTION(uid))

    let expenseId = data.id ?? ''
    let previousValue: Record<string, unknown> | undefined

    if (isUpdate) {
      const docRef = doc(db, EXPENSES_COLLECTION(uid), expenseId)
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        previousValue = snap.data()
      }

      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      })
    } else {
      const docRef = await addDoc(colRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      expenseId = docRef.id
    }

    const savedSnap = await getDoc(doc(db, EXPENSES_COLLECTION(uid), expenseId))
    const savedData = { id: savedSnap.id, ...savedSnap.data() } as RecurringExpense

    await logAudit({
      uid,
      action: isUpdate ? 'update' : 'create',
      entityType: 'recurringExpense',
      entityId: expenseId,
      ...(previousValue ? { previousValue } : {}),
      newValue: savedData as unknown as Record<string, unknown>,
    })

    return { success: true, data: savedData }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Calcola il saldo disponibile totale.
 * Somma dei saldi dei conti - spese ricorrenti mensilizzate.
 */
export async function getAvailableBalance(uid: string): Promise<ApiResult<{
  totalBalance: number;
  monthlyRecurringExpenses: number;
  availableBalance: number;
}>> {
  try {
    const accountsResult = await getAccounts(uid)
    if (!accountsResult.success) return accountsResult

    const expensesResult = await getRecurringExpenses(uid)
    if (!expensesResult.success) return expensesResult

    const totalBalance = accountsResult.data.reduce((sum, acc) => sum + acc.currentBalance, 0)

    const monthlyRecurringExpenses = expensesResult.data.reduce((sum, exp) => {
      let monthlyAmount = 0
      switch (exp.frequency) {
        case 'monthly':
          monthlyAmount = exp.amount
          break
        case 'quarterly':
          monthlyAmount = exp.amount / 3
          break
        case 'annual':
          monthlyAmount = exp.amount / 12
          break
      }
      return sum + monthlyAmount
    }, 0)

    return {
      success: true,
      data: {
        totalBalance,
        monthlyRecurringExpenses,
        availableBalance: totalBalance - monthlyRecurringExpenses,
      }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
