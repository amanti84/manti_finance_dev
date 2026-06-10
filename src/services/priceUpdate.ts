/**
 * src/services/priceUpdate.ts
 * Price Update Service — aggiornamento automatico prezzi via ISIN/ticker.
 * Issue #97 — M3-D
 */
import { Timestamp } from 'firebase/firestore'
import type { Investment, ApiResult, PriceData } from '../types'
import { getPriceByISIN } from './isin'
import { updateInvestment } from './investment'
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
