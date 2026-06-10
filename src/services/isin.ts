import type { ApiResult, PriceData, AssetISINType } from '../types'

/**
 * Recupera il prezzo di un asset via Cloud Function getPriceByISIN.
 */
export async function getPriceByISIN(
  isin: string | null,
  shares: number = 0,
  ticker: string | null = null,
  tickerOnly: boolean = false
): Promise<ApiResult<PriceData>> {
  if (!isin && !ticker) {
    return { success: false, error: 'Necessario ISIN o ticker' }
  }

  try {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
    if (!projectId) {
      return { success: false, error: 'VITE_FIREBASE_PROJECT_ID non configurato' }
    }

    // URL CF: costruita dinamicamente per supportare dev/prod
    const cfUrl = `https://us-central1-${projectId}.cloudfunctions.net/getPriceByISIN`

    const params = new URLSearchParams()
    if (tickerOnly && ticker) {
      params.append('ticker', ticker)
    } else if (isin) {
      params.append('isin', isin)
    }
    if (shares > 0) {
      params.append('shares', shares.toString())
    }

    const response = await fetch(`${cfUrl}?${params.toString()}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error || `Errore CF: ${response.status} ${response.statusText}`
      }
    }

    const data = await response.json()
    if (data.success === false) {
      return { success: false, error: data.error || 'Errore sconosciuto dalla Cloud Function' }
    }

    const result = data.data
    const priceData: PriceData = {
      isin: result.isin || isin,
      ticker: result.symbol || ticker || '',
      name: result.name || result.symbol || result.isin || '',
      price: result.price,
      currency: result.currency,
      currentValue: shares > 0 ? result.price * shares : result.price,
      timestamp: result.fetchedAt?._seconds
        ? new Date(result.fetchedAt._seconds * 1000).toISOString()
        : new Date().toISOString(),
      source: result.source,
    }

    return { success: true, data: priceData }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore durante la chiamata alla Cloud Function'
    }
  }
}

/**
 * Valida un codice ISIN tramite regex.
 */
export function isValidISIN(isin: string): boolean {
  const regex = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/
  return regex.test(isin)
}

/**
 * Formatta l'ISIN (trim + uppercase).
 */
export function formatISIN(isin: string): string {
  return isin.trim().toUpperCase()
}

/**
 * Classifica l'asset in base al prefisso ISIN.
 */
export function getAssetType(isin: string): AssetISINType {
  const prefix = isin.substring(0, 2).toUpperCase()
  if (['IE', 'GB', 'DE', 'FR', 'NL'].includes(prefix)) {
    return 'etf'
  }
  if (prefix === 'IT') {
    return 'fund-it'
  }
  if (prefix === 'LU') {
    return 'fund-lu'
  }
  return 'other'
}

/**
 * Ritorna la frequenza di aggiornamento in base all'asset type.
 */
export function getUpdateFrequency(isin: string): string {
  const type = getAssetType(isin)
  switch (type) {
    case 'etf':
      return 'Tempo reale (ogni 30 minuti)'
    case 'fund-it':
      return 'Giornaliero (NAV ore 18:00)'
    case 'fund-lu':
      return 'Giornaliero (NAV fine giornata)'
    default:
      return 'Variabile'
  }
}
