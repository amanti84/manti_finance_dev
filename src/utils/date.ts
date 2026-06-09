import { type Timestamp } from 'firebase/firestore'

interface FirestoreTimestamp {
  toDate: () => Date
}

/**
 * Converte un valore che può essere Timestamp, Date o ISO string in un oggetto Date.
 */
export function toDateSafe(value: Timestamp | Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string') return new Date(value)
  if (value && typeof (value as unknown as FirestoreTimestamp).toDate === 'function') {
    return (value as unknown as FirestoreTimestamp).toDate()
  }
  return null
}

/**
 * Verifica se un valore è un Timestamp di Firestore
 */
export function isTimestamp(val: unknown): val is Timestamp {
  return (
    val !== null &&
    typeof val === 'object' &&
    'toDate' in (val as Record<string, unknown>) &&
    typeof (val as Record<string, unknown>).toDate === 'function'
  )
}
