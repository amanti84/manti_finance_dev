/**
 * pac.ts
 * PAC Service — tracking Piani di Accumulo del Capitale (PAC) con gestione versamenti
 * periodici, calcolo progresso vs obiettivo, statistiche e analytics.
 * Issue #11 — M2 Core Modules
 */
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import type { Investment, ApiResult } from '../types'
import { logAudit } from './audit'

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface PacPayment {
  id: string
  investmentId: string
  investmentName: string
  data: Timestamp
  importo: number
  priceAtPayment: number
  quantityPurchased: number
  broker: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PacSummary {
  investmentId: string
  investmentName: string
  importoMensile: number
  totaleVersato: number
  numeroVersamenti: number
  mediaPrezzoAcquisto: number
  valoreAttuale: number
  pnlAssoluto: number
  pnlPercent: number
  primoVersamento: Date
  ultimoVersamento: Date
}

export interface PacProgress {
  investmentId: string
  investmentName: string
  obiettivo: number | null
  totaleVersato: number
  progressoPercent: number
  mesiRimanenti: number | null
  importoMensileMedio: number
  proiezioneCompletamento: Date | null
}

export interface PacAnalytics {
  totalePacAttivi: number
  totaleVersamentiMensili: number
  totaleCapitaleInvestito: number
  mediaRitorno: number
  migliorePerformance: { name: string; pnl: number }
  peggiorePerformance: { name: string; pnl: number }
}

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------

const COLLECTION = (uid: string) => `users/${uid}/pac_payments`

// ---------------------------------------------------------------------------
// CRUD OPERATIONS
// ---------------------------------------------------------------------------

export async function recordPacPayment(
  uid: string,
  data: Omit<PacPayment, 'id' | 'quantityPurchased' | 'createdAt' | 'updatedAt'>
): Promise<ApiResult<string>> {
  try {
    const db = getFirestore()
    const quantityPurchased = data.priceAtPayment > 0
      ? Math.round((data.importo / data.priceAtPayment) * 100000) / 100000
      : 0
    const payment: Omit<PacPayment, 'id'> = {
      ...data,
      quantityPurchased,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
    const colRef = collection(db, COLLECTION(uid))
    const docRef = await addDoc(colRef, payment)
    await logAudit({ uid, action: 'create', entityType: 'investment', entityId: docRef.id })
    return { success: true, data: docRef.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function updatePacPayment(
  uid: string,
  paymentId: string,
  data: Partial<Omit<PacPayment, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ApiResult<undefined>> {
  try {
    const db = getFirestore()
    const docRef = doc(db, COLLECTION(uid), paymentId)
    const updated: Partial<PacPayment> & { updatedAt: Timestamp } = {
      ...data,
      updatedAt: Timestamp.now(),
    }
    if (data.importo !== undefined || data.priceAtPayment !== undefined) {
      const snap = await getDoc(docRef)
      if (!snap.exists()) return { success: false, error: 'Versamento non trovato' }
      const existing = snap.data() as PacPayment
      const newImporto = data.importo ?? existing.importo
      const newPrice = data.priceAtPayment ?? existing.priceAtPayment
      updated.quantityPurchased = newPrice > 0
        ? Math.round((newImporto / newPrice) * 100000) / 100000
        : 0
    }
    await updateDoc(docRef, updated as Partial<PacPayment>)
    await logAudit({ uid, action: 'update', entityType: 'investment', entityId: paymentId })
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function deletePacPayment(
  uid: string,
  paymentId: string
): Promise<ApiResult<undefined>> {
  try {
    const db = getFirestore()
    const docRef = doc(db, COLLECTION(uid), paymentId)
    await deleteDoc(docRef)
    await logAudit({ uid, action: 'delete', entityType: 'investment', entityId: paymentId })
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getPacPaymentsByInvestment(
  uid: string,
  investmentId: string
): Promise<ApiResult<PacPayment[]>> {
  try {
    const db = getFirestore()
    const q = query(
      collection(db, COLLECTION(uid)),
      where('investmentId', '==', investmentId),
      orderBy('data', 'desc')
    )
    const snapshot = await getDocs(q)
    const payments: PacPayment[] = []
    snapshot.forEach((d) => { payments.push({ id: d.id, ...d.data() } as PacPayment) })
    return { success: true, data: payments }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getAllPacPayments(
  uid: string
): Promise<ApiResult<PacPayment[]>> {
  try {
    const db = getFirestore()
    const q = query(collection(db, COLLECTION(uid)), orderBy('data', 'desc'))
    const snapshot = await getDocs(q)
    const payments: PacPayment[] = []
    snapshot.forEach((d) => { payments.push({ id: d.id, ...d.data() } as PacPayment) })
    return { success: true, data: payments }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// ---------------------------------------------------------------------------
// ANALYTICS & SUMMARY
// ---------------------------------------------------------------------------

export async function getPacSummary(
  uid: string,
  investment: Investment
): Promise<ApiResult<PacSummary>> {
  try {
    const paymentsResult = await getPacPaymentsByInvestment(uid, investment.id)
    if (!paymentsResult.success) return { success: false, error: paymentsResult.error }
    const payments = paymentsResult.data
    if (payments.length === 0) return { success: false, error: 'Nessun versamento trovato per questo investimento' }
    const totaleVersato = payments.reduce((sum, p) => sum + p.importo, 0)
    const numeroVersamenti = payments.length
    const totalQuantity = payments.reduce((sum, p) => sum + p.quantityPurchased, 0)
    const mediaPrezzoAcquisto = totalQuantity > 0
      ? Math.round((totaleVersato / totalQuantity) * 100) / 100
      : 0
    const valoreAttuale = totalQuantity * investment.currentPrice
    const pnlAssoluto = Math.round((valoreAttuale - totaleVersato) * 100) / 100
    const pnlPercent = totaleVersato > 0
      ? Math.round((pnlAssoluto / totaleVersato) * 10000) / 100
      : 0
    const primoVersamento = payments[payments.length - 1].data.toDate()
    const ultimoVersamento = payments[0].data.toDate()
    return {
      success: true,
      data: {
        investmentId: investment.id,
        investmentName: investment.name,
        importoMensile: investment.pacMonthlyAmount ?? 0,
        totaleVersato: Math.round(totaleVersato * 100) / 100,
        numeroVersamenti,
        mediaPrezzoAcquisto,
        valoreAttuale: Math.round(valoreAttuale * 100) / 100,
        pnlAssoluto,
        pnlPercent,
        primoVersamento,
        ultimoVersamento,
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function calculatePacProgress(
  uid: string,
  investment: Investment,
  obiettivo: number | null = null
): Promise<ApiResult<PacProgress>> {
  try {
    const summaryResult = await getPacSummary(uid, investment)
    if (!summaryResult.success) return { success: false, error: summaryResult.error }
    const summary = summaryResult.data
    const totaleVersato = summary.totaleVersato
    const importoMensileMedio = summary.importoMensile
    let progressoPercent = 0
    let mesiRimanenti: number | null = null
    let proiezioneCompletamento: Date | null = null
    if (obiettivo && obiettivo > 0) {
      progressoPercent = Math.round((totaleVersato / obiettivo) * 10000) / 100
      if (importoMensileMedio > 0) {
        const rimanente = Math.max(0, obiettivo - totaleVersato)
        mesiRimanenti = Math.ceil(rimanente / importoMensileMedio)
        const oggi = new Date()
        proiezioneCompletamento = new Date(oggi)
        proiezioneCompletamento.setMonth(oggi.getMonth() + mesiRimanenti)
      }
    }
    return {
      success: true,
      data: {
        investmentId: investment.id,
        investmentName: investment.name,
        obiettivo,
        totaleVersato,
        progressoPercent,
        mesiRimanenti,
        importoMensileMedio,
        proiezioneCompletamento,
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getPacAnalytics(
  uid: string,
  pacInvestments: Investment[]
): Promise<ApiResult<PacAnalytics>> {
  try {
    const summaries: PacSummary[] = []
    for (const inv of pacInvestments) {
      const summaryResult = await getPacSummary(uid, inv)
      if (summaryResult.success) summaries.push(summaryResult.data)
    }
    if (summaries.length === 0) {
      return {
        success: true,
        data: {
          totalePacAttivi: 0,
          totaleVersamentiMensili: 0,
          totaleCapitaleInvestito: 0,
          mediaRitorno: 0,
          migliorePerformance: { name: '', pnl: 0 },
          peggiorePerformance: { name: '', pnl: 0 },
        },
      }
    }
    const totalePacAttivi = summaries.length
    const totaleVersamentiMensili = summaries.reduce((s, p) => s + p.importoMensile, 0)
    const totaleCapitaleInvestito = summaries.reduce((s, p) => s + p.totaleVersato, 0)
    const mediaRitorno = summaries.reduce((s, p) => s + p.pnlPercent, 0) / summaries.length
    const sorted = [...summaries].sort((a, b) => b.pnlPercent - a.pnlPercent)
    return {
      success: true,
      data: {
        totalePacAttivi,
        totaleVersamentiMensili: Math.round(totaleVersamentiMensili * 100) / 100,
        totaleCapitaleInvestito: Math.round(totaleCapitaleInvestito * 100) / 100,
        mediaRitorno: Math.round(mediaRitorno * 100) / 100,
        migliorePerformance: { name: sorted[0].investmentName, pnl: sorted[0].pnlPercent },
        peggiorePerformance: { name: sorted[sorted.length - 1].investmentName, pnl: sorted[sorted.length - 1].pnlPercent },
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
