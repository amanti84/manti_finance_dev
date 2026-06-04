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
  where,
  serverTimestamp,
  Timestamp,
  getDoc,
} from 'firebase/firestore'
import type {
  InboxItem,
  InboxItemStatus,
  ConfidenceField,
  InboxBadgeCount,
  ApiResult,
} from '../types'
import { logAudit } from './audit'

const COLLECTION = (uid: string) => `users/${uid}/inboxItems`

export async function createInboxItem(
  uid: string,
  input: {
    documentId: string
    fileName: string
    source: 'upload' | 'email'
    confidenceFields?: ConfidenceField[]
  }
): Promise<ApiResult<InboxItem>> {
  try {
    const now = Timestamp.now()
    const itemData: Omit<InboxItem, 'id'> = {
      documentId: input.documentId,
      fileName: input.fileName,
      source: input.source,
      status: 'RICEVUTO',
      confidenceFields: input.confidenceFields ?? [],
      createdAt: now,
      updatedAt: now,
    }
    const colRef = collection(db, COLLECTION(uid))
    const docRef = await addDoc(colRef, {
      ...itemData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    const newItem: InboxItem = { id: docRef.id, ...itemData }
    await logAudit({
      uid, action: 'create', entityType: 'inboxItem', entityId: docRef.id,
      newValue: itemData,
    })
    return { success: true, data: newItem }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function listInboxItems(
  uid: string,
  filters?: { status?: InboxItemStatus }
): Promise<ApiResult<InboxItem[]>> {
  try {
    const colRef = collection(db, COLLECTION(uid))
    let q = query(colRef, orderBy('createdAt', 'desc'))
    if (filters?.status) {
      q = query(colRef, where('status', '==', filters.status), orderBy('createdAt', 'desc'))
    }
    const snap = await getDocs(q)
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InboxItem)
    return { success: true, data: items }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function updateInboxStatus(
  uid: string,
  itemId: string,
  status: InboxItemStatus,
  errorMessage?: string
): Promise<ApiResult<InboxItem>> {
  try {
    const docRef = doc(db, COLLECTION(uid), itemId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: false, error: 'Inbox item non trovato' }
    const currentData = snap.data() as InboxItem
    const updates: Partial<InboxItem> = {
      status,
      updatedAt: Timestamp.now(),
      ...(errorMessage !== undefined ? { errorMessage } : {}),
    }
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() })
    const updatedItem = { ...currentData, ...updates, id: itemId }
    await logAudit({
      uid, action: 'update', entityType: 'inboxItem', entityId: itemId,
      previousValue: currentData as unknown as Record<string, unknown>,
      newValue: updatedItem,
    })
    return { success: true, data: updatedItem }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function confirmInboxItem(
  uid: string,
  itemId: string,
  confirmedFields: Record<string, unknown>
): Promise<ApiResult<InboxItem>> {
  try {
    const docRef = doc(db, COLLECTION(uid), itemId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: false, error: 'Inbox item non trovato' }
    const currentData = snap.data() as InboxItem
    const now = Timestamp.now()
    const updatedConfidenceFields = currentData.confidenceFields.map((field: ConfidenceField) => {
      if (Object.prototype.hasOwnProperty.call(confirmedFields, field.fieldName)) {
        return { ...field, confirmedValue: confirmedFields[field.fieldName], confirmedAt: now }
      }
      return field
    })
    const updates: Partial<InboxItem> = {
      status: 'CONFERMATO',
      confidenceFields: updatedConfidenceFields,
      confirmedAt: now,
      reviewedAt: now,
      updatedAt: now,
    }
    await updateDoc(docRef, {
      ...updates,
      confirmedAt: serverTimestamp(),
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    const updatedItem = { ...currentData, ...updates, id: itemId }
    await logAudit({
      uid, action: 'update', entityType: 'inboxItem', entityId: itemId,
      previousValue: currentData as unknown as Record<string, unknown>,
      newValue: updatedItem,
    })
    return { success: true, data: updatedItem }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function deleteInboxItem(uid: string, itemId: string): Promise<ApiResult<void>> {
  try {
    const docRef = doc(db, COLLECTION(uid), itemId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: false, error: 'Inbox item non trovato' }
    const currentData = snap.data() as InboxItem
    await deleteDoc(docRef)
    await logAudit({
      uid, action: 'delete', entityType: 'inboxItem', entityId: itemId,
      previousValue: currentData as unknown as Record<string, unknown>,
    })
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function calculateBadgeCount(items: InboxItem[]): InboxBadgeCount {
  const terminalStatuses: InboxItemStatus[] = ['CONFERMATO', 'ERRORE']
  const totalItems = items.filter((item) => !terminalStatuses.includes(item.status))
  const requiresReviewItems = totalItems.filter((item) =>
    item.confidenceFields.some((field: ConfidenceField) => field.confidence < 80)
  )
  const pendingItems = totalItems.filter(
    (item) => item.status === 'RICEVUTO' || item.status === 'pending'
  )
  return {
    total: totalItems.length,
    requiresReview: requiresReviewItems.length,
    pending: pendingItems.length,
  }
}
