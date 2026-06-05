/**
 * audit.ts
 * AuditService - tracciamento modifiche su dati finanziari
 * Issue #6 - M1 Foundation
 */
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  type QueryConstraint,
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
  entityType?: AuditEntityType
  entityId?: string
  action?: AuditAction
  limitN?: number
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
): Promise<ApiResult<AuditLogEntry[]>> {
  try {
    const ref = collection(db, 'users', uid, 'audit')
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]
    if (filter.entityType) {
      constraints.unshift(where('entityType', '==', filter.entityType))
    }
    if (filter.entityId) {
      constraints.unshift(where('entityId', '==', filter.entityId))
    }
    if (filter.action) {
      constraints.unshift(where('action', '==', filter.action))
    }
    constraints.push(limit(filter.limitN ?? 50))
    const q = query(ref, ...constraints)
    const snap = await getDocs(q)
    return {
      success: true,
      data: snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }) as AuditLogEntry),
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
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
