/**
 * investment.ts
 * Investment Core Service — gestione portafoglio multi-broker con tracking prezzi,
 * calcolo P&L realizzato e non realizzato, aggregazioni per broker e asset class.
 * Issue #10 — M2 Core Modules
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
import type { Investment, AssetClass, Broker, ApiResult } from '../types'
import { logAuditEvent } from './audit'

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface InvestmentPnL {
  investmentId: string
  name: string
  quantity: number
  avgCost: number
  currentPrice: number
  currentValue: number
  costBasis: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  broker: Broker
  assetClass: AssetClass
}

export interface PortfolioSummary {
  totalValue: number
  totalCostBasis: number
  totalUnrealizedPnL: number
  totalUnrealizedPnLPercent: number
  lastUpdate: Timestamp
  investmentCount: number
}

export interface BrokerAggregation {
  broker: Broker
  totalValue: number
  totalCostBasis: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  investmentCount: number
}

export interface AssetClassAggregation {
  assetClass: AssetClass
  totalValue: number
  totalCostBasis: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  investmentCount: number
  allocationPercent: number
}

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------

const COLLECTION = (uid: string) => `users/${uid}/investments`

// ---------------------------------------------------------------------------
// CRUD OPERATIONS
// ---------------------------------------------------------------------------

/**
 * Crea un nuovo investimento nella collezione Firestore.
 * Registra audit trail per tracciabilità.
 */
export async function createInvestment(
  uid: string,
  data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'currentValue'>
): Promise<ApiResult<string>> {
  try {
    const db = getFirestore()
    const now = Timestamp.now()

    // Calcola currentValue automaticamente
    const currentValue = Math.round(data.quantity * data.currentPrice * 100) / 100

    const investment: Omit<Investment, 'id'> = {
      ...data,
      currentValue,
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await addDoc(collection(db, COLLECTION(uid)), investment)

    // Audit trail
    await logAuditEvent(uid, {
      action: 'investment.created',
      entityType: 'Investment',
      entityId: docRef.id,
      metadata: { name: data.name, broker: data.broker },
    })

    return { success: true, data: docRef.id }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Aggiorna un investimento esistente.
 * Ricalcola automaticamente currentValue se quantity o currentPrice cambiano.
 */
export async function updateInvestment(
  uid: string,
  investmentId: string,
  data: Partial<Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ApiResult<void>> {
  try {
    const db = getFirestore()
    const docRef = doc(db, COLLECTION(uid), investmentId)

    const updated: Partial<Investment> & { updatedAt: Timestamp } = {
      ...data,
      updatedAt: Timestamp.now(),
    }

    // Ricalcola currentValue se necessario
    if (data.quantity !== undefined || data.currentPrice !== undefined) {
      const snap = await getDoc(docRef)
      if (!snap.exists()) {
        return { success: false, error: 'Investimento non trovato' }
      }
      const existing = snap.data() as Investment
      const newQuantity = data.quantity ?? existing.quantity
      const newPrice = data.currentPrice ?? existing.currentPrice
      updated.currentValue = Math.round(newQuantity * newPrice * 100) / 100
    }

    await updateDoc(docRef, updated as Partial<Investment>)

    // Audit trail
    await logAuditEvent(uid, {
      action: 'investment.updated',
      entityType: 'Investment',
      entityId: investmentId,
      metadata: { fields: Object.keys(data) },
    })

    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Elimina un investimento.
 */
export async function deleteInvestment(
  uid: string,
  investmentId: string
): Promise<ApiResult<void>> {
  try {
    const db = getFirestore()
    const docRef = doc(db, COLLECTION(uid), investmentId)

    // Leggi prima di eliminare per audit trail
    const snap = await getDoc(docRef)
    const name = snap.exists() ? (snap.data() as Investment).name : 'unknown'

    await deleteDoc(docRef)

    // Audit trail
    await logAuditEvent(uid, {
      action: 'investment.deleted',
      entityType: 'Investment',
      entityId: investmentId,
      metadata: { name },
    })

    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Recupera un singolo investimento per ID.
 */
export async function getInvestment(
  uid: string,
  investmentId: string
): Promise<ApiResult<Investment>> {
  try {
    const db = getFirestore()
    const docRef = doc(db, COLLECTION(uid), investmentId)
    const snap = await getDoc(docRef)

    if (!snap.exists()) {
      return { success: false, error: 'Investimento non trovato' }
    }

    return { success: true, data: { id: snap.id, ...snap.data() } as Investment }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Recupera tutti gli investimenti dell'utente, ordinati per broker.
 */
export async function getAllInvestments(uid: string): Promise<ApiResult<Investment[]>> {
  try {
    const db = getFirestore()
    const q = query(collection(db, COLLECTION(uid)), orderBy('broker'), orderBy('name'))
    const snapshot = await getDocs(q)

    const investments: Investment[] = []
    snapshot.forEach((doc) => {
      investments.push({ id: doc.id, ...doc.data() } as Investment)
    })

    return { success: true, data: investments }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Filtra investimenti per broker.
 */
export async function getInvestmentsByBroker(
  uid: string,
  broker: Broker
): Promise<ApiResult<Investment[]>> {
  try {
    const db = getFirestore()
    const q = query(
      collection(db, COLLECTION(uid)),
      where('broker', '==', broker),
      orderBy('name')
    )
    const snapshot = await getDocs(q)

    const investments: Investment[] = []
    snapshot.forEach((doc) => {
      investments.push({ id: doc.id, ...doc.data() } as Investment)
    })

    return { success: true, data: investments }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Filtra investimenti per asset class.
 */
export async function getInvestmentsByAssetClass(
  uid: string,
  assetClass: AssetClass
): Promise<ApiResult<Investment[]>> {
  try {
    const db = getFirestore()
    const q = query(
      collection(db, COLLECTION(uid)),
      where('assetClass', '==', assetClass),
      orderBy('name')
    )
    const snapshot = await getDocs(q)

    const investments: Investment[] = []
    snapshot.forEach((doc) => {
      investments.push({ id: doc.id, ...doc.data() } as Investment)
    })

    return { success: true, data: investments }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

// ---------------------------------------------------------------------------
// P&L CALCULATIONS
// ---------------------------------------------------------------------------

/**
 * Calcola il P&L non realizzato di un investimento.
 */
export function calculateUnrealizedPnL(investment: Investment): InvestmentPnL {
  const costBasis = Math.round(investment.quantity * investment.avgCost * 100) / 100
  const currentValue = Math.round(investment.quantity * investment.currentPrice * 100) / 100
  const unrealizedPnL = Math.round((currentValue - costBasis) * 100) / 100
  const unrealizedPnLPercent =
    costBasis > 0 ? Math.round((unrealizedPnL / costBasis) * 10000) / 100 : 0

  return {
    investmentId: investment.id,
    name: investment.name,
    quantity: investment.quantity,
    avgCost: investment.avgCost,
    currentPrice: investment.currentPrice,
    currentValue,
    costBasis,
    unrealizedPnL,
    unrealizedPnLPercent,
    broker: investment.broker,
    assetClass: investment.assetClass,
  }
}

/**
 * Calcola il P&L non realizzato di tutto il portafoglio.
 */
export function calculatePortfolioPnL(investments: Investment[]): ApiResult<InvestmentPnL[]> {
  try {
    const pnlList = investments.map(calculateUnrealizedPnL)
    return { success: true, data: pnlList }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Genera un summary del portafoglio totale.
 */
export function getPortfolioSummary(investments: Investment[]): ApiResult<PortfolioSummary> {
  try {
    const totalValue = investments.reduce(
      (sum, inv) => sum + inv.quantity * inv.currentPrice,
      0
    )
    const totalCostBasis = investments.reduce(
      (sum, inv) => sum + inv.quantity * inv.avgCost,
      0
    )
    const totalUnrealizedPnL = Math.round((totalValue - totalCostBasis) * 100) / 100
    const totalUnrealizedPnLPercent =
      totalCostBasis > 0
        ? Math.round((totalUnrealizedPnL / totalCostBasis) * 10000) / 100
        : 0

    // Trova l'ultimo aggiornamento prezzi
    const lastUpdate =
      investments.length > 0
        ? investments.reduce((latest, inv) =>
            inv.lastPriceUpdate.seconds > latest.seconds ? inv.lastPriceUpdate : latest
          , investments[0].lastPriceUpdate)
        : Timestamp.now()

    return {
      success: true,
      data: {
        totalValue: Math.round(totalValue * 100) / 100,
        totalCostBasis: Math.round(totalCostBasis * 100) / 100,
        totalUnrealizedPnL,
        totalUnrealizedPnLPercent,
        lastUpdate,
        investmentCount: investments.length,
      },
    }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

// ---------------------------------------------------------------------------
// AGGREGATIONS
// ---------------------------------------------------------------------------

/**
 * Aggrega investimenti per broker.
 */
export function aggregateByBroker(investments: Investment[]): ApiResult<BrokerAggregation[]> {
  try {
    const grouped = new Map<Broker, Investment[]>()

    investments.forEach((inv) => {
      if (!grouped.has(inv.broker)) {
        grouped.set(inv.broker, [])
      }
      grouped.get(inv.broker)!.push(inv)
    })

    const result: BrokerAggregation[] = []
    grouped.forEach((invs, broker) => {
      const totalValue = invs.reduce((s, i) => s + i.quantity * i.currentPrice, 0)
      const totalCostBasis = invs.reduce((s, i) => s + i.quantity * i.avgCost, 0)
      const unrealizedPnL = Math.round((totalValue - totalCostBasis) * 100) / 100
      const unrealizedPnLPercent =
        totalCostBasis > 0 ? Math.round((unrealizedPnL / totalCostBasis) * 10000) / 100 : 0

      result.push({
        broker,
        totalValue: Math.round(totalValue * 100) / 100,
        totalCostBasis: Math.round(totalCostBasis * 100) / 100,
        unrealizedPnL,
        unrealizedPnLPercent,
        investmentCount: invs.length,
      })
    })

    return { success: true, data: result.sort((a, b) => b.totalValue - a.totalValue) }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Aggrega investimenti per asset class con % allocazione.
 */
export function aggregateByAssetClass(
  investments: Investment[]
): ApiResult<AssetClassAggregation[]> {
  try {
    const grouped = new Map<AssetClass, Investment[]>()

    investments.forEach((inv) => {
      if (!grouped.has(inv.assetClass)) {
        grouped.set(inv.assetClass, [])
      }
      grouped.get(inv.assetClass)!.push(inv)
    })

    const portfolioTotal = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0)

    const result: AssetClassAggregation[] = []
    grouped.forEach((invs, assetClass) => {
      const totalValue = invs.reduce((s, i) => s + i.quantity * i.currentPrice, 0)
      const totalCostBasis = invs.reduce((s, i) => s + i.quantity * i.avgCost, 0)
      const unrealizedPnL = Math.round((totalValue - totalCostBasis) * 100) / 100
      const unrealizedPnLPercent =
        totalCostBasis > 0 ? Math.round((unrealizedPnL / totalCostBasis) * 10000) / 100 : 0
      const allocationPercent =
        portfolioTotal > 0 ? Math.round((totalValue / portfolioTotal) * 10000) / 100 : 0

      result.push({
        assetClass,
        totalValue: Math.round(totalValue * 100) / 100,
        totalCostBasis: Math.round(totalCostBasis * 100) / 100,
        unrealizedPnL,
        unrealizedPnLPercent,
        investmentCount: invs.length,
        allocationPercent,
      })
    })

    return { success: true, data: result.sort((a, b) => b.totalValue - a.totalValue) }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}
