/**
 * audit.ts
 * AuditService - tracciamento modifiche su dati finanziari
 * Issue #6 - M1 Foundation
 *
 * Principi:
 * - Write-only: ogni record audit non puo' essere modificato dopo la creazione
 * - Ogni scrittura su dati finanziari genera un record audit
 * - La collection audit/{uid}/audit/{id} e' protetta da regole Firestore (no update/delete)
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
  changes?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface AuditFilter {
  entityType?: AuditEntityType
  entityId?: string
  action?: AuditAction
  fromDate?: Date
  toDate?: Date
  limitN?: number
}

// --------------------------------------------------------
// SERVICE
// --------------------------------------------------------

/**
 * Registra un evento audit.
 * E' write-only: non e' possibile modificare o cancellare record audit.
 * Le regole Firestore garantiscono questa proprieta' lato server.
 */
export async function logAudit(
  input: AuditEntryInput
): Promise<AuditLogEntry> {
  const ref = collection(db, 'users', input.uid, 'audit')

  const entry: Omit<AuditLogEntry, 'id'> = {
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    uid: input.uid,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    changes: input.changes ?? {},
    metadata: input.metadata ?? {},
  }

  const docRef = await addDoc(ref, entry)

  return {
    id: docRef.id,
    ...entry,
  } as AuditLogEntry
}

/**
 * Recupera i record audit con filtri opzionali.
 */
export async function getAuditLog(
  uid: string,
  filter: AuditFilter = {}
): Promise<AuditLogEntry[]> {
  const ref = collection(db, 'users', uid, 'audit')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const constraints: any[] = [orderBy('createdAt', 'desc')]

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
 * Convenienza per usare il servizio in modo uniforme.
 */
export async function logChange(
  uid: string,
  entityType: AuditEntityType,
  entityId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Promise<AuditLogEntry> {
  return logAudit({
    uid,
    action: 'update',
    entityType,
    entityId,
    changes: { before, after },
  })
}

/**
 * Helper: logga la creazione di un'entita'.
 */
export async function logCreate(
  uid: string,
  entityType: AuditEntityType,
  entityId: string,
  data: Record<string, unknown>
): Promise<AuditLogEntry> {
  return logAudit({
    uid,
    action: 'create',
    entityType,
    entityId,
    changes: { after: data },
  })
}

/**
 * Helper: logga la cancellazione di un'entita'.
 */
export async function logDelete(
  uid: string,
  entityType: AuditEntityType,
  entityId: string,
  data: Record<string, unknown>
): Promise<AuditLogEntry> {
  return logAudit({
    uid,
    action: 'delete',
    entityType,
    entityId,
    changes: { before: data },
  })
}
