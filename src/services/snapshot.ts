/**
 * snapshot.ts
 * SnapshotService - fotografia mensile del patrimonio
 * Issue #5 - M1 Foundation
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { PatrimonioSnapshot, ApiResult } from '../types'

// --------------------------------------------------------
// TYPES
// --------------------------------------------------------

export interface SnapshotInput {
  uid: string
  year: number
  month: number // 1-12
  // Attivi
  contiCorrenti: number
  investimenti: number
  immobili: number
  fondoPensione: number
  tfr: number
  // Passivi
  mutuo: number
  altriDebiti: number
  note?: string
}

export interface SnapshotWithDelta extends PatrimonioSnapshot {
  delta: number | null // differenza rispetto al mese precedente
}

// --------------------------------------------------------
// HELPERS
// --------------------------------------------------------

/**
 * Genera il document ID nel formato YYYY-MM per un dato anno/mese.
 */
export function buildSnapshotId(year: number, month: number): string {
  const mm = String(month).padStart(2, '0')
  return `${year}-${mm}`
}

/**
 * Calcola il patrimonio netto a partire dall'input.
 */
export function calcPatrimonioNetto(input: SnapshotInput): number {
  const attivi =
    input.contiCorrenti +
    input.investimenti +
    input.immobili +
    input.fondoPensione +
    input.tfr
  const passivi = input.mutuo + input.altriDebiti
  return attivi - passivi
}

// --------------------------------------------------------
// SERVICE
// --------------------------------------------------------

/**
 * Crea uno snapshot mensile.
 * Lo snapshot e' immutabile: una volta creato non va modificato.
 */
export async function createSnapshot(
  input: SnapshotInput
): Promise<ApiResult<PatrimonioSnapshot>> {
  try {
    const snapshotId = buildSnapshotId(input.year, input.month)
    const ref = doc(db, 'users', input.uid, 'snapshots', snapshotId)

    // Verifica se esiste gia'
    const existing = await getDoc(ref)
    if (existing.exists()) {
      return {
        success: false,
        error: `Snapshot ${snapshotId} gia' esistente. Gli snapshot sono immutabili.`,
      }
    }

    const patrimonioNetto = calcPatrimonioNetto(input)

    const snapshot: PatrimonioSnapshot = {
      id: snapshotId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      year: input.year,
      month: input.month as PatrimonioSnapshot['month'],
      contiCorrenti: input.contiCorrenti,
      investimenti: input.investimenti,
      immobili: input.immobili,
      fondoPensione: input.fondoPensione,
      tfr: input.tfr,
      mutuo: input.mutuo,
      altriDebiti: input.altriDebiti,
      patrimonioNetto,
      // include note solo se definita (exactOptionalPropertyTypes)
      ...(input.note !== undefined ? { note: input.note } : {}),
    }

    await setDoc(ref, snapshot)
    return { success: true, data: snapshot }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Recupera uno snapshot per anno/mese.
 */
export async function getSnapshot(
  uid: string,
  year: number,
  month: number
): Promise<ApiResult<PatrimonioSnapshot>> {
  try {
    const snapshotId = buildSnapshotId(year, month)
    const ref = doc(db, 'users', uid, 'snapshots', snapshotId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return { success: false, error: 'Snapshot non trovato' }
    return { success: true, data: snap.data() as PatrimonioSnapshot }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Lista degli ultimi N snapshot ordinati per data decrescente.
 */
export async function listSnapshots(
  uid: string,
  limitN = 12
): Promise<ApiResult<PatrimonioSnapshot[]>> {
  try {
    const ref = collection(db, 'users', uid, 'snapshots')
    const q = query(ref, orderBy('year', 'desc'), orderBy('month', 'desc'), limit(limitN))
    const snap = await getDocs(q)
    return { success: true, data: snap.docs.map((d) => d.data() as PatrimonioSnapshot) }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Lista snapshot per anno specifico.
 */
export async function listSnapshotsByYear(
  uid: string,
  year: number
): Promise<ApiResult<PatrimonioSnapshot[]>> {
  try {
    const ref = collection(db, 'users', uid, 'snapshots')
    const q = query(
      ref,
      where('year', '==', year),
      orderBy('month', 'asc')
    )
    const snap = await getDocs(q)
    return { success: true, data: snap.docs.map((d) => d.data() as PatrimonioSnapshot) }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Calcola il delta rispetto al mese precedente per una lista di snapshot.
 * La lista deve essere ordinata per data decrescente (piu' recente prima).
 */
export function computeDeltas(
  snapshots: PatrimonioSnapshot[]
): SnapshotWithDelta[] {
  return snapshots.map((s, idx) => {
    const prev = snapshots[idx + 1]
    const delta = prev
      ? s.patrimonioNetto - prev.patrimonioNetto
      : null
    return { ...s, delta }
  })
}
