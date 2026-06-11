/**
 * audit.ts
 * AuditService - tracciamento modifiche su dati finanziari
 */
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  type QueryConstraint,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { AuditLogEntry, AuditAction, AuditEntityType, ApiResult } from '../types'

export interface AuditEntryInput {
  uid: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  source?: 'user' | 'system' | 'import'
  ipHash?: string
}

export interface AuditFilter {
  entityType?: AuditEntityType | AuditEntityType[]
  entityId?: string
  action?: AuditAction | AuditAction[]
  limitN?: number
  dateFrom?: Timestamp
  dateTo?: Timestamp
  lastVisible?: DocumentSnapshot | undefined // Per paginazione cursore
}

export async function logAudit(
  input: AuditEntryInput
): Promise<ApiResult<AuditLogEntry>> {
  try {
    const ref = collection(db, 'users', input.uid, 'audit')
    const entry: Omit<AuditLogEntry, 'id'> = {
      uid: input.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      source: input.source ?? 'user',
      ...(input.previousValue !== undefined ? { previousValue: input.previousValue } : {}),
      ...(input.newValue !== undefined ? { newValue: input.newValue } : {}),
      ...(input.ipHash !== undefined ? { ipHash: input.ipHash } : {}),
    }
    const docRef = await addDoc(ref, entry)
    return {
      success: true,
      data: {
        id: docRef.id,
        ...entry,
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getAuditLog(
  uid: string,
  filter: AuditFilter = {}
): Promise<ApiResult<{ entries: AuditLogEntry[], lastVisible: DocumentSnapshot | null }>> {
  try {
    const ref = collection(db, 'users', uid, 'audit')
    const constraints: QueryConstraint[] = []

    if (filter.entityType) {
      if (Array.isArray(filter.entityType)) {
        if (filter.entityType.length > 0) {
          constraints.push(where('entityType', 'in', filter.entityType.slice(0, 10)))
        }
      } else {
        constraints.push(where('entityType', '==', filter.entityType))
      }
    }
    if (filter.entityId) {
      constraints.push(where('entityId', '==', filter.entityId))
    }
    if (filter.action) {
      if (Array.isArray(filter.action)) {
        if (filter.action.length > 0) {
          constraints.push(where('action', 'in', filter.action.slice(0, 10)))
        }
      } else {
        constraints.push(where('action', '==', filter.action))
      }
    }
    if (filter.dateFrom) {
      constraints.push(where('createdAt', '>=', filter.dateFrom))
    }
    if (filter.dateTo) {
      constraints.push(where('createdAt', '<=', filter.dateTo))
    }

    constraints.push(orderBy('createdAt', 'desc'))

    if (filter.lastVisible) {
      constraints.push(startAfter(filter.lastVisible))
    }

    constraints.push(limit(filter.limitN ?? 50))

    const q = query(ref, ...constraints)
    const snap = await getDocs(q)

    const entries = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }) as AuditLogEntry)

    const lastVisible = snap.docs[snap.docs.length - 1]

    return {
      success: true,
      data: { entries, lastVisible },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Genera una stringa CSV dai log di audit.
 * Header: Timestamp,Azione,EntityType,EntityId,Fonte,UID
 */
export function exportAuditLogCSV(entries: AuditLogEntry[]): string {
  const headers = ['Timestamp', 'Azione', 'EntityType', 'EntityId', 'Fonte', 'UID']
  const rows = entries.map(entry => {
    const date = entry.createdAt.toDate()
    const timestamp = `${date.toLocaleDateString('it-IT')} ${date.toLocaleTimeString('it-IT')}`
    return [
      timestamp,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.source ?? 'user',
      entry.uid
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

export async function logChange(
  uid: string,
  entityType: AuditEntityType,
  entityId: string,
  previousValue: Record<string, unknown>,
  newValue: Record<string, unknown>
): Promise<ApiResult<AuditLogEntry>> {
  return logAudit({
    uid,
    action: 'update',
    entityType,
    entityId,
    previousValue,
    newValue,
  })
}

export async function logCreate(
  uid: string,
  entityType: AuditEntityType,
  entityId: string,
  newValue: Record<string, unknown>
): Promise<ApiResult<AuditLogEntry>> {
  return logAudit({
    uid,
    action: 'create',
    entityType,
    entityId,
    newValue,
  })
}

export async function logDelete(
  uid: string,
  entityType: AuditEntityType,
  entityId: string,
  previousValue: Record<string, unknown>
): Promise<ApiResult<AuditLogEntry>> {
  return logAudit({
    uid,
    action: 'delete',
    entityType,
    entityId,
    previousValue,
  })
}
