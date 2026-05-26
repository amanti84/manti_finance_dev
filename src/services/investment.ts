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
import { logAudit } from './audit'

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
  pnl: number
  pnlPct: number
  broker: Broker
  assetClass: AssetClass
}

export interface PortfolioSummary {
  totalValue: number
  totalCostBasis: number
  totalPnL: number
  totalPnLPct: number
  lastUpdate: Timestamp
  investmentCount: number
}

export interface BrokerAggregation {
  broker: Broker
  totalValue: number
  totalCostBasis: number
  pnl: number
  pnlPct: number
  investmentCount: number
}

export interface AssetClassAggregation {
  assetClass: AssetClass
  totalValue: number
  totalCostBasis: number
  pnl: number
  pnlPct: number
  investmentCount: number
  allocationPct: number
}

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------

const COLLECTION = (uid: string) => `users/${uid}/investments`

// ---------------------------------------------------------------------------
// CRUD OPERATIONS
// ---------------------------------------------------------------------------

export async function createInvestment(
  uid: string,
  data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'currentValue'>
): Promise<ApiResult<string>> {
  try {
    const db = getFirestore()
    const now = Timestamp.now()
    const currentValue = Math.round(data.quantity * data.currentPrice * 100) / 100
    const investment: Omit<Investment, 'id'> = { ...data, currentValue, createdAt: now, updatedAt: now }
    const docRef = await addDoc(collection(db, COLLECTION(uid)), investment)
    await logAudit({ uid, action: 'create', entityType: 'investment', entityId: docRef.id, newValue: { name: data.name, broker: data.broker } })
    return { success: true, data: docRef.id }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function updateInvestment(
  uid: string,
  investmentId: string,
  data: Partial<Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ApiResult<void>> {
  try {
    const db = getFirestore()
    const docRef = doc(db, COLLECTION(uid), investmentId)
    const updated: Partial<Investment> & { updatedAt: Timestamp } = { ...data, updatedAt: Timestamp.now() }
    if (data.quantity !== undefined || data.currentPrice !== undefined) {
      const snap = await getDoc(docRef)
      if (!snap.exists()) return { success: false, error: 'Investimento non trovato' }
      const existing = snap.data() as Investment
      const newQuantity = data.quantity ?? existing.quantity
      const newPrice = data.currentPrice ?? existing.currentPrice
      updated.currentValue = Math.round(newQuantity * newPrice * 100) / 100
    }
    await updateDoc(docRef, updated as Partial<Investment>)
    await logAudit({ uid, action: 'update', entityType: 'investment', entityId: investmentId, newValue: { fields: Object.keys(data) } })
    return { success: true, data: undefined }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function deleteInvestment(
  uid: string,
  investmentId: string
): Promise<ApiResult<void>> {
  try {
    const db = getFirestore()
    const docRef = doc(db, COLLECTION(uid), investmentId)
    const snap = await getDoc(docRef)
    const name = snap.exists() ? (snap.data() as Investment).name : 'unknown'
    await deleteDoc(docRef)
    await logAudit({ uid, action: 'delete', entityType: 'investment', entityId: investmentId, previousValue: { name } })
    return { success: true, data: undefined }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function getInvestment(
  uid: string,
  investmentId: string
): Promise<ApiResult<Investment>> {
  try {
    const db = getFirestore()
    const docRef = doc(db, COLLECTION(uid), investmentId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: false, error: 'Investimento non trovato' }
    return { success: true, data: { id: snap.id, ...snap.data() } as Investment }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function getAllInvestments(uid: string): Promise<ApiResult<Investment[]>> {
  try {
    const db = getFirestore()
    const q = query(collection(db, COLLECTION(uid)), orderBy('broker'), orderBy('name'))
    const snapshot = await getDocs(q)
    const investments: Investment[] = []
    snapshot.forEach((d) => { investments.push({ id: d.id, ...d.data() } as Investment) })
    return { success: true, data: investments }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function getInvestmentsByBroker(
  uid: string,
  broker: Broker
): Promise<ApiResult<Investment[]>> {
  try {
    const db = getFirestore()
    const q = query(collection(db, COLLECTION(uid)), where('broker', '==', broker), orderBy('name'))
    const snapshot = await getDocs(q)
    const investments: Investment[] = []
    snapshot.forEach((d) => { investments.push({ id: d.id, ...d.data() } as Investment) })
    return { success: true, data: investments }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function getInvestmentsByAssetClass(
  uid: string,
  assetClass: AssetClass
): Promise<ApiResult<Investment[]>> {
  try {
    const db = getFirestore()
    const q = query(collection(db, COLLECTION(uid)), where('assetClass', '==', assetClass), orderBy('name'))
    const snapshot = await getDocs(q)
    const investments: Investment[] = []
    snapshot.forEach((d) => { investments.push({ id: d.id, ...d.data() } as Investment) })
    return { success: true, data: investments }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

// ---------------------------------------------------------------------------
// P&L CALCULATIONS
// ---------------------------------------------------------------------------

export function calculateUnrealizedPnL(investment: Investment): ApiResult<InvestmentPnL> {
  try {
    if (!investment.avgCost || investment.avgCost === 0) {
      return { success: false, error: 'avgCost non può essere zero' }
    }
    const costBasis = Math.round(investment.quantity * investment.avgCost * 100) / 100
    const currentValue = Math.round(investment.quantity * investment.currentPrice * 100) / 100
    const pnl = Math.round((currentValue - costBasis) * 100) / 100
    const pnlPct = Math.round((pnl / costBasis) * 10000) / 100
    return {
      success: true,
      data: {
        investmentId: investment.id,
        name: investment.name,
        quantity: investment.quantity,
        avgCost: investment.avgCost,
        currentPrice: investment.currentPrice,
        currentValue,
        costBasis,
        pnl,
        pnlPct,
        broker: investment.broker,
        assetClass: investment.assetClass,
      },
    }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export function calculatePortfolioPnL(investments: Investment[]): ApiResult<{ totalPnL: number; totalPnLPct: number }> {
  try {
    const totalCostBasis = investments.reduce((s, i) => s + i.quantity * i.avgCost, 0)
    const totalValue = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0)
    const totalPnL = Math.round((totalValue - totalCostBasis) * 100) / 100
    const totalPnLPct = totalCostBasis > 0 ? Math.round((totalPnL / totalCostBasis) * 10000) / 100 : 0
    return { success: true, data: { totalPnL, totalPnLPct } }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export function getPortfolioSummary(investments: Investment[]): ApiResult<PortfolioSummary> {
  try {
    const totalValue = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0)
    const totalCostBasis = investments.reduce((s, i) => s + i.quantity * i.avgCost, 0)
    const totalPnL = Math.round((totalValue - totalCostBasis) * 100) / 100
    const totalPnLPct = totalCostBasis > 0 ? Math.round((totalPnL / totalCostBasis) * 10000) / 100 : 0
    const lastUpdate = investments.length > 0
      ? investments.reduce((latest, inv) =>
          inv.lastPriceUpdate.seconds > latest.seconds ? inv.lastPriceUpdate : latest,
          investments[0].lastPriceUpdate)
      : Timestamp.now()
    return {
      success: true,
      data: {
        totalValue: Math.round(totalValue * 100) / 100,
        totalCostBasis: Math.round(totalCostBasis * 100) / 100,
        totalPnL,
        totalPnLPct,
        lastUpdate,
        investmentCount: investments.length,
      },
    }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export function aggregateByBroker(investments: Investment[]): ApiResult<BrokerAggregation[]> {
  try {
    const grouped = new Map<Broker, Investment[]>()
    investments.forEach((inv) => {
      if (!grouped.has(inv.broker)) grouped.set(inv.broker, [])
      grouped.get(inv.broker)!.push(inv)
    })
    const result: BrokerAggregation[] = []
    grouped.forEach((invs, broker) => {
      const totalValue = invs.reduce((s, i) => s + i.quantity * i.currentPrice, 0)
      const totalCostBasis = invs.reduce((s, i) => s + i.quantity * i.avgCost, 0)
      const pnl = Math.round((totalValue - totalCostBasis) * 100) / 100
      const pnlPct = totalCostBasis > 0 ? Math.round((pnl / totalCostBasis) * 10000) / 100 : 0
      result.push({ broker, totalValue: Math.round(totalValue * 100) / 100, totalCostBasis: Math.round(totalCostBasis * 100) / 100, pnl, pnlPct, investmentCount: invs.length })
    })
    return { success: true, data: result.sort((a, b) => b.totalValue - a.totalValue) }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export function aggregateByAssetClass(investments: Investment[]): ApiResult<AssetClassAggregation[]> {
  try {
    const grouped = new Map<AssetClass, Investment[]>()
    investments.forEach((inv) => {
      if (!grouped.has(inv.assetClass)) grouped.set(inv.assetClass, [])
      grouped.get(inv.assetClass)!.push(inv)
    })
    const portfolioTotal = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0)
    const result: AssetClassAggregation[] = []
    grouped.forEach((invs, assetClass) => {
      const totalValue = invs.reduce((s, i) => s + i.quantity * i.currentPrice, 0)
      const totalCostBasis = invs.reduce((s, i) => s + i.quantity * i.avgCost, 0)
      const pnl = Math.round((totalValue - totalCostBasis) * 100) / 100
      const pnlPct = totalCostBasis > 0 ? Math.round((pnl / totalCostBasis) * 10000) / 100 : 0
      const allocationPct = portfolioTotal > 0 ? Math.round((totalValue / portfolioTotal) * 10000) / 100 : 0
      result.push({ assetClass, totalValue: Math.round(totalValue * 100) / 100, totalCostBasis: Math.round(totalCostBasis * 100) / 100, pnl, pnlPct, investmentCount: invs.length, allocationPct })
    })
    return { success: true, data: result.sort((a, b) => b.totalValue - a.totalValue) }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}
