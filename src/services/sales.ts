/**
 * sales.ts
 * Servizio per gestione vendita investimenti e calcolo fiscale (plusvalenze/minusvalenze)
 * Issue #156 — M2 Core Modules
 */
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import type {
  Investment,
  SaleResult,
  SaleRecord,
  TaxWallet,
  TaxSummary,
  ApiResult,
  TaxLoss
} from '../types'
import { logAudit } from './audit'

const SALES_COLLECTION = (uid: string) => `users/${uid}/sales`
const WALLET_DOC = (uid: string) => `users/${uid}/config/taxWallet`

/**
 * Recupera lo zainetto fiscale (minusvalenze pregresse).
 */
export async function getTaxWallet(uid: string): Promise<ApiResult<TaxWallet>> {
  try {
    const snap = await getDoc(doc(db, WALLET_DOC(uid)))
    if (!snap.exists()) {
      return {
        success: true,
        data: {
          id: 'taxWallet',
          totalAvailableLosses: 0,
          lossItems: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        }
      }
    }
    return { success: true, data: { id: snap.id, ...snap.data() } as TaxWallet }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Aggiorna lo zainetto fiscale.
 */
export async function updateTaxWallet(uid: string, wallet: TaxWallet): Promise<ApiResult<void>> {
  try {
    const docRef = doc(db, WALLET_DOC(uid))
    const data = {
      ...wallet,
      updatedAt: Timestamp.now()
    }
    await setDoc(docRef, data)
    await logAudit({
      uid,
      action: 'update',
      entityType: 'taxWallet',
      entityId: 'taxWallet',
      newValue: { totalAvailableLosses: wallet.totalAvailableLosses }
    })
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Calcola l'anteprima fiscale di una vendita.
 */
export async function calculateSale(
  investment: Investment,
  sellPrice: number,
  sellQuantity: number,
  uid: string
): Promise<ApiResult<SaleResult>> {
  try {
    const grossGain = Math.round((sellPrice - investment.avgCost) * sellQuantity * 100) / 100
    const isLoss = grossGain < 0

    if (isLoss) {
      return {
        success: true,
        data: {
          grossGain,
          taxableGain: 0,
          taxAmount: 0,
          netProceeds: Math.round(sellPrice * sellQuantity * 100) / 100,
          isLoss: true
        }
      }
    }

    // Plusvalenza: verifica compensazione minus
    const walletRes = await getTaxWallet(uid)
    if (!walletRes.success) return { success: false, error: walletRes.error }

    const wallet = walletRes.data
    let taxableGain = grossGain
    const availableLoss = wallet.totalAvailableLosses

    if (availableLoss > 0) {
      taxableGain = Math.max(0, grossGain - availableLoss)
    }

    const taxAmount = Math.round(taxableGain * 0.26 * 100) / 100
    const netProceeds = Math.round((sellPrice * sellQuantity - taxAmount) * 100) / 100

    return {
      success: true,
      data: {
        grossGain,
        taxableGain: Math.round(taxableGain * 100) / 100,
        taxAmount,
        netProceeds,
        isLoss: false
      }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Registra una vendita e aggiorna portafoglio e zainetto fiscale.
 */
export async function recordSale(
  uid: string,
  investmentId: string,
  sellPrice: number,
  sellQuantity: number,
  saleDate: Date
): Promise<ApiResult<void>> {
  try {
    const invRef = doc(db, `users/${uid}/investments`, investmentId)
    const invSnap = await getDoc(invRef)
    if (!invSnap.exists()) return { success: false, error: 'Investimento non trovato' }

    const investment = { id: invSnap.id, ...invSnap.data() } as Investment
    if (sellQuantity > investment.quantity) return { success: false, error: 'Quantità insufficiente' }

    // 1. Calcolo fiscale
    const calcRes = await calculateSale(investment, sellPrice, sellQuantity, uid)
    if (!calcRes.success) return { success: false, error: calcRes.error }
    const result = calcRes.data

    // 2. Aggiorna Investimento
    const newQuantity = investment.quantity - sellQuantity
    if (newQuantity <= 0.000001) {
      await deleteDoc(invRef)
    } else {
      const newCurrentValue = Math.round(newQuantity * investment.currentPrice * 100) / 100
      await updateDoc(invRef, {
        quantity: newQuantity,
        currentValue: newCurrentValue,
        updatedAt: Timestamp.now()
      })
    }

    // 3. Salva Record Vendita
    const saleRecord: Omit<SaleRecord, 'id'> = {
      investmentId,
      investmentName: investment.name,
      sellPrice,
      sellQuantity,
      saleDate: Timestamp.fromDate(saleDate),
      grossGain: result.grossGain,
      taxableGain: result.taxableGain,
      taxAmount: result.taxAmount,
      netProceeds: result.netProceeds,
      isLoss: result.isLoss,
      broker: investment.broker,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    const saleRef = await addDoc(collection(db, SALES_COLLECTION(uid)), saleRecord)

    // 4. Aggiorna Zainetto Fiscale
    const walletRes = await getTaxWallet(uid)
    if (walletRes.success) {
      const wallet = walletRes.data
      const currentYear = saleDate.getFullYear()

      if (result.isLoss) {
        // Aggiungi minusvalenza
        const newLoss: TaxLoss = {
          amount: Math.abs(result.grossGain),
          year: currentYear,
          expiryYear: currentYear + 4
        }
        wallet.lossItems.push(newLoss)
      } else {
        // Consuma minusvalenze esistenti (FIFO)
        let gainToCompensate = result.grossGain - result.taxableGain
        if (gainToCompensate > 0) {
          // Filtra perdite non ancora scadute
          wallet.lossItems = wallet.lossItems
            .filter(item => item.expiryYear >= currentYear)
            .sort((a, b) => a.year - b.year)

          for (const item of wallet.lossItems) {
            if (gainToCompensate <= 0) break
            const canCompensate = Math.min(item.amount, gainToCompensate)
            item.amount -= canCompensate
            gainToCompensate -= canCompensate
          }
          wallet.lossItems = wallet.lossItems.filter(item => item.amount > 0.01)
        }
      }

      wallet.totalAvailableLosses = wallet.lossItems.reduce((sum, item) => sum + item.amount, 0)
      await updateTaxWallet(uid, wallet)
    }

    // 5. Audit
    const auditValue: Record<string, unknown> = {}
    Object.entries(saleRecord).forEach(([k, v]) => { auditValue[k] = v })

    await logAudit({
      uid,
      action: 'create',
      entityType: 'sale',
      entityId: saleRef.id,
      newValue: auditValue
    })

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Recupera lo storico vendite.
 */
export async function getSaleHistory(uid: string): Promise<ApiResult<SaleRecord[]>> {
  try {
    const q = query(
      collection(db, SALES_COLLECTION(uid)),
      orderBy('saleDate', 'desc')
    )
    const snap = await getDocs(q)
    const records = snap.docs.map(d => ({ id: d.id, ...d.data() } as SaleRecord))
    return { success: true, data: records }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Riepilogo fiscale annuo.
 */
export async function getAnnualTaxSummary(uid: string, year: number): Promise<ApiResult<TaxSummary>> {
  try {
    const start = Timestamp.fromDate(new Date(year, 0, 1))
    const end = Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59))

    const q = query(
      collection(db, SALES_COLLECTION(uid)),
      where('saleDate', '>=', start),
      where('saleDate', '<=', end)
    )

    const snap = await getDocs(q)
    const records = snap.docs.map(d => d.data() as SaleRecord)

    const summary: TaxSummary = {
      year,
      totalGrossGain: 0,
      totalTaxableGain: 0,
      totalTaxPaid: 0,
      totalLossesRealized: 0
    }

    records.forEach(r => {
      if (r.grossGain > 0) {
        summary.totalGrossGain += r.grossGain
        summary.totalTaxableGain += r.taxableGain
        summary.totalTaxPaid += r.taxAmount
      } else {
        summary.totalLossesRealized += Math.abs(r.grossGain)
      }
    })

    // Rounding
    summary.totalGrossGain = Math.round(summary.totalGrossGain * 100) / 100
    summary.totalTaxableGain = Math.round(summary.totalTaxableGain * 100) / 100
    summary.totalTaxPaid = Math.round(summary.totalTaxPaid * 100) / 100
    summary.totalLossesRealized = Math.round(summary.totalLossesRealized * 100) / 100

    return { success: true, data: summary }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
