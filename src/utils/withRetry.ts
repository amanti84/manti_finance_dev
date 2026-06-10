import type { ApiResult } from '../types';

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
}

/**
 * Utility per eseguire tentativi multipli di una funzione che restituisce un ApiResult.
 * Implementa backoff esponenziale.
 * Non ritenta in caso di errore 403 (Permission Denied).
 */
export async function withRetry<T>(
  fn: () => Promise<ApiResult<T>>,
  options: RetryOptions = {}
): Promise<ApiResult<T>> {
  const { maxAttempts = 3, delayMs = 500 } = options;
  let lastError = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await fn();

    if (result.success) {
      return result;
    }

    lastError = result.error;

    // Se l'errore è definitivo (403, permessi negati, o non trovato), non ritentare
    const lowerError = lastError.toLowerCase();
    if (
      lastError.includes('403') ||
      lowerError.includes('permission-denied') ||
      lowerError.includes('permission denied') ||
      lowerError.includes('non trovato') ||
      lowerError.includes('non trovata') ||
      lowerError.includes('not found')
    ) {
      return result;
    }

    // Se abbiamo superato il numero massimo di tentativi, restituiamo l'ultimo risultato
    if (attempt === maxAttempts) {
      return result;
    }

    // Backoff esponenziale: 1x, 2x, 4x...
    const waitTime = delayMs * Math.pow(2, attempt - 1);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  // In teoria non dovremmo mai arrivare qui grazie al return result nel loop
  return {
    success: false,
    error: `Servizio non disponibile. Errore originale: ${lastError}`,
  };
}
