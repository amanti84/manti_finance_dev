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
import type { PatrimonioSnapshot } from '../types'

// --------------------------------------------------------
// TYPES
// --------------------------------------------------------

export interface SnapshotInput {
  uid: string
  year: number
  month: number // 1-12
  totaleInvestimenti: number
  saldoContiCorrente: number
  valoreMutuoResiduo: number
  tfr: number
  altreAttivita?: number
  altrePassivita?: number
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
  return (
    input.totaleInvestimenti +
    input.saldoContiCorrente +
    input.tfr +
    (input.altreAttivita ?? 0) -
    input.valoreMutuoResiduo -
    (input.altrePassivita ?? 0)
  )
}

// --------------------------------------------------------
// SERVICE
// --------------------------------------------------------

/**
 * Crea o sovrascrive uno snapshot mensile.
 * Lo snapshot e' immutabile: una volta creato non va modificato.
 * Usare createSnapshot solo la prima volta per ogni YYYY-MM.
 */
export async function createSnapshot(
  input: SnapshotInput
): Promise<PatrimonioSnapshot> {
  const snapshotId = buildSnapshotId(input.year, input.month)
  const ref = doc(
    db,
    'users',
    input.uid,
    'snapshots',
    snapshotId
  )

  // Verifica se esiste gia'
  const existing = await getDoc(ref)
  if (existing.exists()) {
    throw new Error(
      `Snapshot ${snapshotId} gia' esistente. Gli snapshot sono immutabili.`
    )
  }

  const patrimonioNetto = calcPatrimonioNetto(input)

  const snapshot: PatrimonioSnapshot = {
    id: snapshotId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    uid: input.uid,
    year: input.year,
    month: input.month as PatrimonioSnapshot['month'],
    totaleInvestimenti: input.totaleInvestimenti,
    saldoContiCorrente: input.saldoContiCorrente,
    valoreMutuoResiduo: input.valoreMutuoResiduo,
    tfr: input.tfr,
    altreAttivita: input.altreAttivita ?? 0,
    altrePassivita: input.altrePassivita ?? 0,
    patrimonioNetto,
  }

  await setDoc(ref, snapshot)
  return snapshot
}

/**
 * Recupera uno snapshot per anno/mese.
 */
export async function getSnapshot(
  uid: string,
  year: number,
  month: number
): Promise<PatrimonioSnapshot | null> {
  const snapshotId = buildSnapshotId(year, month)
  const ref = doc(db, 'users', uid, 'snapshots', snapshotId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as PatrimonioSnapshot
}

/**
 * Lista degli ultimi N snapshot ordinati per data decrescente.
 */
export async function listSnapshots(
  uid: string,
  limitN = 12
): Promise<PatrimonioSnapshot[]> {
  const ref = collection(db, 'users', uid, 'snapshots')
  const q = query(ref, orderBy('year', 'desc'), orderBy('month', 'desc'), limit(limitN))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as PatrimonioSnapshot)
}

/**
 * Lista snapshot per anno specifico.
 */
export async function listSnapshotsByYear(
  uid: string,
  year: number
): Promise<PatrimonioSnapshot[]> {
  const ref = collection(db, 'users', uid, 'snapshots')
  const q = query(
    ref,
    where('year', '==', year),
    orderBy('month', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as PatrimonioSnapshot)
}

/**
 * Calcola il delta rispetto al mese precedente per una lista di snapshot.
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
