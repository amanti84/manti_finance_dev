/**
 * format.ts
 * Utility per la formattazione dei dati finanziari.
 */

/**
 * Formatta un numero come valuta Euro (IT).
 * Esempio: 1000.5 -> 1.000,50 €
 */
export const formatCurrency = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0,00 €'
  }

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}
