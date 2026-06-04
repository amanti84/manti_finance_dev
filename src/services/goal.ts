import { db } from '../firebase'
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  getDoc,
} from 'firebase/firestore'
import type { Goal, GoalType, GoalStatus, GoalProgress, ApiResult } from '../types'
import { logAudit } from './audit'

const COLLECTION = (uid: string) => `users/${uid}/goals`

export async function createGoal(
  uid: string,
  input: {
    type: GoalType
    name: string
    targetAmount: number
    targetDate: Date
    baselineAmount: number
    note?: string
  }
): Promise<ApiResult<Goal>> {
  try {
    const colRef = collection(db, COLLECTION(uid))
    const goalData: Omit<Goal, 'id'> = {
      type: input.type,
      name: input.name,
      targetAmount: input.targetAmount,
      targetDate: Timestamp.fromDate(input.targetDate),
      baselineAmount: input.baselineAmount,
      currentAmount: input.baselineAmount,
      status: 'active',
      ...(input.note !== undefined ? { note: input.note } : {}),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
    const docRef = await addDoc(colRef, {
      ...goalData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    const newGoal: Goal = { id: docRef.id, ...goalData }
    await logAudit({
      uid,
      action: 'create',
      entityType: 'goal',
      entityId: docRef.id,
      newValue: newGoal as unknown as Record<string, unknown>,
    })
    return { success: true, data: newGoal }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function listGoals(uid: string): Promise<ApiResult<Goal[]>> {
  try {
    const colRef = collection(db, COLLECTION(uid))
    const q = query(colRef, orderBy('targetDate', 'asc'))
    const snap = await getDocs(q)
    const goals = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Goal)
    return { success: true, data: goals }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function updateGoalProgress(
  uid: string,
  goalId: string,
  currentAmount: number
): Promise<ApiResult<Goal>> {
  try {
    const docRef = doc(db, COLLECTION(uid), goalId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: false, error: 'Goal non trovato' }
    const previousValue = snap.data() as Goal
    await updateDoc(docRef, { currentAmount, updatedAt: serverTimestamp() })
    const updatedGoal: Goal = { ...previousValue, id: goalId, currentAmount, updatedAt: Timestamp.now() }
    await logAudit({
      uid, action: 'update', entityType: 'goal', entityId: goalId,
      previousValue: { currentAmount: previousValue.currentAmount },
      newValue: { currentAmount },
    })
    return { success: true, data: updatedGoal }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function updateGoalStatus(
  uid: string,
  goalId: string,
  status: GoalStatus
): Promise<ApiResult<Goal>> {
  try {
    const docRef = doc(db, COLLECTION(uid), goalId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: false, error: 'Goal non trovato' }
    const previousValue = snap.data() as Goal
    await updateDoc(docRef, { status, updatedAt: serverTimestamp() })
    const updatedGoal: Goal = { ...previousValue, id: goalId, status, updatedAt: Timestamp.now() }
    await logAudit({
      uid, action: 'update', entityType: 'goal', entityId: goalId,
      previousValue: { status: previousValue.status },
      newValue: { status },
    })
    return { success: true, data: updatedGoal }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function deleteGoal(uid: string, goalId: string): Promise<ApiResult<void>> {
  try {
    const docRef = doc(db, COLLECTION(uid), goalId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: false, error: 'Goal non trovato' }
    const previousValue = snap.data()
    await deleteDoc(docRef)
    await logAudit({ uid, action: 'delete', entityType: 'goal', entityId: goalId, previousValue })
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function calculateGoalProgress(goal: Goal): GoalProgress {
  const now = new Date()
  const createdAt = goal.createdAt.toDate()
  const targetDateRaw = goal.targetDate
  const targetDate =
    typeof targetDateRaw === 'object' && targetDateRaw !== null && 'toDate' in targetDateRaw
      ? (targetDateRaw as { toDate: () => Date }).toDate()
      : new Date(targetDateRaw)

  const diffInMs = now.getTime() - createdAt.getTime()
  const mesiTrascorsi = Math.max(diffInMs / (1000 * 60 * 60 * 24 * 30.4375), 0.1)

  const baselineAmount = goal.baselineAmount ?? 0
  const progressAmount = goal.currentAmount - baselineAmount
  const tasso = progressAmount / mesiTrascorsi

  let projectedCompletionDate: Date | null = null
  if (tasso > 0) {
    const remainingAmount = goal.targetAmount - goal.currentAmount
    if (remainingAmount <= 0) {
      projectedCompletionDate = now
    } else {
      const mesiRimanenti = remainingAmount / tasso
      projectedCompletionDate = new Date(now.getTime() + mesiRimanenti * (1000 * 60 * 60 * 24 * 30.4375))
    }
  }

  const progressPercent = Math.min(
    Math.max(
      Math.round(((goal.currentAmount - baselineAmount) / (goal.targetAmount - baselineAmount)) * 100),
      0
    ),
    100
  )

  const isOnTrack = projectedCompletionDate !== null && projectedCompletionDate <= targetDate

  let milestoneReached: 0 | 25 | 50 | 75 | 100 | null = null
  if (progressPercent >= 100) milestoneReached = 100
  else if (progressPercent >= 75) milestoneReached = 75
  else if (progressPercent >= 50) milestoneReached = 50
  else if (progressPercent >= 25) milestoneReached = 25

  return {
    goalId: goal.id,
    currentAmount: goal.currentAmount,
    targetAmount: goal.targetAmount,
    remainingAmount: Math.max(goal.targetAmount - goal.currentAmount, 0),
    projectedCompletionDate,
    progressPercent,
    isOnTrack,
    milestoneReached,
  }
}
