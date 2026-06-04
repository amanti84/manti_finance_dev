/**
 * Utility di formattazione — manti_finance_dev
 */

/** Formatta un numero come valuta EUR */
export function formatCurrency(
  value: number,
  currency = 'EUR',
  locale = 'it-IT'
): string {
  const normalizedValue = isNaN(value) ? 0 : value
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalizedValue)
}

/** Formatta un numero come percentuale */
export function formatPercent(
  value: number,
  decimals = 1,
  locale = 'it-IT'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

/** Formatta un numero con separatori migliaia */
export function formatNumber(
  value: number,
  decimals = 0,
  locale = 'it-IT'
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Formatta una data ISO in formato leggibile */
export function formatDate(isoDate: string, locale = 'it-IT'): string {
  return new Date(isoDate).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Formatta mese + anno */
export function formatMonthYear(
  month: number,
  year: number,
  locale = 'it-IT'
): string {
  return new Date(year, month - 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })
}
