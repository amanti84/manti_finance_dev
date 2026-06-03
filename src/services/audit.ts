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
import type { AuditLogEntry, AuditAction, AuditEntityType } from '../types'

// --------------------------------------------------------
// TYPES
// --------------------------------------------------------
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
// --------------------------------------------------------
// SERVICE
// --------------------------------------------------------
/**
 * Registra un evento audit (write-only).
 */
export async function logAudit(
  input: AuditEntryInput
): Promise<AuditLogEntry> {
  const ref = collection(db, 'users', input.uid, 'audit')
  // Usa spread per gestire exactOptionalPropertyTypes
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
    id: docRef.id,
    ...entry,
  }
}

/**
 * Recupera i record audit con filtri opzionali.
 */
export async function getAuditLog(
  uid: string,
  filter: AuditFilter = {}
): Promise<AuditLogEntry[]> {
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
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }) as AuditLogEntry)
}

/**
 * Helper: logga una modifica a un'entita' finanziaria.
 */
export async function logChange(
  uid: string,
  entityType: AuditEntityType,
  entityId: string,
  previousValue: Record<string, unknown>,
  newValue: Record<string, unknown>
): Promise<AuditLogEntry> {
  return logAudit({
    uid,
    action: 'update',
    entityType,
    entityId,
    previousValue,
    newValue,
  })
}

/**
 * Helper: logga la creazione di un'entita'.
 */
export async function logCreate(
  uid: string,
  entityType: AuditEntityType,
  entityId: string,
  newValue: Record<string, unknown>
): Promise<AuditLogEntry> {
  return logAudit({
    uid,
    action: 'create',
    entityType,
    entityId,
    newValue,
  })
}

/**
 * Helper: logga la cancellazione di un'entita'.
 */
export async function logDelete(
  uid: string,
  entityType: AuditEntityType,
  entityId: string,
  previousValue: Record<string, unknown>
): Promise<AuditLogEntry> {
  return logAudit({
    uid,
    action: 'delete',
    entityType,
    entityId,
    previousValue,
  })
}
