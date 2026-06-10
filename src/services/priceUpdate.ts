/**
 * src/services/priceUpdate.ts
 * Price Update Service — aggiornamento automatico prezzi via ISIN/ticker.
 * Issue #97 — M3-D
 * Issue #141 — M3-KG2 Kindergarten Integration
 */
import { Timestamp } from 'firebase/firestore'
import type { Investment, ApiResult, PriceData } from '../types'
import type { KindergartenInvestment, KindergartenPAC } from '../types/kindergarten'
import { getPriceByISIN } from './isin'
import { updateInvestment } from './investment'
import {
  getKindergartenInvestments,
  updateKindergartenInvestment
} from './kindergartenInvestment'
import {
  getKindergartenPACs,
  updateKindergartenPAC
} from './kindergartenPac'
import { logAudit } from './audit'

/**
 * Aggiorna il prezzo di un singolo investimento.
 */
export async function updateInvestmentPrice(
  uid: string,
  investment: Investment
): Promise<ApiResult<PriceData>> {
  if (!investment.isin && !investment.tickerOnly) {
    return { success: false, error: 'Necessario ISIN o ticker per aggiornamento' }
  }

  try {
    const result = await getPriceByISIN(
      investment.isin ?? null,
      investment.quantity,
      investment.ticker ?? null,
      investment.tickerOnly
    )

    if (!result.success) {
      // Log error on investment
      await updateInvestment(uid, investment.id, {
        lastUpdateError: result.error,
        lastUpdateAttempt: Timestamp.now()
      })
      return result
    }

    const priceData = result.data

    if (priceData.currency !== 'EUR') {
      const errorMsg = `Valuta ${priceData.currency} non supportata. Solo EUR ammesso.`
      await updateInvestment(uid, investment.id, {
        lastUpdateError: errorMsg,
        lastUpdateAttempt: Timestamp.now()
      })
      return { success: false, error: errorMsg }
    }

    // Update investment on Firestore
    const updateResult = await updateInvestment(uid, investment.id, {
      currentPrice: priceData.price,
      currentValue: priceData.currentValue,
      lastPriceUpdate: Timestamp.now(),
      priceSource: priceData.source,
      lastUpdateError: null,
      lastUpdateAttempt: Timestamp.now(),
      yahooSymbol: priceData.ticker
    })

    if (!updateResult.success) {
      return { success: false, error: `Errore aggiornamento Firestore: ${updateResult.error}` }
    }

    // Log Audit
    await logAudit({
      uid,
      action: 'update',
      entityType: 'investment',
      entityId: investment.id,
      newValue: {
        currentPrice: priceData.price,
        currentValue: priceData.currentValue,
        source: priceData.source
      }
    })

    return { success: true, data: priceData }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto'
    await updateInvestment(uid, investment.id, {
      lastUpdateError: errorMsg,
      lastUpdateAttempt: Timestamp.now()
    })
    return { success: false, error: errorMsg }
  }
}

/**
 * Aggiorna il prezzo di un investimento Kindergarten.
 */
export async function updateKindergartenInvestmentPrice(
  uid: string,
  investment: KindergartenInvestment
): Promise<ApiResult<PriceData>> {
  if (!investment.isin && !investment.tickerOnly) {
    return { success: false, error: 'Necessario ISIN o ticker per aggiornamento' }
  }

  try {
    const result = await getPriceByISIN(
      investment.isin ?? null,
      investment.quantity,
      investment.ticker ?? null,
      investment.tickerOnly
    )

    if (!result.success) {
      await updateKindergartenInvestment(uid, investment.id, {
        lastUpdateError: result.error,
        lastUpdateAttempt: Timestamp.now()
      })
      return result
    }

    const priceData = result.data
    if (priceData.currency !== 'EUR') {
      const errorMsg = `Valuta ${priceData.currency} non supportata. Solo EUR ammesso.`
      await updateKindergartenInvestment(uid, investment.id, {
        lastUpdateError: errorMsg,
        lastUpdateAttempt: Timestamp.now()
      })
      return { success: false, error: errorMsg }
    }

    const updateResult = await updateKindergartenInvestment(uid, investment.id, {
      currentPrice: priceData.price,
      lastPriceUpdate: Timestamp.now(),
      priceSource: priceData.source,
      lastUpdateError: null,
      lastUpdateAttempt: Timestamp.now(),
      yahooSymbol: priceData.ticker
    })

    if (!updateResult.success) {
      return { success: false, error: `Errore aggiornamento Firestore KG: ${updateResult.error}` }
    }

    await logAudit({
      uid,
      action: 'update',
      entityType: 'investment',
      entityId: investment.id,
      newValue: {
        currentPrice: priceData.price,
        source: priceData.source,
        isKindergarten: true
      }
    })

    return { success: true, data: priceData }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto'
    await updateKindergartenInvestment(uid, investment.id, {
      lastUpdateError: errorMsg,
      lastUpdateAttempt: Timestamp.now()
    })
    return { success: false, error: errorMsg }
  }
}

/**
 * Aggiorna il prezzo di un PAC Kindergarten.
 */
export async function updateKindergartenPACPrice(
  uid: string,
  pac: KindergartenPAC
): Promise<ApiResult<PriceData>> {
  if (!pac.isin && !pac.tickerOnly) {
    return { success: false, error: 'Necessario ISIN o ticker per aggiornamento' }
  }

  try {
    const result = await getPriceByISIN(
      pac.isin ?? null,
      pac.quantity ?? 0,
      pac.ticker ?? null,
      pac.tickerOnly
    )

    if (!result.success) {
      await updateKindergartenPAC(uid, pac.id, {
        lastUpdateError: result.error,
        lastUpdateAttempt: Timestamp.now()
      })
      return result
    }

    const priceData = result.data
    if (priceData.currency !== 'EUR') {
      const errorMsg = `Valuta ${priceData.currency} non supportata. Solo EUR ammesso.`
      await updateKindergartenPAC(uid, pac.id, {
        lastUpdateError: errorMsg,
        lastUpdateAttempt: Timestamp.now()
      })
      return { success: false, error: errorMsg }
    }

    const updateResult = await updateKindergartenPAC(uid, pac.id, {
      currentValue: priceData.currentValue,
      lastPriceUpdate: Timestamp.now(),
      priceSource: priceData.source,
      lastUpdateError: null,
      lastUpdateAttempt: Timestamp.now(),
      yahooSymbol: priceData.ticker
    })

    if (!updateResult.success) {
      return { success: false, error: `Errore aggiornamento Firestore KG PAC: ${updateResult.error}` }
    }

    await logAudit({
      uid,
      action: 'update',
      entityType: 'investment',
      entityId: pac.id,
      newValue: {
        currentValue: priceData.currentValue,
        source: priceData.source,
        isKindergarten: true,
        isPac: true
      }
    })

    return { success: true, data: priceData }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto'
    await updateKindergartenPAC(uid, pac.id, {
      lastUpdateError: errorMsg,
      lastUpdateAttempt: Timestamp.now()
    })
    return { success: false, error: errorMsg }
  }
}

interface UpdateAllOptions {
  autoUpdateOnly?: boolean
  onProgress?: (current: number, total: number, name: string) => void
}

/**
 * Aggiorna i prezzi di una lista di investimenti con rate limiting.
 */
export async function updateAllPrices(
  uid: string,
  investments: Investment[],
  options?: UpdateAllOptions
): Promise<ApiResult<{ successCount: number; failCount: number; total: number }>> {
  const toUpdate = options?.autoUpdateOnly
    ? investments.filter(inv => inv.autoUpdate)
    : investments

  let successCount = 0
  let failCount = 0
  const total = toUpdate.length

  for (let i = 0; i < total; i++) {
    const inv = toUpdate[i]
    if (options?.onProgress) {
      options.onProgress(i + 1, total, inv.name)
    }

    const result = await updateInvestmentPrice(uid, inv)
    if (result.success) {
      successCount++
    } else {
      failCount++
    }

    // Rate limiting: 500ms pausa tra chiamate
    if (i < total - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return {
    success: true,
    data: { successCount, failCount, total }
  }
}

/**
 * Aggiorna i prezzi di tutti gli investimenti e PAC Kindergarten.
 */
export async function updateAllKindergartenPrices(
  uid: string,
  options?: UpdateAllOptions
): Promise<ApiResult<{ successCount: number; failCount: number; total: number }>> {
  try {
    // 1. Carica tutti gli investimenti e PAC KG
    const [invRes, pacRes] = await Promise.all([
      getKindergartenInvestments(uid),
      getKindergartenPACs(uid)
    ])

    if (!invRes.success) return { success: false, error: invRes.error }
    if (!pacRes.success) return { success: false, error: pacRes.error }

    const investments = invRes.data
    const pacs = pacRes.data

    // 2. Filtra per isin ?? tickerOnly e autoUpdate
    const filteredInvs = options?.autoUpdateOnly
      ? investments.filter(i => (i.isin ?? i.tickerOnly) && i.autoUpdate !== false)
      : investments.filter(i => (i.isin ?? i.tickerOnly))

    const filteredPacs = options?.autoUpdateOnly
      ? pacs.filter(p => (p.isin ?? p.tickerOnly) && p.autoUpdate !== false)
      : pacs.filter(p => (p.isin ?? p.tickerOnly))

    const toUpdate = [
      ...filteredInvs.map(i => ({ type: 'inv' as const, data: i })),
      ...filteredPacs.map(p => ({ type: 'pac' as const, data: p }))
    ]

    let successCount = 0
    let failCount = 0
    const total = toUpdate.length

    // 3. Esegui aggiornamenti con rate limiting
    for (let i = 0; i < total; i++) {
      const item = toUpdate[i]
      if (options?.onProgress) {
        options.onProgress(i + 1, total, item.data.name)
      }

      let result: ApiResult<PriceData>
      if (item.type === 'inv') {
        result = await updateKindergartenInvestmentPrice(uid, item.data)
      } else {
        result = await updateKindergartenPACPrice(uid, item.data)
      }

      if (result.success) {
        successCount++
      } else {
        failCount++
      }

      // 4. Rate limiting: 500ms pausa
      if (i < total - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return {
      success: true,
      data: { successCount, failCount, total }
    }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Errore aggiornamento batch KG' }
  }
}
