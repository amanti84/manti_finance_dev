/**
 * netWorth.ts
 * Net Worth Dashboard Service — Patrimonio netto aggregato e trend storico.
 * Issue #89 — [M3-B] Net Worth Dashboard
 */
import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  setDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { logAudit } from './audit'
import type {
  NetWorthSnapshot,
  ApiResult,
  Month,
} from '../types'
import { getAccounts } from './cashflow'
import { getAllInvestments } from './investment'
import { getMutuoConfig } from './mutuo'
import { getAllPensionFunds } from './previdenza'

const COLLECTION = (uid: string) => `users/${uid}/netWorthSnapshots`

/**
 * Cattura uno snapshot del patrimonio netto oggi.
 * Aggrega dati da investimenti, mutuo, conti correnti e previdenza.
 */
export async function captureNetWorthSnapshot(uid: string): Promise<ApiResult<NetWorthSnapshot>> {
  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1) as Month
    const docId = `${year}-${month}`

    // 1. Fetch data from all services
    const [
      accountsRes,
      investmentsRes,
      mutuoRes,
      pensionRes,
      latestSnapRes
    ] = await Promise.all([
      getAccounts(uid),
      getAllInvestments(uid),
      getMutuoConfig(uid),
      getAllPensionFunds(uid),
      getLatestNetWorth(uid)
    ])

    // Handle required data
    const accounts = accountsRes.success ? accountsRes.data : []
    const investments = investmentsRes.success ? investmentsRes.data : []
    const mutuo = mutuoRes.success ? mutuoRes.data : null
    const pensionFunds = pensionRes.success ? pensionRes.data : []
    const latestSnap = latestSnapRes.success ? latestSnapRes.data : null

    // 2. Aggregate Assets
    const liquidita = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0)

    let investimentiVal = 0
    let pacVal = 0
    let immobiliVal = 0

    investments.forEach(inv => {
      if (inv.assetClass === 'immobili') {
        immobiliVal += inv.currentValue
      } else if (inv.isPac) {
        pacVal += inv.currentValue
      } else {
        investimentiVal += inv.currentValue
      }
    })

    const previdenza = pensionFunds.reduce((sum, fund) => sum + fund.saldoAttuale, 0)

    const assets = {
      liquidita: Math.round(liquidita * 100) / 100,
      investimenti: Math.round(investimentiVal * 100) / 100,
      pac: Math.round(pacVal * 100) / 100,
      previdenza: Math.round(previdenza * 100) / 100,
      immobili: Math.round(immobiliVal * 100) / 100
    }

    // 3. Aggregate Liabilities
    const liabilities = {
      mutuo: mutuo ? mutuo.debitoResiduo : 0,
      altriDebiti: 0 // Inizialmente 0, estendibile in futuro
    }

    // 4. Calculate Net Worth
    const totalAssets = assets.liquidita + assets.investimenti + assets.pac + assets.previdenza + assets.immobili
    const totalLiabilities = liabilities.mutuo + liabilities.altriDebiti
    const netWorth = Math.round((totalAssets - totalLiabilities) * 100) / 100

    const netWorthVariation = latestSnap
      ? Math.round((netWorth - latestSnap.netWorth) * 100) / 100
      : 0

    const snapshot: Omit<NetWorthSnapshot, 'id'> = {
      date: Timestamp.fromDate(now),
      year,
      month,
      assets,
      liabilities,
      netWorth,
      netWorthVariation,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    }

    const docRef = doc(db, COLLECTION(uid), docId)
    await setDoc(docRef, snapshot)

    const result: NetWorthSnapshot = {
      id: docId,
      ...snapshot,
      // Overwrite serverTimestamp for immediate use if needed, though usually Firestore handles it
      createdAt: snapshot.createdAt || Timestamp.now(),
      updatedAt: snapshot.updatedAt || Timestamp.now()
    }

    await logAudit({
      uid,
      action: 'snapshot',
      entityType: 'netWorthSnapshot',
      entityId: docId,
      newValue: result as unknown as Record<string, unknown>
    })

    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Recupera lo storico dei snapshot del patrimonio netto.
 */
export async function getNetWorthHistory(uid: string, months = 24): Promise<ApiResult<NetWorthSnapshot[]>> {
  try {
    const colRef = collection(db, COLLECTION(uid))
    const q = query(colRef, orderBy('date', 'desc'), limit(months))
    const snap = await getDocs(q)

    const history = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as NetWorthSnapshot))

    // Ritorna in ordine cronologico per i grafici
    return { success: true, data: history.reverse() }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Recupera lo snapshot più recente.
 */
export async function getLatestNetWorth(uid: string): Promise<ApiResult<NetWorthSnapshot | null>> {
  try {
    const colRef = collection(db, COLLECTION(uid))
    const q = query(colRef, orderBy('date', 'desc'), limit(1))
    const snap = await getDocs(q)

    if (snap.empty) {
      return { success: true, data: null }
    }

    return {
      success: true,
      data: { id: snap.docs[0].id, ...snap.docs[0].data() } as NetWorthSnapshot
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
